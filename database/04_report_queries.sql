USE HemoTrackDB;
GO
DECLARE @FromDate date=DATEADD(day,-30,CONVERT(date,GETDATE()));
DECLARE @ToDate date=CONVERT(date,GETDATE());

/* Donors by blood group (COUNT, GROUP BY). */
SELECT BloodGroup,COUNT_BIG(*) AS DonorCount
FROM dbo.Donor
GROUP BY BloodGroup
ORDER BY BloodGroup;

/* Accepted donation history over a selected range (JOIN, filter, sort). */
SELECT d.DonationCode,p.FullName,d.BloodGroup,d.DonationDate,d.UnitCount,d.Status
FROM dbo.Donation d
INNER JOIN dbo.Donor p ON p.DonorId=d.DonorId
WHERE d.DonationDate>=@FromDate AND d.DonationDate<=@ToDate
ORDER BY d.DonationDate DESC,d.DonationId DESC;

/* Eligible stock totals are computed from the individual-unit view. */
SELECT BloodGroup,COUNT_BIG(*) AS AvailableUnits
FROM dbo.vEligibleInventory
GROUP BY BloodGroup
ORDER BY BloodGroup;

/* Units approaching expiry within the next seven days. */
SELECT UnitCode,BloodGroup,ExpiryDate
FROM dbo.vEligibleInventory
WHERE ExpiryDate<=DATEADD(day,7,CONVERT(date,GETDATE()))
ORDER BY ExpiryDate,UnitCode;

/* Requests and issued progress, including requests with no issues (LEFT JOIN in view). */
SELECT RequestCode,RequesterName,BloodGroup,RequestedQuantity,IssuedQuantity,RemainingQuantity,Status,RequestDate
FROM dbo.vBloodRequestFulfillment
WHERE RequestDate>=@FromDate AND RequestDate<=@ToDate
ORDER BY RequestDate DESC;

/* Issue ledger at unit level. */
SELECT i.IssueCode,r.RequestCode,u.UnitCode,u.BloodGroup,i.IssuedAt
FROM dbo.BloodIssue i
INNER JOIN dbo.BloodRequest r ON r.BloodRequestId=i.BloodRequestId
INNER JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
INNER JOIN dbo.InventoryUnit u ON u.InventoryUnitId=iu.InventoryUnitId
WHERE i.IssuedAt>=@FromDate AND i.IssuedAt<DATEADD(day,1,@ToDate)
ORDER BY i.IssuedAt DESC,i.BloodIssueId DESC;

/* HAVING highlights low-stock groups without storing a manually edited total. */
SELECT BloodGroup,COUNT_BIG(*) AS EligibleUnits
FROM dbo.vEligibleInventory
GROUP BY BloodGroup
HAVING COUNT_BIG(*)<=4
ORDER BY EligibleUnits,BloodGroup;
GO
