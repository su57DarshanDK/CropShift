# Mustard Seed Comparison Feature Audit

This report documents the implementation, database architecture, calculation engine, API contract, frontend UI, testing, and integration verification for the **Mustard Seed Comparison** feature in CropShift.

---

## 1. Files Created & Modified

### Backend Files
- **[NEW] [mustard_variety.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/models/mustard_variety.py)**: SQLAlchemy model for `MustardVariety` (`mustard_varieties` table).
- **[MODIFY] [models/\_\_init\_\_.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/models/__init__.py)**: Exported `MustardVariety`.
- **[MODIFY] [seed.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/database/seed.py)**: Seeded 5 real Indian ICAR mustard varieties (`Pusa Mustard 30`, `Pusa Bold`, `DRMRIJ 31 / Giriraj`, `RH 749`, `NRCHB 101`). Added sequence syncing for `mustard_varieties`.
- **[NEW] [mustard_comparison.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/decision_engine/mustard_comparison.py)**: Decision calculation engine for evaluating and ranking mustard varieties based on farm inputs.
- **[NEW] [mustard_comparison.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/schemas/mustard_comparison.py)**: Pydantic schemas (`MustardVarietyResult`, `MustardComparisonResponse`).
- **[NEW] [mustard_comparison.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/api/v1/mustard_comparison.py)**: FastAPI router defining `GET /api/v1/farms/{farm_id}/mustard-comparison`.
- **[MODIFY] [router.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/app/api/router.py)**: Mounted `mustard_comparison` router.
- **[NEW] [test_mustard_comparison.py](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/backend/tests/test_mustard_comparison.py)**: Unit test suite covering authentication, 403 authorization, 404 handling, and dynamic input change tests.

### Frontend Files
- **[MODIFY] [types/api.ts](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/types/api.ts)**: Added `MustardVarietyResult` and `MustardComparisonResponse` TypeScript interfaces.
- **[MODIFY] [services/api.ts](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/services/api.ts)**: Added `getMustardComparison(farmId: number)` service function.
- **[MODIFY] [RecommendationPage.tsx](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/pages/RecommendationPage.tsx)**: Added `"🌱 Mustard Seed Comparison"` card under **Explore Further** section navigating to `/mustard-comparison`.
- **[NEW] [MustardComparisonPage.tsx](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/pages/MustardComparisonPage.tsx)**: Dedicated page component showing Farm Context, 🏆 Best Match Card, and Comparison Table.
- **[MODIFY] [App.tsx](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/App.tsx)**: Registered route `/mustard-comparison`.
- **[NEW] [mustardComparison.test.tsx](file:///c:/Users/dkdar/Downloads/CropShift%20Sqlx/frontend/src/tests/mustardComparison.test.tsx)**: Unit tests for card rendering, page loading, table sorting, empty and error states.

---

## 2. Database Schema Changes

### `mustard_varieties` Table
```sql
CREATE TABLE mustard_varieties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    variety_code VARCHAR(50) NOT NULL UNIQUE,
    suitable_soil_types VARCHAR(255) NOT NULL,
    water_requirement VARCHAR(50) NOT NULL, -- Low, Medium, High
    maturity_duration_days INTEGER NOT NULL,
    expected_yield_per_acre FLOAT NOT NULL,  -- in Quintals/acre
    expected_price_per_unit FLOAT NOT NULL,   -- in ₹/Quintal
    production_cost_per_acre FLOAT NOT NULL,  -- in ₹/Acre
    disease_resistance VARCHAR(255),
    pest_risk VARCHAR(100),
    suitability_info TEXT,
    region_suitability VARCHAR(255) NOT NULL,
    market_info TEXT,
    data_source VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Seeded Mustard Seed Varieties
1. **Pusa Mustard 30 (Lesira)**: Low erucic acid, 9.5 q/ac yield, ₹5,650/q, Loamy/Alluvial/Red/Black soil.
2. **Pusa Bold**: High drought tolerance, 8.5 q/ac yield, ₹5,450/q, Sandy/Red/Loamy soil, Low water requirement.
3. **DRMRIJ 31 (Giriraj)**: High oil content (40.5%), 10.8 q/ac yield, ₹5,700/q, Black/Clay Loam soil.
4. **RH 749**: High biomass, 11.2 q/ac yield, ₹5,500/q, Alluvial/Fertile Loam, High water requirement.
5. **NRCHB 101**: Early maturity (110 days), 8.2 q/ac yield, ₹5,550/q, Sandy Loam/Loamy, Low water requirement.

---

## 3. Calculation Engine Logic

Evaluates every active mustard variety against the farmer's specific farm attributes (`soil_type`, `water_availability`, `state`, `district`, `land_area_acre`):

- **Suitability Score (0 - 100)**:
  - Soil match: +20 points for exact/category match, -20 points penalty for mismatch.
  - Region match: +10 points for state/district match.
  - Water compatibility:
    - Limited water + High water variety: -30 suitability penalty, +35 risk penalty.
    - Limited water + Low water variety: +15 suitability bonus.
- **Economics / Profitability**:
  - `expected_revenue_per_acre = expected_yield_per_acre × expected_price_per_unit`
  - `profit_per_acre = expected_revenue_per_acre - production_cost_per_acre`
  - `estimated_net_profit = profit_per_acre × land_area_acre`
  - `profitability_score = clamp((profit_per_acre / 35,000) * 85, 0, 100)`
- **Overall Score**:
  - `overall_score = clamp(0, 100, int(0.35 * suitability + 0.35 * profitability + 0.15 * market - 0.15 * risk))`
- **Decision & Ranking**:
  - Ranked by `overall_score` descending. Top variety assigned `"RECOMMENDED"`.

---

## 4. API Specification

### Endpoint: `GET /api/v1/farms/{farm_id}/mustard-comparison`
- **Security**: Bearer JWT token required (`Authorization: Bearer <token>`).
- **Authorization**: Enforces `farm.owner_id == current_user.id`.
- **Response HTTP Statuses**:
  - `200 OK`: Returns complete comparison JSON.
  - `401 Unauthorized`: Missing or invalid JWT token.
  - `403 Forbidden`: User attempts to access another farmer's farm.
  - `404 Not Found`: Farm ID does not exist.

---

## 5. Test Results

- **Backend Pytest**: **150 passed / 0 failed** (including 5 tests in `test_mustard_comparison.py`).
- **Frontend Vitest**: **124 passed / 0 failed** (18/18 test files passed).
- **Live HTTP Integration Test**: Verified live against PostgreSQL 18 + FastAPI.
  - Farm Alpha (Black Cotton soil, 5 acres): Best Match = **DRMRIJ 31 (Giriraj)** (Score: 80).
  - Farm Beta (Sandy Loam soil, 2 acres, limited water): Best Match = **NRCHB 101** (Score: 69).
  - Unauthorized Cross-User Access Attempt: **`403 Forbidden`**.
- **Production Build**: `npm run build` completed with 0 errors (`dist/assets/index-DIhwQfK9.js`).

---

## 6. Browser Verification Status

- Unit and HTTP integration tests complete and verified 100% green.
- Headless browser verification ready to run against `http://localhost:5173/mustard-comparison`.
