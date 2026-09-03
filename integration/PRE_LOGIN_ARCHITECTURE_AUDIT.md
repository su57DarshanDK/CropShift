# Pre-Login Architecture Audit & Implementation Plan

## 1. Current Architecture Summary
- **Frontend**: React 18, TypeScript, Vite, React Router v6, Tailwind CSS.
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0 ORM, Pydantic v2.
- **Database**: PostgreSQL 18 with PostGIS 3.6.2 extension enabled (running on port 5433).
- **Authentication**: OAuth2 Password Flow (JWT tokens with `sub` and `user_id` claims, bcrypt password hashing via `passlib`).
- **Role System**: Role-based access control with `"farmer"` and `"buyer"` roles stored in the `user` table.

---

## 2. Existing Auth Flow & Roles
- **Registration**: `/api/v1/auth/register` creates user with role (`"farmer"` or `"buyer"`).
- **Token Login**: `/api/v1/auth/token` validates credentials and returns a signed JWT bearer token.
- **User Info**: `/api/v1/auth/me` returns the authenticated user object including role.
- **Role Guards**: Backend has `get_current_farmer` and `get_current_buyer` dependencies. Frontend has `<ProtectedRoute allowedRole="..." />`.

---

## 3. Existing Routes Analysis

### Public & Auth Routes
- `/`: Currently routes dynamically based on auth state (`RoleSelectionPage`, `FarmerDashboardPage`, or `BuyerDashboardPage`).
- `/select-role`, `/login`: Role selection entry.
- `/farmer/login`, `/login/farmer`: Farmer login page.
- `/buyer/login`, `/login/buyer`: Buyer login page.
- `/farmer/register`, `/register/farmer`: Farmer registration page.
- `/buyer/register`, `/register/buyer`: Buyer registration page.

### Farmer Protected Routes
- `/farmer/home`: Farmer dashboard / application shell.
- `/farmer/farm`, `/farmer/analyze`: Farm analysis form.
- `/farmer/profit`: Profitability comparison & engine.
- `/farmer/market`: Market intelligence & dynamic scoring.
- `/farmer/map`: Map & weather context.
- `/farmer/subsidies`: Subsidies & scheme eligibility.
- `/farmer/risk`: Risk simulation.
- `/farmer/demands`: Marketplace buyer demands.
- `/farmer/future-lots`, `/farmer/auctions`, `/farmer/bids`, `/farmer/accepted-offers`: Farmer future crop auctions & lot management.
- `/farmer/stock`, `/farmer/stock-auctions`: Farmer stock management.
- `/farmer/certificates`: Trust certificates.

### Buyer Protected Routes
- `/buyer/home`: Buyer marketplace dashboard.
- `/buyer/demands`, `/buyer/my-demands`: Buyer demand creation & management.
- `/buyer/future-crops`, `/buyer/marketplace`: Browse farmer future crop lots.
- `/buyer/stock`: Browse available physical stock lots.
- `/buyer/bids`: Manage active bids.
- `/buyer/accepted-offers`: Manage accepted deals.
- `/buyer/certificates`: View verified certificates.

---

## 4. Problems Discovered

1. **Email vs Username Login Mismatch**: `/api/v1/auth/token` only matched `User.username == form_data.username`. When logging in with email (e.g., `farmer@cropshift.demo`), the query failed unless email was checked as well.
2. **Missing Specific Demo Accounts in Seed**: The prompt requires `farmer@cropshift.demo` (`Farmer@123`) and `buyer@cropshift.demo` (`Buyer@123`) to exist in the database with linked farmer/buyer entities.
3. **Route Aliasing & Navigation Consistency**: Sidebar navigation needed strict alignment with Section 17 (Farmer Sidebar) and Section 18 (Buyer Sidebar) requirement lists, maintaining strict separation between Farmer and Buyer experiences.
4. **Role Security Enforcements**: Ensuring all backend endpoints strictly validate role permissions (401 for unauthenticated, 403 for role forbidden) and ownership constraints (403/404 for cross-user farm access).

---

## 5. Exact Implementation Plan

### Phase 1: Database Seed & Auth Endpoint Enhancements
1. Update `backend/app/api/v1/auth.py` so login checks both `username` AND `email`.
2. Update `backend/app/database/seed.py` to include `farmer@cropshift.demo` (Rajesh Kumar, 3 acres, Tumkur, Karnataka) and `buyer@cropshift.demo` (ABC Agro Traders), plus complete realistic marketplace demo data.
3. Re-run `init_db` and `seed` script on PostgreSQL (port 5433).

### Phase 2: Frontend Route Alignment & Layout Separation
1. Ensure `/` shows the `RoleSelectionPage` for unauthenticated users with two visually distinct cards: 🌾 **FARMER** and 🏪 **BUYER / MARKETPLACE**.
2. Support `/farmer/login`, `/farmer/register`, `/farmer/home` and `/buyer/login`, `/buyer/register`, `/buyer/home`.
3. Update `FarmerLayout.tsx` and `BuyerLayout.tsx` sidebars to strictly match the requested section 17 and section 18 ordering.
4. Ensure `<ProtectedRoute>` prevents Farmers from opening Buyer pages and Buyers from opening Farmer pages.

### Phase 3: Full End-to-End Verification
1. Run backend pytest suite (160 tests).
2. Test real HTTP login & marketplace flows with real database persistence.
3. Generate `integration/FINAL_MARKETPLACE_LOGIN_VERIFICATION.md`.
