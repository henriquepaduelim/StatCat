


https://github.com/user-attachments/assets/95990c81-d890-492f-ab60-bdde2d61d656


https://github.com/user-attachments/assets/9117c132-41aa-49d3-880c-c0807bf84613



https://github.com/user-attachments/assets/64ffa3b6-6f6b-4ceb-b0b0-b3f4f46c0f39



https://github.com/user-attachments/assets/b00076a5-a800-456d-8b51-d1b5bc87f177



# Combine Football Platform

Internal pilot build that centralises physical and technical assessments, branded reporting, and client-facing dashboards for football combines.

## Monorepo Layout

```
.
├── backend/   # FastAPI + SQLModel API (SQLite seed, media uploads, JWT auth)
└── frontend/  # Vite/React dashboard and marketing site with shared assets
```

## Phase Snapshot — Pilot Ready
- Authenticated multi-tenant experience for `staff` (HQ) and `club` operators sharing the same API.
- Scheduling, athlete management, and reporting flows are wired end-to-end with live FastAPI endpoints.
- Admin area lists partner clubs and surfaces activity metrics; settings/report pages are placeholders for upcoming configuration work.
- Marketing landing page, dashboard, athletes, sessions, reports, and admin routes are styled with the current theme system and sample content.
- SQLite seed data ships realistic clients, users, tests, sessions, and KPI results; optional rich data loader available for Players To Pro.

## Backend Highlights (FastAPI + SQLModel)
- JWT/OAuth2 authentication (`/api/v1/auth`) for `staff`, `club`, and future `athlete` roles; tokens issued through `/auth/login` with an expanded profile available from `/auth/login/full`.
- CRUD endpoints for clients, athletes (including `/media/athletes/<id>` photo upload with 5 MB cap), test definitions, assessment sessions, and session results.
- Athlete report generator (`GET /api/v1/reports/athletes/{id}`) groups sessions, computes trend-friendly metrics, and adds peer averages by age band.
- Dashboard summary (`/api/v1/dashboard/summary`) counts active/inactive athletes, respecting role-based scoping.
- SQLite database initialised on startup with seeds for three demo clubs plus command-line helpers in `backend/scripts/` for generating more data.
- Configurable media root and CORS via `.env` variables; static assets served from `/media`.

## Frontend Highlights (React + Vite + Tailwind)
- App shell with Zustand stores for auth, locale, and client-driven theming (colours/logo pulled from the API).
- Landing page in `frontend/src/pages/Home.tsx` showcases hero video, feature highlights, and CTA copy tailored for club decision-makers.
- Dashboard and admin views use Recharts/Tremor widgets for KPIs, top client charts, trend lines, and calendar heatmaps.
- Athlete area supports filtering, sorting, creation, detail view, and photo uploads with optimistic UI states.
- Session workflows cover creation, inline edits, drag-and-drop scheduling on a FullCalendar grid, and quick starts that deep-link into athlete assessments.
- Athlete report page renders printable performance cards, timeframe filters, and comparison charts against peer averages.
- Client detail, settings, and reports pages are scaffolded with copy and layout, ready for upcoming integrations (no API mutations yet).
- React Query powers data fetching with persisted tokens; API wrapper lives in `frontend/src/api` with dedicated modules per resource.

## Local Development

### Requirements
- Python 3.11+
- Node.js 18+
- npm (or yarn/pnpm if you update scripts accordingly)

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env  # set SECRET_KEY, BACKEND_CORS_ORIGINS, MEDIA_ROOT as needed
uvicorn app.main:app --reload
```
- First startup creates `combine.db` and seeds demo data; delete the file to regenerate a clean dataset.
- Interactive docs: http://localhost:8000/docs — Health check: http://localhost:8000/health

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- Vite serves the app on http://localhost:5173 with a dev proxy to `http://localhost:8000/api`.
- Production bundle: `npm run build` → `dist/`; preview with `npm run preview`.

### Seed Credentials
| Email | Role | Password | Notes |
|-------|------|----------|-------|
| admin@mvp.ca | staff | admin123 | Full access, switches client themes |
| jodie@playerstopro.com | club | ptp123456 | Restricted to Players To Pro data |
| urban@combine.dev | club | urban123 | Restricted to Urban Fut data |

## Tooling & Useful Commands
- `uvicorn app.main:app --reload` — Run API locally.
- `pytest` — Placeholder for backend tests (none committed yet).
- `ruff check app` / `mypy app` — Static analysis and type checking.
- `npm run lint` — ESLint over `frontend/src`.
- `npm run build` — Frontend production output.
- `backend/scripts/*` — Utilities for generating or inspecting demo records.

## Known Gaps & Next Up
- Replace ad-hoc seed migrations with Alembic-managed migrations.
- Wire client settings/report admin pages to real endpoints and add mutations.
- Expand automated test coverage on both backend (pytest/httpx) and frontend (RTL/Cypress).
- Finalise PDF/CSV exports plus scheduled deliveries from the reporting module.
- Integrate external storage (S3/MinIO) for high-resolution media and automate cleanup.
