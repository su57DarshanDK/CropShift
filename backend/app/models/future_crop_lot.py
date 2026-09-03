"""FutureCropLot model — a farmer's pre-sowing crop lot available for buyer interest."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class FutureCropLot(Base):
    __tablename__ = "future_crop_lot"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farm.id"), nullable=False, index=True)
    crop_name = Column(String, nullable=False)
    land_area_acre = Column(Float, nullable=True)
    expected_quantity_tonnes = Column(Float, nullable=True)
    expected_harvest_start = Column(String, nullable=True)  # e.g. "Nov 2026"
    expected_harvest_end = Column(String, nullable=True)    # e.g. "Dec 2026"
    expected_grade = Column(String, nullable=True)
    location = Column(String, nullable=True)
    state = Column(String, nullable=True)
    description = Column(String, nullable=True)
    certificate_id = Column(Integer, ForeignKey("certificate.id"), nullable=True)
    # OPEN / CLOSED / ACCEPTED
    status = Column(String, nullable=False, default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="future_crop_lots", foreign_keys=[farmer_id])
    farm = relationship("Farm")
    certificate = relationship("Certificate", foreign_keys=[certificate_id])
    auctions = relationship("Auction", back_populates="future_crop_lot",
                            primaryjoin="and_(Auction.lot_id == FutureCropLot.id, Auction.lot_type == 'FUTURE_CROP')",
                            foreign_keys="[Auction.lot_id]", overlaps="stock_lot_auctions")
