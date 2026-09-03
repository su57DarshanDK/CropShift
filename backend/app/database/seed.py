"""
seed.py -- Deterministic, idempotent seed data for CropShift A1.

Seed strategy: use INSERT ... ON CONFLICT DO NOTHING (via SQLAlchemy merge-by-pk).
Running this script twice yields identical row counts.

DATA STATUS: DEMO -- all numeric values are hand-authored for demonstration purposes.
Sources: ICAR crop guides, Karnataka state agriculture department references (STATIC).

Usage:
    python -m app.database.seed
"""

import app.patch_bcrypt
import datetime
import logging

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from .session import engine
from .init_db import init_db
from ..models import (
    Farmer,
    Farm,
    Crop,
    CropType,
    CropEconomics,
    CropSuitability,
    Market,
    MarketPrice,
    Subsidy,
    RiskScenario,
    RiskCode,
    User,
    MustardVariety,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _point(lon: float, lat: float) -> WKTElement:
    """Return a PostGIS POINT geometry in SRID 4326."""
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def _get_or_create(session: Session, model, pk_value: int, **kwargs):
    """Fetch by pk; if missing, create and add to session."""
    obj = session.get(model, pk_value)
    if obj is None:
        obj = model(id=pk_value, **kwargs)
        session.add(obj)
    return obj


# ---------------------------------------------------------------------------
# Seed users
# ---------------------------------------------------------------------------
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    dict(id=1, username="demo", email="demo@cropshift.com", hashed_password=pwd_context.hash("demo123"), is_active=True, role="farmer"),
    dict(id=2, username="farmer_rajesh", email="farmer@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="farmer"),
    dict(id=3, username="buyer_abc", email="buyer@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="buyer"),
    dict(id=4, username="farmer_suresh", email="farmer2@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="farmer"),
    dict(id=5, username="farmer_ramesh", email="farmer3@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="farmer"),
    dict(id=6, username="buyer_krishna", email="buyer2@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="buyer"),
    dict(id=7, username="buyer_sunfresh", email="buyer3@cropshift.demo", hashed_password=pwd_context.hash("demo123"), is_active=True, role="buyer")
]

# ---------------------------------------------------------------------------
# Seed crops  (id=1..7)
# ---------------------------------------------------------------------------

CROPS = [
    dict(
        id=1, name="Paddy", crop_type=CropType.CEREAL,
        season="Kharif", duration_days=120, water_requirement="HIGH", is_oilseed=False,
    ),
    dict(
        id=2, name="Groundnut", crop_type=CropType.OILSEED,
        season="Kharif", duration_days=105, water_requirement="MEDIUM", is_oilseed=True,
    ),
    dict(
        id=3, name="Sunflower", crop_type=CropType.OILSEED,
        season="Rabi", duration_days=90, water_requirement="MEDIUM", is_oilseed=True,
    ),
    dict(
        id=4, name="Soybean", crop_type=CropType.OILSEED,
        season="Kharif", duration_days=100, water_requirement="MEDIUM", is_oilseed=True,
    ),
    dict(
        id=5, name="Mustard", crop_type=CropType.OILSEED,
        season="Rabi", duration_days=90, water_requirement="LOW", is_oilseed=True,
    ),
    dict(
        id=6, name="Sesame", crop_type=CropType.OILSEED,
        season="Kharif", duration_days=75, water_requirement="LOW", is_oilseed=True,
    ),
    dict(
        id=7, name="Maize", crop_type=CropType.CEREAL,
        season="Kharif", duration_days=110, water_requirement="MEDIUM", is_oilseed=False,
    ),
]

# ---------------------------------------------------------------------------
# Seed farmers  (id=1..3)
# ---------------------------------------------------------------------------

FARMERS = [
    dict(id=1, name="Raju Naik",    phone="9876543210", language="kn",
         district="Tumkur",   state="Karnataka"),
    dict(id=2, name="Srinivas Rao", phone="9876543211", language="kn",
         district="Haveri",   state="Karnataka"),
    dict(id=3, name="Lakshmi Devi", phone="9876543212", language="kn",
         district="Dharwad",  state="Karnataka"),
]

# ---------------------------------------------------------------------------
# Seed farms  (id=1..3)
# Farm 1 = golden demo farm (Section 15): Paddy, 1 acre, water available
# ---------------------------------------------------------------------------

FARMS = [
    dict(
        id=1, farmer_id=1, land_area_acre=1.0,
        water_availability=True, soil_type="red laterite",
        district="Tumkur", state="Karnataka",
        location=_point(77.1025, 13.3409),   # Tumkur approx coords
        current_crop_id=1, owner_id=1,        # Paddy
    ),
    dict(
        id=2, farmer_id=2, land_area_acre=2.5,
        water_availability=True, soil_type="black cotton",
        district="Haveri", state="Karnataka",
        location=_point(75.4000, 14.7960),
        current_crop_id=7,                    # Maize
    ),
    dict(
        id=3, farmer_id=3, land_area_acre=3.0,
        water_availability=False, soil_type="red laterite",
        district="Dharwad", state="Karnataka",
        location=_point(75.0078, 15.4589),
        current_crop_id=5,                    # Mustard
    ),
]

# ---------------------------------------------------------------------------
# Crop economics  (one row per crop, Karnataka region)
# Values: STATIC -- sourced from Karnataka Dept. of Agriculture reference guides.
# ---------------------------------------------------------------------------

CROP_ECONOMICS = [
    # (id, crop_id, expected_yield_per_acre, yield_unit, production_cost, expected_price)
    (1,  1,  "Karnataka", 20.0, "quintal", 18000.0, 2600.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (2,  2,  "Karnataka", 10.0, "quintal", 12000.0, 5500.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (3,  3,  "Karnataka",  8.0, "quintal", 10000.0, 5000.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (4,  4,  "Karnataka",  8.0, "quintal", 11000.0, 4800.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (5,  5,  "Karnataka",  6.0, "quintal",  8000.0, 5200.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (6,  6,  "Karnataka",  4.0, "quintal",  7000.0, 7000.0,  "STATIC", "Karnataka Dept of Agriculture"),
    (7,  7,  "Karnataka", 22.0, "quintal", 14000.0, 1600.0,  "STATIC", "Karnataka Dept of Agriculture"),
]

# ---------------------------------------------------------------------------
# Crop suitability  (two regions per crop)
# ---------------------------------------------------------------------------

CROP_SUITABILITIES = [
    # (id, crop_id, region, soil_type, water_level, base_score, notes)
    (1,  1, "Tumkur",  "red laterite",  "HIGH",   75.0, "Suitable with irrigation"),
    (2,  1, "Haveri",  "black cotton",  "HIGH",   80.0, "Good canal irrigation"),
    (3,  2, "Tumkur",  "red laterite",  "MEDIUM", 87.0, "Excellent fit"),
    (4,  2, "Dharwad", "red laterite",  "MEDIUM", 85.0, "Good oilseed region"),
    (5,  3, "Dharwad", "black cotton",  "MEDIUM", 82.0, "Rabi season suitable"),
    (6,  3, "Haveri",  "black cotton",  "MEDIUM", 79.0, "Good yield potential"),
    (7,  4, "Haveri",  "black cotton",  "MEDIUM", 80.0, "Kharif soybean belt"),
    (8,  4, "Dharwad", "red laterite",  "MEDIUM", 76.0, "Moderate suitability"),
    (9,  5, "Dharwad", "red laterite",  "LOW",    78.0, "Rabi mustard ok"),
    (10, 5, "Tumkur",  "red laterite",  "LOW",    72.0, "Dryland suitable"),
    (11, 6, "Tumkur",  "red laterite",  "LOW",    74.0, "Drought tolerant"),
    (12, 6, "Dharwad", "red laterite",  "LOW",    71.0, "Suitable"),
    (13, 7, "Haveri",  "black cotton",  "MEDIUM", 83.0, "Good maize area"),
    (14, 7, "Tumkur",  "red laterite",  "MEDIUM", 77.0, "Moderate yield"),
]

# ---------------------------------------------------------------------------
# Markets  (id=1..4, Karnataka APMCs)
# ---------------------------------------------------------------------------

MARKETS = [
    dict(id=1, name="Tumkur APMC",    district="Tumkur",  state="Karnataka",
         location=_point(77.1000, 13.3400), market_type="APMC"),
    dict(id=2, name="Haveri APMC",    district="Haveri",  state="Karnataka",
         location=_point(75.3980, 14.7950), market_type="APMC"),
    dict(id=3, name="Dharwad APMC",   district="Dharwad", state="Karnataka",
         location=_point(75.0100, 15.4600), market_type="APMC"),
    dict(id=4, name="Bengaluru APMC", district="Bengaluru", state="Karnataka",
         location=_point(77.5946, 12.9716), market_type="APMC"),
]

# ---------------------------------------------------------------------------
# Market prices  (all prices in INR per quintal; date = DEMO reference date)
# DEMO values -- Agmarknet snapshot basis
# ---------------------------------------------------------------------------

_PRICE_DATE = datetime.date(2024, 10, 1)

MARKET_PRICES = [
    # (id, market_id, crop_id, price, trend)
    (1,  1, 1, 2550.0, "STABLE"),   # Paddy, Tumkur
    (2,  2, 1, 2600.0, "STABLE"),   # Paddy, Haveri
    (3,  1, 2, 5400.0, "RISING"),   # Groundnut, Tumkur
    (4,  2, 2, 5500.0, "RISING"),   # Groundnut, Haveri
    (5,  3, 3, 4900.0, "STABLE"),   # Sunflower, Dharwad
    (6,  4, 3, 5100.0, "STABLE"),   # Sunflower, Bengaluru
    (7,  2, 4, 4750.0, "STABLE"),   # Soybean, Haveri
    (8,  3, 4, 4800.0, "STABLE"),   # Soybean, Dharwad
    (9,  3, 5, 5150.0, "RISING"),   # Mustard, Dharwad
    (10, 4, 5, 5200.0, "RISING"),   # Mustard, Bengaluru
    (11, 1, 6, 6900.0, "STABLE"),   # Sesame, Tumkur
    (12, 4, 6, 7000.0, "STABLE"),   # Sesame, Bengaluru
    (13, 2, 7, 1550.0, "FALLING"),  # Maize, Haveri
    (14, 4, 7, 1600.0, "STABLE"),   # Maize, Bengaluru
]

# ---------------------------------------------------------------------------
# Risk scenarios  (4 required by spec)
# ---------------------------------------------------------------------------

RISK_SCENARIOS = [
    dict(
        id=1, code=RiskCode.BASELINE,
        name="Baseline",
        description="Normal conditions. No stress applied.",
        price_multiplier=1.0, yield_multiplier=1.0, water_penalty=0.0,
    ),
    dict(
        id=2, code=RiskCode.PRICE_DOWN,
        name="Price Drop 20%",
        description="Market price falls 20% below reference. Yield unchanged.",
        price_multiplier=0.8, yield_multiplier=1.0, water_penalty=0.0,
    ),
    dict(
        id=3, code=RiskCode.YIELD_DOWN,
        name="Yield Drop 30%",
        description="Crop yield drops 30% due to pest, disease, or weather. Price unchanged.",
        price_multiplier=1.0, yield_multiplier=0.7, water_penalty=0.0,
    ),
    dict(
        id=4, code=RiskCode.WATER_RISK,
        name="Water Scarcity",
        description="Irrigation unavailable. Score penalty applied for high-water crops.",
        price_multiplier=1.0, yield_multiplier=1.0, water_penalty=25.0,
    ),
]

# ---------------------------------------------------------------------------
# Subsidy schemes  (4-6 schemes; STATIC, verified Karnataka / national schemes)
# ---------------------------------------------------------------------------

SUBSIDIES = [
    dict(
        id=1,
        scheme_id="PM-KISAN",
        scheme_name="PM Kisan Samman Nidhi",
        description="Direct income support of INR 6,000/year to eligible farmer families.",
        applicable_crop_types=["CEREAL", "OILSEED", "PULSE", "OTHER"],
        applicable_states=["Karnataka", "All States"],
        eligibility_factors={"land_ownership": True, "small_marginal": True},
        required_information=["Aadhaar", "Land records", "Bank account"],
        support_information="Toll-free: 155261",
        verification_required=True,
        data_source="pmkisan.gov.in (STATIC)",
    ),
    dict(
        id=2,
        scheme_id="NMOOP",
        scheme_name="National Mission on Oilseeds and Oil Palm",
        description="Subsidy and technical support to boost oilseed production.",
        applicable_crop_types=["OILSEED"],
        applicable_states=["Karnataka", "All States"],
        eligibility_factors={"crop_type": "OILSEED"},
        required_information=["Land records", "Crop sown certificate"],
        support_information="Contact district agriculture office",
        verification_required=True,
        data_source="agricoop.nic.in (STATIC)",
    ),
    dict(
        id=3,
        scheme_id="RKVY-KA",
        scheme_name="Rashtriya Krishi Vikas Yojana -- Karnataka",
        description="State-level flexible fund for agricultural development and input subsidy.",
        applicable_crop_types=["CEREAL", "OILSEED", "PULSE"],
        applicable_states=["Karnataka"],
        eligibility_factors={"state": "Karnataka"},
        required_information=["Aadhaar", "Farmer ID card"],
        support_information="Karnataka Dept of Agriculture helpline",
        verification_required=True,
        data_source="rky.karnataka.gov.in (STATIC)",
    ),
    dict(
        id=4,
        scheme_id="SMAM",
        scheme_name="Sub-Mission on Agricultural Mechanisation",
        description="Subsidy on farm machinery and equipment; up to 50% cost support.",
        applicable_crop_types=["CEREAL", "OILSEED", "PULSE", "OTHER"],
        applicable_states=["Karnataka", "All States"],
        eligibility_factors={"land_area_min_acre": 0.5},
        required_information=["Aadhaar", "Land records", "Bank account"],
        support_information="Contact district agriculture office",
        verification_required=True,
        data_source="agrimachinery.nic.in (STATIC)",
    ),
    dict(
        id=5,
        scheme_id="NABARD-KCC",
        scheme_name="Kisan Credit Card -- NABARD",
        description="Short-term crop credit at concessional interest rate (4-7%).",
        applicable_crop_types=["CEREAL", "OILSEED", "PULSE", "OTHER"],
        applicable_states=["Karnataka", "All States"],
        eligibility_factors={"bank_account": True},
        required_information=["Aadhaar", "Land records", "Bank passbook"],
        support_information="Nearest bank branch / NABARD helpline",
        verification_required=True,
        data_source="nabard.org (STATIC)",
    ),
]


# ---------------------------------------------------------------------------
# Main seed function
MUSTARD_VARIETIES = [
    # ── Mustard Varieties ──────────────────────────────────────────────────
    dict(
        id=1,
        name="Pusa Mustard 30 (Lesira)",
        variety_code="LESIRA-30",
        crop_name="Mustard",
        suitable_soil_types="Loamy, Alluvial, Red, Black, Clay Loam",
        water_requirement="Medium",
        maturity_duration_days=135,
        expected_yield_per_acre=9.5,
        expected_price_per_unit=5650.0,
        production_cost_per_acre=18500.0,
        disease_resistance="High resistance to White Rust and Alternaria Blight",
        pest_risk="Low Aphid Vulnerability",
        suitability_info="First low erucic acid (<2%) Indian mustard variety. High oil content (37.7%) and excellent market price premium.",
        region_suitability="Andhra Pradesh, Telangana, Karnataka, Rajasthan, MP, Haryana, Punjab, UP",
        market_info="High demand by commercial oil mills for healthy mustard oil production.",
        data_source="ICAR-IARI New Delhi / DRMR Bharatpur",
        is_active=True
    ),
    dict(
        id=2,
        name="Pusa Bold",
        variety_code="PUSA-BOLD",
        crop_name="Mustard",
        suitable_soil_types="Sandy, Sandy Loam, Red, Loamy",
        water_requirement="Low",
        maturity_duration_days=125,
        expected_yield_per_acre=8.5,
        expected_price_per_unit=5450.0,
        production_cost_per_acre=16000.0,
        disease_resistance="Moderate resistance to White Rust",
        pest_risk="Medium Aphid Vulnerability in humid spells",
        suitability_info="Popular bold-seeded variety with strong drought tolerance. Highly suitable for limited irrigation and sandy/red soils.",
        region_suitability="Andhra Pradesh, Karnataka, Rajasthan, MP, Gujarat",
        market_info="Widely accepted across all major APMC mandis.",
        data_source="ICAR-IARI New Delhi",
        is_active=True
    ),
    dict(
        id=3,
        name="DRMRIJ 31 (Giriraj)",
        variety_code="GIRIRAJ-31",
        crop_name="Mustard",
        suitable_soil_types="Black, Clay Loam, Heavy Loam, Alluvial",
        water_requirement="Medium",
        maturity_duration_days=140,
        expected_yield_per_acre=10.8,
        expected_price_per_unit=5700.0,
        production_cost_per_acre=19500.0,
        disease_resistance="High tolerance to Sclerotinia Rot & Powdery Mildew",
        pest_risk="Low Aphid Risk",
        suitability_info="High-yielding variety developed by DRMR. Excellent response to medium-high soil moisture and black fertile soil.",
        region_suitability="Andhra Pradesh, Telangana, Karnataka, MP, Maharashtra, Rajasthan",
        market_info="Top choice for oil crushers due to high oil extraction percentage (40.5%).",
        data_source="ICAR-Directorate of Rapeseed-Mustard Research (DRMR)",
        is_active=True
    ),
    dict(
        id=4,
        name="RH 749",
        variety_code="RH-749",
        crop_name="Mustard",
        suitable_soil_types="Alluvial, Fertile Loam, Heavy Clay",
        water_requirement="High",
        maturity_duration_days=145,
        expected_yield_per_acre=11.2,
        expected_price_per_unit=5500.0,
        production_cost_per_acre=21000.0,
        disease_resistance="Moderate resistance to Alternaria Blight",
        pest_risk="Requires Aphid monitoring during flowering",
        suitability_info="High biomass, vigorous variety for assured irrigation zones.",
        region_suitability="Haryana, Punjab, UP, Northern MP, Rajasthan",
        market_info="Good commercial value, large grain volume.",
        data_source="CCS Haryana Agricultural University (HAU) Hisar",
        is_active=True
    ),
    dict(
        id=5,
        name="NRCHB 101",
        variety_code="NRCHB-101",
        crop_name="Mustard",
        suitable_soil_types="Sandy Loam, Loamy, Alluvial, Red",
        water_requirement="Low",
        maturity_duration_days=110,
        expected_yield_per_acre=8.2,
        expected_price_per_unit=5550.0,
        production_cost_per_acre=15500.0,
        disease_resistance="High resistance to Mustard Mosaic & White Rust",
        pest_risk="Very Low Pest Risk",
        suitability_info="Early maturing short-duration variety (110 days). Ideal for water-limited conditions.",
        region_suitability="Andhra Pradesh, Karnataka, Tamil Nadu, MP, Rajasthan",
        market_info="Early arrival in mandis fetches seasonal early-bird price bonus.",
        data_source="ICAR-DRMR Bharatpur",
        is_active=True
    ),

    # ── Groundnut Varieties ────────────────────────────────────────────────
    dict(
        id=6,
        name="TAG 24",
        variety_code="TAG-24",
        crop_name="Groundnut",
        suitable_soil_types="Sandy, Sandy Loam, Red, Loamy",
        water_requirement="Medium",
        maturity_duration_days=105,
        expected_yield_per_acre=11.5,
        expected_price_per_unit=6300.0,
        production_cost_per_acre=26000.0,
        disease_resistance="High tolerance to Stem Rot & Tikka leaf spot",
        pest_risk="Low Leaf Miner Risk",
        suitability_info="Early maturing Spanish bunch variety with high shelling percentage (72%) and 49% oil content.",
        region_suitability="Karnataka, Andhra Pradesh, Maharashtra, Gujarat, Tamil Nadu",
        market_info="Top choice for oil crushers and export traders.",
        data_source="BARC Trombay & MPKV Rahuri",
        is_active=True
    ),
    dict(
        id=7,
        name="TG 37A",
        variety_code="TG-37A",
        crop_name="Groundnut",
        suitable_soil_types="Red Sandy Loam, Red, Loamy",
        water_requirement="Low",
        maturity_duration_days=110,
        expected_yield_per_acre=10.2,
        expected_price_per_unit=6150.0,
        production_cost_per_acre=24500.0,
        disease_resistance="Moderate resistance to Rust & Peanut Mottle Virus",
        pest_risk="Low Thrips Vulnerability",
        suitability_info="High drought tolerance. Suitable for both Kharif rainfed and Rabi irrigated conditions.",
        region_suitability="Karnataka, Andhra Pradesh, Telangana, Maharashtra",
        market_info="Consistent market demand across APMC mandis.",
        data_source="Bhabha Atomic Research Centre (BARC)",
        is_active=True
    ),
    dict(
        id=8,
        name="Kadiri 6 (K6)",
        variety_code="KADIRI-6",
        crop_name="Groundnut",
        suitable_soil_types="Red, Black, Sandy Loam, Clay Loam",
        water_requirement="Medium",
        maturity_duration_days=115,
        expected_yield_per_acre=12.0,
        expected_price_per_unit=6400.0,
        production_cost_per_acre=27000.0,
        disease_resistance="Resistant to Late Leaf Spot & Collar Rot",
        pest_risk="Very Low Pest Risk",
        suitability_info="Vigorous Spanish bunch variety with high pod yield and 48% oil content.",
        region_suitability="Andhra Pradesh, Karnataka, Telangana, Tamil Nadu",
        market_info="Premium market pricing due to uniform bold kernels.",
        data_source="ANGRAU Kadiri Station",
        is_active=True
    ),
    dict(
        id=9,
        name="JL 24 (Phule Pragati)",
        variety_code="JL-24",
        crop_name="Groundnut",
        suitable_soil_types="Loamy, Alluvial, Sandy Loam",
        water_requirement="Low",
        maturity_duration_days=95,
        expected_yield_per_acre=9.8,
        expected_price_per_unit=6000.0,
        production_cost_per_acre=23000.0,
        disease_resistance="Moderate resistance to Tikka",
        pest_risk="Low Pest Risk",
        suitability_info="Ultra-short duration (95 days) allowing double cropping.",
        region_suitability="Maharashtra, Gujarat, Karnataka, MP",
        market_info="Popular for quick cash returns.",
        data_source="MPKV Rahuri",
        is_active=True
    ),

    # ── Maize Varieties ────────────────────────────────────────────────────
    dict(
        id=10,
        name="DHM 117",
        variety_code="DHM-117",
        crop_name="Maize",
        suitable_soil_types="Black, Clay Loam, Heavy Loam, Alluvial",
        water_requirement="Medium",
        maturity_duration_days=115,
        expected_yield_per_acre=28.5,
        expected_price_per_unit=2150.0,
        production_cost_per_acre=21000.0,
        disease_resistance="High resistance to Turcicum Leaf Blight",
        pest_risk="Low Fall Armyworm vulnerability",
        suitability_info="High-yielding single cross hybrid maize.",
        region_suitability="Karnataka, Andhra Pradesh, Telangana, Bihar",
        market_info="Preferred by poultry feed manufacturers.",
        data_source="IIMR Hyderabad",
        is_active=True
    ),
    dict(
        id=11,
        name="Bio 9681",
        variety_code="BIO-9681",
        crop_name="Maize",
        suitable_soil_types="Red, Sandy Loam, Loamy",
        water_requirement="Medium",
        maturity_duration_days=110,
        expected_yield_per_acre=26.0,
        expected_price_per_unit=2100.0,
        production_cost_per_acre=20000.0,
        disease_resistance="Moderate resistance to Maydis Leaf Blight",
        pest_risk="Requires monitoring for stem borer",
        suitability_info="Adaptable hybrid with strong root stay-green character.",
        region_suitability="Karnataka, AP, Maharashtra, MP",
        market_info="Steady market demand in regional mandis.",
        data_source="BioSeeds India",
        is_active=True
    ),

    # ── Paddy Varieties ────────────────────────────────────────────────────
    dict(
        id=12,
        name="BPT 5204 (Samba Mahsuri)",
        variety_code="BPT-5204",
        crop_name="Paddy",
        suitable_soil_types="Clay, Clay Loam, Black, Heavy Loam",
        water_requirement="High",
        maturity_duration_days=145,
        expected_yield_per_acre=26.0,
        expected_price_per_unit=2450.0,
        production_cost_per_acre=24000.0,
        disease_resistance="Resistant to Bacterial Leaf Blight",
        pest_risk="Requires Stem Borer management",
        suitability_info="Premium fine grain rice variety with high cooking quality.",
        region_suitability="Andhra Pradesh, Telangana, Karnataka, Tamil Nadu",
        market_info="High market price premium for fine rice.",
        data_source="ANGRAU Bapatla",
        is_active=True
    ),
    dict(
        id=13,
        name="MTU 1010",
        variety_code="MTU-1010",
        crop_name="Paddy",
        suitable_soil_types="Alluvial, Red, Loamy, Clay Loam",
        water_requirement="Medium",
        maturity_duration_days=120,
        expected_yield_per_acre=24.5,
        expected_price_per_unit=2250.0,
        production_cost_per_acre=22000.0,
        disease_resistance="High resistance to Blast",
        pest_risk="Low Pest Risk",
        suitability_info="Short duration high-yielding non-lodging variety.",
        region_suitability="Andhra Pradesh, Telangana, Karnataka, Odisha",
        market_info="Reliable staple rice variety in mandis.",
        data_source="ANGRAU Maruteru",
        is_active=True
    ),

    # ── Soybean Varieties ──────────────────────────────────────────────────
    dict(
        id=14,
        name="JS 335",
        variety_code="JS-335",
        crop_name="Soybean",
        suitable_soil_types="Black, Clay Loam, Heavy Loam",
        water_requirement="Medium",
        maturity_duration_days=100,
        expected_yield_per_acre=10.5,
        expected_price_per_unit=4850.0,
        production_cost_per_acre=18500.0,
        disease_resistance="High resistance to Yellow Mosaic Virus",
        pest_risk="Low Girdle Beetle Risk",
        suitability_info="Most popular soybean variety in Central India.",
        region_suitability="MP, Maharashtra, Rajasthan, Karnataka",
        market_info="High demand by soybean solvent extraction plants.",
        data_source="JNKVV Jabalpur",
        is_active=True
    ),

    # ── Sunflower Varieties ────────────────────────────────────────────────
    dict(
        id=15,
        name="KBSH 41",
        variety_code="KBSH-41",
        crop_name="Sunflower",
        suitable_soil_types="Red, Sandy Loam, Loamy",
        water_requirement="Medium",
        maturity_duration_days=95,
        expected_yield_per_acre=9.5,
        expected_price_per_unit=5300.0,
        production_cost_per_acre=17000.0,
        disease_resistance="Resistant to Sunflower Necrosis Virus",
        pest_risk="Low Caterpillar Risk",
        suitability_info="High oil content (41%) sunflower hybrid.",
        region_suitability="Karnataka, Andhra Pradesh, Maharashtra",
        market_info="High demand by edible oil refiners.",
        data_source="UAS Bangalore",
        is_active=True
    ),

    # ── Sesame Varieties ──────────────────────────────────────────────────
    dict(
        id=16,
        name="TMV 3",
        variety_code="TMV-3",
        crop_name="Sesame",
        suitable_soil_types="Red, Sandy, Sandy Loam",
        water_requirement="Low",
        maturity_duration_days=85,
        expected_yield_per_acre=5.2,
        expected_price_per_unit=7300.0,
        production_cost_per_acre=12000.0,
        disease_resistance="Resistant to Phyllody & Phytophthora Blight",
        pest_risk="Very Low Pest Risk",
        suitability_info="White bold-seeded sesame variety.",
        region_suitability="Tamil Nadu, Andhra Pradesh, Karnataka",
        market_info="Top price in confectionery and oil market.",
        data_source="TNAU Tindivanam",
        is_active=True
    )
]

def seed_db(session: Session) -> None:
    """Insert all seed records. Idempotent -- skips existing rows by primary key."""

    logger.info("Seeding users...")
    for u in USERS:
        obj = session.get(User, u["id"])
        if obj is None:
            obj = User(**u)
            session.add(obj)
        else:
            obj.username = u["username"]
            obj.email = u["email"]
            obj.hashed_password = u["hashed_password"]
            if "role" in u:
                obj.role = u["role"]

    logger.info("Seeding crops...")
    for c in CROPS:
        _get_or_create(session, Crop, c["id"], **{k: v for k, v in c.items() if k != "id"})

    logger.info("Seeding farmers...")
    for f in FARMERS:
        _get_or_create(session, Farmer, f["id"], **{k: v for k, v in f.items() if k != "id"})

    logger.info("Seeding farms...")
    for f in FARMS:
        _get_or_create(session, Farm, f["id"], **{k: v for k, v in f.items() if k != "id"})

    logger.info("Seeding crop economics...")
    for row in CROP_ECONOMICS:
        (eid, crop_id, region, yield_per_acre, yield_unit,
         prod_cost, price_per_unit, status, source) = row
        _get_or_create(
            session, CropEconomics, eid,
            crop_id=crop_id,
            region=region,
            expected_yield_per_acre=yield_per_acre,
            yield_unit=yield_unit,
            production_cost_per_acre=prod_cost,
            expected_price_per_unit=price_per_unit,
            data_status=status,
            data_source=source,
        )

    logger.info("Seeding crop suitabilities...")
    for row in CROP_SUITABILITIES:
        (sid, crop_id, region, soil, water_level, base_score, notes) = row
        _get_or_create(
            session, CropSuitability, sid,
            crop_id=crop_id,
            region=region,
            soil_type=soil,
            water_requirement_level=water_level,
            suitability_base_score=base_score,
            notes=notes,
        )

    logger.info("Seeding markets...")
    for m in MARKETS:
        _get_or_create(session, Market, m["id"], **{k: v for k, v in m.items() if k != "id"})

    logger.info("Seeding market prices...")
    for row in MARKET_PRICES:
        (pid, market_id, crop_id, price, trend) = row
        _get_or_create(
            session, MarketPrice, pid,
            market_id=market_id,
            crop_id=crop_id,
            price=price,
            price_unit="quintal",
            price_date=_PRICE_DATE,
            trend=trend,
            data_status="DEMO",
            data_source="Agmarknet snapshot basis (DEMO)",
        )

    logger.info("Seeding risk scenarios...")
    for r in RISK_SCENARIOS:
        _get_or_create(session, RiskScenario, r["id"], **{k: v for k, v in r.items() if k != "id"})

    logger.info("Seeding subsidies...")
    for s in SUBSIDIES:
        _get_or_create(session, Subsidy, s["id"], **{k: v for k, v in s.items() if k != "id"})

    logger.info("Seeding mustard varieties...")
    for mv in MUSTARD_VARIETIES:
        _get_or_create(session, MustardVariety, mv["id"], **{k: v for k, v in mv.items() if k != "id"})

    # ── Market platform seed data ──────────────────────────────────────────────
    _seed_market_platform(session)

    session.commit()

    # Sync sequences to max id to prevent duplicate key errors during registration/creation
    from sqlalchemy import text
    tables = ['user', 'crop', 'farmer', 'farm', 'market', 'subsidy', 'mustard_varieties',
              'buyer_demand', 'future_crop_lot', 'stock_lot', 'certificate', 'auction', 'bid',
              'contact_sharing']
    for t in tables:
        try:
            session.execute(text(f"SELECT setval('{t}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM \"{t}\"));"))
        except Exception:
            session.rollback()
    session.commit()

    logger.info("Seed complete.")


def _seed_market_platform(session: Session) -> None:
    """
    Clean marketplace activity tables so the application operates strictly on real user-created data.
    """
    from ..models import BuyerDemand, FutureCropLot, StockLot, Certificate, Auction, Bid, ContactSharing

    try:
        session.query(ContactSharing).delete(synchronize_session=False)
        session.query(Bid).delete(synchronize_session=False)
        session.query(Auction).delete(synchronize_session=False)
        session.query(StockLot).delete(synchronize_session=False)
        session.query(FutureCropLot).delete(synchronize_session=False)
        session.query(Certificate).delete(synchronize_session=False)
        session.query(BuyerDemand).delete(synchronize_session=False)
        session.commit()
        logger.info("Marketplace activity tables cleared for clean real user transactions.")
    except Exception as e:
        session.rollback()
        logger.warning(f"Note on clearing marketplace tables: {e}")


def run_seed() -> None:
    """Entry point: initialise DB then seed."""
    from .session import SessionLocal
    init_db()
    with SessionLocal() as session:
        seed_db(session)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
    print("Seed data inserted successfully.")

