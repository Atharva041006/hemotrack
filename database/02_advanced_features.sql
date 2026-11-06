USE HemoTrackDB;
GO

CREATE TABLE dbo.InventoryStatusAudit (
    InventoryStatusAuditId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InventoryStatusAudit PRIMARY KEY,
    InventoryUnitId int NOT NULL,
    OldStatus varchar(12) NOT NULL,
    NewStatus varchar(12) NOT NULL,
    ChangedAt datetime2(0) NOT NULL CONSTRAINT DF_InventoryStatusAudit_ChangedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventoryStatusAudit_InventoryUnit FOREIGN KEY (InventoryUnitId) REFERENCES dbo.InventoryUnit(InventoryUnitId)
);
GO

CREATE OR ALTER TRIGGER dbo.trg_InventoryUnit_StatusAudit
ON dbo.InventoryUnit
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT dbo.InventoryStatusAudit (InventoryUnitId,OldStatus,NewStatus)
    SELECT i.InventoryUnitId,d.Status,i.Status
    FROM inserted i INNER JOIN deleted d ON d.InventoryUnitId=i.InventoryUnitId
    WHERE i.Status<>d.Status;
END;
GO

CREATE OR ALTER VIEW dbo.vEligibleInventory
AS
    SELECT u.InventoryUnitId,u.UnitCode,u.DonationId,u.BloodGroup,u.CollectedDate,u.ExpiryDate,u.Status
    FROM dbo.InventoryUnit u
    INNER JOIN dbo.Donation d ON d.DonationId=u.DonationId
    WHERE u.Status='Available'
      AND d.Status='Accepted'
      AND u.ExpiryDate>CONVERT(date,GETDATE());
GO

CREATE OR ALTER VIEW dbo.vExpiredInventory
AS
    SELECT u.InventoryUnitId,u.UnitCode,u.DonationId,u.BloodGroup,u.CollectedDate,u.ExpiryDate,u.Status
    FROM dbo.InventoryUnit u
    WHERE u.Status IN ('Available','Quarantined')
      AND u.ExpiryDate<=CONVERT(date,GETDATE());
GO

