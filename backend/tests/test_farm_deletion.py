"""
Comprehensive backend test suite for Farm Deletion (Reset) functionality.
Tests 10 key requirements:
1. DELETE own farm -> 200 success.
2. DELETE nonexistent farm -> 404.
3. DELETE another user's farm -> 403.
4. Deleted farm no longer appears in GET /api/v1/farms.
5. Deleted farm cannot be used for recommendation.
6. Dependent records (recommendations) are correctly removed.
7. Other farms belonging to the same user remain untouched.
8. User account remains intact.
9. Create farm -> delete farm -> create another farm works.
10. Database sequence and sequence behavior remain correct.
"""
import pytest
import uuid
from app.database.session import SessionLocal
from app.models.farm import Farm
from app.models.recommendation import Recommendation

def get_auth_headers(client, prefix="user"):
    uid = uuid.uuid4().hex[:8]
    username = f"{prefix}_{uid}"
    user_email = f"{username}@cropshift.com"
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": user_email,
        "password": "pass12345"
    })
    res = client.post("/api/v1/auth/token", data={
        "username": username,
        "password": "pass12345"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "username": username}

def test_delete_own_farm_success(client):
    auth = get_auth_headers(client, "del_user_1")
    headers = {"Authorization": auth["Authorization"]}
    
    # Create a farm
    res_create = client.post("/api/v1/farms", json={
        "land_area_acre": 4.5,
        "water_availability": True,
        "soil_type": "Loamy",
        "district": "Dharwad",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    assert res_create.status_code == 200
    farm_id = res_create.json()["id"]

    # Delete the farm
    res_del = client.delete(f"/api/v1/farms/{farm_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"

    # Verify farm is deleted from DB
    db = SessionLocal()
    try:
        deleted_farm = db.get(Farm, farm_id)
        assert deleted_farm is None
    finally:
        db.close()

def test_delete_nonexistent_farm(client):
    auth = get_auth_headers(client, "del_user_2")
    headers = {"Authorization": auth["Authorization"]}
    res = client.delete("/api/v1/farms/999999", headers=headers)
    assert res.status_code == 404

def test_delete_another_user_farm_forbidden(client):
    auth_a = get_auth_headers(client, "owner_a")
    headers_a = {"Authorization": auth_a["Authorization"]}

    auth_b = get_auth_headers(client, "intruder_b")
    headers_b = {"Authorization": auth_b["Authorization"]}

    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 3.0,
        "water_availability": True,
        "soil_type": "Red Laterite",
        "district": "Tumkur",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers_a)
    farm_id = res_farm.json()["id"]

    # Intruder B attempts to delete Owner A's farm -> 403 Forbidden
    res_del = client.delete(f"/api/v1/farms/{farm_id}", headers=headers_b)
    assert res_del.status_code == 403

def test_deleted_farm_no_longer_in_get_farms(client):
    auth = get_auth_headers(client, "del_user_3")
    headers = {"Authorization": auth["Authorization"]}
    
    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 5.0,
        "water_availability": True,
        "soil_type": "Black Cotton",
        "district": "Shimoga",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    farm_id = res_farm.json()["id"]

    # Verify it appears in GET farms
    farms_before = client.get("/api/v1/farms", headers=headers).json()
    assert any(f["id"] == farm_id for f in farms_before)

    # Delete farm
    client.delete(f"/api/v1/farms/{farm_id}", headers=headers)

    # Verify it NO LONGER appears in GET farms
    farms_after = client.get("/api/v1/farms", headers=headers).json()
    assert not any(f["id"] == farm_id for f in farms_after)

def test_deleted_farm_cannot_be_used_for_recommendation(client):
    auth = get_auth_headers(client, "del_user_4")
    headers = {"Authorization": auth["Authorization"]}

    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 2.5,
        "water_availability": True,
        "soil_type": "Loamy",
        "district": "Dharwad",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    farm_id = res_farm.json()["id"]

    # Delete farm
    client.delete(f"/api/v1/farms/{farm_id}", headers=headers)

    # Requesting recommendation / mustard comparison for deleted farm -> 404 Not Found
    res_mustard = client.get(f"/api/v1/farms/{farm_id}/mustard-comparison", headers=headers)
    assert res_mustard.status_code == 404

def test_dependent_records_removed(client):
    auth = get_auth_headers(client, "del_user_5")
    headers = {"Authorization": auth["Authorization"]}

    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 4.0,
        "water_availability": True,
        "soil_type": "Loamy",
        "district": "Tumkur",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    farm_id = res_farm.json()["id"]

    # Generate recommendation
    client.post("/api/v1/recommendations", json={"farm_id": farm_id}, headers=headers)

    # Verify recommendation exists in DB
    db = SessionLocal()
    try:
        recs_before = db.query(Recommendation).filter(Recommendation.farm_id == farm_id).all()
        assert len(recs_before) > 0
    finally:
        db.close()

    # Delete farm
    client.delete(f"/api/v1/farms/{farm_id}", headers=headers)

    # Verify dependent recommendations are deleted
    db = SessionLocal()
    try:
        recs_after = db.query(Recommendation).filter(Recommendation.farm_id == farm_id).all()
        assert len(recs_after) == 0
    finally:
        db.close()

def test_other_farms_belonging_to_user_remain_untouched(client):
    auth = get_auth_headers(client, "del_user_6")
    headers = {"Authorization": auth["Authorization"]}

    # Create 3 farms
    f1_id = client.post("/api/v1/farms", json={"land_area_acre": 1.0, "water_availability": True, "soil_type": "Loamy", "district": "Tumkur", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers).json()["id"]
    f2_id = client.post("/api/v1/farms", json={"land_area_acre": 5.0, "water_availability": True, "soil_type": "Black Cotton", "district": "Shimoga", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers).json()["id"]
    f3_id = client.post("/api/v1/farms", json={"land_area_acre": 10.0, "water_availability": True, "soil_type": "Red Laterite", "district": "Mysore", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers).json()["id"]

    # Delete Farm 2
    res_del = client.delete(f"/api/v1/farms/{f2_id}", headers=headers)
    assert res_del.status_code == 200

    # Verify Farm 1 and Farm 3 remain in GET farms
    farms_list = client.get("/api/v1/farms", headers=headers).json()
    farm_ids = [f["id"] for f in farms_list]

    assert f1_id in farm_ids
    assert f3_id in farm_ids
    assert f2_id not in farm_ids

def test_user_account_remains_intact(client):
    auth = get_auth_headers(client, "del_user_7")
    headers = {"Authorization": auth["Authorization"]}

    res_farm = client.post("/api/v1/farms", json={
        "land_area_acre": 3.0,
        "water_availability": True,
        "soil_type": "Loamy",
        "district": "Dharwad",
        "state": "Karnataka",
        "current_crop": "Paddy"
    }, headers=headers)
    farm_id = res_farm.json()["id"]

    client.delete(f"/api/v1/farms/{farm_id}", headers=headers)

    # User account must still exist and be able to login
    user_me = client.get("/api/v1/auth/me", headers=headers)
    assert user_me.status_code == 200
    assert user_me.json()["username"] == auth["username"]

def test_create_delete_recreate_flow(client):
    auth = get_auth_headers(client, "del_user_8")
    headers = {"Authorization": auth["Authorization"]}

    # 1. Create farm
    f1_id = client.post("/api/v1/farms", json={"land_area_acre": 2.0, "water_availability": True, "soil_type": "Loamy", "district": "Tumkur", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers).json()["id"]

    # 2. Delete farm
    client.delete(f"/api/v1/farms/{f1_id}", headers=headers)

    # 3. Create another farm
    res_f2 = client.post("/api/v1/farms", json={"land_area_acre": 6.0, "water_availability": False, "soil_type": "Black Cotton", "district": "Belgaum", "state": "Karnataka", "current_crop": "Paddy"}, headers=headers)
    assert res_f2.status_code == 200
    f2_id = res_f2.json()["id"]

    assert f2_id > f1_id

    # Verify only Farm 2 exists for user
    farms = client.get("/api/v1/farms", headers=headers).json()
    assert len(farms) == 1
    assert farms[0]["id"] == f2_id
