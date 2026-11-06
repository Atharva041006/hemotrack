USE HemoTrackDB;
GO
/* Read-only consistency assertions. Returns an error on violated invariants. */
IF EXISTS (
    SELECT d.DonationId FROM dbo.Donation d
    LEFT JOIN dbo.InventoryUnit u ON u.DonationId=d.DonationId
    WHERE d.Status='Accepted'
    GROUP BY d.DonationId,d.UnitCount
    HAVING COUNT(u.InventoryUnitId)<>d.UnitCount
) THROW 52001,'Accepted donation inventory count does not match UnitCount.',1;

IF EXISTS (
    SELECT 1 FROM dbo.Donation d JOIN dbo.InventoryUnit u ON u.DonationId=d.DonationId
    WHERE d.Status<>'Accepted'
) THROW 52002,'A non-accepted donation has inventory units.',1;

IF EXISTS (
    SELECT 1 FROM dbo.vEligibleInventory v
    WHERE v.Status<>'Available' OR v.ExpiryDate<=CONVERT(date,GETDATE())
) THROW 52003,'The eligible inventory view contains an ineligible unit.',1;

IF EXISTS (
    SELECT r.BloodRequestId FROM dbo.BloodRequest r
    JOIN dbo.BloodIssue i ON i.BloodRequestId=r.BloodRequestId
    JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
    GROUP BY r.BloodRequestId,r.RequestedQuantity
    HAVING COUNT(iu.InventoryUnitId)>r.RequestedQuantity
) THROW 52004,'Issued unit count exceeds a request quantity.',1;

IF EXISTS (
    SELECT 1 FROM dbo.BloodIssue i
    JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
    JOIN dbo.InventoryUnit u ON u.InventoryUnitId=iu.InventoryUnitId
    JOIN dbo.BloodRequest r ON r.BloodRequestId=i.BloodRequestId
    WHERE u.BloodGroup<>r.BloodGroup
) THROW 52005,'An issued unit blood group differs from its request.',1;

IF EXISTS (
    SELECT 1 FROM dbo.BloodIssueUnit iu
    JOIN dbo.InventoryUnit u ON u.InventoryUnitId=iu.InventoryUnitId
    WHERE u.Status<>'Issued'
) THROW 52006,'An issued unit link points to a unit not marked Issued.',1;

IF EXISTS (
    SELECT r.BloodRequestId
    FROM dbo.BloodRequest r
    LEFT JOIN dbo.BloodIssue i ON i.BloodRequestId=r.BloodRequestId
    LEFT JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
    GROUP BY r.BloodRequestId,r.RequestedQuantity,r.Status
    HAVING (r.Status='Fulfilled' AND COUNT(iu.InventoryUnitId)<r.RequestedQuantity)
        OR (r.Status='PartiallyFulfilled' AND (COUNT(iu.InventoryUnitId)=0 OR COUNT(iu.InventoryUnitId)>=r.RequestedQuantity))
        OR (r.Status IN ('Pending','Approved','Rejected') AND COUNT(iu.InventoryUnitId)>0)
) THROW 52007,'Request status is inconsistent with its issued-unit ledger.',1;

SELECT 'Accepted donations' AS CheckName,COUNT_BIG(*) AS RecordCount FROM dbo.Donation WHERE Status='Accepted'
UNION ALL SELECT 'Eligible inventory units',COUNT_BIG(*) FROM dbo.vEligibleInventory
UNION ALL SELECT 'Expired units',COUNT_BIG(*) FROM dbo.vExpiredInventory
UNION ALL SELECT 'Pending requests',COUNT_BIG(*) FROM dbo.BloodRequest WHERE Status='Pending'
UNION ALL SELECT 'Issue records',COUNT_BIG(*) FROM dbo.BloodIssue;
GO
