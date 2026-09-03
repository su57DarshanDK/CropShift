from pydantic import BaseModel, Field
from typing import List, Optional

class SeedVarietyDetail(BaseModel):
    id: int
    name: str
    variety_code: str
    crop_name: str
    expected_yield_per_acre: float
    yield_unit: str = "quintal"
    maturity_duration_days: int
    water_requirement: str
    suitable_soil_types: str
    disease_resistance: Optional[str] = None
    expected_price_per_unit: float
    production_cost_per_acre: float
    profit_per_acre: float
    suitability_score: int
    decision: str

class SeedCompareRequest(BaseModel):
    farm_id: int
    crop_name: str
    seed_id_1: int
    seed_id_2: int

class SeedCompareResponse(BaseModel):
    farm_id: int
    crop_name: str
    seed_1: SeedVarietyDetail
    seed_2: SeedVarietyDetail
    better_seed_id: int
    better_seed_name: str
    better_seed_code: str
    reasons: List[str] = Field(default_factory=list)
