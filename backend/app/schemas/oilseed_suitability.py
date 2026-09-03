from pydantic import BaseModel, Field
from typing import List, Optional

class OilseedCropOption(BaseModel):
    crop_id: int
    crop_name: str
    is_oilseed: bool = True
    water_requirement: str
    suitability_score: int
    profitability_score: int
    reasons: List[str] = Field(default_factory=list)

class NonOilseedCropOption(BaseModel):
    crop_id: int
    crop_name: str
    water_requirement: str
    suitability_score: int
    expected_yield: str

class OilseedSuitabilityResponse(BaseModel):
    farm_id: int
    farm_name: str
    current_crop: str
    land_area_acre: float
    soil_type: str
    water_availability: str
    district: str
    state: str
    can_oilseed_be_grown: bool
    suitability_status: str
    explanation: str
    unsuitable_reasons: List[str] = Field(default_factory=list)
    suitable_oilseed_crops: List[OilseedCropOption] = Field(default_factory=list)
    non_oilseed_alternatives: List[NonOilseedCropOption] = Field(default_factory=list)
