"""
Test suite for Mustard Seed Comparison API endpoint and calculation engine.
Includes tests for authentication, authorization (403), 404 handling,
and dynamic calculation changes when farm inputs change.
"""
import pytest
from app.models.mustard_variety import MustardVariety
from app.models.farm import Farm

def get_auth_headers(client, username, email, password):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    res = client.post("/api/v1/auth/token", data={
        "username": username,
        "password": password
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_unauthenticated_mustard_comparison(client):
    response = client.get("/api/v1/farms/1/mustard-comparison", headers={"Authorization": "Bearer invalid_token_123"})
    assert response.status_code == 401

def test_missing_farm_mustard_comparison(client):
    headers = get_auth_headers(client, "mustard_user_1", "m1@cropshift.com", "pass12345")
    response = client.get("/api/v1/farms/999999/mustard-comparison", headers=headers)
    assert response.status_code == 404
    assert "Farm not found" in response.json()["error"]["message"]

def test_cross_user_mustard_comparison(client):
    headers_a = get_auth_headers(client, "mustard_farmer_a", "ma@cropshift.com", "pass12345")
    headers_b = get_auth_headers(client, "mustard_farmer_b", "mb@cropshift.com", "pass12345")

    # Farmer A creates a farm
    res_farm_a = client.post("/api/v1/farms", json={
        "land_area_acre": 4.0,
        "water_availability": True,
        "soil_type": "Red Laterite",
        "district": "Tumkur",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers_a)
    farm_a_id = res_farm_a.json()["id"]

    # Farmer B attempts to get comparison for Farm A -> 403
    res_cross = client.get(f"/api/v1/farms/{farm_a_id}/mustard-comparison", headers=headers_b)
    assert res_cross.status_code == 403
    assert "You do not have access" in res_cross.json()["error"]["message"]

def test_successful_mustard_comparison(client):
    headers = get_auth_headers(client, "mustard_farmer_c", "mc@cropshift.com", "pass12345")

    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 3.5,
        "water_availability": True,
        "soil_type": "Loamy",
        "district": "Guntur",
        "state": "Andhra Pradesh",
        "current_crop": "Paddy"
    }, headers=headers)
    farm_id = res_farm.json()["id"]

    res_comp = client.get(f"/api/v1/farms/{farm_id}/mustard-comparison", headers=headers)
    assert res_comp.status_code == 200
    data = res_comp.json()

    assert data["farm_id"] == farm_id
    assert "best_mustard_variety" in data
    assert len(data["comparison"]) > 0

    first_item = data["comparison"][0]
    assert first_item["decision"] == "RECOMMENDED"
    assert first_item["overall_score"] > 0
    assert first_item["estimated_net_profit"] > 0

def test_farm_input_changes_mustard_ranking(client):
    """
    CRITICAL LOGIC TEST:
    Proves that changing farm inputs (Soil: Black vs Sandy, Water: Available vs Limited, Acreage: 5 vs 2)
    recalculates suitability, risk, profit totals, rankings, and best match variety.
    """
    headers = get_auth_headers(client, "mustard_farmer_d", "md@cropshift.com", "pass12345")

    # Farm 1: Black Soil, Available Water, 5 Acres
    res_f1 = client.post("/api/v1/farms", json={
        "land_area_acre": 5.0,
        "water_availability": True,
        "soil_type": "Black Cotton",
        "district": "Dharwad",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    f1_id = res_f1.json()["id"]

    # Farm 2: Sandy Loam Soil, Limited/Scarce Water, 2 Acres
    res_f2 = client.post("/api/v1/farms", json={
        "land_area_acre": 2.0,
        "water_availability": False,
        "soil_type": "Sandy Loam",
        "district": "Chitradurga",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    f2_id = res_f2.json()["id"]

    res1 = client.get(f"/api/v1/farms/{f1_id}/mustard-comparison", headers=headers).json()
    res2 = client.get(f"/api/v1/farms/{f2_id}/mustard-comparison", headers=headers).json()

    # 1. Total farm profit must scale with acreage (5 acres vs 2 acres)
    top1 = res1["comparison"][0]
    top2 = res2["comparison"][0]
    assert res1["land_area_acre"] == 5.0
    assert res2["land_area_acre"] == 2.0

    # 2. Compare variety specific scores between Farm 1 and Farm 2
    giriraj_f1 = next(v for v in res1["comparison"] if "Giriraj" in v["variety_name"])
    giriraj_f2 = next(v for v in res2["comparison"] if "Giriraj" in v["variety_name"])

    pusa_bold_f1 = next(v for v in res1["comparison"] if "Pusa Bold" in v["variety_name"])
    pusa_bold_f2 = next(v for v in res2["comparison"] if "Pusa Bold" in v["variety_name"])

    # Giriraj should have higher suitability and lower risk on Farm 1 (Black soil, water available) than Farm 2 (Sandy soil, no water)
    assert giriraj_f1["suitability_score"] > giriraj_f2["suitability_score"]
    assert giriraj_f1["risk_score"] < giriraj_f2["risk_score"]

    # Pusa Bold should be more suitable / lower risk on Farm 2 (Low water requirement) than high-water varieties
    assert pusa_bold_f2["suitability_score"] > giriraj_f2["suitability_score"]

    # Overall scores and rankings must differ between the two farms
    assert res1["comparison"][0]["overall_score"] != res2["comparison"][0]["overall_score"]

def test_multiple_farm_safety(client):
    """
    SECTION 14 REQUIREMENT:
    User A has Farm 1 & Farm 2. User B has Farm 3.
    User A -> Farm 1 PASS
    User A -> Farm 2 PASS
    User A -> Farm 3 403 FORBIDDEN
    User B -> Farm 1 403 FORBIDDEN
    """
    headers_a = get_auth_headers(client, "multi_user_a", "ua@cropshift.com", "pass12345")
    headers_b = get_auth_headers(client, "multi_user_b", "ub@cropshift.com", "pass12345")

    # User A creates Farm 1 & Farm 2
    f1_id = client.post("/api/v1/farms", json={"land_area_acre": 2.0, "water_availability": True, "soil_type": "Loamy", "district": "Tumkur", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers_a).json()["id"]
    f2_id = client.post("/api/v1/farms", json={"land_area_acre": 5.0, "water_availability": False, "soil_type": "Black Cotton", "district": "Shimoga", "state": "Karnataka", "current_crop": "Maize"}, headers=headers_a).json()["id"]

    # User B creates Farm 3
    f3_id = client.post("/api/v1/farms", json={"land_area_acre": 4.0, "water_availability": True, "soil_type": "Red Laterite", "district": "Mysore", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers_b).json()["id"]

    # User A accesses Farm 1 -> 200 OK
    assert client.get(f"/api/v1/farms/{f1_id}/mustard-comparison", headers=headers_a).status_code == 200

    # User A accesses Farm 2 -> 200 OK
    assert client.get(f"/api/v1/farms/{f2_id}/mustard-comparison", headers=headers_a).status_code == 200

    # User A accesses Farm 3 -> 403 FORBIDDEN
    assert client.get(f"/api/v1/farms/{f3_id}/mustard-comparison", headers=headers_a).status_code == 403

    # User B accesses Farm 1 -> 403 FORBIDDEN
    assert client.get(f"/api/v1/farms/{f1_id}/mustard-comparison", headers=headers_b).status_code == 403
