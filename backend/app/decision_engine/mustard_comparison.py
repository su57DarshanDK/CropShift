"""
Decision engine for evaluating and ranking Mustard Seed Varieties against a specific farm's real conditions.
"""
from typing import List, Dict, Any
from app.models.farm import Farm
from app.models.mustard_variety import MustardVariety

def clamp(val: float, min_val: float, max_val: float) -> int:
    return int(max(min_val, min(max_val, val)))

def evaluate_mustard_varieties_for_farm(
    farm: Farm,
    varieties: List[MustardVariety],
    current_crop_name: str = "Paddy"
) -> Dict[str, Any]:
    """
    Evaluates every active mustard variety against the farmer's specific farm attributes.
    Returns ranked comparison results with suitability, profitability, market, risk, and overall scores.
    """
    farm_soil = (farm.soil_type or "").strip().lower()
    farm_state = (farm.state or "").strip().lower()
    farm_district = (farm.district or "").strip().lower()
    has_water = bool(farm.water_availability)
    land_area = float(farm.land_area_acre or 1.0)

    comparison_results = []

    for v in varieties:
        suitable_soils = (v.suitable_soil_types or "").lower()
        water_req = (v.water_requirement or "Medium").lower()
        region_suit = (v.region_suitability or "").lower()

        # 1. Suitability Calculation
        suit_base = 70.0

        # Soil Match
        soil_matched = False
        if farm_soil:
            suitable_list = [s.strip().lower() for s in v.suitable_soil_types.split(',')]
            # Check exact or category match
            if any(s == farm_soil or s in farm_soil for s in suitable_list):
                soil_matched = True
            elif "black" in farm_soil and "black" in suitable_soils:
                soil_matched = True
            elif "sandy" in farm_soil and "sandy" in suitable_soils:
                soil_matched = True
            elif "alluvial" in farm_soil and "alluvial" in suitable_soils:
                soil_matched = True
            elif "red" in farm_soil and "red" in suitable_soils:
                soil_matched = True
            elif "loamy" in farm_soil and ("loamy" in suitable_soils or "loam" in suitable_soils) and "clay" not in farm_soil:
                soil_matched = True

        soil_delta = 20.0 if soil_matched else -20.0

        # Region Match
        region_matched = False
        if farm_state and (farm_state in region_suit or any(w in region_suit for w in farm_state.split())):
            region_matched = True
        elif farm_district and farm_district in region_suit:
            region_matched = True

        region_delta = 10.0 if region_matched else 0.0

        # Water Match
        water_delta = 0.0
        water_risk_add = 0.0
        if not has_water:  # Limited / Scarce water
            if "high" in water_req:
                water_delta = -30.0
                water_risk_add = 35.0
            elif "low" in water_req:
                water_delta = 15.0
                water_risk_add = 0.0
            else:  # Medium
                water_delta = 0.0
                water_risk_add = 10.0
        else:  # Available water
            if "high" in water_req or "medium" in water_req:
                water_delta = 10.0

        suitability_score = clamp(suit_base + soil_delta + region_delta + water_delta, 0.0, 100.0)

        # 2. Economics / Profitability Calculation
        yield_per_acre = float(v.expected_yield_per_acre)
        price_per_unit = float(v.expected_price_per_unit)
        cost_per_acre = float(v.production_cost_per_acre)

        expected_revenue_per_acre = yield_per_acre * price_per_unit
        profit_per_acre = expected_revenue_per_acre - cost_per_acre

        estimated_revenue = expected_revenue_per_acre * land_area
        estimated_cost = cost_per_acre * land_area
        estimated_net_profit = profit_per_acre * land_area

        # Profitability Score scaled around target profit (e.g. ₹35,000/acre = 85)
        profitability_score = clamp((profit_per_acre / 35000.0) * 85.0, 0.0, 100.0)

        # 3. Market Score
        market_base = 75.0
        if price_per_unit >= 5600.0:
            market_base += 10.0
        if "high demand" in (v.market_info or "").lower():
            market_base += 5.0
        market_score = clamp(market_base, 0.0, 100.0)

        # 4. Risk Score
        risk_base = 15.0
        if not soil_matched and farm_soil:
            risk_base += 20.0
        risk_base += water_risk_add

        if v.pest_risk and ("medium" in v.pest_risk.lower() or "requires" in v.pest_risk.lower()):
            risk_base += 10.0

        risk_score = clamp(risk_base, 0.0, 100.0)

        # 5. Overall Score
        # Overall = 35% suitability + 35% profitability + 15% market - 15% risk
        raw_overall = (0.35 * suitability_score) + (0.35 * profitability_score) + (0.15 * market_score) - (0.15 * risk_score)
        overall_score = clamp(raw_overall, 0.0, 100.0)

        # 6. Dynamic Bullet Point Explanations & Risks
        reasons = []
        risks = []

        if soil_matched:
            reasons.append(f"Highly suitable for {farm.soil_type or 'your'} soil conditions.")
        else:
            risks.append(f"Soil type mismatch: requires {v.suitable_soil_types}.")

        if not has_water and "low" in water_req:
            reasons.append("Low water requirement matches your limited water availability.")
        elif not has_water and "high" in water_req:
            risks.append("High water demand may strain limited water resources.")

        reasons.append(f"Generates estimated net profit of ₹{profit_per_acre:,.0f}/acre (₹{estimated_net_profit:,.0f} total for {land_area} acres).")

        if price_per_unit >= 5600.0:
            reasons.append(f"High market price premium of ₹{price_per_unit:,.0f}/quintal.")

        if v.disease_resistance:
            reasons.append(v.disease_resistance)

        if v.pest_risk:
            if "high" in v.pest_risk.lower() or "requires" in v.pest_risk.lower():
                risks.append(v.pest_risk)

        comparison_results.append({
            "variety_id": v.id,
            "variety_name": v.name,
            "variety_code": v.variety_code,
            "suitable_soil_types": v.suitable_soil_types,
            "water_requirement": v.water_requirement,
            "maturity_duration_days": v.maturity_duration_days,
            "suitability_score": suitability_score,
            "profitability_score": profitability_score,
            "market_score": market_score,
            "risk_score": risk_score,
            "overall_score": overall_score,
            "expected_yield_per_acre": yield_per_acre,
            "yield_unit": "quintal",
            "expected_price_per_unit": price_per_unit,
            "production_cost_per_acre": cost_per_acre,
            "profit_per_acre": profit_per_acre,
            "estimated_revenue": estimated_revenue,
            "estimated_cost": estimated_cost,
            "estimated_net_profit": estimated_net_profit,
            "decision": "RECOMMENDED",  # Will be adjusted after ranking
            "disease_resistance": v.disease_resistance,
            "pest_risk": v.pest_risk,
            "suitability_info": v.suitability_info,
            "region_suitability": v.region_suitability,
            "market_info": v.market_info,
            "data_source": v.data_source,
            "reasons": reasons,
            "risks": risks,
        })

    # Sort results by overall_score descending
    comparison_results.sort(key=lambda x: x["overall_score"], reverse=True)

    # Assign decision labels: top ranked gets RECOMMENDED, others get SUITABLE or ALTERNATIVE
    for idx, item in enumerate(comparison_results):
        if idx == 0:
            item["decision"] = "RECOMMENDED"
        elif item["overall_score"] >= 70:
            item["decision"] = "SUITABLE"
        else:
            item["decision"] = "ALTERNATIVE"

    best_variety = comparison_results[0]["variety_name"] if comparison_results else "Pusa Mustard 30"

    return {
        "farm_id": farm.id,
        "farm_name": f"Farm #{farm.id} ({farm.district or 'Local'}, {farm.state or 'State'})",
        "current_crop": current_crop_name,
        "land_area_acre": land_area,
        "soil_type": farm.soil_type or "Unknown",
        "water_availability": "Available" if has_water else "Limited",
        "district": farm.district or "Local District",
        "state": farm.state or "Local State",
        "best_mustard_variety": best_variety,
        "comparison": comparison_results,
    }
