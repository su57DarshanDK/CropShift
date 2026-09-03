"""Auction model — pre-sowing or stock auction for a crop lot."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class Auction(Base):
    __tablename__ = "auction"

    id = Column(Integer, primary_key=True, index=True)
    # FUTURE_CROP or STOCK
    lot_type = Column(String, nullable=False)
    lot_id = Column(Integer, nullable=False, index=True)
    farmer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    # OPEN / CLOSED / ACCEPTED
    status = Column(String, nullable=False, default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", foreign_keys=[farmer_id])
    bids = relationship("Bid", back_populates="auction", cascade="all, delete-orphan")

    # Polymorphic lot relationships (resolved in service layer)
    future_crop_lot = relationship(
        "FutureCropLot",
        primaryjoin="and_(Auction.lot_id == foreign(FutureCropLot.id), Auction.lot_type == 'FUTURE_CROP')",
        viewonly=True,
        overlaps="stock_lot_auctions"
    )
    stock_lot = relationship(
        "StockLot",
        primaryjoin="and_(Auction.lot_id == foreign(StockLot.id), Auction.lot_type == 'STOCK')",
        viewonly=True,
        overlaps="future_crop_lot"
    )
