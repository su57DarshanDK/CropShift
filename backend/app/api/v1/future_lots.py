"""future_lots.py — Future Crop Lot API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.future_crop_lot import FutureCropLot
from app.models.farm import Farm
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


class FutureLotCreate(BaseModel):
    farm_id: int
    crop_name: str
    land_area_acre: Optional[float] = None
    expected_quantity_tonnes: Optional[float] = None
    expected_harvest_start: Optional[str] = None
    expected_harvest_end: Optional[str] = None
    expected_grade: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    certificate_id: Optional[int] = None


class FutureLotResponse(BaseModel):
    id: int
    farmer_id: int
    farmer_username: Optional[str] = None
    farm_id: int
    crop_name: str
    land_area_acre: Optional[float] = None
    expected_quantity_tonnes: Optional[float] = None
    expected_harvest_start: Optional[str] = None
    expected_harvest_end: Optional[str] = None
    expected_grade: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    certificate_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("", response_model=FutureLotResponse)
def create_future_lot(
    payload: FutureLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Future Crop Lot. Farmer must own the referenced farm."""
    farm = db.get(Farm, payload.farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    if farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to use this farm.")

    lot = FutureCropLot(
        farmer_id=current_user.id,
        farm_id=payload.farm_id,
        crop_name=payload.crop_name,
        land_area_acre=payload.land_area_acre,
        expected_quantity_tonnes=payload.expected_quantity_tonnes,
        expected_harvest_start=payload.expected_harvest_start,
        expected_harvest_end=payload.expected_harvest_end,
        expected_grade=payload.expected_grade,
        location=payload.location,
        state=payload.state,
        description=payload.description,
        certificate_id=payload.certificate_id,
        status="OPEN",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    r = FutureLotResponse.model_validate(lot)
    r.farmer_username = current_user.username
    return r


@router.get("", response_model=List[FutureLotResponse])
def list_future_lots(
    crop: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse all OPEN future crop lots (accessible to buyers and farmers)."""
    q = db.query(FutureCropLot).filter(FutureCropLot.status == "OPEN")
    if crop:
        q = q.filter(FutureCropLot.crop_name.ilike(f"%{crop}%"))
    if state:
        q = q.filter(FutureCropLot.state.ilike(f"%{state}%"))
    lots = q.order_by(FutureCropLot.created_at.desc()).all()
    result = []
    for lot in lots:
        r = FutureLotResponse.model_validate(lot)
        if lot.farmer:
            r.farmer_username = lot.farmer.username
        result.append(r)
    return result


@router.get("/mine", response_model=List[FutureLotResponse])
def list_my_future_lots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer views their own future crop lots."""
    lots = (
        db.query(FutureCropLot)
        .filter(FutureCropLot.farmer_id == current_user.id)
        .order_by(FutureCropLot.created_at.desc())
        .all()
    )
    result = []
    for lot in lots:
        r = FutureLotResponse.model_validate(lot)
        r.farmer_username = current_user.username
        result.append(r)
    return result


@router.get("/{lot_id}", response_model=FutureLotResponse)
def get_future_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lot = db.get(FutureCropLot, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Future crop lot not found.")
    r = FutureLotResponse.model_validate(lot)
    if lot.farmer:
        r.farmer_username = lot.farmer.username
    return r


@router.patch("/{lot_id}/certificate")
def attach_certificate(
    lot_id: int,
    certificate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a certificate to a future crop lot."""
    lot = db.get(FutureCropLot, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Future crop lot not found.")
    if lot.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    lot.certificate_id = certificate_id
    db.commit()
    return {"status": "success", "certificate_id": certificate_id}
