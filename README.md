# CropShift — "Know Your Market Before You Sow"

CropShift is an agricultural decision support and pre-sowing market platform. It empowers Indian farmers to evaluate and execute data-backed crop shifts from water-intensive paddy/wheat cultivation toward high-profit oilseeds (Groundnut, Mustard, Soybean, Sunflower, Sesame).

---

## Architecture Overview

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, SPA Routing
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0, GeoAlchemy2, Pydantic V2
- **Database**: PostgreSQL 15+ with PostGIS spatial extension enabled
- **APIs**: REST API with `/api/v1` prefix and OpenAPI/Swagger documentation

---

## Local Development Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 15+ with PostGIS installed

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# Initialize database schema and reference data
python -m app.database.init_db
python -m app.database.seed

# Start FastAPI development server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start Vite development server
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)

---

## Running the Test Suite

```bash
# Run Backend Tests (160 tests)
cd backend
pytest

# Run Frontend Tests (116 tests)
cd frontend
npm test

# Run TypeScript Validation & Production Build
cd frontend
npm run build
```

---

## Production Deployment — Render

CropShift is configured for one-click deployment on [Render.com](https://render.com) using the included `render.yaml` blueprint.

### 1. GitHub Repository Setup
1. Push your CropShift codebase to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Prepare CropShift for production deployment"
   git remote add origin https://github.com/su57DarshanDK/Sql-x.git
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy Using Render Blueprint (`render.yaml`)
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `su57DarshanDK/Sql-x`.
4. Render will automatically parse `render.yaml` and provision 3 resources:
   - **`cropshift-db`** (Managed PostgreSQL Database)
   - **`cropshift-api`** (FastAPI Python Web Service)
   - **`cropshift-web`** (React/Vite Static Site)
5. Click **Apply**.

---

### 3. Manual Deployment Configuration (Alternative)

If deploying services individually on Render without blueprints:

#### A. Managed PostgreSQL (`cropshift-db`)
- **Name**: `cropshift-db`
- **Database**: `cropshift`
- **User**: `cropshift_user`
- **Region**: Same as web services (e.g. `Oregon`)
- *Note on PostGIS*: Render PostgreSQL has the PostGIS extension available. Our application automatically initializes tables and runs `CREATE EXTENSION IF NOT EXISTS postgis;` on startup.

#### B. FastAPI Web Service (`cropshift-api`)
- **Environment**: `Python`
- **Root Directory**: `backend`
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Health Check Path**: `/health`
- **Environment Variables**:
  | Variable | Value / Source |
  |:---|:---|
  | `DATABASE_URL` | *Internal Database URL from `cropshift-db`* |
  | `SECRET_KEY` | *A secure random 32-byte secret string* |
  | `CORS_ORIGINS` | `https://cropshift-web.onrender.com,http://localhost:5173` |

#### C. React / Vite Static Site (`cropshift-web`)
- **Environment**: `Static Site`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **SPA Rewrite Rule**:
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Action**: `Rewrite` (handled by `frontend/public/_redirects`)
- **Environment Variables**:
  | Variable | Value |
  |:---|:---|
  | `VITE_API_URL` | `https://cropshift-api.onrender.com` |
  | `VITE_USE_MOCKS` | `false` |