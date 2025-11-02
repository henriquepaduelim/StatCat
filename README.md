# Combine Football Platform

Assessment and performance management system for football combines with role-based access, athlete onboarding, and comprehensive reporting.

## Architecture Overview

The platform uses a monorepo structure with independent backend and frontend deployments:

```
.
├── backend/          # FastAPI + SQLModel + SQLite
│   ├── app/
│   │   ├── api/v1/   # REST endpoints
│   │   ├── models/   # SQLModel entities
│   │   ├── schemas/  # Pydantic validation
│   │   ├── services/ # Business logic
│   │   ├── analytics/# Metrics computation
│   │   ├── core/     # Config, security, auth
│   │   └── db/       # Database setup and seed
│   └── pyproject.toml
└── frontend/         # React + Vite + Tailwind + React Query
    ├── src/
    │   ├── pages/    # Route components
    │   ├── components/# Reusable UI elements
    │   ├── api/      # HTTP client
    │   ├── hooks/    # React hooks
    │   ├── stores/   # Zustand state management
    │   └── types/    # TypeScript interfaces
    └── package.json
```

## Backend (FastAPI + SQLModel)

### Core Features
- **Authentication**: JWT/OAuth2 with four roles (admin, staff, coach, athlete)
- **Data Models**: User, Athlete, Team, Test, AssessmentSession, SessionResult, Group, TestDefinition, MatchStat
- **API Endpoints**:
  - `/api/v1/auth/` - Registration, login, token validation
  - `/api/v1/athletes/` - CRUD with photo upload (5 MB limit)
  - `/api/v1/teams/` - Team management
  - `/api/v1/tests/` - Test definitions and configurations
  - `/api/v1/sessions/` - Assessment session tracking
  - `/api/v1/reports/` - Athlete performance reports with peer comparison
  - `/api/v1/dashboard/` - Aggregated metrics and leaderboards
  - `/api/v1/analytics/` - Metric computation and analysis

### Database
- SQLite with auto-initialization and demo seed data
- Single-organization setup
- Recreate dataset by deleting `backend/combine.db`

### Media Handling
- Static file serving from `/media` directory
- Athlete photo uploads with validation
- Configurable storage root via `.env`

## Frontend (React + Vite + Tailwind)

### Core Features
- **Authentication Flow**: Token-based with persistent storage and auto-redirect based on athlete status
- **Role-Based Navigation**: Different dashboards for admin, staff, coach, and athlete
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Data Management**: React Query with optimized caching and invalidation

### User Journey
1. **Registration** → Create account with name, email, password on `/login`
2. **Auto-Login** → Redirect to `/athlete-onboarding` with session auto-populated
3. **Step 1** → Basic information (DOB, gender, measurements, position, team)
4. **Step 2** → Additional details (address, guardians, emergency contact, medical info)
5. **Step 3** → Review and submit for admin approval
6. **Admin Review** → Status becomes PENDING; athlete waits on `/awaiting-approval`
7. **Approval/Rejection** → Admin decision with optional feedback; rejected athletes can resubmit



## Installation & Development

### Requirements
- Python 3.11+
- Node.js 18+
- npm

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173` with dev proxy to backend API

### Build Production
```bash
# Backend
pip install -e .
uvicorn app.main:app

# Frontend
npm run build
npm run preview
```

## Default Credentials

| Email | Role | Password | Access |
|-------|------|----------|--------|
| admin@combine.local | admin | admin123 | Full platform access |
| staff@combine.local | staff | staff123 | Athletes, sessions, reports |
| coach@combine.local | coach | coach123 | Athlete data, assessments |

To reset: delete `backend/combine.db`

## Technology Stack

### Backend
- FastAPI 0.110+ - ASGI web framework
- SQLModel 0.0.16+ - SQL ORM with Pydantic validation
- Uvicorn 0.27+ - ASGI server
- SQLite - Embedded database
- Passlib + bcrypt - Password hashing
- python-jose - JWT tokens

### Frontend
- React 18 - UI framework
- Vite - Build tool and dev server
- Tailwind CSS - Utility-first styling
- React Router - Navigation
- React Query - Server state management
- Zustand - Client state management
- FontAwesome - Icons
- Tremor - Data visualization
- Recharts - Charts and graphs

## Project Structure Notes

### Backend Organization
- **models/** - SQLModel schema definitions
- **schemas/** - Pydantic request/response validation
- **services/** - Business logic layer
- **analytics/** - Metric computations
- **api/v1/endpoints/** - Route handlers per resource
- **core/** - Configuration, auth, security utilities
- **db/** - Database initialization and seed data

### Frontend Organization
- **pages/** - Route-level components
- **components/** - Reusable UI components
- **api/** - HTTP client with endpoint modules
- **hooks/** - Custom React hooks
- **stores/** - Zustand stores for state
- **types/** - TypeScript type definitions
- **i18n/** - Internationalization

## Common Tasks

### Clear Database and Reseed
```bash
rm backend/combine.db
uvicorn app.main:app --reload
```

### Type Checking
```bash
# Backend
mypy app

# Frontend
tsc --noEmit
```

### Linting
```bash
# Backend
ruff check app

# Frontend
npm run lint
```

### Build Frontend Production
```bash
cd frontend
npm run build  # Creates dist/
npm run preview  # Test production build locally
```

## Performance Considerations

- **Video Playback**: Login and onboarding use looped MP4 with `loop` attribute for seamless playback
- **Form Optimization**: NewAthleteStepTwoForm uses compact layout with reduced spacing to minimize scroll
- **State Management**: React Query caches athlete data with smart invalidation
- **Bundle Size**: Lazy loading of routes and components
- **API Requests**: Token-based auth with localStorage persistence

## Deployment Notes

- Backend requires environment variables: `SECRET_KEY`, `BACKEND_CORS_ORIGINS`, `MEDIA_ROOT`
- Frontend proxies API requests to backend during development
- CORS configured for cross-origin requests
- Static media files served from configured directory
- Session data persisted in SQLite
- No external database required for pilot

## Current Status

Production-ready core functionality with single-tenant architecture. Athlete registration, onboarding, and approval workflows fully implemented. Dashboard provides role-based access to metrics, teams, and reports.
