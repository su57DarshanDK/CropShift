"""buyer_demands.py — Buyer Demand Board API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.buyer_demand import BuyerDemand
from app.models.user import User
from app.api.v1.auth import get_current_user, get_current_buyer

router = APIRouter()


class BuyerDemandCreate(BaseModel):
    crop_name: str
    quantity_tonnes: float
    required_grade: Optional[str] = None
    harvest_period_start: Optional[str] = None
    harvest_period_end: Optional[str] = None
    preferred_location: Optional[str] = None
    state: Optional[str] = None
    min_price_per_qtl: Optional[float] = None
    max_price_per_qtl: Optional[float] = None
    description: Optional[str] = None


class BuyerDemandResponse(BaseModel):
    id: int
    buyer_id: int
    buyer_username: Optional[str] = None
    crop_name: str
    quantity_tonnes: float
    required_grade: Optional[str] = None
    harvest_period_start: Optional[str] = None
    harvest_period_end: Optional[str] = None
    preferred_location: Optional[str] = None
    state: Optional[str] = None
    min_price_per_qtl: Optional[float] = None
    max_price_per_qtl: Optional[float] = None
    description: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("", response_model=BuyerDemandResponse)
def create_buyer_demand(
    payload: BuyerDemandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a buyer demand. Buyers post demands for farmer visibility."""
    demand = BuyerDemand(
        buyer_id=current_user.id,
        crop_name=payload.crop_name,
        quantity_tonnes=payload.quantity_tonnes,
        required_grade=payload.required_grade,
        harvest_period_start=payload.harvest_period_start,
        harvest_period_end=payload.harvest_period_end,
        preferred_location=payload.preferred_location,
        state=payload.state,
        min_price_per_qtl=payload.min_price_per_qtl,
        max_price_per_qtl=payload.max_price_per_qtl,
        description=payload.description,
        status="OPEN",
    )
    db.add(demand)
    db.commit()
    db.refresh(demand)
    resp = BuyerDemandResponse.model_validate(demand)
    resp.buyer_username = current_user.username
    return resp


@router.get("", response_model=List[BuyerDemandResponse])
def list_buyer_demands(
    crop: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all OPEN buyer demands. Farmers use this to discover market demand."""
    q = db.query(BuyerDemand).filter(BuyerDemand.status == "OPEN")
    if crop:
        q = q.filter(BuyerDemand.crop_name.ilike(f"%{crop}%"))
    if state:
        q = q.filter(BuyerDemand.state.ilike(f"%{state}%"))
    demands = q.order_by(BuyerDemand.created_at.desc()).all()
    result = []
    for d in demands:
        r = BuyerDemandResponse.model_validate(d)
        if d.buyer:
            r.buyer_username = d.buyer.username
        result.append(r)
    return result


@router.get("/mine", response_model=List[BuyerDemandResponse])
def list_my_demands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_buyer),
):
    """List demands posted by the authenticated buyer."""
    demands = (
        db.query(BuyerDemand)
        .filter(BuyerDemand.buyer_id == current_user.id)
        .order_by(BuyerDemand.created_at.desc())
        .all()
    )
    result = []
    for d in demands:
        r = BuyerDemandResponse.model_validate(d)
        r.buyer_username = current_user.username
        result.append(r)
    return result


@router.get("/{demand_id}", response_model=BuyerDemandResponse)
def get_buyer_demand(
    demand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    demand = db.get(BuyerDemand, demand_id)
    if not demand:
        raise HTTPException(status_code=404, detail="Buyer demand not found.")
    r = BuyerDemandResponse.model_validate(demand)
    if demand.buyer:
        r.buyer_username = demand.buyer.username
    return r


@router.delete("/{demand_id}")
def close_buyer_demand(
    demand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close/delete a buyer demand (owner only)."""
    demand = db.get(BuyerDemand, demand_id)
    if not demand:
        raise HTTPException(status_code=404, detail="Buyer demand not found.")
    if demand.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to close this demand.")
    demand.status = "CLOSED"
    db.commit()
    return {"status": "success", "message": f"Demand {demand_id} closed."}
