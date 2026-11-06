# HemoTrack demo and release checklist

## Phase 11 — Demo readiness

### Start locally

1. Confirm Node.js/npm, SQL Server, and the Microsoft ODBC Driver 18 are installed.
2. Start `MSSQL$SQLEXPRESS01` from an elevated PowerShell window if it is stopped.
3. Follow `database/README.md` to install the database scripts in order.
4. In `backend/`, install packages, copy `.env.example` to `.env` if needed, set `SQL_SERVER`, then run `npm.cmd run dev`.
5. In `frontend/`, run `npm.cmd install` and `npm.cmd run dev` in another terminal; open the Vite URL.
6. Confirm `/api/health/live` returns 200 and `/api/health/ready` reports the database connected before demonstrating persisted workflows.

### Short demonstration route

1. Dashboard: explain inventory totals, alerts, and summary metrics.
2. Donors: search and add/edit a synthetic donor.
3. Donations: create a screening donation, accept it, and show created inventory units; also show a rejected donation creates none.
4. Inventory and requests: inspect available units, create a request, and track its status.
5. Issues: issue matching unexpired units; demonstrate that invalid, expired, or duplicate units are rejected.
6. Reports: apply a date/status filter and export or print the result.

Use fictional data only. When the API/database is unavailable, the interface uses temporary demo data; clearly identify this and do not present it as persisted SQL-backed behavior.

## Phase 12 — Final quality and handoff

- [x] Frontend production build and lint pass in this workspace.
- [x] Backend syntax check and validation tests pass in this workspace.
- [x] Setup instructions and SQL execution order are documented.
- [x] Browser demo interactions are recorded in `Verification.md`.
- [ ] SQL scripts and database workflows verified against a running SQL Server.
- [ ] Capture genuine application screenshots after database-backed setup; include them in the PBL report.
- [ ] Fill in student/institution details in `PBL-Project-Report.md`.
- [ ] Repeat the checks on the demonstration machine and confirm persistent API/database workflows.

The unchecked items require the target SQL Server and project-specific academic details. Until those are complete, describe this as a built project with pending live-database verification, not a fully verified deployment.
