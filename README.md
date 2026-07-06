# Flux Client

Flux Client is a dashboard for Calagopus with Discord OAuth, server management, coin balance tracking, support tickets, AFK rewards, referrals, billing, and a React frontend.

## Project Layout

- `backend/` FastAPI app, SQLAlchemy models, API routes, and background tasks
- `frontend/` React + Vite dashboard
- `docker-compose.yml` PostgreSQL, Redis, backend, and frontend services
- `openapi.json` Calagopus OpenAPI schema used to generate client models

## Requirements

- Python 3.14 or newer
- Node.js 20 or newer
- npm
- PostgreSQL 16
- Redis 7

Docker and Docker Compose can be used instead of installing PostgreSQL and Redis locally.

## Environment Setup

Create a `.env` file at the repository root or export the same values in your shell.

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=flux_client

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# App URLs
FRONTEND_URL=http://localhost:3010
BACKEND_PUBLIC_URL=http://localhost:8010
SECRET_KEY=change-me

# Calagopus
CALAGOPUS_URL=https://panel.freakcloud.tk
CALAGOPUS_API_KEY=your_admin_api_key

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:8010/api/auth/callback

# Optional security / integrations
VPNAPI_KEY=
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_IS_SANDBOX=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com

# Product tuning
AFK_REWARD_PER_HEARTBEAT=1.0
REFERRAL_REWARD_COINS=5.0
DRIFT_SYNC_INTERVAL_SECONDS=900
```

## Local Setup

### 1. Backend

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If you need to regenerate the Calagopus typed models from `openapi.json`:

```powershell
python generate_client.py
```

Run the backend:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will create tables on startup for local development.

### 2. Frontend

From the repository root:

```powershell
cd frontend
npm install
```

If you are running the frontend locally, make sure the API base URL points to the backend:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000"
npm run dev
```

Production build:

```powershell
npm run build
```

Preview the built app:

```powershell
npm run preview
```

## Docker Setup

Docker Compose starts PostgreSQL, Redis, the backend, and the frontend together.
This repository now expects the backend and frontend to be published as GitHub Container Registry images by the GitHub Actions workflow in `.github/workflows/publish-images.yml`.

```powershell
docker compose pull
docker compose up -d
```

Services:

- Backend: `http://localhost:8010`
- Frontend: `http://localhost:3010`
- PostgreSQL: internal Docker network only
- Redis: internal Docker network only

If you want to pin a specific image version, set `FLUX_IMAGE_TAG` in your `.env` file to a commit SHA or release tag instead of `latest`.

### GitHub Actions and GHCR

The workflow publishes two images on every push to `main` or `master`:

- `ghcr.io/blackbox-cmd/flux-client-backend`
- `ghcr.io/blackbox-cmd/flux-client-frontend`

The frontend build needs a repository variable named `VITE_API_BASE_URL` in GitHub Settings.
Set it to the same public API URL you use for `BACKEND_PUBLIC_URL`, for example `https://api.client.example.com`.

If the GHCR packages are private, log in on the VPS before pulling:

```powershell
docker login ghcr.io
```

Then use a GitHub PAT with `read:packages`.

## Running Tests

Backend tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests -q
```

If you are using another virtual environment or system Python, make sure `pytest` is installed in that interpreter first.

## Useful Commands

Regenerate Calagopus models:

```powershell
cd backend
python generate_client.py
```

Run the backend health check:

```powershell
curl http://localhost:8000/health
```

## Notes

- Discord OAuth must point back to the backend callback route.
- SSLCommerz payment validation requires a configured store ID and store password.
- The frontend expects the backend API URL at build time through `VITE_API_BASE_URL`.

## Troubleshooting

- If login redirects fail, verify `DISCORD_REDIRECT_URI`, `FRONTEND_URL`, and `BACKEND_PUBLIC_URL`.
- If database imports fail, confirm `POSTGRES_*` values match your database service.
- If Redis locks are timing out, check that Redis is reachable on the configured host and port.
- If the frontend cannot reach the API, confirm `VITE_API_BASE_URL` and the backend port (`8010` by default in Docker).
