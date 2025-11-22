---

# StatCat Football Platform

StatCat centralizes combine data, athlete onboarding, and team collaboration for grassroots and academy programs. The stack pairs a FastAPI/SQLModel backend with a Vite React frontend so clubs, staff, coaches, and athletes can share metrics, content, and schedules through one channel.

## Deployment (Render backend + Vercel frontend + Neon DB)

- Backend (Render)
  - Env vars: `ENVIRONMENT=production`, `AUTO_SEED_DATABASE=false`, strong `SECRET_KEY`, `DATABASE_URL` (Neon), `BACKEND_CORS_ORIGINS=["https://<frontend-domain>"]`, SMTP creds (rotated), `MEDIA_ROOT=/app/media`.
  - Storage: attach a persistent disk/volume and mount to `/app/media` for uploads. If you move to S3 later, point MEDIA_ROOT accordingly and set bucket/region/creds.
  - Health check: `/health`. Run with Render’s native Python environment or the provided Dockerfile.

- Frontend (Vercel)
  - Env vars: `VITE_API_BASE_URL=https://<render-backend-url>` plus `VITE_APP_BRAND_NAME`, `VITE_BRAND_ID`, `VITE_BRAND_FAVICON`.
  - Build command: `npm run build`.

- Database (Neon)
  - Migrations applied (`alembic upgrade head`). Keep the Neon URL only in platform secrets.

- Smoke tests post-deploy
  - `/health`, login/signup, password reset email, upload/download media, dashboard pages.

## Project Layout

```
.
├── backend/        # FastAPI + SQLModel API, Alembic migrations, scripts
├── frontend/       # React (TypeScript) + Vite app, Tailwind/Tremor UI
├── scripts/        # Branding builder, DB tooling
├── tests/          # Backend pytest suite
├── branding/       # Club-specific presets (logos, colors, env)
└── packages/       # Generated deliverables per club
```

## Current Highlights

### Authentication & Access Control
- JWT authentication with refresh handling
- Role-based permissions (admin, staff, coach, athlete)
- Athlete onboarding + approval workflow
- Protected routes on the frontend and backend

### Athlete Operations
- Self-serve registration, profile editing, and document capture
- Status tracking (Incomplete → Pending → Approved/Rejected)
- Admin view with bulk operations and filters
- Player Profile portal (overview, combines, report cards, scheduling)

### Team & Staff Management
- Team builder with roster drag-and-drop
- Coach directory with assignments and invites
- Team feed (community posts with photo uploads)
- Per-team dashboards with leaderboards, schedules, combine metrics, and a maintenance utility for end-of-season exports

### Reporting & Analytics
- Combine result entry (splits, YoYo, jump, max power) via API or UI
- Leaderboards for scorers and clean sheets (global, team-filtered)
- Report cards, match reports, approval queue, and insights tracker
- Calendar + availability panel for events, training, and combines

### Branding & Packaging
- Theme definitions (`branding/*.json`) drive colors, logos, and env files
- `scripts/build_club_package.py` produces env bundles + themed builds per club
- Assets placed under `packages/<club-id>/` for deployment

## Technology Stack

- **Backend:** FastAPI, SQLModel, PostgreSQL/SQLite, Alembic, Pydantic, JWT
- **Frontend:** React 18, TypeScript, Vite, React Query, Zustand, Tailwind CSS, Tremor, FontAwesome
- **Tooling:** Pytest, Ruff, MyPy, ESLint, Vitest
- **DevOps hooks:** Docker Compose, branding builder script

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ (with npm)
- (Optional) PostgreSQL for production/testing

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env
# Edit .env and set SECRET_KEY, DATABASE_URL, BACKEND_CORS_ORIGINS, MEDIA_ROOT
uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

For migrations:
```bash
cd backend
alembic upgrade head          # apply latest schema
alembic revision --autogenerate -m "Describe change"
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Production build:
```bash
npm run build
npm run preview
```
Set `VITE_API_BASE_URL` and `VITE_MEDIA_BASE_URL` for non-local deployments. When `VITE_ENABLE_PWA_BUILD=true`, the Service Worker/PWA bundle is included.

## Configuration

### Backend `.env`
```
SECRET_KEY=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
MEDIA_ROOT=media
DATABASE_URL=sqlite:///./data/combine.db  # or PostgreSQL DSN
```

For PostgreSQL testing, create a second `.env` (for example `env.test`) pointing to `postgresql://.../statcat_test`.

