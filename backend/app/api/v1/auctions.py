"""auctions.py — Pre-sowing and stock auction + bid management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.auction import Auction
from app.models.bid import Bid
from app.models.future_crop_lot import FutureCropLot
from app.models.stock_lot import StockLot
from app.models.contact_sharing import ContactSharing
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AuctionCreate(BaseModel):
    lot_type: str  # "FUTURE_CROP" or "STOCK"
    lot_id: int


class BidCreate(BaseModel):
    bid_price_per_qtl: float
    quantity_tonnes: Optional[float] = None
    required_grade: Optional[str] = None
    quality_conditions: Optional[str] = None
    transport_cost_per_qtl: Optional[float] = 0.0
    additional_conditions: Optional[str] = None


class BidResponse(BaseModel):
    id: int
    auction_id: int
    buyer_id: int
    buyer_username: Optional[str] = None
    bid_price_per_qtl: float
    quantity_tonnes: Optional[float] = None
    required_grade: Optional[str] = None
    quality_conditions: Optional[str] = None
    transport_cost_per_qtl: Optional[float] = None
    additional_conditions: Optional[str] = None
    effective_price_per_qtl: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    # Contact sharing info (populated when bid is accepted)
    contact_sharing_status: Optional[str] = None
    contact_sharing_id: Optional[int] = None

    class Config:
        from_attributes = True


class AuctionResponse(BaseModel):
    id: int
    lot_type: str
    lot_id: int
    farmer_id: int
    status: str
    created_at: Optional[datetime] = None
    bids: List[BidResponse] = []

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_bid_response(bid: Bid, db: Session) -> BidResponse:
    buyer = db.get(User, bid.buyer_id)
    r = BidResponse.model_validate(bid)
    r.buyer_username = buyer.username if buyer else None
    r.effective_price_per_qtl = bid.effective_price_per_qtl
    # Attach contact sharing info if bid is accepted
    if bid.status == "ACCEPTED" and bid.contact_sharing:
        r.contact_sharing_status = bid.contact_sharing.status
        r.contact_sharing_id = bid.contact_sharing.id
    return r


# ── Auction endpoints ─────────────────────────────────────────────────────────

@router.post("", response_model=AuctionResponse)
def open_auction(
    payload: AuctionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Open an auction for a Future Crop Lot or Stock Lot (farmer only)."""
    if payload.lot_type == "FUTURE_CROP":
        lot = db.get(FutureCropLot, payload.lot_id)
        if not lot:
            raise HTTPException(status_code=404, detail="Future crop lot not found.")
        if lot.farmer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to auction this lot.")
    elif payload.lot_type == "STOCK":
        lot = db.get(StockLot, payload.lot_id)
        if not lot:
            raise HTTPException(status_code=404, detail="Stock lot not found.")
        if lot.farmer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to auction this lot.")
    else:
        raise HTTPException(status_code=422, detail="lot_type must be FUTURE_CROP or STOCK.")

    # Check for existing open auction on this lot
    existing = (
        db.query(Auction)
        .filter(Auction.lot_type == payload.lot_type, Auction.lot_id == payload.lot_id, Auction.status == "OPEN")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="An open auction already exists for this lot.")

    auction = Auction(
        lot_type=payload.lot_type,
        lot_id=payload.lot_id,
        farmer_id=current_user.id,
        status="OPEN",
    )
    db.add(auction)
    db.commit()
    db.refresh(auction)

    r = AuctionResponse.model_validate(auction)
    r.bids = []
    return r


@router.get("/mine", response_model=List[AuctionResponse])
def list_my_auctions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farmer's own auctions with their bids."""
    auctions = (
        db.query(Auction)
        .filter(Auction.farmer_id == current_user.id)
        .order_by(Auction.created_at.desc())
        .all()
    )
    result = []
    for auction in auctions:
        r = AuctionResponse.model_validate(auction)
        r.bids = [_build_bid_response(b, db) for b in auction.bids]
        result.append(r)
    return result


# ── IMPORTANT: Specific /bids/... routes MUST come before /{auction_id} ──────
# FastAPI matches routes top-to-bottom; if /{auction_id} is defined first,
# then GET /bids/mine would be captured with auction_id="bids" → 422 error.

