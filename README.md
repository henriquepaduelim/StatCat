
---

# StatCat Football Platform

StatCat is a centralized platform for managing football combine operations, including athlete registration, assessment tracking, performance reporting, and team management. The system is designed for clubs, coaches, and administrators to streamline the evaluation and development of athletes.

## Project Structure

```
.
├── backend/        # FastAPI + SQLModel API with SQLite database
├── frontend/       # React + Vite application with Tailwind CSS
├── scripts/        # Database utilities and data import tools
├── tests/          # Backend test suite
```

## Features

### Authentication & Authorization
- Secure JWT-based authentication
- Role-based access control (admin, staff, coach, athlete)
- Protected routes and API endpoints
- Athlete approval workflow

### Athlete Management
- Athlete registration with personal details and document uploads
- Status tracking: incomplete, pending, approved, rejected
- Administrator approval and batch operations
- Profile editing

### Team & Coach Management
- Team creation and roster management
- Coach assignment and management
- Filtering by age category
- Athlete assignment to teams

### Assessment & Reporting
- Session-based assessment tracking and scheduling
- Standardized test definitions and result entry
- Performance metrics, peer comparison, and age-band analysis
- Individual athlete report cards and historical data

### Dashboard & Analytics
- Real-time statistics and summaries
- Performance leaderboards and rankings
- Event calendar and scheduling
- Team and group management interface

## Technical Stack

- **Backend:** FastAPI, SQLModel, SQLite, Alembic, JWT, Pydantic
- **Frontend:** React (TypeScript), Vite, React Query, Zustand, Tailwind CSS, Tremor
- **Testing:** Pytest, in-memory SQLite, reusable fixtures

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env
# Edit .env and set SECRET_KEY, BACKEND_CORS_ORIGINS, MEDIA_ROOT
uvicorn app.main:app --reload
```

API available at: http://localhost:8000  
Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

For production:
```bash
npm run build
npm run preview
```

### Database Migrations

Alembic is used for schema migrations.

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "Description of changes"
```

See `ALEMBIC_GUIDE.md` for details.

### Database Initialization

The database is created on first startup with seed data. To reset, delete combine.db and restart the backend.

### Test Accounts

| Email                  | Password   | Role   |
|------------------------|------------|--------|
| admin@combine.local    | admin123   | admin  |
| staff@combine.local    | staff123   | staff  |
| coach@combine.local    | coach123   | coach  |

Athletes self-register and require admin approval.

## API Endpoints

- Authentication: `/api/v1/auth/*`
- Athletes: `/api/v1/athletes/*`
- Teams & Coaches: `/api/v1/teams/*`, `/api/v1/teams/coaches/*`
- Groups: `/api/v1/groups/*`
- Assessment Sessions: `/api/v1/sessions/*`
- Test Definitions: `/api/v1/tests/*`
- Reporting & Analytics: `/api/v1/reports/*`, `/api/v1/dashboard/*`, `/api/v1/analytics/*`

See the OpenAPI docs for full details.

## Development Tools

### Backend

- Run server: `uvicorn app.main:app --reload`
- Run tests: `pytest`
- Lint: `ruff check app`
- Type check: `mypy app`

### Frontend

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npm run type-check`

### Scripts

Located in scripts and `backend/scripts/`:
- Data import, demo athlete generation, migration utilities

## Configuration

### Backend

Create `.env` in backend with:
```
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
MEDIA_ROOT=media
DATABASE_URL=sqlite:///./combine.db
```

### Frontend

Uses Vite environment variables. API proxy configured in `vite.config.ts`.

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