### Frontend env (`.env.local`)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_MEDIA_BASE_URL=http://localhost:8000/media
VITE_ENABLE_PWA_BUILD=false
```

## Useful Commands

### Backend
- Run dev server: `uvicorn app.main:app --reload`
- Tests: `PYTHONPATH=backend .venv/bin/python -m pytest`
- Lint: `ruff check app`
- Types: `mypy app`
- Seed/reset DB: use scripts in `backend/scripts/`

### Frontend
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests (if configured): `npm run test`

## API Overview
- Auth: `/api/v1/auth/*`
- Athletes: `/api/v1/athletes/*`
- Teams / Coaches: `/api/v1/teams/*`
- Team feed + posts: `/api/v1/teams/{team_id}/posts`
- Team combine metrics: `/api/v1/teams/{team_id}/combine-metrics`
- Reports/analytics: `/api/v1/reports/*`, `/api/v1/analytics/*`
- Events: `/api/v1/events/*`

Refer to the OpenAPI schema for parameter details and response models.

## Branding Packages

```
python scripts/build_club_package.py <club-id>
```

Outputs (`packages/<club-id>/`):
- `frontend-dist/`: themed static build
- `backend.env`, `frontend.env`, `compose.env`: environment files
- `branding.json`: snapshot of the source branding config

Use `--skip-build` to regenerate envs only, or `--persist-theme` to keep the generated Tailwind theme checked in. By default the script restores the previous theme files after building.

## Test Accounts (Demo)

| Email               | Password  | Role   |
|---------------------|-----------|--------|
| admin@combine.local | admin123  | admin  |
| staff@combine.local | staff123  | staff  |
| coach@combine.local | coach123  | coach  |

Athletes self-register and need approval before accessing their profile.

## Notes
- Media uploads are served from `/media`. Ensure `MEDIA_ROOT` exists and is writable (`backend/media/` by default).
- When running the frontend in development, set `VITE_MEDIA_BASE_URL` so images from Team Feed render correctly.
- The SQLite DB is stored under `backend/data/` (gitignored). Use PostgreSQL for staging/production.

StatCat is under active development. Larger backlog items include comment reactions, team feed filters, global search, and additional automated QA coverage.
- Logos/favicons live inside `branding/assets/<club-id>/`. Reference them from the club JSON via the `assets` block.
- During a build the helper copies those files into `frontend/public/branding/<club-id>/` and generates `frontend/src/theme/branding.generated.ts` so React components pick up the correct paths.
- When testing locally and you want to keep the generated files in place (so `docker compose up` shows the club colors/logo), run:

  ```bash
  python scripts/build_club_package.py <club-id> --persist-theme --persist-branding --persist-assets
  docker compose up -d --build frontend
  ```

  The `--persist-*` flags keep the temporary files so the next `npm run dev` / Docker build reuses them. Omit the flags in CI or when you just want to produce a clean package.

- `python scripts/build_club_package.py` automatically appends `http://localhost:3000` and `http://localhost:5173` to `BACKEND_CORS_ORIGINS` so the package works locally. Provide `--no-localhost-cors` if you need a production-only `.env`.
- The dev server (`npm run dev`) now reads default branding values from `frontend/.env.development` (Elite 1). Override them per machine using `frontend/.env.local` so you can keep the base experience intact while preparing custom packages.

## Project Status

- Complete authentication and approval workflow
- Athlete and team management
- Assessment session scheduling and reporting
- Dashboard and analytics
- Comprehensive test coverage
- RESTful API with OpenAPI docs
- Responsive UI with mobile support

## Architecture Notes

- Monorepo with separate backend and frontend
- Type-safe schemas (Pydantic, TypeScript)
- Secure password storage and JWT tokens
- Alembic migrations for schema versioning
- Pagination and optimized queries
- Role-based access control and input validation

## Performance & Security

- Indexed columns and eager loading for database performance
- JWT authentication and bcrypt password hashing
- CORS and RBAC on all endpoints
- Comprehensive test coverage and code quality checks

---
