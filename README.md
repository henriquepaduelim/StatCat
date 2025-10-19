


https://github.com/user-attachments/assets/95990c81-d890-492f-ab60-bdde2d61d656


https://github.com/user-attachments/assets/9117c132-41aa-49d3-880c-c0807bf84613



https://github.com/user-attachments/assets/64ffa3b6-6f6b-4ceb-b0b0-b3f4f46c0f39



https://github.com/user-attachments/assets/b00076a5-a800-456d-8b51-d1b5bc87f177



# Combine Football Platform

End-to-end platform for tracking physical and technical tests, centralizing reports, and serving customizable dashboards for partner clubs.

## Monorepo Overview

```
.
├── backend/   # FastAPI + SQLModel API (SQLite by default)
└── frontend/  # Dashboard and marketing site in React/Vite/TypeScript
```

## Current Status

### Backend (FastAPI)
- JWT authentication (`/api/v1/auth`) supporting `staff` and `club` roles, hashed passwords, and OAuth2-issued tokens.
- CRUD for clients, athletes (photo upload in `/media/athletes/<id>`), physical tests, and assessment sessions.
- Consolidated athlete report endpoint (`GET /api/v1/reports/athletes/{id}`) grouping sessions and recorded metrics.
- SQLite database bootstrapped automatically with seeds (clients, users, tests, athletes, sessions, results) in `combine.db`.
- Static file server rooted at `MEDIA_ROOT`, with configuration driven by `.env` variables.

### Frontend (React + Vite)
- Bilingual landing page (English/French) with media assets stored in `public/media`.
- Authenticated area (Dashboard → Athletes → Sessions → Reports) guarded by `RequireAuth` with state persisted through Zustand.
- Dashboard built with Recharts, heatmaps, and comparison widgets; consumes live API data and a fallback dataset to keep the UI functional offline.
- Athlete management flows: list, create, detail, and photo upload.
- Forms to create sessions and tests directly from the dashboard, wired to the backend endpoints.
- Client-driven theming (colors, logo, description) supplied by the clients endpoint.

## Running Locally

### Requirements
- **Python 3.11+** (recommend using `pyenv` or `uv`).
- **Node.js 18+** (using `nvm` makes version switching easier).
- **npm** (or `pnpm`/`yarn`, if preferred).

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"  # installs development deps (pytest, httpx, ruff, mypy)
cp .env.example .env       # adjust SECRET_KEY, BACKEND_CORS_ORIGINS, MEDIA_ROOT, etc.
uvicorn app.main:app --reload
```
- The SQLite database (`combine.db`) is created/seeded on the first startup. Delete the file before launching to regenerate the sample data.
- Interactive docs: http://localhost:8000/docs
- Simple healthcheck: http://localhost:8000/health

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- Vite runs on http://localhost:5173 with an automatic proxy to `http://localhost:8000/api`.
- Production build: `npm run build`; preview build: `npm run preview`.

### Seed Credentials
| User | Role | Password | Notes |
|------|------|----------|-------|
| admin@mvp.ca | staff | admin123 | full access, can switch client themes |
| jodie@playerstopro.com | club | ptp123456 | scoped to Players To Pro Football |
| urban@combine.dev | club | urban123 | scoped to Urban Fut |

## Directory Layout

```
backend/
├── app/
│   ├── api/            # v1 routes (auth, athletes, clients, sessions, tests, reports)
│   ├── core/           # configuration and security helpers (JWT, password hashing)
│   ├── db/             # SQLModel session and seeding utilities
│   ├── models/         # SQLModel tables
│   ├── schemas/        # Pydantic/SQLModel DTOs
│   └── services/       # placeholder for future utilities
├── media/              # local uploads (e.g., athlete photos)
├── combine.db          # auto-generated SQLite database
└── pyproject.toml      # dependencies and dev extras

frontend/
├── src/
│   ├── api/            # axios client and request wrappers (auth, sessions, tests)
│   ├── components/     # AppShell, charts, heatmap, etc.
│   ├── hooks/          # React Query hooks (athletes, sessions, reports...)
│   ├── i18n/           # EN/FR translations
│   ├── pages/          # Home, Dashboard, Athletes, Sessions, Reports
│   ├── stores/         # Zustand stores (auth, theme)
│   └── theme/          # theme generation driven by client metadata
├── public/             # static assets (videos, images)
└── vite.config.ts
```

## Useful Scripts
- `uvicorn app.main:app --reload` – backend dev server.
- `pytest` – backend test suite (httpx already included).
- `ruff check app` / `mypy app` – backend linting and type checks.
- `npm run lint` – frontend ESLint.
- `npm run build` – frontend production build (outputs `dist/`).

## Next Steps
- Configure Alembic migrations instead of recreating SQLite on schema changes.
- Integrate external storage (S3/MinIO) for photos and future attachments.
- Implement automated tests on the backend (pytest + httpx) and frontend (React Testing Library).
- Expand report exports (PDF/CSV) and enable real printing from the frontend.
- Prepare deployment scripts (Docker Compose, CI/CD) and client-specific environments.
