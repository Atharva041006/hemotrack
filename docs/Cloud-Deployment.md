# HemoTrack cloud deployment

This project can host its React frontend on Vercel, its Express API on Render, and its SQL Server database on Azure SQL. The API must be the only service that connects to SQL Server; never put database credentials in Vercel or browser code.

## 1. Prepare Azure SQL

Create an Azure SQL logical server and database, then use SQL Server Management Studio to run the project's database scripts in the order in [`../database/README.md`](../database/README.md). In the Azure SQL networking page, allow the Render service's outbound addresses or use a supported private-network arrangement. Do not enable unrestricted public access for a real deployment.

## 2. Deploy the API on Render

Push the project to GitHub. In Render, create a **Blueprint** from the repository and select `render.yaml`. Set these values as service environment variables (Render marks them secret where appropriate):

- `SQL_SERVER`: Azure SQL host, such as `your-server.database.windows.net` (host only, no `tcp:` prefix).
- `SQL_DATABASE`: Azure database name.
- `SQL_USER` and `SQL_PASSWORD`: a least-privilege database login for the API.
- `FRONTEND_ORIGINS`: exact Vercel origin, such as `https://your-app.vercel.app` (no path; add comma-separated custom domains if needed).

After deployment, open `https://YOUR-API.onrender.com/api/health/live`; it should return `{"status":"ok"}`. `/api/health/ready` should return `database: connected`; otherwise review Render logs and Azure SQL firewall/network access.

## 3. Point Vercel at the API

In Vercel project settings, add the environment variable `VITE_API_URL` with the API origin plus `/api`, for example `https://your-api.onrender.com/api`. Redeploy the frontend after setting it. Verify `/api/health/ready`, then check dashboard data and one database-backed operation.

## Important

- Never commit `.env`, database passwords, or connection strings.
- Local `.env.example` keeps Windows Integrated Authentication. Render uses the cross-platform SQL login mode.
- A local `SQLEXPRESS01` instance on a personal PC is not a cloud database endpoint.
- The application is educational; deployment does not add authentication or production clinical safeguards.
- Free service tiers can sleep, so the first API request may take longer. Choose an always-on tier for a live demonstration.
