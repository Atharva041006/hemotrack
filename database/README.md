# SQL Server scripts

These scripts use fictional sample records only. The donor table intentionally avoids contact and address fields. The project is educational and does not implement clinical compatibility or eligibility advice.

## Execution order

Run from an account with the needed SQL Server permissions, for instance in SSMS using Windows Authentication:

First ensure the named SQL Server service is running. In an elevated PowerShell window, check/start it with:

```powershell
Get-Service -Name 'MSSQL$SQLEXPRESS01'
Start-Service -Name 'MSSQL$SQLEXPRESS01'
sqlcmd -S 'localhost\SQLEXPRESS01' -E -Q "SELECT @@SERVERNAME AS ServerName"
```

If the service name differs on another machine, use the instance's service name shown in SQL Server Configuration Manager. The Windows account running SSMS/sqlcmd needs permission to create the database and objects.

1. `00_create_database.sql` — creates `HemoTrackDB` if absent.
2. `phase-5-schema.sql` — creates normalized core tables, keys, checks, and indexes.
3. `02_advanced_features.sql` — creates inventory audit, views, and donation/issue procedures.
4. `03_demo_seed.sql` — inserts synthetic data and demonstrates partial fulfillment.
5. `04_report_queries.sql` — sample date-filtered and aggregate reports.
6. `05_verify.sql` — read-only consistency assertions for accepted donations, eligibility, issue-unit status, request fulfillment state, quantities, and blood-group matching, followed by a summary.

`00_create_database.sql` is repeatable. The schema and audit-table scripts are first-install scripts and should not be rerun on an already-installed database. The views and procedures use `CREATE OR ALTER` and can be refreshed after the audit table exists. The demo seed uses stable unique codes and is designed to avoid duplicate rows.

## Core safeguards

- `InventoryUnit` is one physical sample unit; stock reports count its rows.
- Donation unit counts and request quantities are bounded to 1–100 in both API validation and database constraints.
- `vEligibleInventory` requires status `Available`, an accepted source donation, and expiry after today's SQL Server date.
- `usp_SetDonationStatus` accepts only a donation still in `Screening`; acceptance creates exactly `UnitCount` unit rows once. Rejected donations create no inventory.
- `usp_IssueBloodUnits` locks the request and selected units in a transaction, validates the requested group, accepted donation, available status, unexpired date, and remaining quantity, then writes issue links, marks units `Issued`, and changes request fulfillment status atomically.
- `usp_IssueBloodUnits` rejects malformed, nonpositive, or duplicate unit IDs even when called outside the API. Cancelled requests remain cancelled in fulfillment reports; approved or partially fulfilled requests may be cancelled, which prevents additional issue transactions.
- `BloodIssueUnit.InventoryUnitId` is its primary key, preventing a unit from being issued a second time.
- `trg_InventoryUnit_StatusAudit` records status changes for an auditable history.

The date windows and unit transitions are project demonstration rules. They are not medical guidance. Database scripts have not been executed in the current environment because the configured SQL Server instance is not running or reachable here; live SQL syntax and transaction behavior still require execution against SQL Server.
