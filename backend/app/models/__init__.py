"""Import all SQLAlchemy models so Base.metadata is fully populated."""
from .farmer import Farmer           # noqa: F401
from .crop import Crop, CropType     # noqa: F401
from .farm import Farm               # noqa: F401
from .crop_economics import CropEconomics   # noqa: F401
from .crop_suitability import CropSuitability  # noqa: F401
from .market import Market           # noqa: F401
from .market_price import MarketPrice        # noqa: F401
from .subsidy import Subsidy         # noqa: F401
from .recommendation import Recommendation   # noqa: F401
from .risk_scenario import RiskScenario, RiskCode  # noqa: F401
from .user import User  # noqa: F401
from .mustard_variety import MustardVariety  # noqa: F401
# Market platform models
from .buyer_demand import BuyerDemand  # noqa: F401
from .certificate import Certificate  # noqa: F401
from .future_crop_lot import FutureCropLot  # noqa: F401
from .stock_lot import StockLot  # noqa: F401
from .auction import Auction  # noqa: F401
from .bid import Bid  # noqa: F401
from .contact_sharing import ContactSharing  # noqa: F401

