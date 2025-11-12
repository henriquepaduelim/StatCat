# Repository Guidelines

## Project Structure & Module Organization
- `backend/app` contains FastAPI routers, schemas, and services; keep domain logic inside module folders (`athletes`, `teams`, `sessions`) and shared helpers in `core/`.
- `frontend/src` follows feature folders with `components/`, `pages/`, `stores/`, and `lib/`; static assets live in `public/` and built bundles in `frontend/dist`.
- `scripts/` and `backend/scripts/` host database utilities (imports, Alembic helpers) for setup and maintenance.
- `tests/` mirrors the API surface with pytest modules such as `test_auth.py` and `test_teams.py`; add new suites beside the matching router.
- Deployment manifests (`docker-compose.yml`, `render*.yaml`, `vercel.json`) describe container builds and cloud targets; update them when adding environment variables or ports.

## Build, Test, and Development Commands
- Backend dev server: `cd backend && uvicorn app.main:app --reload` (loads `.env` and auto-reloads).
- Backend quality gates: `cd backend && pytest`, `ruff check app`, `mypy app`.
- Database migrations: `cd backend && alembic upgrade head` to apply, `alembic revision --autogenerate -m "..."` to create.
- Frontend workflow: `cd frontend && npm install`, then `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- Full-stack via Docker: `docker-compose up --build` starts API, Vite preview, and the SQLite volume with consistent versions.

## Coding Style & Naming Conventions
- Python uses 4-space indentation, typed SQLModel/Pydantic schemas, and snake_case modules; ensure `ruff` and `mypy` pass before pushing.
- React/TypeScript components use PascalCase filenames (`TeamDashboard.tsx`), hooks stay in `useThing.ts`, and Zustand stores in `*.store.ts`.
- Tailwind classes should be ordered logically (layout → spacing → color); share reusable variants in `frontend/src/lib/styles.ts`.

## Testing Guidelines
- Prefer pytest function-based modules with descriptive names (`test_athletes_approve_flow`); seed data via fixtures in `tests/conftest.py`.
- Target >80% coverage on new backend modules; add regression tests when touching authentication, session scoring, or approval workflows.
- Mock external services (email, S3) with `httpx` test client overrides; never hit live endpoints in CI.
- Frontend tests are minimal today—when adding them, colocate under `frontend/src/__tests__` and mirror the component name.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: add athlete export`, `fix(auth): refresh token ttl`) as reflected in `git log`.
- Each PR should include a summary, linked issue, screenshots/GIFs for UI, test evidence (`pytest`, `npm run build`), and migration notes if schema changes occur.
- Keep commits focused; avoid mixing backend schema changes with frontend UI tweaks unless tightly coupled.

## Environment & Security Tips
- Copy `backend/.env.example` to `.env` and set `SECRET_KEY`, `MEDIA_ROOT`, `BACKEND_CORS_ORIGINS`; never commit secrets.
- Frontend variables need the `VITE_` prefix in `frontend/.env.local`; ensure generated assets in `public/` never hardcode keys.
- Rotate default test credentials (`admin@combine.local`) outside sandbox environments and update seeding scripts accordingly.
