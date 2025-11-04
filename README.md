# Combine Football Platform

A centralized platform for managing physical and technical assessments, athlete profiles, and performance reporting for football combines.

## Project Structure

```
.
├── backend/        # FastAPI + SQLModel API with SQLite database
├── frontend/       # React + Vite application with Tailwind CSS
└── scripts/        # Database utilities and data import tools
```

## Overview

This application provides a complete solution for managing football combine operations, including athlete registration, assessment tracking, and performance reporting. The system supports role-based access control with distinct workflows for administrators, staff, coaches, and athletes.

### Core Features

**Authentication & Authorization**
- JWT-based authentication with secure password hashing
- Role-based access control: admin, staff, coach, athlete
- Protected routes and API endpoints based on user permissions

**Athlete Management**
- Complete athlete registration with personal information and documents
- Photo upload and document management
- Status tracking: incomplete, pending, approved, rejected
- Athlete approval workflow for administrators

**Assessment & Reporting**
- Session-based assessment tracking
- Performance metrics and test results
- Peer comparison and age-band analysis
- Report generation with historical data

**Dashboard & Analytics**
- Real-time athlete statistics
- Performance leaderboards
- Session insights and trends
- Team and group management

## Technical Stack

### Backend
- FastAPI framework with async support
- SQLModel for database models and queries
- SQLite database with automatic schema creation
- JWT authentication with bcrypt password hashing
- Pydantic schemas for request/response validation
- Media file handling with configurable storage

### Frontend
- React 18 with TypeScript
- Vite for development and production builds
- React Query for server state management
- Zustand for client state management
- Tailwind CSS for styling
- React Router for navigation
- Tremor components for data visualization

## Getting Started

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- npm or yarn package manager

### Backend Setup

Navigate to the backend directory and create a virtual environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

On Windows, use:
```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -e ".[dev]"
```

Configure environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `SECRET_KEY` - JWT signing key
- `BACKEND_CORS_ORIGINS` - Allowed frontend origins
- `MEDIA_ROOT` - File storage location

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

API documentation: http://localhost:8000/docs

Health check endpoint: http://localhost:8000/health

### Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The application will be available at http://localhost:5173

For production build:

```bash
npm run build
npm run preview
```

### Database Migrations

This project uses **Alembic** for database schema version control and migrations.

#### Initial Setup
Migrations are automatically available after backend setup. To check status:

```bash
cd backend
alembic current
```

#### Applying Migrations
Apply all pending migrations:

```bash
alembic upgrade head
```

#### Creating New Migrations
When you modify database models, create a migration:

```bash
alembic revision --autogenerate -m "Description of changes"
```

Review the generated migration file in `backend/alembic/versions/`, then apply it:

```bash
alembic upgrade head
```

 **For detailed information, see [ALEMBIC_GUIDE.md](./ALEMBIC_GUIDE.md)**

### Database Initialization

The database is automatically created on first startup with seed data. To reset the database, delete the `backend/combine.db` file and restart the backend server.

**Note:** The legacy `_ensure_optional_columns()` function has been replaced by Alembic migrations for better schema management and version control.

### Test Accounts

The following test accounts are created during database initialization:

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| admin@combine.local | admin123 | admin | Full system access |
| staff@combine.local | staff123 | staff | Athlete and session management |
| coach@combine.local | coach123 | coach | Assessment entry and reporting |