@router.get("/bids/mine", response_model=List[BidResponse])
def list_my_bids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer views all bids they have placed."""
    bids = (
        db.query(Bid)
        .filter(Bid.buyer_id == current_user.id)
        .order_by(Bid.created_at.desc())
        .all()
    )
    return [_build_bid_response(b, db) for b in bids]


@router.get("/bids/{bid_id}", response_model=BidResponse)
def get_bid(
    bid_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single bid detail. Accessible to the bid's buyer or the auction's farmer."""
    bid = db.get(Bid, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found.")
    auction = db.get(Auction, bid.auction_id)
    if current_user.id not in (bid.buyer_id, auction.farmer_id if auction else None):
        raise HTTPException(status_code=403, detail="Not authorized to view this bid.")
    return _build_bid_response(bid, db)


@router.post("/bids/{bid_id}/accept")
def accept_bid(
    bid_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Farmer accepts an indicative bid.
    IMPORTANT: This represents buyer/seller interest and does NOT automatically
    create a legally binding purchase contract.
    """
    bid = db.get(Bid, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found.")

    auction = db.get(Auction, bid.auction_id)
    if auction.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this bid.")
    if auction.status != "OPEN":
        raise HTTPException(status_code=400, detail="This offer has already been accepted.")
    if bid.status != "PENDING":
        raise HTTPException(status_code=400, detail="This bid is not in PENDING status.")

    # Mark this bid as accepted, reject others
    for other_bid in auction.bids:
        if other_bid.id == bid_id:
            other_bid.status = "ACCEPTED"
        elif other_bid.status == "PENDING":
            other_bid.status = "REJECTED"

    # Close the auction
    auction.status = "ACCEPTED"

    # Create ContactSharing record (permissions default to False)
    existing_sharing = db.query(ContactSharing).filter(ContactSharing.bid_id == bid_id).first()
    if not existing_sharing:
        sharing = ContactSharing(
            bid_id=bid_id,
            farmer_id=current_user.id,
            buyer_id=bid.buyer_id,
            farmer_permission=False,
            buyer_permission=False,
            status="PENDING",
        )
        db.add(sharing)
    db.commit()

    buyer = db.get(User, bid.buyer_id)
    return {
        "status": "INDICATIVE_OFFER_ACCEPTED",
        "bid_id": bid_id,
        "buyer_id": bid.buyer_id,
        "buyer_username": buyer.username if buyer else None,
        "bid_price_per_qtl": bid.bid_price_per_qtl,
        "effective_price_per_qtl": bid.effective_price_per_qtl,
        "disclaimer": (
            "This acceptance represents buyer/seller interest and does not automatically "
            "create a legally binding purchase contract."
        ),
        "contact_sharing_status": "PENDING",
        "message": "Both parties may now manage contact sharing permissions.",
    }


# ── Auction endpoints with path param — MUST come after specific /bids/... ───

@router.get("/lots/{lot_type}/{lot_id}", response_model=Optional[AuctionResponse])
def get_auction_by_lot(
    lot_type: str,
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Look up the auction for a specific lot (used by buyers viewing a lot).
    lot_type: FUTURE_CROP or STOCK
    Returns None (empty) if no auction exists yet.
    """
    normalized = lot_type.upper().replace("-", "_")
    auction = (
        db.query(Auction)
        .filter(Auction.lot_type == normalized, Auction.lot_id == lot_id)
        .order_by(Auction.created_at.desc())
        .first()
    )
    if not auction:
        return None
    r = AuctionResponse.model_validate(auction)
    # Farmer sees all bids; buyer sees only their own bids
    if auction.farmer_id == current_user.id:
        r.bids = [_build_bid_response(b, db) for b in auction.bids]
    else:
        own_bids = [b for b in auction.bids if b.buyer_id == current_user.id]
        r.bids = [_build_bid_response(b, db) for b in own_bids]
    return r


@router.get("/{auction_id}", response_model=AuctionResponse)
def get_auction(
    auction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get auction detail. Bids visible to the lot's farmer or the bidding buyer."""
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found.")

    r = AuctionResponse.model_validate(auction)
    # Show bids only to farmer owner or any authenticated user (buyer needs to see their own bid)
    if auction.farmer_id == current_user.id:
        r.bids = [_build_bid_response(b, db) for b in auction.bids]
    else:
        # Buyer only sees their own bids
        own_bids = [b for b in auction.bids if b.buyer_id == current_user.id]
        r.bids = [_build_bid_response(b, db) for b in own_bids]
    return r


# ── Bid endpoints ─────────────────────────────────────────────────────────────

@router.post("/{auction_id}/bids", response_model=BidResponse)
def place_bid(
    auction_id: int,
    payload: BidCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer places a conditional indicative bid on an open auction."""
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found.")
    if auction.status != "OPEN":
        raise HTTPException(status_code=400, detail="This auction is closed.")
    if auction.farmer_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot bid on your own lot.")
    # Check duplicate bid
    existing_bid = (
        db.query(Bid)
        .filter(Bid.auction_id == auction_id, Bid.buyer_id == current_user.id)
        .first()
    )
    if existing_bid:
        raise HTTPException(status_code=400, detail="You have already placed a bid on this auction.")

    bid = Bid(
        auction_id=auction_id,
        buyer_id=current_user.id,
        bid_price_per_qtl=payload.bid_price_per_qtl,
        quantity_tonnes=payload.quantity_tonnes,
        required_grade=payload.required_grade,
        quality_conditions=payload.quality_conditions,
        transport_cost_per_qtl=payload.transport_cost_per_qtl or 0.0,
        additional_conditions=payload.additional_conditions,
        status="PENDING",
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)
    return _build_bid_response(bid, db)


@router.get("/{auction_id}/bids", response_model=List[BidResponse])
def list_bids(
    auction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all bids on an auction — farmer sees all, buyer sees own only."""
    auction = db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found.")
    if auction.farmer_id != current_user.id:
        # Buyers see only their own bids
        bids = [b for b in auction.bids if b.buyer_id == current_user.id]
    else:
        bids = auction.bids
    return [_build_bid_response(b, db) for b in bids]
