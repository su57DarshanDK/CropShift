"""Certificate model — quality certificates uploaded by farmers."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database.base import Base


class Certificate(Base):
    __tablename__ = "certificate"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    farm_id = Column(Integer, ForeignKey("farm.id"), nullable=True, index=True)
    crop = Column(String, nullable=False)
    grade = Column(String, nullable=True)
    issuing_organization = Column(String, nullable=True)
    issue_date = Column(String, nullable=True)  # stored as string for flexibility
    certificate_number = Column(String, nullable=True)
    file_path = Column(String, nullable=True)  # local path to uploaded file
    # PENDING / VERIFIED / REJECTED
    verification_status = Column(String, nullable=False, default="PENDING")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="certificates", foreign_keys=[farmer_id])
