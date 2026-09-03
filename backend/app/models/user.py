from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from ..database.base import Base

class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    # role: "farmer" (default) or "buyer"
    role = Column(String, nullable=False, default="farmer", server_default="farmer")

    farms = relationship("Farm", back_populates="owner")
    buyer_demands = relationship("BuyerDemand", back_populates="buyer", foreign_keys="BuyerDemand.buyer_id")
    future_crop_lots = relationship("FutureCropLot", back_populates="farmer", foreign_keys="FutureCropLot.farmer_id")
    stock_lots = relationship("StockLot", back_populates="farmer", foreign_keys="StockLot.farmer_id")
    certificates = relationship("Certificate", back_populates="farmer", foreign_keys="Certificate.farmer_id")
    bids = relationship("Bid", back_populates="buyer", foreign_keys="Bid.buyer_id")
