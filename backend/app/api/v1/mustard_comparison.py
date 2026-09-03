from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.user import User
from app.models.mustard_variety import MustardVariety
from app.api.v1.auth import get_current_user
from app.schemas.mustard_comparison import MustardComparisonResponse
from app.decision_engine.mustard_comparison import evaluate_mustard_varieties_for_farm

router = APIRouter(tags=["Mustard Seed Comparison"])

@router.get("/{farm_id}/mustard-comparison", response_model=MustardComparisonResponse)
def get_mustard_seed_comparison(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns comparative evaluation of all active mustard seed varieties for the specified farm.
    Enforces user authentication and strict farm ownership authorization.
    """
    # 1. Fetch farm from DB
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    # 2. Enforce Ownership Authorization
    if farm.owner_id != current_user.id and farm.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this farm."
        )

    # 3. Resolve current crop name from farmer's farm record in DB
    current_crop_name = "Mustard"
    if farm.current_crop_id:
        crop_obj = db.query(Crop).filter(Crop.id == farm.current_crop_id).first()
        if crop_obj:
            current_crop_name = crop_obj.name

    # 4. Fetch seed varieties matching farmer's crop or active varieties
    varieties = db.query(MustardVariety).filter(
        MustardVariety.is_active == True,
        (MustardVariety.crop_name.ilike(current_crop_name)) | (MustardVariety.crop_name == "Mustard")
    ).all()

    if not varieties:
        varieties = db.query(MustardVariety).filter(MustardVariety.is_active == True).all()

    if not varieties:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No seed varieties available for this crop."
        )

    # 5. Evaluate and rank seed varieties against farmer's real farm inputs
    result = evaluate_mustard_varieties_for_farm(farm, varieties, current_crop_name)
    return result
