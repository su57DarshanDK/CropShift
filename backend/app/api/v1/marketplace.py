"""marketplace.py — Combined marketplace: demand board + lot aggregation."""
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.buyer_demand import BuyerDemand
from app.models.future_crop_lot import FutureCropLot
from app.models.stock_lot import StockLot
from app.models.farm import Farm
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


class DemandWithMatch(BaseModel):
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
    # Match score for the authenticated farmer (0-100)
    match_score: Optional[int] = None
    match_reasons: List[str] = []

    class Config:
        from_attributes = True


def _calculate_match_score(demand: BuyerDemand, farmer_farms: list) -> tuple[int, list]:
    """
    Simple heuristic match score between a buyer demand and farmer's farms.
    Returns (score: int, reasons: list[str])
    """
    score = 0
    reasons = []

    for farm in farmer_farms:
        # State match
        if demand.state and farm.state:
            if demand.state.lower() == farm.state.lower():
                score += 40
                reasons.append(f"Your farm in {farm.state} matches buyer's state preference")

        # Location match (district)
        if demand.preferred_location and farm.district:
            if demand.preferred_location.lower() in farm.district.lower():
                score += 20
                reasons.append(f"Your district ({farm.district}) matches buyer's location")

        # Crop match (from farm's current crop name if available)
        try:
            if farm.current_crop and demand.crop_name:
                current_crop_name = farm.current_crop.name if hasattr(farm.current_crop, "name") else str(farm.current_crop)
                if demand.crop_name.lower() == current_crop_name.lower():
                    score += 30
                    reasons.append(f"Crop match: {demand.crop_name}")
        except Exception:
            pass  # Skip crop match if relationship not loaded

        # Price incentive
        if demand.max_price_per_qtl:
            score += 10
            reasons.append(f"Buyer offers up to ₹{demand.max_price_per_qtl:,.0f}/qtl")

    return min(score, 100), reasons


@router.get("/demands", response_model=List[DemandWithMatch])
def get_marketplace_demands(
    crop: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Demand board: shows all OPEN buyer demands.
    For farmers, each demand shows a match score against their farms.
    """
    q = db.query(BuyerDemand).filter(BuyerDemand.status == "OPEN")
    if crop:
        q = q.filter(BuyerDemand.crop_name.ilike(f"%{crop}%"))
    if state:
        q = q.filter(BuyerDemand.state.ilike(f"%{state}%"))
    demands = q.order_by(BuyerDemand.created_at.desc()).all()

    # Get farmer's farms for matching
    farmer_farms = (
        db.query(Farm)
        .filter(Farm.owner_id == current_user.id)
        .all()
    )

    result = []
    for d in demands:
        r = DemandWithMatch.model_validate(d)
        if d.buyer:
            r.buyer_username = d.buyer.username
        if farmer_farms:
            score, reasons = _calculate_match_score(d, farmer_farms)
            r.match_score = score
            r.match_reasons = reasons
        result.append(r)

    # Sort by match score descending
    result.sort(key=lambda x: (x.match_score or 0), reverse=True)
    return result


class MarketplaceLot(BaseModel):
    lot_type: str  # "FUTURE" or "STOCK"
    id: int
    farmer_username: Optional[str] = None
    crop_name: str
    quantity: Optional[float] = None
    quantity_unit: str = "tonnes"
    grade: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    harvest_period: Optional[str] = None
    status: str
    has_certificate: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/lots", response_model=List[MarketplaceLot])
def get_marketplace_lots(
    crop: Optional[str] = None,
    state: Optional[str] = None,
    lot_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Combined marketplace: future crop lots + stock lots."""
    result = []

    # Future lots
    if not lot_type or lot_type == "FUTURE":
        fq = db.query(FutureCropLot).filter(FutureCropLot.status == "OPEN")
        if crop:
            fq = fq.filter(FutureCropLot.crop_name.ilike(f"%{crop}%"))
        if state:
            fq = fq.filter(FutureCropLot.state.ilike(f"%{state}%"))
        for lot in fq.all():
            harvest = None
            if lot.expected_harvest_start and lot.expected_harvest_end:
                harvest = f"{lot.expected_harvest_start} – {lot.expected_harvest_end}"
            elif lot.expected_harvest_start:
                harvest = lot.expected_harvest_start
            result.append(MarketplaceLot(
                lot_type="FUTURE",
                id=lot.id,
                farmer_username=lot.farmer.username if lot.farmer else None,
                crop_name=lot.crop_name,
                quantity=lot.expected_quantity_tonnes,
                grade=lot.expected_grade,
                location=lot.location,
                state=lot.state,
                harvest_period=harvest,
                status=lot.status,
                has_certificate=lot.certificate_id is not None,
                created_at=lot.created_at,
            ))

    # Stock lots
    if not lot_type or lot_type == "STOCK":
        sq = db.query(StockLot).filter(StockLot.status == "AVAILABLE")
        if crop:
            sq = sq.filter(StockLot.crop_name.ilike(f"%{crop}%"))
        if state:
            sq = sq.filter(StockLot.state.ilike(f"%{state}%"))
        for lot in sq.all():
            result.append(MarketplaceLot(
                lot_type="STOCK",
                id=lot.id,
                farmer_username=lot.farmer.username if lot.farmer else None,
                crop_name=lot.crop_name,
                quantity=lot.quantity_tonnes,
                grade=lot.actual_grade,
                location=lot.location,
                state=lot.state,
                harvest_period=lot.harvest_date,
                status=lot.status,
                has_certificate=lot.certificate_id is not None,
                created_at=lot.created_at,
            ))

    # Sort by created_at desc
    result.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
    return result
