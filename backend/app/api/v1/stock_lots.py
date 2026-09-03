"""stock_lots.py — Actual Stock Lot API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.stock_lot import StockLot
from app.models.farm import Farm
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


class StockLotCreate(BaseModel):
    farm_id: Optional[int] = None
    crop_name: str
    quantity_tonnes: float
    actual_grade: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    harvest_date: Optional[str] = None
    description: Optional[str] = None
    certificate_id: Optional[int] = None


class StockLotResponse(BaseModel):
    id: int
    farmer_id: int
    farmer_username: Optional[str] = None
    farm_id: Optional[int] = None
    crop_name: str
    quantity_tonnes: float
    actual_grade: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    harvest_date: Optional[str] = None
    description: Optional[str] = None
    certificate_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("", response_model=StockLotResponse)
def create_stock_lot(
    payload: StockLotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an actual stock lot (after harvest)."""
    if payload.farm_id:
        farm = db.get(Farm, payload.farm_id)
        if farm and farm.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to use this farm.")

    lot = StockLot(
        farmer_id=current_user.id,
        farm_id=payload.farm_id,
        crop_name=payload.crop_name,
        quantity_tonnes=payload.quantity_tonnes,
        actual_grade=payload.actual_grade,
        location=payload.location,
        state=payload.state,
        harvest_date=payload.harvest_date,
        description=payload.description,
        certificate_id=payload.certificate_id,
        status="AVAILABLE",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    r = StockLotResponse.model_validate(lot)
    r.farmer_username = current_user.username
    return r


@router.get("", response_model=List[StockLotResponse])
def list_stock_lots(
    crop: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse all AVAILABLE stock lots."""
    q = db.query(StockLot).filter(StockLot.status == "AVAILABLE")
    if crop:
        q = q.filter(StockLot.crop_name.ilike(f"%{crop}%"))
    if state:
        q = q.filter(StockLot.state.ilike(f"%{state}%"))
    lots = q.order_by(StockLot.created_at.desc()).all()
    result = []
    for lot in lots:
        r = StockLotResponse.model_validate(lot)
        if lot.farmer:
            r.farmer_username = lot.farmer.username
        result.append(r)
    return result


@router.get("/mine", response_model=List[StockLotResponse])
def list_my_stock_lots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer's own stock lots."""
    lots = (
        db.query(StockLot)
        .filter(StockLot.farmer_id == current_user.id)
        .order_by(StockLot.created_at.desc())
        .all()
    )
    result = []
    for lot in lots:
        r = StockLotResponse.model_validate(lot)
        r.farmer_username = current_user.username
        result.append(r)
    return result


@router.get("/{lot_id}", response_model=StockLotResponse)
def get_stock_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lot = db.get(StockLot, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Stock lot not found.")
    r = StockLotResponse.model_validate(lot)
    if lot.farmer:
        r.farmer_username = lot.farmer.username
    return r
