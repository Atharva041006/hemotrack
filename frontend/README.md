# HemoTrack frontend

React and Vite interface for HemoTrack. Donors, donations, inventory, requests, issues, dashboard, and reports use the backend API when SQL Server is ready; otherwise the interface identifies fictional, session-only demo data.

## Run

From this directory:

```powershell
npm.cmd install
npm.cmd run dev
```

Vite serves the frontend on port 5173 and proxies `/api` to `http://localhost:3001`. Start the backend from `../backend`; database setup is documented in `../database/README.md`.

## Verify

```powershell
npm.cmd run lint
npm.cmd run build
```

The build output is written to the ignored `dist/` directory.
