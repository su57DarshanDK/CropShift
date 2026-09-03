"""ContactSharing model — mutual permission to share contact info after indicative acceptance."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class ContactSharing(Base):
    __tablename__ = "contact_sharing"

    id = Column(Integer, primary_key=True, index=True)
    bid_id = Column(Integer, ForeignKey("bid.id"), nullable=False, unique=True, index=True)
    farmer_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    farmer_permission = Column(Boolean, nullable=False, default=False)
    buyer_permission = Column(Boolean, nullable=False, default=False)
    # PENDING / MUTUAL_APPROVAL / DECLINED / SHARED
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bid = relationship("Bid", back_populates="contact_sharing")
    farmer = relationship("User", foreign_keys=[farmer_id])
    buyer = relationship("User", foreign_keys=[buyer_id])
