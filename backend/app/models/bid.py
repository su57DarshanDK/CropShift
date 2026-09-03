"""Bid model — a conditional bid placed by a buyer in an auction."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class Bid(Base):
    __tablename__ = "bid"

    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey("auction.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    bid_price_per_qtl = Column(Float, nullable=False)
    quantity_tonnes = Column(Float, nullable=True)
    required_grade = Column(String, nullable=True)
    # Conditional pricing: "If Grade A -> ₹6200, If Grade B -> ₹5900"
    quality_conditions = Column(String, nullable=True)
    transport_cost_per_qtl = Column(Float, nullable=True, default=0.0)
    additional_conditions = Column(String, nullable=True)
    # PENDING / ACCEPTED / REJECTED
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    auction = relationship("Auction", back_populates="bids")
    buyer = relationship("User", back_populates="bids", foreign_keys=[buyer_id])
    contact_sharing = relationship("ContactSharing", back_populates="bid", uselist=False)

    @property
    def effective_price_per_qtl(self) -> float:
        """Calculate effective offer = bid_price - transport_cost."""
        return self.bid_price_per_qtl - (self.transport_cost_per_qtl or 0.0)
