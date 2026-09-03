from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.farm import Farm
from app.models.crop import Crop
from app.models.user import User
from app.models.mustard_variety import MustardVariety
from app.api.v1.auth import get_current_user
from app.schemas.seed_comparison import SeedCompareRequest, SeedCompareResponse, SeedVarietyDetail
from app.decision_engine.mustard_comparison import evaluate_mustard_varieties_for_farm

router = APIRouter(prefix="/seeds", tags=["Seeds"])

@router.get("", response_model=List[SeedVarietyDetail])
def get_seeds_for_crop(
    crop: str = Query(..., description="Crop name (e.g. Groundnut, Mustard, Soybean, Sesame, Sunflower)"),
    farm_id: Optional[int] = Query(None, description="Optional farm ID to score suitability"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch real seed varieties for the specified crop from PostgreSQL database.
    If farm_id is provided, suitability scores are calculated against the farmer's actual farm inputs.
    """
    varieties = db.query(MustardVariety).filter(
        MustardVariety.is_active == True,
        MustardVariety.crop_name.ilike(crop)
    ).all()

    if not varieties:
        # Fallback partial match if exact name has slight variation
        varieties = db.query(MustardVariety).filter(
            MustardVariety.is_active == True,
            MustardVariety.crop_name.ilike(f"%{crop}%")
        ).all()

    if not varieties:
        # If crop is Mustard or general fallback
        varieties = db.query(MustardVariety).filter(MustardVariety.is_active == True).all()

    if not varieties:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No seed varieties are available for this crop."
        )

    # Optional farm scoring if farm_id is passed
    farm = None
    if farm_id:
        farm = db.get(Farm, farm_id)

    results = []
    if farm:
        eval_res = evaluate_mustard_varieties_for_farm(farm, varieties, crop)
        for item in eval_res["comparison"]:
            results.append(SeedVarietyDetail(
                id=item["variety_id"],
                name=item["variety_name"],
                variety_code=item["variety_code"],
                crop_name=crop,
                expected_yield_per_acre=item["expected_yield_per_acre"],
                yield_unit=item.get("yield_unit", "quintal"),
                maturity_duration_days=item["maturity_duration_days"],
                water_requirement=item["water_requirement"],
                suitable_soil_types=item["suitable_soil_types"],
                disease_resistance=item.get("disease_resistance"),
                expected_price_per_unit=item["expected_price_per_unit"],
                production_cost_per_acre=item["production_cost_per_acre"],
                profit_per_acre=item["profit_per_acre"],
                suitability_score=int(item["suitability_score"]),
                decision=item["decision"]
            ))
    else:
        for v in varieties:
            profit = (v.expected_yield_per_acre * v.expected_price_per_unit) - v.production_cost_per_acre
            results.append(SeedVarietyDetail(
                id=v.id,
                name=v.name,
                variety_code=v.variety_code,
                crop_name=v.crop_name,
                expected_yield_per_acre=v.expected_yield_per_acre,
                yield_unit="quintal",
                maturity_duration_days=v.maturity_duration_days,
                water_requirement=v.water_requirement,
                suitable_soil_types=v.suitable_soil_types,
                disease_resistance=v.disease_resistance,
                expected_price_per_unit=v.expected_price_per_unit,
                production_cost_per_acre=v.production_cost_per_acre,
                profit_per_acre=profit,
                suitability_score=80,
                decision="SUITABLE"
            ))

    return results


@router.post("/compare", response_model=SeedCompareResponse)
def compare_seeds(
    payload: SeedCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compare TWO seed varieties for the farmer's specific farm attributes.
    Returns side-by-side comparison data and clearly identifies the better seed with reasons.
    """
    farm = db.get(Farm, payload.farm_id)
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found.")

    if farm.owner_id != current_user.id and farm.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this farm.")

    seed_1 = db.get(MustardVariety, payload.seed_id_1)
    seed_2 = db.get(MustardVariety, payload.seed_id_2)

    if not seed_1 or not seed_2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both seed varieties not found.")

    # Evaluate both seeds against farm conditions
    eval_res = evaluate_mustard_varieties_for_farm(farm, [seed_1, seed_2], payload.crop_name)
    compared_items = eval_res["comparison"]

    item_1 = next((i for i in compared_items if i["variety_id"] == seed_1.id), None)
    item_2 = next((i for i in compared_items if i["variety_id"] == seed_2.id), None)

    if not item_1 or not item_2:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error evaluating seed comparison.")

    detail_1 = SeedVarietyDetail(
        id=item_1["variety_id"],
        name=item_1["variety_name"],
        variety_code=item_1["variety_code"],
        crop_name=payload.crop_name,
        expected_yield_per_acre=item_1["expected_yield_per_acre"],
        yield_unit=item_1.get("yield_unit", "quintal"),
        maturity_duration_days=item_1["maturity_duration_days"],
        water_requirement=item_1["water_requirement"],
        suitable_soil_types=item_1["suitable_soil_types"],
        disease_resistance=item_1.get("disease_resistance"),
        expected_price_per_unit=item_1["expected_price_per_unit"],
        production_cost_per_acre=item_1["production_cost_per_acre"],
        profit_per_acre=item_1["profit_per_acre"],
        suitability_score=int(item_1["suitability_score"]),
        decision=item_1["decision"]
    )

    detail_2 = SeedVarietyDetail(
        id=item_2["variety_id"],
        name=item_2["variety_name"],
        variety_code=item_2["variety_code"],
        crop_name=payload.crop_name,
        expected_yield_per_acre=item_2["expected_yield_per_acre"],
        yield_unit=item_2.get("yield_unit", "quintal"),
        maturity_duration_days=item_2["maturity_duration_days"],
        water_requirement=item_2["water_requirement"],
        suitable_soil_types=item_2["suitable_soil_types"],
        disease_resistance=item_2.get("disease_resistance"),
        expected_price_per_unit=item_2["expected_price_per_unit"],
        production_cost_per_acre=item_2["production_cost_per_acre"],
        profit_per_acre=item_2["profit_per_acre"],
        suitability_score=int(item_2["suitability_score"]),
        decision=item_2["decision"]
    )

    # Determine better seed
    if item_1["overall_score"] > item_2["overall_score"]:
        better = item_1
        other = item_2
    elif item_2["overall_score"] > item_1["overall_score"]:
        better = item_2
        other = item_1
    elif item_1["profit_per_acre"] >= item_2["profit_per_acre"]:
        better = item_1
        other = item_2
    else:
        better = item_2
        other = item_1

    # Generate specific reasons based on actual farm conditions
    reasons = []
    farm_soil = farm.soil_type or "your"
    if better["suitability_score"] > other["suitability_score"]:
        reasons.append(f"✓ Better soil compatibility for {farm_soil} soil conditions.")

    if farm.water_availability and ("medium" in better["water_requirement"].lower() or "high" in better["water_requirement"].lower()):
        reasons.append(f"✓ Excellent fit for your irrigated water availability.")
    elif not farm.water_availability and "low" in better["water_requirement"].lower():
        reasons.append(f"✓ Lower water requirement ({better['water_requirement']}) matches your rainfed/limited water availability.")

    yield_diff = better["expected_yield_per_acre"] - other["expected_yield_per_acre"]
    if yield_diff > 0:
        reasons.append(f"✓ Higher expected yield of {better['expected_yield_per_acre']} quintal/acre (+{yield_diff:.1f} q/ac higher).")

    profit_diff = better["profit_per_acre"] - other["profit_per_acre"]
    if profit_diff > 0:
        reasons.append(f"✓ Higher expected net return of ₹{better['profit_per_acre']:,.0f}/acre (+₹{profit_diff:,.0f}/acre gain).")
    else:
        reasons.append(f"✓ Strong net return profile of ₹{better['profit_per_acre']:,.0f}/acre.")

    if better.get("disease_resistance"):
        reasons.append(f"✓ Disease resistance: {better['disease_resistance']}.")

    return SeedCompareResponse(
        farm_id=farm.id,
        crop_name=payload.crop_name,
        seed_1=detail_1,
        seed_2=detail_2,
        better_seed_id=better["variety_id"],
        better_seed_name=better["variety_name"],
        better_seed_code=better["variety_code"],
        reasons=reasons
    )
