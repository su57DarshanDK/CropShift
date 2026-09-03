from pydantic import BaseModel, field_validator
from typing import Optional, Union, Any

class FarmBase(BaseModel):
    farm_name: Optional[str] = None
    land_area_acre: float
    water_availability: Union[bool, str, Any]
    soil_type: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    current_crop: Optional[str] = None  # We accept string from frontend, will map to crop_id in backend
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("water_availability", mode="before")
    @classmethod
    def parse_water_availability(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("available", "high", "good", "adequate", "irrigated", "true", "yes", "1"):
                return True
            if clean in ("limited", "low", "poor", "scarce", "rainfed", "false", "no", "0"):
                return False
        return bool(v)

class FarmCreate(FarmBase):
    pass

class FarmUpdate(FarmBase):
    land_area_acre: Optional[float] = None
    water_availability: Optional[Union[bool, str, Any]] = None

    @field_validator("water_availability", mode="before")
    @classmethod
    def parse_water_availability_update(cls, v: Any) -> Optional[bool]:
        if v is None:
            return None
        return FarmBase.parse_water_availability(v)

class FarmResponse(BaseModel):
    id: int
    farmer_id: int
    land_area_acre: float
    water_availability: bool
    soil_type: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    current_crop_id: Optional[int] = None
    owner_id: Optional[int] = None

    class Config:
        orm_mode = True
        from_attributes = True
