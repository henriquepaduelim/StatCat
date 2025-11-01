This file is for you only. Keep it out of commits. Quick path to put the app online for the client:

1) Backend env (set as platform secrets, not committed)
   - `ENVIRONMENT=production`
   - `AUTO_SEED_DATABASE=false`
   - `SECRET_KEY=<strong random 32+ chars>`
   - `DATABASE_URL=postgresql://...` (Neon connection string)
   - `BACKEND_CORS_ORIGINS=["https://<frontend-domain>"]`
   - SMTP (new app password or provider): `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
   - `MEDIA_ROOT=/app/media` (or S3 if configured)

2) Frontend env
   - `VITE_API_BASE_URL=https://<api-domain>`
   - Branding: `VITE_APP_BRAND_NAME`, `VITE_BRAND_ID`, `VITE_BRAND_FAVICON`

3) Build & run locally (sanity check)
   ```bash
   cd backend
   ./.venv/bin/pytest             # optional but recommended
   ./.venv/bin/uvicorn app.main:app --reload  # verify API

   cd ../frontend
   npm ci
   npm run build
   npm run test                  # optional but recommended
   npm run lint                  # optional but recommended
   ```

4) Docker deploy (recommended)
   - Backend image: use `backend/Dockerfile`. Ensure envs above are passed. Mount a persistent volume to `/app/media`.
   - Frontend image: `frontend/Dockerfile` builds with `VITE_API_BASE_URL` arg/env; serves via nginx.
   - `docker-compose.yml` already wires ports; for production, set `VITE_API_BASE_URL` and CORS, and add HTTPS termination via your proxy/load balancer.

5) Database
   - Migrations already applied to Neon (`alembic upgrade head` successful).
   - Keep `psycopg2-binary` installed in the backend image; don’t re-enable AUTO_SEED in production.

6) Security & hygiene
   - Rotate leaked SMTP creds; do not commit secrets. Ensure HTTPS everywhere.
   - File uploads are restricted by type; store media on persistent storage or S3. Consider a separate media domain with safe headers.
   - Optional next hardening: move auth token to httpOnly cookie; add CSP/HSTS to nginx.

7) Final smoke tests in staging
   - `GET /health`
   - Signup/login flow, password reset email, file upload/download, basic dashboard.

Keep this file untracked (do not commit).



psql 'postgresql://neondb_owner:npg_1HLhVgu8Abvj@ep-lingering-frost-ahsmj3a0-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'