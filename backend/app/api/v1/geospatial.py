from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.geospatial.service import (
    get_farm_location,
    get_nearby_markets,
    get_geographic_context
)
from app.models.user import User
from app.models.farm import Farm
from app.api.v1.auth import get_current_user
from app.schemas.geospatial import GeospatialResponse, Coordinate, GeographicContext, NearbyMarket

router = APIRouter()

@router.get("/{farm_id}", response_model=GeospatialResponse)
def get_geospatial(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    if farm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this farm.")

    loc = get_farm_location(db, farm_id)
    farm_coord = Coordinate(**loc) if loc else None

    # Get nearby markets
    markets_res = get_nearby_markets(db, farm_id, radius_km=100.0)
    markets_list = [NearbyMarket(**m) for m in markets_res["markets"]]
    
    # Explanatory note or summary string for distance information
    dist_info = markets_res["note"]
    if not dist_info and markets_list:
        nearest = markets_list[0]
        dist_info = f"Nearest market is {nearest.market_name} at {nearest.distance_km:.1f} km."

    # Get geographic context
    ctx = get_geographic_context(db, farm_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Geographic context not found for this farm.")

    geo_ctx = GeographicContext(
        district=ctx["district"],
        state=ctx["state"],
        agro_climatic_zone=ctx["agro_climatic_zone"],
        markets_count=ctx["nearby_market_count"]
    )

    return GeospatialResponse(
        farm=farm_coord,
        nearby_markets=markets_list,
        distance_information=dist_info,
        geographic_context=geo_ctx
    )
