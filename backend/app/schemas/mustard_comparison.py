from pydantic import BaseModel, Field
from typing import List, Optional

class MustardVarietyResult(BaseModel):
    variety_id: int
    variety_name: str
    variety_code: str
    suitable_soil_types: str
    water_requirement: str
    maturity_duration_days: int
    suitability_score: int
    profitability_score: int
    market_score: int
    risk_score: int
    overall_score: int
    expected_yield_per_acre: float
    yield_unit: str = "quintal"
    expected_price_per_unit: float
    production_cost_per_acre: float
    profit_per_acre: float
    estimated_revenue: float
    estimated_cost: float
    estimated_net_profit: float
    decision: str
    disease_resistance: Optional[str] = None
    pest_risk: Optional[str] = None
    suitability_info: Optional[str] = None
    region_suitability: Optional[str] = None
    market_info: Optional[str] = None
    data_source: Optional[str] = None
    reasons: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)

class MustardComparisonResponse(BaseModel):
    farm_id: int
    farm_name: str
    current_crop: str
    land_area_acre: float
    soil_type: str
    water_availability: str
    district: str
    state: str
    best_mustard_variety: str
    comparison: List[MustardVarietyResult]
