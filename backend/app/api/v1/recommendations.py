from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.decision_engine.recommendation import generate_recommendation
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse

router = APIRouter()

@router.post("", response_model=RecommendationResponse)
def create_recommendation(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = db.get(Farm, payload.farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    
    if farm.owner_id != current_user.id and farm.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm.")

    # Optionally save coords before generating recommendation
    if payload.latitude is not None and payload.longitude is not None:
        farm.location = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"
        db.commit()

    rec = generate_recommendation(db, payload.farm_id)
    if not rec:
        raise HTTPException(
            status_code=404,
            detail=f"Farm with ID {payload.farm_id} not found or recommendation failed."
        )
    
    crop = db.get(Crop, rec.recommended_crop_id)
    crop_name = crop.name if crop else "Unknown"

    return RecommendationResponse(
        recommended_crop=crop_name,
        suitability_score=int(rec.suitability_score),
        profitability_score=int(rec.profitability_score),
        market_score=int(rec.market_score),
        risk_score=int(rec.risk_score),
        safety_score=int(rec.safety_score),
        decision=rec.decision,
        expected_profit=float(rec.expected_profit),
        current_crop_profit=float(rec.current_crop_profit),
        profit_difference=float(rec.profit_difference),
        reasons=rec.reasons or [],
        risks=rec.risks or []
    )

from app.schemas.oilseed_suitability import OilseedSuitabilityResponse
from app.decision_engine.oilseed_suitability import evaluate_oilseed_suitability_for_farm

@router.get("/farms/{farm_id}/oilseed-suitability", response_model=OilseedSuitabilityResponse)
def get_oilseed_suitability(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")

    if farm.owner_id != current_user.id and farm.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm.")

    res = evaluate_oilseed_suitability_for_farm(db, farm_id)
    if not res:
        raise HTTPException(status_code=404, detail="Unable to evaluate oilseed suitability for this farm.")

    return res

