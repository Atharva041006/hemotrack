/* HemoTrackDB schema proposal — adopted project defaults, NOT EXECUTED.
   Apply only via the order documented in database/README.md. */
SET XACT_ABORT ON;
USE HemoTrackDB;
GO
BEGIN TRANSACTION;

CREATE TABLE dbo.Donor (
    DonorId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Donor PRIMARY KEY,
    DonorCode nvarchar(20) NOT NULL CONSTRAINT UQ_Donor_DonorCode UNIQUE,
    FullName nvarchar(120) NOT NULL,
    BloodGroup char(3) NOT NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Donor_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Donor_BloodGroup CHECK (BloodGroup IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
    CONSTRAINT CK_Donor_FullName CHECK (LEN(LTRIM(RTRIM(FullName))) >= 2)
);

CREATE TABLE dbo.Donation (
    DonationId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Donation PRIMARY KEY,
    DonationCode nvarchar(20) NOT NULL CONSTRAINT UQ_Donation_DonationCode UNIQUE,
    DonorId int NOT NULL,
    DonationDate date NOT NULL,
    BloodGroup char(3) NOT NULL,
    UnitCount smallint NOT NULL,
    Status varchar(12) NOT NULL CONSTRAINT DF_Donation_Status DEFAULT 'Screening',
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Donation_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Donation_Donor FOREIGN KEY (DonorId) REFERENCES dbo.Donor(DonorId),
    CONSTRAINT UQ_Donation_DonationId_BloodGroup UNIQUE (DonationId, BloodGroup),
    CONSTRAINT CK_Donation_BloodGroup CHECK (BloodGroup IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
    CONSTRAINT CK_Donation_UnitCount CHECK (UnitCount BETWEEN 1 AND 100),
    CONSTRAINT CK_Donation_Status CHECK (Status IN ('Screening','Accepted','Rejected'))
);

CREATE TABLE dbo.InventoryUnit (
    InventoryUnitId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_InventoryUnit PRIMARY KEY,
    UnitCode nvarchar(30) NOT NULL CONSTRAINT UQ_InventoryUnit_UnitCode UNIQUE,
    DonationId int NOT NULL,
    BloodGroup char(3) NOT NULL,
    CollectedDate date NOT NULL,
    ExpiryDate date NOT NULL,
    Status varchar(12) NOT NULL CONSTRAINT DF_InventoryUnit_Status DEFAULT 'Quarantined',
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_InventoryUnit_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventoryUnit_DonationBloodGroup FOREIGN KEY (DonationId, BloodGroup)
        REFERENCES dbo.Donation(DonationId, BloodGroup),
    CONSTRAINT CK_InventoryUnit_BloodGroup CHECK (BloodGroup IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
    CONSTRAINT CK_InventoryUnit_Dates CHECK (ExpiryDate > CollectedDate),
    CONSTRAINT CK_InventoryUnit_Status CHECK (Status IN ('Quarantined','Available','Issued','Discarded'))
);

CREATE TABLE dbo.Requester (
    RequesterId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Requester PRIMARY KEY,
    RequesterName nvarchar(160) NOT NULL CONSTRAINT UQ_Requester_RequesterName UNIQUE,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Requester_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Requester_Name CHECK (LEN(LTRIM(RTRIM(RequesterName))) >= 2)
);

CREATE TABLE dbo.BloodRequest (
    BloodRequestId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BloodRequest PRIMARY KEY,
    RequestCode nvarchar(20) NOT NULL CONSTRAINT UQ_BloodRequest_RequestCode UNIQUE,
    RequesterId int NOT NULL,
    BloodGroup char(3) NOT NULL,
    RequestedQuantity smallint NOT NULL,
    RequestDate date NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_BloodRequest_Status DEFAULT 'Pending',
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_BloodRequest_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BloodRequest_Requester FOREIGN KEY (RequesterId) REFERENCES dbo.Requester(RequesterId),
    CONSTRAINT CK_BloodRequest_BloodGroup CHECK (BloodGroup IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
    CONSTRAINT CK_BloodRequest_Quantity CHECK (RequestedQuantity BETWEEN 1 AND 100),
    CONSTRAINT CK_BloodRequest_Status CHECK (Status IN ('Pending','Approved','PartiallyFulfilled','Fulfilled','Rejected','Cancelled'))
);

CREATE TABLE dbo.BloodIssue (
    BloodIssueId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BloodIssue PRIMARY KEY,
    IssueCode nvarchar(40) NOT NULL CONSTRAINT UQ_BloodIssue_IssueCode UNIQUE,
    BloodRequestId int NOT NULL,
    IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_BloodIssue_IssuedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BloodIssue_BloodRequest FOREIGN KEY (BloodRequestId) REFERENCES dbo.BloodRequest(BloodRequestId)
);

CREATE TABLE dbo.BloodIssueUnit (
    InventoryUnitId int NOT NULL CONSTRAINT PK_BloodIssueUnit PRIMARY KEY,
    BloodIssueId int NOT NULL,
    CONSTRAINT FK_BloodIssueUnit_InventoryUnit FOREIGN KEY (InventoryUnitId) REFERENCES dbo.InventoryUnit(InventoryUnitId),
    CONSTRAINT FK_BloodIssueUnit_BloodIssue FOREIGN KEY (BloodIssueId) REFERENCES dbo.BloodIssue(BloodIssueId)
);

CREATE INDEX IX_Donation_Donor_Date ON dbo.Donation(DonorId, DonationDate DESC);
CREATE INDEX IX_Donation_Status_Date ON dbo.Donation(Status, DonationDate);
CREATE INDEX IX_InventoryUnit_Group_Status_Expiry ON dbo.InventoryUnit(BloodGroup, Status, ExpiryDate);
CREATE INDEX IX_InventoryUnit_Donation ON dbo.InventoryUnit(DonationId);
CREATE INDEX IX_BloodRequest_Status_Date ON dbo.BloodRequest(Status, RequestDate DESC);
CREATE INDEX IX_BloodRequest_Requester_Date ON dbo.BloodRequest(RequesterId, RequestDate DESC);
CREATE INDEX IX_BloodIssue_Request_Date ON dbo.BloodIssue(BloodRequestId, IssuedAt DESC);
CREATE INDEX IX_BloodIssueUnit_Issue ON dbo.BloodIssueUnit(BloodIssueId);

COMMIT TRANSACTION;
