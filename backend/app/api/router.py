from fastapi import APIRouter
from app.api.v1 import (
    health,
    recommendations,
    profitability,
    markets,
    subsidies,
    geospatial,
    risk,
    ivr,
    auth,
    farms,
    mustard_comparison,
    buyer_demands,
    future_lots,
    stock_lots,
    certificates,
    auctions,
    contact_sharing,
    marketplace,
    seeds,
)

api_router = APIRouter()

# Include v1 routers
api_router.include_router(health.router)
api_router.include_router(farms.router, prefix="/farms", tags=["Farms"])
api_router.include_router(seeds.router)
api_router.include_router(mustard_comparison.router, prefix="/farms", tags=["Mustard Seed Comparison"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(profitability.router, prefix="/profitability", tags=["Profitability"])
api_router.include_router(markets.router, prefix="/markets", tags=["Markets"])
api_router.include_router(subsidies.router, prefix="/subsidies", tags=["Subsidies"])
api_router.include_router(geospatial.router, prefix="/geospatial", tags=["Geospatial"])
api_router.include_router(risk.router, prefix="/risk-simulation", tags=["Risk Simulation"])
api_router.include_router(ivr.router, prefix="/ivr", tags=["IVR"])
api_router.include_router(auth.router)
# Market platform routers
api_router.include_router(buyer_demands.router, prefix="/buyer-demands", tags=["Buyer Demands"])
api_router.include_router(future_lots.router, prefix="/future-lots", tags=["Future Crop Lots"])
api_router.include_router(stock_lots.router, prefix="/stock-lots", tags=["Stock Lots"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["Certificates"])
api_router.include_router(auctions.router, prefix="/auctions", tags=["Auctions"])
api_router.include_router(contact_sharing.router, prefix="/contact-sharing", tags=["Contact Sharing"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["Marketplace"])

