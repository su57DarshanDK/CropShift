import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.auth import create_access_token, get_password_hash
from app.database.session import SessionLocal
from app.models.user import User
from app.models.farm import Farm

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_users_and_tokens():
    db = SessionLocal()
    try:
        # Create User A
        user_a = db.query(User).filter(User.username == "farmer_a_test").first()
        if not user_a:
            user_a = User(username="farmer_a_test", email="a@test.com", hashed_password=get_password_hash("passA123"))
            db.add(user_a)
            db.commit()
            db.refresh(user_a)

        # Create User B
        user_b = db.query(User).filter(User.username == "farmer_b_test").first()
        if not user_b:
            user_b = User(username="farmer_b_test", email="b@test.com", hashed_password=get_password_hash("passB123"))
            db.add(user_b)
            db.commit()
            db.refresh(user_b)

        token_a = create_access_token({"sub": user_a.username, "user_id": user_a.id})
        token_b = create_access_token({"sub": user_b.username, "user_id": user_b.id})

        return {
            "user_a": user_a,
            "user_b": user_b,
            "token_a": token_a,
            "token_b": token_b,
            "headers_a": {"Authorization": f"Bearer {token_a}"},
            "headers_b": {"Authorization": f"Bearer {token_b}"},
        }
    finally:
        db.close()


def test_unique_user_ids(setup_users_and_tokens):
    """Req 1 & 2: Users receive unique, different IDs."""
    data = setup_users_and_tokens
    assert data["user_a"].id is not None
    assert data["user_b"].id is not None
    assert data["user_a"].id != data["user_b"].id


def test_user_a_and_b_can_create_farms(setup_users_and_tokens):
    """Req 3 & 4: User A and User B can create farms tied to their own IDs."""
    headers_a = setup_users_and_tokens["headers_a"]
    headers_b = setup_users_and_tokens["headers_b"]

    # User A creates farm
    res_a = client.post("/api/v1/farms", json={
        "land_area_acre": 3.0,
        "water_availability": True,
        "soil_type": "Red Laterite",
        "district": "Tumkur",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers_a)
    assert res_a.status_code == 200
    farm_a = res_a.json()
    assert farm_a["owner_id"] == setup_users_and_tokens["user_a"].id

    # User B creates farm
    res_b = client.post("/api/v1/farms", json={
        "land_area_acre": 5.0,
        "water_availability": False,
        "soil_type": "Black Cotton",
        "district": "Shivamogga",
        "state": "Karnataka",
        "current_crop": "Maize"
    }, headers=headers_b)
    assert res_b.status_code == 200
    farm_b = res_b.json()
    assert farm_b["owner_id"] == setup_users_and_tokens["user_b"].id

    setup_users_and_tokens["farm_a_id"] = farm_a["id"]
    setup_users_and_tokens["farm_b_id"] = farm_b["id"]


def test_farm_listing_isolation(setup_users_and_tokens):
    """Req 5 & 6: User A sees only A's farm, User B sees only B's farm."""
    headers_a = setup_users_and_tokens["headers_a"]
    headers_b = setup_users_and_tokens["headers_b"]

    farms_a = client.get("/api/v1/farms", headers=headers_a).json()
    farms_b = client.get("/api/v1/farms", headers=headers_b).json()

    a_ids = [f["id"] for f in farms_a]
    b_ids = [f["id"] for f in farms_b]

    assert setup_users_and_tokens["farm_a_id"] in a_ids
    assert setup_users_and_tokens["farm_b_id"] not in a_ids

    assert setup_users_and_tokens["farm_b_id"] in b_ids
    assert setup_users_and_tokens["farm_a_id"] not in b_ids


def test_unauthorized_cross_user_farm_access(setup_users_and_tokens):
    """Req 7, 8, 9 & 10: User A cannot read, update, delete, or recommend for B's farm."""
    headers_a = setup_users_and_tokens["headers_a"]
    farm_b_id = setup_users_and_tokens["farm_b_id"]

    # Read B's farm as A
    res_get = client.get(f"/api/v1/farms/{farm_b_id}", headers=headers_a)
    assert res_get.status_code == 403

    # Update B's farm as A
    res_put = client.put(f"/api/v1/farms/{farm_b_id}", json={"land_area_acre": 10.0}, headers=headers_a)
    assert res_put.status_code == 403

    # Recommendation for B's farm as A
    res_rec = client.post("/api/v1/recommendations", json={"farm_id": farm_b_id}, headers=headers_a)
    assert res_rec.status_code == 403

    # Delete B's farm as A
    res_del = client.delete(f"/api/v1/farms/{farm_b_id}", headers=headers_a)
    assert res_del.status_code == 403
