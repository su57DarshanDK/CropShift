import urllib.request
import urllib.parse
import json

BASE = 'http://127.0.0.1:8000'

def login(username, password):
    url = f'{BASE}/api/v1/auth/token'
    data = urllib.parse.urlencode({'username': username, 'password': password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def request(method, path, body=None, token=None):
    url = f'{BASE}{path}'
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

# 1. Health
s, res = request('GET', '/api/v1/health')
print('1. Health Check:', s, res)
assert s == 200

# 2. Login as Farmer (demo)
s, res = login('demo', 'password123')
print(f"2. Farmer Login: {s}, User: {res['user']['username']}, Role: {res['user']['role']}")
assert s == 200
farmer_token = res['access_token']

# 3. Get My Farms
s, res = request('GET', '/api/v1/farms', token=farmer_token)
print(f"3. My Farms: {s}, Total Farms: {len(res)}, Primary: Farm #{res[0]['id']} ({res[0]['district']})")
assert s == 200
farm_id = res[0]['id']

# 4. Oilseed Suitability
s, res = request('GET', f'/api/v1/recommendations/farms/{farm_id}/oilseed-suitability', token=farmer_token)
top_crop = res['suitable_oilseed_crops'][0]
print(f"4. Oilseed Suitability: {s}, Can grow oilseeds: {res['can_oilseed_be_grown']} | Top: {top_crop['crop_name']} ({top_crop['suitability_score']}%)")
assert s == 200
assert res['can_oilseed_be_grown'] is True

# 5. Seeds Variety from PostgreSQL
s, res = request('GET', '/api/v1/seeds?crop=Groundnut', token=farmer_token)
print('5. Seed Varieties from DB:', s, 'Varieties:', [v['name'] for v in res[:3]])
assert s == 200
assert len(res) >= 2

# 6. Seed Comparison for Farm
s, res = request('GET', f'/api/v1/farms/{farm_id}/mustard-comparison', token=farmer_token)
best_v = res['comparison'][0]
print(f"6. Seed Comparison Evaluation: {s}, Ranked Best: {res['best_mustard_variety']} (Score: {best_v['overall_score']})")
assert s == 200

# 7. Profitability
s, res = request('GET', f'/api/v1/profitability/{farm_id}', token=farmer_token)
print(f"7. Profitability Comparison: {s}, Estimated Net Profit Difference: Rs {res['profit_difference']}")
assert s == 200

# 8. Geospatial & PostGIS Distance
s, res = request('GET', f'/api/v1/geospatial/{farm_id}', token=farmer_token)
market0 = res['nearby_markets'][0]
print(f"8. Geospatial APMC Routing: {s}, Closest Market: {market0['market_name']}, Distance: {market0['distance_km']} km")
assert s == 200

# 9. Subsidies
s, res = request('GET', f'/api/v1/subsidies/{farm_id}', token=farmer_token)
print(f"9. Matched Government Schemes: {s}, Count: {len(res)}, Top Scheme: {res[0]['scheme_name']}")
assert s == 200

# 10. Risk Simulation (Dynamic 4 Scenarios)
s, res = request('POST', '/api/v1/risk-simulation', {'farm_id': farm_id, 'crop_id': 2}, token=farmer_token)
print(f"10. Risk Simulation Scenarios: {s}")
print(f"    - Baseline: {res['baseline']['safety_score']} ({res['baseline']['decision']})")
print(f"    - Price Down: {res['price_down']['safety_score']} ({res['price_down']['decision']})")
print(f"    - Yield Down: {res['yield_down']['safety_score']} ({res['yield_down']['decision']})")
print(f"    - Water Risk: {res['water_risk']['safety_score']} ({res['water_risk']['decision']})")
assert s == 200

# 11. Login as Buyer (buyer_abc)
s, res = login('buyer_abc', 'password123')
print(f"11. Buyer Login: {s}, User: {res['user']['username']}, Role: {res['user']['role']}")
assert s == 200
buyer_token = res['access_token']

# 12. Buyer Creates Demand
demand_payload = {
    "crop_name": "Groundnut",
    "quantity_tonnes": 15.0,
    "target_price_per_qtl": 6200.0,
    "required_grade": "A",
    "target_location": "Tumkur",
    "target_state": "Karnataka",
    "delivery_start": "2026-10-15",
    "delivery_end": "2026-11-15",
    "description": "High oil content groundnut for cold-pressed oil extraction."
}
s, demand_res = request('POST', '/api/v1/buyer-demands', demand_payload, token=buyer_token)
print(f"12. Buyer Demand Created: {s}, ID: {demand_res['id']}, Crop: {demand_res['crop_name']} ({demand_res['quantity_tonnes']}t)")
assert s == 200
demand_id = demand_res['id']

# 12. Farmer Views Demands with Farm Match Score
s, demands = request('GET', '/api/v1/marketplace/demands', token=farmer_token)
print(f"12. Farmer Marketplace Demands: {s}, Available: {len(demands)}, Top match score: {demands[0].get('match_score', 'N/A')}%")
assert s == 200
assert len(demands) >= 1

# 13. Farmer Creates Future Crop Lot
lot_payload = {
    "farm_id": farm_id,
    "crop_name": "Groundnut",
    "expected_quantity_tonnes": 15.0,
    "expected_grade": "A",
    "expected_harvest_start": "2026-10-20",
    "expected_harvest_end": "2026-11-10",
    "land_area_acre": 3.0,
    "location": "Tumkur",
    "state": "Karnataka",
    "description": "Premium TMV 2 variety groundnut, organically cultivated."
}
s, lot_res = request('POST', '/api/v1/future-lots', lot_payload, token=farmer_token)
print(f"13. Future Crop Lot Created: {s}, Lot ID: {lot_res['id']}, Status: {lot_res['status']}")
assert s == 200
lot_id = lot_res['id']

# 14. Farmer Opens Auction for the Lot
s, auction_res = request('POST', '/api/v1/auctions', {'lot_type': 'FUTURE_CROP', 'lot_id': lot_id}, token=farmer_token)
print(f"14. Auction Opened: {s}, Auction ID: {auction_res['id']}, Status: {auction_res['status']}")
assert s == 200
auction_id = auction_res['id']

# 15. Buyer Places Conditional Indicative Bid
bid_payload = {
    "bid_price_per_qtl": 6350.0,
    "quantity_tonnes": 15.0,
    "required_grade": "A",
    "transport_cost_per_qtl": 120.0,
    "quality_conditions": "Moisture <= 8%, Oil content >= 48%",
    "additional_conditions": "Delivery at Tumkur warehouse within harvest window."
}
s, bid_res = request('POST', f'/api/v1/auctions/{auction_id}/bids', bid_payload, token=buyer_token)
print(f"15. Buyer Placed Conditional Bid: {s}, Bid ID: {bid_res['id']}, Price: Rs {bid_res['bid_price_per_qtl']}/qtl, Effective: Rs {bid_res['effective_price_per_qtl']}/qtl")
assert s == 200
bid_id = bid_res['id']

# 16. Farmer Accepts Indicative Bid
s, accept_res = request('POST', f'/api/v1/auctions/bids/{bid_id}/accept', token=farmer_token)
print(f"16. Farmer Accepted Indicative Offer: {s}")
print(f"    - Notice: {accept_res['message']}")
print(f"    - Legal Disclaimer: {accept_res['disclaimer']}")
assert s == 200

# 17. Double Opt-in Contact Sharing (Farmer gives consent)
s, f_consent = request('POST', f'/api/v1/contact-sharing/{bid_id}/permission?allow=true', token=farmer_token)
print(f"17. Farmer Contact Consent: {s}, Status: {f_consent['status']}")
assert s == 200

# 18. Buyer gives consent -> Contacts mutually revealed
s, b_consent = request('POST', f'/api/v1/contact-sharing/{bid_id}/permission?allow=true', token=buyer_token)
print(f"18. Buyer Contact Consent: {s}, Status: {b_consent['status']}")
print(f"    - Revealed Farmer: {b_consent['farmer_contact']['username']} ({b_consent['farmer_contact']['email']})")
print(f"    - Revealed Buyer: {b_consent['buyer_contact']['username']} ({b_consent['buyer_contact']['email']})")
assert s == 200
assert b_consent['status'] == 'SHARED'

print('\n' + '=' * 75)
print('*** COMPLETE CROPSHIFT PLATFORM LIFECYCLE VALIDATED WITH 100% SUCCESS! ***')
print('=' * 75)
