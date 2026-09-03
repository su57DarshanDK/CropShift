from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm
from app.schemas.risk import RiskSimulationRequest, RiskSimulationResponse, RiskScenarioResult

from app.services.farm_service import get_farm_conditions
from app.services.crop_service import get_current_crop
from app.services.market_service import get_best_market_for_crop
from app.models.crop_suitability import CropSuitability
from app.models.crop_economics import CropEconomics
from app.decision_engine.suitability import score_suitability
from app.decision_engine.profitability import calculate_profitability
from app.decision_engine.risk import calculate_risk_score
from app.decision_engine.safety_score import calculate_headline_safety_score

router = APIRouter()

def evaluate_scenario(
    db: Session,
    farm_id: int,
    farm_cond: dict,
    curr_crop_id: int,
    alt_crop: dict,
    price_multiplier: float,
    yield_multiplier: float,
    water_penalty_factor: float
) -> RiskScenarioResult:
    # 1. Simulate water availability if drought/water-risk scenario
    simulated_farm_cond = dict(farm_cond)
    if water_penalty_factor > 0:
        simulated_farm_cond["water_availability"] = False

    # 2. Suitability
    suit_row = db.query(CropSuitability).filter(
        CropSuitability.crop_id == alt_crop["id"],
        CropSuitability.region == simulated_farm_cond["district"]
    ).first()
    suit_res = score_suitability(simulated_farm_cond, alt_crop, suit_row)
    
    # 3. Economics
    curr_econ_row = db.query(CropEconomics).filter(
        CropEconomics.crop_id == curr_crop_id,
        CropEconomics.region == simulated_farm_cond["state"]
    ).first()
    if not curr_econ_row:
        curr_econ_row = db.query(CropEconomics).filter(CropEconomics.crop_id == curr_crop_id).first()
        
    alt_econ_row = db.query(CropEconomics).filter(
        CropEconomics.crop_id == alt_crop["id"],
        CropEconomics.region == simulated_farm_cond["state"]
    ).first()
    if not alt_econ_row:
        alt_econ_row = db.query(CropEconomics).filter(CropEconomics.crop_id == alt_crop["id"]).first()

    curr_econ_dict = {}
    if curr_econ_row:
        curr_econ_dict = {
            "expected_yield_per_acre": curr_econ_row.expected_yield_per_acre,
            "yield_unit": curr_econ_row.yield_unit,
            "production_cost_per_acre": curr_econ_row.production_cost_per_acre,
            "expected_price_per_unit": curr_econ_row.expected_price_per_unit,
        }
        
    alt_econ_dict = {}
    if alt_econ_row:
        alt_econ_dict = {
            "expected_yield_per_acre": alt_econ_row.expected_yield_per_acre * yield_multiplier,
            "yield_unit": alt_econ_row.yield_unit,
            "production_cost_per_acre": alt_econ_row.production_cost_per_acre,
            "expected_price_per_unit": alt_econ_row.expected_price_per_unit * price_multiplier,
        }

    profit_res = calculate_profitability(
        simulated_farm_cond,
        curr_econ_dict,
        alt_econ_dict,
        simulated_farm_cond["land_area_acre"]
    )
    
    # 4. Market
    market_res = get_best_market_for_crop(db, farm_id, alt_crop["id"])
    m_score = market_res["market_score"] if market_res else 60
    m_trend = market_res["trend"] if market_res else "STABLE"
    m_dist = market_res["distance_km"] if market_res else None
    
    # 5. Risk
    risk_score = calculate_risk_score(
        suitability_score=suit_res.score,
        trend=m_trend,
        water_availability=simulated_farm_cond["water_availability"],
        water_requirement=alt_crop["water_requirement"],
        distance_km=m_dist
    )
    
    # 6. Safety Score
    safety_res = calculate_headline_safety_score(
        suitability=suit_res.score,
        profitability=profit_res.profitability_score,
        market=m_score,
        risk=risk_score
    )
    
    return RiskScenarioResult(safety_score=int(safety_res.safety_score), decision=safety_res.decision)

from app.models.user import User
from app.api.v1.auth import get_current_user

@router.post("", response_model=RiskSimulationResponse)
def simulate_risk(
    payload: RiskSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = db.get(Farm, payload.farm_id)
    crop = db.get(Crop, payload.crop_id)
    
    if not farm or not crop:
        raise HTTPException(status_code=404, detail="Farm or Crop not found.")
        
    if farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm.")
        
    farm_cond = get_farm_conditions(db, payload.farm_id)
    curr_crop_data = get_current_crop(db, payload.farm_id)
    curr_crop_id = curr_crop_data["id"] if curr_crop_data else crop.id
    
    alt_crop = {
        "id": crop.id,
        "name": crop.name,
        "crop_type": crop.crop_type,
        "season": crop.season,
        "duration_days": crop.duration_days,
        "water_requirement": crop.water_requirement,
        "is_oilseed": crop.is_oilseed,
    }

    baseline = evaluate_scenario(db, payload.farm_id, farm_cond, curr_crop_id, alt_crop, 1.0, 1.0, 0.0)
    price_down = evaluate_scenario(db, payload.farm_id, farm_cond, curr_crop_id, alt_crop, payload.price_variance, 1.0, 0.0)
    yield_down = evaluate_scenario(db, payload.farm_id, farm_cond, curr_crop_id, alt_crop, 1.0, payload.yield_variance, 0.0)
    water_risk = evaluate_scenario(db, payload.farm_id, farm_cond, curr_crop_id, alt_crop, 1.0, payload.yield_variance, 1.0)

    return RiskSimulationResponse(
        baseline=baseline,
        price_down=price_down,
        yield_down=yield_down,
        water_risk=water_risk
    )
