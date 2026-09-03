"""
test_ivr.py -- A13 acceptance tests for IVR engine and endpoint.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.database.init_db import init_db
from app.database.seed import seed_db

client = TestClient(app)


@pytest.fixture(scope="module")
def db() -> Session:
    init_db()
    with SessionLocal() as session:
        seed_db(session)
        yield session


def test_ivr_recommendation_matches_web(db: Session):
    # Fetch Web Recommendation response
    web_res = client.post("/api/v1/recommendations", json={"farm_id": 1})
    assert web_res.status_code == 200
    web_data = web_res.json()

    # Fetch IVR Recommendation response
    ivr_res = client.post("/api/v1/ivr/recommendation", json={"farmer_id": 1})
    assert ivr_res.status_code == 200
    ivr_data = ivr_res.json()

    # Verify matching recommendation
    assert ivr_data["verified"] is True
    assert ivr_data["farmer_name"] == "Raju Naik"
    
    rec_web = web_data
    rec_ivr = ivr_data["recommendation"]
    
    assert rec_ivr["recommended_crop"] == rec_web["recommended_crop"]
    assert rec_ivr["safety_score"] == rec_web["safety_score"]
    assert rec_ivr["profit_difference"] == rec_web["profit_difference"]


def test_ivr_voice_script_format():
    ivr_res = client.post("/api/v1/ivr/recommendation", json={"farmer_id": 1})
    assert ivr_res.status_code == 200
    ivr_data = ivr_res.json()
    
    script = ivr_data["voice_script"]
    assert script is not None
    assert "Namaste Raju Naik" in script
    assert "groundnut" in script.lower()
    
    # Check natural numbers spelling instead of digits
    assert "eighty two" in script.lower()
    assert "nine thousand" in script.lower()
    assert "one" in script.lower()
    
    # Check under 45 words
    words = script.split()
    assert len(words) <= 45


def test_ivr_unknown_farmer():
    res = client.post("/api/v1/ivr/recommendation", json={"farmer_id": 9999})
    assert res.status_code == 200
    data = res.json()
    
    assert data["verified"] is False
    assert data["recommendation"] is None
    assert "could not verify" in data["voice_script"].lower()
