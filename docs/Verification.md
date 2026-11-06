# Verification record

## Run in this workspace

- Frontend: `npm.cmd run build` — passed.
- Frontend: `npm.cmd run lint` — passed.
- Backend: `npm.cmd run check` — passed.
- Backend: `npm.cmd test` — 5 validation tests passed.
- Browser: dashboard modules and Reports/Issues pages rendered with fictional demo data.
- Browser: request page rendered after the status-copy refinement; cancelling both approved and partially fulfilled demo requests changed them to Cancelled and displayed success. Reload restored the seed demo state.
- Browser: Reports status filter narrowed the current period to three accepted donation records and restored all 14 history rows when reset.
- Browser: recorded a three-unit fictional donation in the session demo; the donation list displayed the quantity. Reload restored the seed records.
- API live check: `GET /api/health/live` returned 200 in-process.
- SQL readiness and donor summary returned safe 503 responses when attempted.

## Blocked verification

`sqlcmd -S localhost\SQLEXPRESS01 -E` could not locate/connect to the SQL Server instance. The instance and service (`MSSQL$SQLEXPRESS01`) are registered locally, but no `sqlservr` process is running, and Windows denies service-control access from this session. Consequently, do not claim these items passed:

- Applying the T-SQL scripts to SQL Server.
- Stored procedure and trigger execution.
- Transaction rollback, locking, or concurrent issue tests.
- Persistent CRUD through the backend.
- Frontend-to-SQL end-to-end workflows.

After SQL Server is available, use an elevated PowerShell window to start the registered instance if necessary, then execute the scripts in `database/README.md` order, run the database verification queries, and test these cases: accepted vs rejected donation inventory creation, expired-unit issue rejection, duplicate-unit rejection, request progress, and rollback on a rejected issue.
