from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class Coordinate(BaseModel):
    latitude: float
    longitude: float

class NearbyMarket(BaseModel):
    market_id: int
    market_name: str
    distance_km: float
    latitude: float
    longitude: float

class GeographicContext(BaseModel):
    district: Optional[str] = None
    state: Optional[str] = None
    agro_climatic_zone: Optional[str] = None
    markets_count: int

class GeospatialResponse(BaseModel):
    farm: Optional[Coordinate] = None
    nearby_markets: List[NearbyMarket]
    distance_information: Optional[str] = None
    geographic_context: GeographicContext

    model_config = ConfigDict(populate_by_name=True)
