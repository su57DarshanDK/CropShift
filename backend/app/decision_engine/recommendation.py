"""
Recommendation engine for CropShift.
Orchestrates suitability, profitability, market, and risk evaluations.
"""
from sqlalchemy.orm import Session
from typing import Optional

from app.models.recommendation import Recommendation
from app.models.crop_suitability import CropSuitability
from app.models.crop_economics import CropEconomics
from app.services.farm_service import get_farm_conditions
from app.services.crop_service import get_current_crop, get_alternative_crops
from app.services.market_service import get_best_market_for_crop
from app.decision_engine.suitability import score_suitability
from app.decision_engine.profitability import calculate_profitability
from app.decision_engine.risk import calculate_risk_score
from app.decision_engine.safety_score import calculate_headline_safety_score
from app.decision_engine.explainability import generate_explanations


def generate_recommendation(db: Session, farm_id: int) -> Optional[Recommendation]:
    """
    Orchestrate the full pipeline to evaluate alternative crops and select the best recommendation.
    Persists and returns the Recommendation database model.
    """
    # 1. Fetch farm conditions
    farm_cond = get_farm_conditions(db, farm_id)
    if not farm_cond:
        return None

    # 2. Get current crop
    curr_crop = get_current_crop(db, farm_id)
    if not curr_crop:
        return None

    # 3. Get candidate alternative crops
    alt_crops = get_alternative_crops(db, farm_id)
    if not alt_crops:
        return None

    # 4. Fetch current crop economics
    curr_econ_row = (
        db.query(CropEconomics)
        .filter(CropEconomics.crop_id == curr_crop["id"], CropEconomics.region == farm_cond["state"])
        .first()
    )
    if not curr_econ_row:
        curr_econ_row = (
            db.query(CropEconomics)
            .filter(CropEconomics.crop_id == curr_crop["id"])
            .first()
        )
    if not curr_econ_row:
        return None

    curr_econ_dict = {
        "expected_yield_per_acre": curr_econ_row.expected_yield_per_acre,
        "yield_unit": curr_econ_row.yield_unit,
        "production_cost_per_acre": curr_econ_row.production_cost_per_acre,
        "expected_price_per_unit": curr_econ_row.expected_price_per_unit,
        "data_source": curr_econ_row.data_source,
        "data_status": curr_econ_row.data_status,
    }

    candidates_evaluated = []

    for alt_crop in alt_crops:
        # A. Fetch suitability row and score suitability
        suit_row = (
            db.query(CropSuitability)
            .filter(CropSuitability.crop_id == alt_crop["id"], CropSuitability.region == farm_cond["district"])
            .first()
        )
        suit_res = score_suitability(farm_cond, alt_crop, suit_row)

        # B. Fetch alternative crop economics and calculate profitability
        alt_econ_row = (
            db.query(CropEconomics)
            .filter(CropEconomics.crop_id == alt_crop["id"], CropEconomics.region == farm_cond["state"])
            .first()
        )
        if not alt_econ_row:
            alt_econ_row = (
                db.query(CropEconomics)
                .filter(CropEconomics.crop_id == alt_crop["id"])
                .first()
            )
        if not alt_econ_row:
            continue

        alt_econ_dict = {
            "expected_yield_per_acre": alt_econ_row.expected_yield_per_acre,
            "yield_unit": alt_econ_row.yield_unit,
            "production_cost_per_acre": alt_econ_row.production_cost_per_acre,
            "expected_price_per_unit": alt_econ_row.expected_price_per_unit,
            "data_source": alt_econ_row.data_source,
            "data_status": alt_econ_row.data_status,
        }

        profit_res = calculate_profitability(
            farm_conditions=farm_cond,
            current_crop_econ=curr_econ_dict,
            alternative_crop_econ=alt_econ_dict,
            land_area_acre=farm_cond["land_area_acre"]
        )

        # C. Fetch market context and score
        market_res = get_best_market_for_crop(db, farm_id, alt_crop["id"])
        if market_res:
            m_score = market_res["market_score"]
            m_trend = market_res["trend"]
            m_dist = market_res["distance_km"]
        else:
            m_score = 60
            m_trend = "STABLE"
            m_dist = None

        # D. Calculate risk score
        risk_score = calculate_risk_score(
            suitability_score=suit_res.score,
            trend=m_trend,
            water_availability=farm_cond["water_availability"],
            water_requirement=alt_crop["water_requirement"],
            distance_km=m_dist
        )

        # E. Calculate Safety Score
        safety_res = calculate_headline_safety_score(
            suitability=suit_res.score,
            profitability=profit_res.profitability_score,
            market=m_score,
            risk=risk_score
        )

        # F. Build reasons & risks via the explainability engine
        combined_notes = list(set((suit_res.notes or []) + (safety_res.notes or [])))
        reasons, risks = generate_explanations(
            decision=safety_res.decision,
            suitability_score=int(suit_res.score),
            profitability_score=int(profit_res.profitability_score),
            market_score=int(m_score),
            risk_score=int(risk_score),
            profit_diff=float(profit_res.profit_difference),
            current_crop_profit=float(profit_res.current_crop_profit),
            expected_profit=float(profit_res.estimated_profit),
            alt_crop_name=alt_crop["name"],
            water_requirement=alt_crop["water_requirement"],
            water_availability=farm_cond["water_availability"],
            trend=m_trend,
            distance_km=m_dist,
            notes=combined_notes
        )

        candidates_evaluated.append({
            "recommended_crop_id": alt_crop["id"],
            "suitability_score": float(suit_res.score),
            "profitability_score": float(profit_res.profitability_score),
            "market_score": float(m_score),
            "risk_score": float(risk_score),
            "safety_score": float(safety_res.safety_score),
            "decision": safety_res.decision,
            "expected_profit": float(profit_res.estimated_profit),
            "current_crop_profit": float(profit_res.current_crop_profit),
            "profit_difference": float(profit_res.profit_difference),
            "reasons": reasons,
            "risks": risks
        })

    if not candidates_evaluated:
        return None

    # Sort deterministically: highest safety score, then highest profit_difference, then lowest crop_id
    candidates_evaluated.sort(
        key=lambda x: (
            -x["safety_score"],
            -x["profit_difference"],
            x["recommended_crop_id"]
        )
    )

    best = candidates_evaluated[0]

    # Persist to database
    rec = Recommendation(
        farm_id=farm_id,
        recommended_crop_id=best["recommended_crop_id"],
        suitability_score=best["suitability_score"],
        profitability_score=best["profitability_score"],
        market_score=best["market_score"],
        risk_score=best["risk_score"],
        safety_score=best["safety_score"],
        decision=best["decision"],
        expected_profit=best["expected_profit"],
        current_crop_profit=best["current_crop_profit"],
        profit_difference=best["profit_difference"],
        reasons=best["reasons"],
        risks=best["risks"]
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
