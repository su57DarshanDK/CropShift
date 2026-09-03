"""StockLot model — actual harvested stock available for sale."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class StockLot(Base):
    __tablename__ = "stock_lot"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farm.id"), nullable=True, index=True)
    crop_name = Column(String, nullable=False)
    quantity_tonnes = Column(Float, nullable=False)
    actual_grade = Column(String, nullable=True)
    location = Column(String, nullable=True)
    state = Column(String, nullable=True)
    harvest_date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    certificate_id = Column(Integer, ForeignKey("certificate.id"), nullable=True)
    # AVAILABLE / SOLD / CLOSED
    status = Column(String, nullable=False, default="AVAILABLE")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="stock_lots", foreign_keys=[farmer_id])
    farm = relationship("Farm")
    certificate = relationship("Certificate", foreign_keys=[certificate_id])
