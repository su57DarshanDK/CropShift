"""
test_api_layer.py -- Acceptance tests for API layer endpoints with authentication.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_context():
    # Register & Login user
    client.post("/api/v1/auth/register", json={
        "username": "api_layer_tester",
        "email": "apitester@cropshift.com",
        "password": "pass12345"
    })
    res_login = client.post("/api/v1/auth/token", data={
        "username": "api_layer_tester",
        "password": "pass12345"
    })
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get user's farms or create one
    res_farms = client.get("/api/v1/farms", headers=headers)
    farms = res_farms.json()
    if not farms:
        res_create = client.post("/api/v1/farms", json={
            "land_area_acre": 5.0,
            "water_availability": True,
            "soil_type": "Black Cotton",
            "district": "Shimoga",
            "state": "Karnataka",
            "current_crop": "Paddy"
        }, headers=headers)
        farm_id = res_create.json()["id"]
    else:
        farm_id = farms[0]["id"]

    return headers, farm_id

def test_root_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_v1_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_recommendations_endpoint():
    headers, farm_id = get_auth_context()
    res = client.post("/api/v1/recommendations", json={"farm_id": farm_id}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    expected_keys = {
        "recommended_crop", "suitability_score", "profitability_score",
        "market_score", "risk_score", "safety_score", "decision",
        "expected_profit", "current_crop_profit", "profit_difference",
        "reasons", "risks"
    }
    assert set(data.keys()) == expected_keys

def test_profitability_endpoint():
    headers, farm_id = get_auth_context()
    res = client.get(f"/api/v1/profitability/{farm_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    expected_keys = {
        "current_crop", "recommended_crop", "expected_yield",
        "production_cost", "expected_revenue", "estimated_profit",
        "profit_difference"
    }
    assert set(data.keys()) == expected_keys

def test_markets_endpoint():
    headers, farm_id = get_auth_context()
    res = client.get(f"/api/v1/markets/2?farm_id={farm_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    expected_keys = {
        "crop_id", "crop_name", "price", "price_unit", "market_name",
        "market_location", "distance_km", "trend", "market_score",
        "data_status", "data_source"
    }
    assert set(data.keys()) == expected_keys

def test_subsidies_endpoint():
    headers, farm_id = get_auth_context()
    res = client.get(f"/api/v1/subsidies/{farm_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 5

def test_geospatial_endpoint():
    headers, farm_id = get_auth_context()
    res = client.get(f"/api/v1/geospatial/{farm_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    expected_keys = {
        "farm", "nearby_markets", "distance_information", "geographic_context"
    }
    assert set(data.keys()) == expected_keys

def test_risk_simulation_endpoint():
    headers, farm_id = get_auth_context()
    res = client.post("/api/v1/risk-simulation", json={"farm_id": farm_id, "crop_id": 2}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    expected_keys = {"baseline", "price_down", "yield_down", "water_risk"}
    assert set(data.keys()) == expected_keys

def test_ivr_endpoint():
    res = client.post("/api/v1/ivr/recommendation", json={"farmer_id": 1})
    assert res.status_code == 200
    data = res.json()
    assert "recommendation" in data

def test_invalid_farm_id_404():
    headers, _ = get_auth_context()
    res = client.get("/api/v1/profitability/999999", headers=headers)
    assert res.status_code == 404