CREATE OR ALTER VIEW dbo.vBloodRequestFulfillment
AS
    SELECT r.BloodRequestId,r.RequestCode,r.RequesterId,h.RequesterName,r.BloodGroup,
           r.RequestedQuantity,CONVERT(int,COUNT(iu.InventoryUnitId)) AS IssuedQuantity,
           r.RequestedQuantity-CONVERT(int,COUNT(iu.InventoryUnitId)) AS RemainingQuantity,
           r.RequestDate,
           CASE WHEN r.Status IN ('Rejected','Cancelled') THEN r.Status
                WHEN COUNT(iu.InventoryUnitId)>=r.RequestedQuantity THEN 'Fulfilled'
                WHEN COUNT(iu.InventoryUnitId)>0 THEN 'PartiallyFulfilled'
                ELSE r.Status END AS Status
    FROM dbo.BloodRequest r
    INNER JOIN dbo.Requester h ON h.RequesterId=r.RequesterId
    LEFT JOIN dbo.BloodIssue i ON i.BloodRequestId=r.BloodRequestId
    LEFT JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
    GROUP BY r.BloodRequestId,r.RequestCode,r.RequesterId,h.RequesterName,r.BloodGroup,
             r.RequestedQuantity,r.RequestDate,r.Status;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SetDonationStatus
    @DonationId int,
    @Status varchar(12),
    @ExpiryDate date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @Status NOT IN ('Accepted','Rejected') THROW 51010,'Status must be Accepted or Rejected.',1;
    BEGIN TRANSACTION;
    DECLARE @DonationDate date,@UnitCount smallint,@DonationCode nvarchar(20),@CurrentStatus varchar(12),@n int;
    SELECT @DonationDate=DonationDate,@UnitCount=UnitCount,@DonationCode=DonationCode,@CurrentStatus=Status
    FROM dbo.Donation WITH (UPDLOCK,HOLDLOCK) WHERE DonationId=@DonationId;
    IF @CurrentStatus IS NULL THROW 51011,'Donation was not found.',1;
    IF @CurrentStatus<>'Screening' THROW 51012,'Only a screening donation can be reviewed.',1;
    IF @Status='Accepted' AND (@ExpiryDate IS NULL OR @ExpiryDate<=@DonationDate)
        THROW 51013,'Accepted demo units require an expiry date after collection.',1;
    IF EXISTS (SELECT 1 FROM dbo.InventoryUnit WHERE DonationId=@DonationId)
        THROW 51014,'Inventory already exists for this donation.',1;
    UPDATE dbo.Donation SET Status=@Status WHERE DonationId=@DonationId;
    IF @Status='Accepted'
    BEGIN
        SET @n=1;
        WHILE @n<=@UnitCount
        BEGIN
            INSERT dbo.InventoryUnit(UnitCode,DonationId,BloodGroup,CollectedDate,ExpiryDate,Status)
            SELECT CONCAT(@DonationCode,'-',RIGHT(CONCAT('000',@n),3)),@DonationId,BloodGroup,@DonationDate,@ExpiryDate,'Available'
            FROM dbo.Donation WHERE DonationId=@DonationId;
            SET @n+=1;
        END;
    END;
    SELECT DonationId,DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status
    FROM dbo.Donation WHERE DonationId=@DonationId;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_IssueBloodUnits
    @BloodRequestId int,
    @InventoryUnitIdsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF ISJSON(@InventoryUnitIdsJson)<>1
       OR LEFT(LTRIM(@InventoryUnitIdsJson),1)<>'['
       OR RIGHT(RTRIM(@InventoryUnitIdsJson),1)<>']'
        THROW 51001,'Inventory unit IDs must be a JSON array.',1;
    DECLARE @Selected TABLE (InventoryUnitId int NOT NULL PRIMARY KEY);
    DECLARE @RawCount int=(SELECT COUNT(*) FROM OPENJSON(@InventoryUnitIdsJson));
    INSERT @Selected(InventoryUnitId)
    SELECT DISTINCT TRY_CONVERT(int,[value]) FROM OPENJSON(@InventoryUnitIdsJson)
    WHERE [type]=2 AND TRY_CONVERT(int,[value])>0;
    IF @RawCount=0 OR (SELECT COUNT(*) FROM @Selected)<>@RawCount
        THROW 51001,'Inventory unit IDs must be distinct positive integers.',1;

    BEGIN TRANSACTION;
    DECLARE @Requested smallint,@Group char(3),@RequestStatus varchar(20),@AlreadyIssued int;
    SELECT @Requested=RequestedQuantity,@Group=BloodGroup,@RequestStatus=Status
    FROM dbo.BloodRequest WITH (UPDLOCK,HOLDLOCK) WHERE BloodRequestId=@BloodRequestId;
    IF @Requested IS NULL THROW 51002,'Request was not found.',1;
    IF @RequestStatus NOT IN ('Approved','PartiallyFulfilled') THROW 51002,'Request is not approved for issue.',1;
    SELECT @AlreadyIssued=COUNT(*) FROM dbo.BloodIssue i JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId WHERE i.BloodRequestId=@BloodRequestId;
    IF @AlreadyIssued+(SELECT COUNT(*) FROM @Selected)>@Requested THROW 51003,'Issue exceeds the request quantity.',1;

    DECLARE @ValidCount int;
    SELECT @ValidCount=COUNT(*)
    FROM @Selected s
    INNER JOIN dbo.InventoryUnit u WITH (UPDLOCK,HOLDLOCK) ON u.InventoryUnitId=s.InventoryUnitId
    INNER JOIN dbo.Donation d ON d.DonationId=u.DonationId
    WHERE u.Status='Available' AND u.BloodGroup=@Group
      AND u.ExpiryDate>CONVERT(date,GETDATE()) AND d.Status='Accepted';
    IF @ValidCount<>(SELECT COUNT(*) FROM @Selected) THROW 51004,'One or more units are expired, unavailable, unaccepted, or do not match the request.',1;

    DECLARE @IssueId int,@IssueCode nvarchar(40)=CONCAT('ISS-',REPLACE(CONVERT(nvarchar(36),NEWID()),'-',''));
    INSERT dbo.BloodIssue(IssueCode,BloodRequestId) VALUES(@IssueCode,@BloodRequestId);
    SET @IssueId=CONVERT(int,SCOPE_IDENTITY());
    INSERT dbo.BloodIssueUnit(InventoryUnitId,BloodIssueId) SELECT InventoryUnitId,@IssueId FROM @Selected;
    UPDATE u SET Status='Issued' FROM dbo.InventoryUnit u INNER JOIN @Selected s ON s.InventoryUnitId=u.InventoryUnitId;

    DECLARE @TotalIssued int=@AlreadyIssued+(SELECT COUNT(*) FROM @Selected);
    UPDATE dbo.BloodRequest SET Status=CASE WHEN @TotalIssued>=RequestedQuantity THEN 'Fulfilled' ELSE 'PartiallyFulfilled' END
    WHERE BloodRequestId=@BloodRequestId;
    SELECT @IssueId AS BloodIssueId,@IssueCode AS IssueCode,@BloodRequestId AS BloodRequestId,
           SYSUTCDATETIME() AS IssuedAt,(SELECT COUNT(*) FROM @Selected) AS Quantity,
           (SELECT STRING_AGG(u.UnitCode,N', ') FROM @Selected s JOIN dbo.InventoryUnit u ON u.InventoryUnitId=s.InventoryUnitId) AS UnitCodes;
    COMMIT TRANSACTION;
END;
GO

CREATE INDEX IX_InventoryStatusAudit_Unit_ChangedAt ON dbo.InventoryStatusAudit(InventoryUnitId,ChangedAt DESC);
GO