Athletes can self-register through the application interface and require administrator approval before accessing the system.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - New user registration
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/login/full` - Login with extended profile data
- `GET /api/v1/auth/me` - Current user profile

### Athletes
- `GET /api/v1/athletes` - List all athletes
- `POST /api/v1/athletes` - Create new athlete
- `GET /api/v1/athletes/{id}` - Get athlete details
- `PUT /api/v1/athletes/{id}` - Update athlete information
- `DELETE /api/v1/athletes/{id}` - Remove athlete
- `POST /api/v1/athletes/{id}/photo` - Upload athlete photo
- `POST /api/v1/athletes/{id}/complete-registration` - Complete athlete profile
- `POST /api/v1/athletes/{id}/submit-for-approval` - Submit for admin approval

### Teams & Groups
- `GET /api/v1/teams` - List teams
- `POST /api/v1/teams` - Create team
- `GET /api/v1/groups` - List groups
- `POST /api/v1/groups` - Create group

### Assessments
- `GET /api/v1/tests` - List test definitions
- `GET /api/v1/sessions` - List assessment sessions
- `POST /api/v1/sessions` - Create new session
- `GET /api/v1/sessions/{id}/results` - Get session results

### Reporting & Analytics
- `GET /api/v1/reports/athletes/{id}` - Generate athlete report
- `GET /api/v1/dashboard/summary` - Dashboard statistics
- `GET /api/v1/analytics/metrics` - Performance metrics

## Development Tools

### Running Tests

The project includes comprehensive test coverage for authentication, CRUD operations, and API endpoints.

#### Backend Tests

Run all tests:
```bash
cd backend
pytest
```

Run with coverage report:
```bash
pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_auth.py -v
```

Run tests matching a pattern:
```bash
pytest -k "test_create" -v
```

**Test Structure:**
- `tests/conftest.py` - Fixtures and test configuration
- `tests/test_auth.py` - Authentication endpoint tests
- `tests/test_athletes.py` - Athlete CRUD tests
- `tests/test_teams.py` - Team CRUD tests

**Key Features:**
- In-memory SQLite database for fast testing
- Isolated test sessions (no test pollution)
- Reusable fixtures for users and authentication
- Comprehensive coverage of happy paths and error cases

### Backend Commands

Run the development server:
```bash
uvicorn app.main:app --reload
```

Run tests:
```bash
pytest
```

Code quality checks:
```bash
ruff check app
mypy app
```

### Frontend Commands

Start development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Run linter:
```bash
npm run lint
```

Type checking:
```bash
npm run type-check
```

### Database Scripts

Located in `backend/scripts/`:
- `import_combine_data.py` - Import assessment data from CSV
- `generate_demo_athletes.py` - Generate test athlete data
- `migrate_db.py` - Database migration utilities

## Configuration

### Backend Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
MEDIA_ROOT=media
DATABASE_URL=sqlite:///./combine.db
```

### Frontend Configuration

The frontend uses Vite's environment variable system. Development proxy is configured in `vite.config.ts` to forward API requests to the backend server.

## Project Status

### Current Implementation
- User authentication and authorization
- Athlete registration with approval workflow
- Profile management with document uploads
- Role-based route protection
- Dashboard with statistics (update coming soon)
- Assessment session tracking
- Team and group management

### Architecture Notes
- Monorepo structure with separate backend and frontend
- RESTful API design with OpenAPI documentation
- Type-safe schemas with Pydantic and TypeScript
- Responsive UI with mobile support
- File upload handling with size limits
- Secure password storage and JWT tokens

### Performance & Best Practices

**Database Optimizations:**
- Pagination on all list endpoints (default 50 items, max 100)
- Indexed columns for common queries (email, team_id, athlete_id)
- Eager loading to prevent N+1 queries in relationships
- Database migrations with Alembic for schema versioning

**Security:**
- JWT-based authentication with configurable expiration
- Password hashing with bcrypt
- CORS configuration from environment variables
- Role-based access control (RBAC) on all endpoints
- Input validation with Pydantic schemas

**Code Quality:**
- Comprehensive test coverage (auth, CRUD, permissions)
- Centralized permission checking with `ensure_roles()` helper
- Conditional logging (development only) to reduce production noise
- TypeScript strict mode for frontend type safety
- Linting with Ruff (Python) and ESLint (TypeScript)

**API Best Practices:**
- Consistent error responses with HTTP status codes
- Request/response validation with schemas
- OpenAPI documentation auto-generated
- Versioned API endpoints (`/api/v1/`)
- Health check endpoint for monitoring
