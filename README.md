# HemoTrack

**Blood Bank Inventory and Donor Management System** — a college DBMS project built with React, Express, and Microsoft SQL Server.

HemoTrack demonstrates donor and donation records, unit-level inventory, blood requests, transactional issue workflows, reports, and database design. It is an educational project, not a medically validated system.

## Run the application

Requirements: Windows, Node.js 24+, npm, SQL Server with the Microsoft ODBC Driver 18 for SQL Server. The current project was developed with `npm.cmd` in PowerShell.

### Frontend demo

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open the Vite URL shown in the terminal. When the API or database is unavailable, screens use fictional in-browser demo data; those changes are temporary.

### SQL-backed application

1. Follow [`database/README.md`](database/README.md) to create `HemoTrackDB`, apply the schema, advanced SQL, and fictional seed records in order.
2. In a second terminal:

```powershell
cd backend
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

3. Set `SQL_SERVER` in `backend/.env` to the SQL Server instance available on that machine. Windows Integrated Authentication uses the Windows account running the API; no SQL password is stored.
4. Verify `http://localhost:3001/api/health/live` and `/api/health/ready`. Then open the frontend. Vite proxies `/api` calls to port 3001.

For local development, `SQL_TRUST_SERVER_CERTIFICATE=true` supports a local SQL Server certificate. Use a properly trusted certificate and set this to `false` in a secured deployment.

## Project structure

- `frontend/` — responsive React/Vite UI, API client, and labeled offline demo fallbacks.
- `backend/` — Express routes, SQL Server connection pool, validation, health endpoints, and donor/donation/inventory/request/issue/report APIs.
- `database/` — schema proposal, installation script, views, trigger, stored procedures, synthetic seed data, and reporting queries.
- `docs/` — academic report draft and verification notes.

The concise presentation route and final handoff checklist are in [`docs/Release-Checklist.md`](docs/Release-Checklist.md).

## API

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET,POST,PUT /api/donors`
- `GET,POST /api/donations`, `PATCH /api/donations/:id/status`
- `GET /api/inventory`
- `GET,POST /api/requests`, `PATCH /api/requests/:id/status`
- `GET,POST /api/issues`
- `GET /api/reports/summary` and `/api/dashboard`

## Checks

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
cd ../backend
npm.cmd run check
npm.cmd test
```

The backend tests cover input-validation helpers. The local SQL Server instance was not running/reachable during this build, so SQL DDL, stored procedures, persistence, and database-backed endpoint behavior still need execution against SQL Server before claiming end-to-end verification. See [`docs/Verification.md`](docs/Verification.md).
