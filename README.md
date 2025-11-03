


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

### Database Initialization

The database is automatically created on first startup with seed data. To reset the database, delete the `backend/combine.db` file and restart the backend server.

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

## License

This project is proprietary software developed for internal use.
