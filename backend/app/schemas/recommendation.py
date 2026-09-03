from pydantic import BaseModel
from typing import List

class RecommendationRequest(BaseModel):
    farm_id: int
    latitude: float | None = None
    longitude: float | None = None

class RecommendationResponse(BaseModel):
    recommended_crop: str
    suitability_score: int
    profitability_score: int
    market_score: int
    risk_score: int
    safety_score: int
    decision: str
    expected_profit: float
    current_crop_profit: float
    profit_difference: float
    reasons: List[str]
    risks: List[str]
