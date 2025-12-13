# StatCat Football Platform

## 1. Overview

StatCat is a comprehensive platform designed for grassroots and academy football programs to centralize combine data, streamline athlete onboarding, and enhance team collaboration. It provides a unified solution for managing teams, coaches, and athletes, sharing testing results, and coordinating schedules.

The platform is a multi-tenant system, designed to be branded and deployed for individual football clubs, with a flexible architecture that supports custom themes and configurations.

## 2. Architecture

The project is structured as a monorepo with a decoupled frontend and backend.

*   **Backend:** A robust API built with **FastAPI** and **Python**. It handles all business logic, data processing, and authentication.
*   **Frontend:** A modern single-page application (SPA) built with **React** and **TypeScript**, using **Vite** for fast development and builds.
*   **Database:** The application uses **SQLModel** as an ORM and is designed to work with **PostgreSQL** in production and **SQLite** for development. Database schema changes are managed by **Alembic**.

## 3. Technology Stack

**Backend:**
*   **Framework:** FastAPI
*   **Database:** PostgreSQL (production), SQLite (development)
*   **ORM:** SQLModel
*   **Migrations:** Alembic
*   **Authentication:** JWT (via `python-jose`), Passlib (for password hashing)
*   **Data Validation:** Pydantic
*   **Testing:** Pytest
*   **Linting/Formatting:** Ruff, MyPy

**Frontend:**
*   **Framework:** React 18 (with TypeScript)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS, Tremor, PostCSS
*   **State Management:**
    *   Server State: TanStack React Query
    *   Client State: Zustand
*   **Routing:** React Router v6
*   **Testing:** Vitest (unit/integration), Playwright (E2E)
*   **PWA:** The app is configured as a Progressive Web App using `vite-plugin-pwa`.

## 4. Core Features & Flows

*   **Authentication & Authorization:**
    *   JWT-based authentication with a token persisted in local storage.
    *   Role-Based Access Control (RBAC) for `admin`, `staff`, `coach`, and `athlete` roles.
    *   Secure password hashing using `bcrypt`.
    *   Password reset functionality via email (SMTP).

*   **Athlete Onboarding & Management:**
    *   Athletes can self-register.
    *   An approval workflow (`INCOMPLETE` -> `PENDING` -> `APPROVED` / `REJECTED`) is managed by admins/staff.
    *   Admins can view and manage all athletes.

*   **Team Management:**
    *   Coaches and staff can create and manage teams.
    *   Team feed for posts and announcements.
    *   Dashboards for team-specific metrics and leaderboards.

*   **Reporting and Analytics:**
    *   Entry of combine results and other performance metrics.
    *   Generation of "Report Cards" for athletes (including PDF generation with WeasyPrint).

## 5. Project Structure

```
.
├── backend/        # FastAPI API, migrations, and services
│   ├── app/        # Core application code
│   │   ├── api/    # API endpoints (routers)
│   │   ├── core/   # Configuration, security, etc.
│   │   ├── db/     # Database session management
│   │   ├── models/ # SQLModel data models
│   │   ├── schemas/# Pydantic schemas
│   │   └── services/ # Business logic
│   ├── alembic/    # Database migrations
│   └── tests/      # Backend tests
├── frontend/       # React (TypeScript) + Vite frontend
│   ├── src/
│   │   ├── api/        # API client (axios)
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom hooks
│   │   ├── pages/      # Top-level page components
│   │   ├── stores/     # Zustand stores
│   │   └── styles/     # Global styles and Tailwind config
│   └── e2e/          # Playwright E2E tests
└── scripts/        # Utility scripts (e.g., build branding packages)
```

## 6. Environment Setup

### Prerequisites
*   Python 3.11+
*   Node.js 18+ (with npm)
*   (Optional) PostgreSQL for production-like testing.

### Backend `.env`

Create a `.env` file in the `backend/` directory by copying `.env.example`. Key variables:

*   `SECRET_KEY`: A strong, unique secret for signing JWTs.
*   `ENCRYPTION_KEY_CURRENT`: A separate strong key for encrypting sensitive data in the database. **This is critical for security.**
*   `DATABASE_URL`: Connection string for your database (e.g., `sqlite:///./data/combine.db` for local dev, or `postgresql://...` for production).
*   `BACKEND_CORS_ORIGINS`: A JSON-style list of allowed frontend origins (e.g., `["http://localhost:5173"]`).
*   `SMTP_HOST`, `SMTP_USER`, etc.: Credentials for your email provider for password resets.

### Frontend `.env`

Create a `.env` file in the `frontend/` directory.

*   `VITE_API_BASE_URL`: The URL of the backend API (e.g., `http://localhost:8000`).
*   `VITE_MEDIA_BASE_URL`: The URL where media files are served from.

## 7. Running Locally

### Backend

```bash
# From the project root
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Run the development server
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`, with OpenAPI docs at `http://localhost:8000/docs`.

### Frontend

```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## 8. Useful Scripts

*   **Backend Tests:** `pytest`
*   **Backend Linting:** `ruff check .`
*   **Frontend Tests:** `npm run test` (Vitest)
*   **Frontend E2E Tests:** `npm run e2e` (Playwright)
*   **Frontend Linting:** `npm run lint`

## 9. Security, Auth & Permissions

*   **Authentication:** The frontend receives a JWT access token upon successful login, which is stored in local storage and sent in the `Authorization` header for all API requests.
*   **Authorization:** The backend protects endpoints based on the user's role (`admin`, `staff`, `coach`, `athlete`). The frontend uses a `ProtectedRoute` component and a `usePermissions` hook to control access to routes and UI elements based on the same roles.
*   **Data Encryption:** Sensitive athlete data (e.g., medical information) is encrypted at rest in the database using `cryptography.fernet`. A dedicated `ENCRYPTION_KEY_CURRENT` is required for this.

## 10. Deployment Considerations

*   **Database:** A production-grade PostgreSQL database is required.
*   **File Storage:** The default setup serves media files from the local filesystem. For a scalable and robust solution, it is highly recommended to use a cloud storage service like AWS S3. The application is already configured to support this via the `AWS_S3_BUCKET` setting.
*   **Environment Variables:** All secrets and environment-specific configurations must be managed securely in the deployment environment.
*   **Database Migrations:** Alembic migrations (`alembic upgrade head`) should be run as part of the deployment process before the new application version is launched.

## 11. Potential Improvements (Roadmap)

Based on the analysis of the codebase, here are some recommended improvements:

*   **Refactor Authentication Flow:** The current frontend authentication flow has a potential race condition on initialization. This should be refactored to ensure the user's session is fully restored *before* the main application renders, preventing UI flashes.
*   **Implement Refresh Tokens:** The current auth system only uses access tokens. Implementing a refresh token mechanism would provide a more secure and persistent user session.
*   **Improve Athlete Onboarding UX:** Instead of redirecting unapproved athletes back to the login page, it would be better to direct them to a dedicated page explaining their "Pending Approval" status.
*   **Consolidate Styling System:** The frontend uses both Tailwind CSS and `styled-components`. To ensure consistency and reduce bundle size, the project should standardize on one system (likely Tailwind CSS).
*   **Integrate Error Reporting:** The `ErrorBoundary` in the frontend should be integrated with a service like Sentry (which is already a dependency) to capture and track production errors.

## 12. License

This project is currently unlicensed.