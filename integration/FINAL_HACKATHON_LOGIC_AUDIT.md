# CropShift — Final Hackathon Logic Audit

---

## Executive Summary

A comprehensive, line-by-line audit of the entire CropShift codebase (Frontend, Backend, Database, Decision Engine, and Marketplace layers) was conducted to identify any remaining hardcoded logic, disconnected APIs, localStorage dependencies, or demo-only shortcuts.

---

## Detailed Findings Matrix

| ID | Finding | File | Root Cause | Severity | Planned Fix | Verification Method |
|:---|:---|:---|:---|:---|:---|:---|
| **F-01** | Golden Demo Hardcoded Bypass | `backend/app/api/v1/risk.py:124-130` | Legacy `if payload.farm_id == 1 and payload.crop_id == 2:` returned hardcoded scores bypassing real calculation | **HIGH** | Remove the hardcoded branch; calculate all scenarios dynamically via `evaluate_scenario` | Pytest on `test_golden_demo.py` & `test_risk_simulation.py` with custom parameters |
| **F-02** | Static Recommendation on Farmer Dashboard | `frontend/src/pages/FarmerDashboardPage.tsx:157` | Hardcoded string `"🌱 Groundnut · 88% Suitable"` rendered without querying user's farm data | **MEDIUM** | Query `getMyFarms()` and `getOilseedSuitability(farmId)` dynamically; show clean empty state if no farm exists | Vitest on `dashboard.test.tsx` and UI inspection |
| **F-03** | Static Weather & Scheme Snippets on Dashboard | `frontend/src/pages/FarmerDashboardPage.tsx:264-282` | Static snippets for Tumkur / Karnataka rendered unconditionally | **LOW** | Dynamically populate district and state from active farm profile | Vitest and UI inspection |
| **F-04** | LocalStorage-Only Dependency on Profitability Page | `frontend/src/pages/ProfitabilityPage.tsx:17` | Direct `getFarmDetails()` call from `localStorage` renders empty page on fresh session or direct URL access | **HIGH** | Hydrate from `getMyFarms()` API asynchronously if `localStorage` has no farm | Vitest on `profitability.test.tsx` and manual browser refresh |
| **F-05** | LocalStorage-Only Dependency on Map Page | `frontend/src/pages/MapPage.tsx:18` | `getFarmDetails()` called synchronously on mount without backend fallback | **HIGH** | Fetch farm list from `getMyFarms()` API and load coordinates dynamically | Vitest on `map.test.tsx` and manual browser refresh |
| **F-06** | LocalStorage-Only Dependency on Subsidies Page | `frontend/src/pages/SubsidiesPage.tsx:16` | `getFarmDetails()` called synchronously on mount without backend fallback | **HIGH** | Fetch farm list from `getMyFarms()` API and load schemes dynamically | Vitest on `subsidies.test.tsx` and manual browser refresh |
| **F-07** | LocalStorage-Only Dependency on Risk Simulation Page | `frontend/src/pages/RiskSimulationPage.tsx:24` | Relies on `getFarmDetails()` and `getRecommendation()` from `localStorage` | **HIGH** | Fetch active farm from `getMyFarms()` and active recommendation from API | Vitest on `risk.test.tsx` and manual browser refresh |
| **F-08** | Incomplete Crop Mapping on Market Page | `frontend/src/pages/MarketPage.tsx:25-30` | Static mapping `Cotton -> 3` instead of comprehensive oilseed crop dictionary | **MEDIUM** | Map all 7 supported crops dynamically (`Paddy: 1, Groundnut: 2, Sunflower: 3, Soybean: 4, Mustard: 5, Sesame: 6, Maize: 7`) | Vitest on `market.test.tsx` and UI inspection |
| **F-09** | Weather Risk Penalty in Drought Simulation | `backend/app/api/v1/risk.py:75` | `simulated_water_avail = "POOR"` passed string to boolean parameter `water_availability: bool` | **MEDIUM** | Pass boolean `False` to `calculate_risk_score` and update `simulated_farm_cond["water_availability"] = False` | Pytest risk calculation tests |

---

## Data Flow Verification

```
[Farmer Input via Form]
   State: Karnataka
   District: Tumakuru
   Soil: Red Laterite
   Water: Available
   Land: 3 acres
   Current crop: Paddy
         │
         ▼
[PostgreSQL Database (Table: farm)]
   Persisted with owner_id = current_user.id
   Point Geometry: SRID 4326 POINT(77.1025 13.3409)
         │
         ▼
[Decision Engine Pipeline]
   ├── suitability.py (Soil match + Water match + Region fit)
   ├── profitability.py (Expected Yield × Price - Cultivation Cost × 3 acres)
   ├── market.py / geospatial (PostGIS ST_Distance to Tumkur APMC = 0.3 km)
   ├── risk.py (Multi-scenario price/yield/water stress tests)
   └── safety_score.py (Weighted Headline Index & Decision: SWITCH / CAUTION / DONT_SWITCH)
         │
         ▼
[Frontend Presentation]
   ├── /farmer/recommendation: Oilseed Feasibility & Seed Variety Compare
   ├── /farmer/profitability: Live per-acre & total 3-acre profit difference
   ├── /farmer/market & /farmer/geospatial: True APMC distance & price trend
   ├── /farmer/subsidies: Real NMEO-OP / PM-KISAN matching
   └── /farmer/my-lots: Pre-sowing auction & indicative bidding
```

---

## Verification Plan

1. **Backend**: Execute all 160 Pytest units verifying zero regressions after removing hardcoded branches.
2. **Frontend**: Execute all 116 Vitest units verifying data hydration from API on fresh state.
3. **TypeScript Build**: Ensure `npm run build` exits with code 0.
4. **End-to-End**: Verify multi-tenant user isolation and interactive flow from registration to seed comparison and marketplace bidding.
