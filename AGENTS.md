# Repository Guidelines

## Project Structure & Module Organization
Backend code lives under `backend/app`: routers in `api/v1`, SQLModel schemas in `models`, service helpers in `services`, and shared dependencies in `core`. Operational scripts, imports, and data cleanup utilities sit in `backend/scripts/` and root `scripts/`. The Vite client resides in `frontend/src` with feature folders such as `components/dashboard`, `components/athletes`, `pages`, `stores`, and helpers in `lib`. Automated API suites live in `/tests`, mirroring the router (`test_athletes.py`, `test_teams.py`) so coverage stays obvious.

## Build, Test, and Development Commands
Backend workflow: `cd backend && uvicorn app.main:app --reload` for local API work, `pytest` for regression tests, `ruff check app` and `mypy app` before committing, and `alembic revision --autogenerate -m "msg"` followed by `alembic upgrade head` for schema changes. Frontend workflow: `cd frontend && npm run dev`, `npm run build`, `npm run preview`, and `npm run lint`. Use `docker-compose up --build` when you need the API, frontend, and SQLite volume online together.

## Coding Style & Naming Conventions
Python modules use 4-space indentation, snake_case files, and typed Pydantic/SQLModel models; keep queries in repositories/services and expose clean router functions. React/TypeScript files use PascalCase components (`TeamAvailabilityCard.tsx`), camelCase hooks/utilities, and colocate Tailwind classes in JSX or helper maps. Run `ruff --fix` and `npm run lint -- --fix` to apply canonical formatting.

## Testing Guidelines
When editing an endpoint, extend the matching pytest module and rely on fixtures in `tests/conftest.py` for seeded users, tokens, and teams. Frontend regressions should be covered with lightweight React Testing Library cases under `frontend/src/__tests__` and executed via `npm run test` (add the script if needed). Target >80% coverage on new backend modules and document any remaining gaps.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat(athletes): add readonly table`, `fix(teams): delete orphan links`) to keep automation straightforward. Each PR should link to its issue, describe behavior changes, include screenshots or GIFs for UI work, and list the commands run (`pytest`, `npm run build`, migrations). Keep changes focused; split backend schema work from UI refactors when possible, and tag both API and UI reviewers when a change crosses layers.

## Environment & Data Hygiene
Copy `backend/.env.example` to `.env`, populate `SECRET_KEY`, `DATABASE_URL`, `BACKEND_CORS_ORIGINS`, and notification credentials, and never commit secrets. Frontend variables require a `VITE_` prefix in `frontend/.env.local`. Use the cleanup and seeding helpers in `backend/scripts/` (for example `python backend/scripts/reset_db.py`) instead of editing SQLite directly so legacy coaches, teams, and events do not linger in local tests.
