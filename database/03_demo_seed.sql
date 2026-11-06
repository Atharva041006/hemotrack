USE HemoTrackDB;
GO
/* Entire dataset is fictional. Re-runnable by its unique codes/names. */
IF NOT EXISTS (SELECT 1 FROM dbo.Donor WHERE DonorCode='D-1001') INSERT dbo.Donor(DonorCode,FullName,BloodGroup) VALUES('D-1001','Amara Shah','A+');
IF NOT EXISTS (SELECT 1 FROM dbo.Donor WHERE DonorCode='D-1002') INSERT dbo.Donor(DonorCode,FullName,BloodGroup) VALUES('D-1002','Kiran Patel','O+');
IF NOT EXISTS (SELECT 1 FROM dbo.Donor WHERE DonorCode='D-1003') INSERT dbo.Donor(DonorCode,FullName,BloodGroup) VALUES('D-1003','Rehan Khan','B+');
IF NOT EXISTS (SELECT 1 FROM dbo.Donor WHERE DonorCode='D-1004') INSERT dbo.Donor(DonorCode,FullName,BloodGroup) VALUES('D-1004','Mira Desai','AB-');
GO
IF NOT EXISTS (SELECT 1 FROM dbo.Donation WHERE DonationCode='DON-2401')
    INSERT dbo.Donation(DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status)
    SELECT 'DON-2401',DonorId,DATEADD(day,-2,CONVERT(date,GETDATE())),'A+',2,'Screening' FROM dbo.Donor WHERE DonorCode='D-1001';
IF NOT EXISTS (SELECT 1 FROM dbo.Donation WHERE DonationCode='DON-2402')
    INSERT dbo.Donation(DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status)
    SELECT 'DON-2402',DonorId,DATEADD(day,-5,CONVERT(date,GETDATE())),'O+',2,'Screening' FROM dbo.Donor WHERE DonorCode='D-1002';
IF NOT EXISTS (SELECT 1 FROM dbo.Donation WHERE DonationCode='DON-2403')
    INSERT dbo.Donation(DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status)
    SELECT 'DON-2403',DonorId,DATEADD(day,-8,CONVERT(date,GETDATE())),'B+',1,'Screening' FROM dbo.Donor WHERE DonorCode='D-1003';
IF NOT EXISTS (SELECT 1 FROM dbo.Donation WHERE DonationCode='DON-2404')
    INSERT dbo.Donation(DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status)
    SELECT 'DON-2404',DonorId,DATEADD(day,-10,CONVERT(date,GETDATE())),'AB-',1,'Screening' FROM dbo.Donor WHERE DonorCode='D-1004';
GO
DECLARE @DonationId int,@CollectionDate date,@ExpiryDate date;
SET @DonationId=NULL;
SELECT @DonationId=DonationId,@CollectionDate=DonationDate FROM dbo.Donation WHERE DonationCode='DON-2401' AND Status='Screening';
IF @DonationId IS NOT NULL BEGIN SET @ExpiryDate=DATEADD(day,90,@CollectionDate); EXEC dbo.usp_SetDonationStatus @DonationId,'Accepted',@ExpiryDate; END;
SET @DonationId=NULL;
SELECT @DonationId=DonationId,@CollectionDate=DonationDate FROM dbo.Donation WHERE DonationCode='DON-2402' AND Status='Screening';
IF @DonationId IS NOT NULL BEGIN SET @ExpiryDate=DATEADD(day,90,@CollectionDate); EXEC dbo.usp_SetDonationStatus @DonationId,'Accepted',@ExpiryDate; END;
SET @DonationId=NULL;
SELECT @DonationId=DonationId FROM dbo.Donation WHERE DonationCode='DON-2403' AND Status='Screening';
IF @DonationId IS NOT NULL EXEC dbo.usp_SetDonationStatus @DonationId,'Rejected',NULL;
SET @DonationId=NULL;
SELECT @DonationId=DonationId,@CollectionDate=DonationDate FROM dbo.Donation WHERE DonationCode='DON-2404' AND Status='Screening';
IF @DonationId IS NOT NULL BEGIN SET @ExpiryDate=DATEADD(day,90,@CollectionDate); EXEC dbo.usp_SetDonationStatus @DonationId,'Accepted',@ExpiryDate; END;
GO
IF NOT EXISTS (SELECT 1 FROM dbo.Requester WHERE RequesterName='Northstar Medical Center') INSERT dbo.Requester(RequesterName) VALUES('Northstar Medical Center');
IF NOT EXISTS (SELECT 1 FROM dbo.Requester WHERE RequesterName='Lakeside Care Hospital') INSERT dbo.Requester(RequesterName) VALUES('Lakeside Care Hospital');
IF NOT EXISTS (SELECT 1 FROM dbo.BloodRequest WHERE RequestCode='REQ-0801')
    INSERT dbo.BloodRequest(RequestCode,RequesterId,BloodGroup,RequestedQuantity,RequestDate,Status)
    SELECT 'REQ-0801',RequesterId,'A+',2,DATEADD(day,-1,CONVERT(date,GETDATE())),'Approved' FROM dbo.Requester WHERE RequesterName='Northstar Medical Center';
IF NOT EXISTS (SELECT 1 FROM dbo.BloodRequest WHERE RequestCode='REQ-0802')
    INSERT dbo.BloodRequest(RequestCode,RequesterId,BloodGroup,RequestedQuantity,RequestDate,Status)
    SELECT 'REQ-0802',RequesterId,'O+',1,CONVERT(date,GETDATE()),'Pending' FROM dbo.Requester WHERE RequesterName='Lakeside Care Hospital';
GO
/* One partial fulfillment demonstrates the transaction and inventory audit. */
DECLARE @RequestId int=(SELECT BloodRequestId FROM dbo.BloodRequest WHERE RequestCode='REQ-0801');
DECLARE @UnitId int=(SELECT TOP (1) InventoryUnitId FROM dbo.InventoryUnit WHERE UnitCode='DON-2401-001' AND Status='Available');
DECLARE @UnitIdsJson nvarchar(max)=CONCAT('[',@UnitId,']');
IF @RequestId IS NOT NULL AND @UnitId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.BloodIssueUnit WHERE InventoryUnitId=@UnitId)
    EXEC dbo.usp_IssueBloodUnits @RequestId, @UnitIdsJson;
GO
