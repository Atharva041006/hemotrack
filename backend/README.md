# HemoTrack API

Express API for donor, donation, inventory, request, issue, dashboard, and report workflows. SQL Server access uses Windows Integrated Authentication through `mssql/msnodesqlv8` and the Microsoft ODBC driver.

## Run

1. Install SQL Server and the Microsoft ODBC Driver for SQL Server, then follow [`../database/README.md`](../database/README.md).
2. Copy `.env.example` to `.env` if one does not already exist. Set `SQL_SERVER`, `SQL_DATABASE`, and `SQL_ODBC_DRIVER`; the Windows account running Node must be able to access the database.
3. Run `npm install`, then `npm run dev`.
4. Check `/api/health/live` and `/api/health/ready` on port 3001. The first is process liveness; the second checks SQL connectivity.

## Endpoints

- `GET /api/donors`, `POST /api/donors`, `PUT /api/donors/:id`
- `GET /api/donations`, `POST /api/donations`, `PATCH /api/donations/:id/status`
- `GET /api/inventory`
- `GET /api/requests`, `POST /api/requests`, `PATCH /api/requests/:id/status`
- `GET /api/issues`, `POST /api/issues`
- `GET /api/reports/summary`, `GET /api/dashboard`
- `GET /api/donors/summary`

The database is authoritative when connected. The frontend's labeled demo data is session-only and is not persisted. This is an educational workflow; it does not implement medical compatibility, donor eligibility, authentication, or production deployment controls.

Run `npm test` and `npm run check` for backend validation tests and syntax checks. SQL-backed workflows require a reachable SQL Server to verify.
