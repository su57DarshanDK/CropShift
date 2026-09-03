"""BuyerDemand model — represents a buyer's purchase interest/requirement."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class BuyerDemand(Base):
    __tablename__ = "buyer_demand"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    crop_name = Column(String, nullable=False)
    quantity_tonnes = Column(Float, nullable=False)
    required_grade = Column(String, nullable=True)  # e.g. "Grade A", "Grade B"
    # Harvest period as text range e.g. "Nov-Dec 2026"
    harvest_period_start = Column(String, nullable=True)
    harvest_period_end = Column(String, nullable=True)
    preferred_location = Column(String, nullable=True)
    state = Column(String, nullable=True)
    min_price_per_qtl = Column(Float, nullable=True)
    max_price_per_qtl = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    # OPEN = actively seeking, CLOSED = fulfilled/cancelled
    status = Column(String, nullable=False, default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    buyer = relationship("User", back_populates="buyer_demands", foreign_keys=[buyer_id])
