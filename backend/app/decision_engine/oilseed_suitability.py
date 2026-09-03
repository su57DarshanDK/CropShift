"""
oilseed_suitability.py -- Evaluates whether oilseed crops can be grown on a farmer's actual farm,
lists suitable oilseeds, or returns non-oilseed alternatives.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.crop import Crop
from app.models.crop_suitability import CropSuitability
from app.models.crop_economics import CropEconomics
from app.services.farm_service import get_farm_conditions
from app.decision_engine.suitability import score_suitability

def evaluate_oilseed_suitability_for_farm(db: Session, farm_id: int) -> Dict[str, Any]:
    """
    Evaluates oilseed crop suitability for the given farm ID using PostgreSQL data.
    Returns CAN OILSEED CROPS BE GROWN (YES/NO), suitable oilseed options, or non-oilseed alternatives.
    """
    farm = db.get(Farm, farm_id)
    if not farm:
        return None

    farm_cond = get_farm_conditions(db, farm_id)
    if not farm_cond:
        return None

    farm_soil = (farm.soil_type or "").strip().lower()
    has_water = bool(farm.water_availability)
    district = farm.district or "Local District"
    state = farm.state or "Local State"

    # Query all active crops from PostgreSQL
    all_crops = db.query(Crop).all()

    oilseed_candidates = []
    non_oilseed_candidates = []

    current_crop_name = "Unknown"
    if farm.current_crop_id:
        c_obj = db.get(Crop, farm.current_crop_id)
        if c_obj:
            current_crop_name = c_obj.name

    for c in all_crops:
        # Fetch suitability row for district
        suit_row = db.query(CropSuitability).filter(
            CropSuitability.crop_id == c.id,
            CropSuitability.region == district
        ).first()

        c_dict = {
            "id": c.id,
            "name": c.name,
            "crop_type": c.crop_type,
            "is_oilseed": c.is_oilseed,
            "water_requirement": c.water_requirement,
            "season": c.season
        }

        suit_res = score_suitability(farm_cond, c_dict, suit_row)
        score = suit_res.score

        # Determine profitability score
        econ_row = db.query(CropEconomics).filter(
            CropEconomics.crop_id == c.id,
            CropEconomics.region == state
        ).first()
        if not econ_row:
            econ_row = db.query(CropEconomics).filter(CropEconomics.crop_id == c.id).first()

        profit_score = 70
        if econ_row:
            revenue = float(econ_row.expected_yield_per_acre) * float(econ_row.expected_price_per_unit)
            profit = revenue - float(econ_row.production_cost_per_acre)
            profit_score = int(min(100, max(10, (profit / 35000.0) * 85.0)))

        reasons = []
        if suit_res.factors:
            for f in suit_res.factors:
                if f.contribution > 15:
                    reasons.append(f.explanation)

        if not reasons:
            reasons.append(f"Suitable for {farm.soil_type or 'your'} soil and climate conditions.")

        if c.is_oilseed or (c.crop_type and "oilseed" in c.crop_type.lower()):
            # Oilseed filter rule: Check if farm water & soil can support this oilseed
            water_req = (c.water_requirement or "Medium").upper()
            water_pass = True
            if not has_water and water_req == "HIGH":
                water_pass = False

            if score >= 50 and water_pass:
                oilseed_candidates.append({
                    "crop_id": c.id,
                    "crop_name": c.name,
                    "is_oilseed": True,
                    "water_requirement": c.water_requirement or "Medium",
                    "suitability_score": score,
                    "profitability_score": profit_score,
                    "reasons": reasons
                })
        else:
            if score >= 50:
                expected_yield_str = "25 quintal/acre"
                if econ_row:
                    expected_yield_str = f"{econ_row.expected_yield_per_acre} {econ_row.yield_unit}/acre"

                non_oilseed_candidates.append({
                    "crop_id": c.id,
                    "crop_name": c.name,
                    "water_requirement": c.water_requirement or "Medium",
                    "suitability_score": score,
                    "expected_yield": expected_yield_str
                })

    # Sort candidates by suitability_score descending
    oilseed_candidates.sort(key=lambda x: x["suitability_score"], reverse=True)
    non_oilseed_candidates.sort(key=lambda x: x["suitability_score"], reverse=True)

    can_oilseed_be_grown = len(oilseed_candidates) > 0
    unsuitable_reasons = []

    if can_oilseed_be_grown:
        suitability_status = "YES — OILSEED CROPS ARE SUITABLE"
        explanation = f"Oilseed crops are suitable for your {farm.soil_type or 'regional'} soil and {'available' if has_water else 'rainfed/limited'} water availability in {district}, {state}."
    else:
        suitability_status = "NO — OILSEED CROPS ARE NOT SUITABLE"
        explanation = f"Oilseed crops are not recommended for your farm conditions in {district}, {state}."
        if not has_water:
            unsuitable_reasons.append("Water availability is insufficient for oilseed cultivation.")
        if farm_soil:
            unsuitable_reasons.append(f"Soil type '{farm.soil_type}' is not optimal for high-yield oilseed varieties.")
        unsuitable_reasons.append("Regional climate and seasonal window favor alternative grain or fiber crops.")

    return {
        "farm_id": farm.id,
        "farm_name": f"Farm #{farm.id} ({district}, {state})",
        "current_crop": current_crop_name,
        "land_area_acre": float(farm.land_area_acre or 1.0),
        "soil_type": farm.soil_type or "Regional Average",
        "water_availability": "Available" if has_water else "Limited",
        "district": district,
        "state": state,
        "can_oilseed_be_grown": can_oilseed_be_grown,
        "suitability_status": suitability_status,
        "explanation": explanation,
        "unsuitable_reasons": unsuitable_reasons,
        "suitable_oilseed_crops": oilseed_candidates,
        "non_oilseed_alternatives": non_oilseed_candidates,
    }
