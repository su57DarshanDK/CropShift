from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from app.database.base import Base

class MustardVariety(Base):
    __tablename__ = "mustard_varieties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    variety_code = Column(String(50), nullable=False, unique=True)
    crop_name = Column(String(50), nullable=False, default="Mustard")
    suitable_soil_types = Column(String(255), nullable=False)
    water_requirement = Column(String(50), nullable=False)  # Low, Medium, High
    maturity_duration_days = Column(Integer, nullable=False)
    expected_yield_per_acre = Column(Float, nullable=False)  # in Quintals per acre
    expected_price_per_unit = Column(Float, nullable=False)   # in ₹ per Quintal
    production_cost_per_acre = Column(Float, nullable=False)  # in ₹ per Acre
    disease_resistance = Column(String(255), nullable=True)
    pest_risk = Column(String(100), nullable=True)
    suitability_info = Column(Text, nullable=True)
    region_suitability = Column(String(255), nullable=False)
    market_info = Column(Text, nullable=True)
    data_source = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
