const express = require('express')
const crypto = require('node:crypto')
const { getPool, sql } = require('./db')
const { groups, statuses, isPositiveInt, isDate, validDonor, validDonation, validRequest, validIssue } = require('./validation')

const router = express.Router()
const code = (prefix) => `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

router.get('/donors', async (_req,res,next) => {
  try { const pool=await getPool(); const result=await pool.request().query('SELECT DonorId, DonorCode, FullName, BloodGroup, CreatedAt FROM dbo.Donor ORDER BY FullName;'); res.json({data:result.recordset}) } catch(e){next(e)}
})
router.post('/donors', async (req,res,next) => {
  const { fullName, bloodGroup }=req.body||{}
  if(!validDonor(req.body)) return fail(res,400,'VALIDATION_ERROR','A valid donor name and blood group are required.')
  try { const pool=await getPool(); const r=await pool.request().input('code',sql.NVarChar(20),code('D')).input('name',sql.NVarChar(120),fullName.trim()).input('group',sql.Char(3),bloodGroup).query('INSERT dbo.Donor (DonorCode,FullName,BloodGroup) OUTPUT INSERTED.DonorId,INSERTED.DonorCode,INSERTED.FullName,INSERTED.BloodGroup,INSERTED.CreatedAt VALUES (@code,@name,@group);'); res.status(201).json({data:r.recordset[0]}) } catch(e){next(e)}
})
router.put('/donors/:id', async (req,res,next) => {
  const id=Number(req.params.id); const {fullName,bloodGroup}=req.body||{}
  if(!isPositiveInt(id)||!validDonor(req.body)) return fail(res,400,'VALIDATION_ERROR','A valid donor ID, name, and blood group are required.')
  try { const pool=await getPool(); const r=await pool.request().input('id',sql.Int,id).input('name',sql.NVarChar(120),fullName.trim()).input('group',sql.Char(3),bloodGroup).query('UPDATE dbo.Donor SET FullName=@name,BloodGroup=@group OUTPUT INSERTED.DonorId,INSERTED.DonorCode,INSERTED.FullName,INSERTED.BloodGroup,INSERTED.CreatedAt WHERE DonorId=@id;'); if(!r.recordset.length)return fail(res,404,'NOT_FOUND','Donor not found.'); res.json({data:r.recordset[0]}) } catch(e){next(e)}
})
router.get('/donations', async (req,res,next) => {
  try { const pool=await getPool(); const r=await pool.request().query(`SELECT d.DonationId,d.DonationCode,d.DonorId,p.DonorCode,p.FullName AS DonorName,d.BloodGroup,d.DonationDate,d.UnitCount,d.Status FROM dbo.Donation d INNER JOIN dbo.Donor p ON p.DonorId=d.DonorId ORDER BY d.DonationDate DESC,d.DonationId DESC;`); res.json({data:r.recordset}) } catch(e){next(e)}
})
router.post('/donations', async (req,res,next) => {
  const {donorId,bloodGroup,donationDate,unitCount=1}=req.body||{}
  if(!validDonation(req.body)) return fail(res,400,'VALIDATION_ERROR','Provide a valid donor, blood group, date, and unit count (1–100).')
  try {
    const pool=await getPool()
    const tx=new sql.Transaction(pool)
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
    try {
      const donorResult=await new sql.Request(tx).input('donorId',sql.Int,Number(donorId)).query('SELECT BloodGroup FROM dbo.Donor WITH (UPDLOCK,HOLDLOCK) WHERE DonorId=@donorId;')
      const donor=donorResult.recordset[0]
      if(!donor){await tx.rollback();return fail(res,404,'DONOR_NOT_FOUND','The selected donor does not exist.')}
      if(donor.BloodGroup!==bloodGroup){await tx.rollback();return fail(res,409,'BLOOD_GROUP_MISMATCH','The donation blood group must match the donor record.')}
      const r=await new sql.Request(tx).input('code',sql.NVarChar(20),code('DON')).input('donorId',sql.Int,Number(donorId)).input('group',sql.Char(3),donor.BloodGroup).input('date',sql.Date,donationDate).input('count',sql.SmallInt,Number(unitCount)).query("INSERT dbo.Donation (DonationCode,DonorId,DonationDate,BloodGroup,UnitCount,Status) OUTPUT INSERTED.* VALUES (@code,@donorId,@date,@group,@count,'Screening');")
      await tx.commit()
      res.status(201).json({data:r.recordset[0]})
    } catch(e){await tx.rollback();throw e}
  } catch(e){next(e)}
})
router.patch('/donations/:id/status', async (req,res,next) => {
  const id=Number(req.params.id); const {status,expiryDate}=req.body||{}
  if(!isPositiveInt(id)||!['Accepted','Rejected'].includes(status)) return fail(res,400,'VALIDATION_ERROR','Status must be Accepted or Rejected.')
  if(status==='Accepted'&&!isDate(expiryDate)) return fail(res,400,'VALIDATION_ERROR','An expiry date is required when accepting this demo donation.')
  try { const pool=await getPool(); const r=await pool.request().input('DonationId',sql.Int,id).input('Status',sql.VarChar(12),status).input('ExpiryDate',sql.Date,expiryDate||null).execute('dbo.usp_SetDonationStatus'); res.json({data:r.recordset?.[0]||{updated:true}}) } catch(e){next(e)}
})
router.get('/inventory', async (req,res,next) => {
  const allowed=new Set(['Available','Quarantined','Issued','Discarded','Expired'])
  if(req.query.status && !allowed.has(req.query.status))return fail(res,400,'VALIDATION_ERROR','Unknown inventory status.')
  if(req.query.bloodGroup&&!groups.has(req.query.bloodGroup))return fail(res,400,'VALIDATION_ERROR','Unknown blood group.')
  try { const pool=await getPool(); const q=pool.request(); q.input('group',sql.Char(3),req.query.bloodGroup||null).input('status',sql.VarChar(12),req.query.status==='Expired'?null:req.query.status||null).input('expired',sql.Bit,req.query.status==='Expired'); const r=await q.query(`SELECT u.InventoryUnitId,u.UnitCode,u.DonationId,u.BloodGroup,u.CollectedDate,u.ExpiryDate,CASE WHEN u.Status IN ('Available','Quarantined') AND u.ExpiryDate<=CONVERT(date,GETDATE()) THEN 'Expired' ELSE u.Status END AS Status FROM dbo.InventoryUnit u WHERE (@group IS NULL OR u.BloodGroup=@group) AND (@status IS NULL OR u.Status=@status) AND (@expired=0 OR (u.Status IN ('Available','Quarantined') AND u.ExpiryDate<=CONVERT(date,GETDATE()))) AND (COALESCE(@status,'')<>'Available' OR u.ExpiryDate>CONVERT(date,GETDATE())) ORDER BY u.ExpiryDate,u.UnitCode;`); res.json({data:r.recordset}) } catch(e){next(e)}
})
router.get('/requests', async (req,res,next) => {
  if(req.query.status&&!statuses.has(req.query.status))return fail(res,400,'VALIDATION_ERROR','Unknown request status.')
  try { const pool=await getPool(); const q=pool.request().input('status',sql.VarChar(20),req.query.status||null); const r=await q.query(`SELECT r.BloodRequestId,r.RequestCode,r.RequesterId,h.RequesterName,r.BloodGroup,r.RequestedQuantity,COALESCE(f.IssuedQuantity,0) AS IssuedQuantity,r.RequestDate,CASE WHEN r.Status IN ('Rejected','Cancelled') THEN r.Status WHEN COALESCE(f.IssuedQuantity,0)>=r.RequestedQuantity THEN 'Fulfilled' WHEN COALESCE(f.IssuedQuantity,0)>0 THEN 'PartiallyFulfilled' ELSE r.Status END AS Status FROM dbo.BloodRequest r INNER JOIN dbo.Requester h ON h.RequesterId=r.RequesterId LEFT JOIN (SELECT i.BloodRequestId,COUNT_BIG(*) IssuedQuantity FROM dbo.BloodIssue i JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId GROUP BY i.BloodRequestId) f ON f.BloodRequestId=r.BloodRequestId WHERE (@status IS NULL OR r.Status=@status) ORDER BY r.RequestDate DESC,r.BloodRequestId DESC;`); res.json({data:r.recordset}) } catch(e){next(e)}
})
router.post('/requests', async (req,res,next) => {
  const {requester,bloodGroup,quantity,requestDate}=req.body||{}
  if(!validRequest(req.body)) return fail(res,400,'VALIDATION_ERROR','Provide a requester, blood group, quantity (1–100), and valid request date.')
  try { const pool=await getPool(); const tx=new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE); try { const q=new sql.Request(tx); q.input('name',sql.NVarChar(160),requester.trim()); let r=await q.query("SELECT RequesterId FROM dbo.Requester WITH (UPDLOCK,HOLDLOCK) WHERE RequesterName=@name;"); let requesterId=r.recordset[0]?.RequesterId; if(!requesterId){r=await new sql.Request(tx).input('name',sql.NVarChar(160),requester.trim()).query('INSERT dbo.Requester(RequesterName) OUTPUT INSERTED.RequesterId VALUES(@name);');requesterId=r.recordset[0].RequesterId} const requestCode=code('REQ'); r=await new sql.Request(tx).input('code',sql.NVarChar(20),requestCode).input('rid',sql.Int,requesterId).input('group',sql.Char(3),bloodGroup).input('qty',sql.SmallInt,Number(quantity)).input('date',sql.Date,requestDate).query("INSERT dbo.BloodRequest(RequestCode,RequesterId,BloodGroup,RequestedQuantity,RequestDate,Status) OUTPUT INSERTED.* VALUES(@code,@rid,@group,@qty,@date,'Pending');"); await tx.commit(); res.status(201).json({data:r.recordset[0]}) } catch(e){await tx.rollback();throw e} } catch(e){next(e)}
})
router.patch('/requests/:id/status', async (req,res,next) => {
  const id=Number(req.params.id);const {status}=req.body||{}
  if(!isPositiveInt(id)||!['Approved','Rejected','Cancelled'].includes(status))return fail(res,400,'VALIDATION_ERROR','Use an allowed request review status.')
  try { const pool=await getPool(); const r=await pool.request().input('id',sql.Int,id).input('status',sql.VarChar(20),status).query("UPDATE dbo.BloodRequest SET Status=@status OUTPUT INSERTED.* WHERE BloodRequestId=@id AND ((Status='Pending' AND @status IN ('Approved','Rejected','Cancelled')) OR (Status IN ('Approved','PartiallyFulfilled') AND @status='Cancelled'));"); if(!r.recordset.length)return fail(res,409,'INVALID_TRANSITION','The request can no longer transition to that status.');res.json({data:r.recordset[0]}) } catch(e){next(e)}
})
router.get('/issues', async (_req,res,next)=>{try{const pool=await getPool();const r=await pool.request().query('SELECT i.BloodIssueId,i.IssueCode,i.BloodRequestId,i.IssuedAt,COUNT_BIG(iu.InventoryUnitId) AS Quantity,STRING_AGG(u.UnitCode,N\', \') AS UnitCodes FROM dbo.BloodIssue i LEFT JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId LEFT JOIN dbo.InventoryUnit u ON u.InventoryUnitId=iu.InventoryUnitId GROUP BY i.BloodIssueId,i.IssueCode,i.BloodRequestId,i.IssuedAt ORDER BY i.IssuedAt DESC;');res.json({data:r.recordset})}catch(e){next(e)}})
router.post('/issues', async (req,res,next)=>{const {requestId,inventoryUnitIds}=req.body||{};if(!validIssue(req.body))return fail(res,400,'VALIDATION_ERROR','Provide a request ID and 1–100 inventory unit IDs.');try{const pool=await getPool();const r=await pool.request().input('BloodRequestId',sql.Int,Number(requestId)).input('InventoryUnitIdsJson',sql.NVarChar(sql.MAX),JSON.stringify(inventoryUnitIds.map(Number))).execute('dbo.usp_IssueBloodUnits');res.status(201).json({data:r.recordset[0]})}catch(e){if([51001,51002,51003,51004].includes(e.number))return fail(res,409,'ISSUE_REJECTED','The request or selected units are not eligible for issue.');next(e)}})
router.get('/reports/summary', async (_req,res,next)=>{try{const pool=await getPool();const r=await pool.request().query('SELECT (SELECT COUNT_BIG(*) FROM dbo.Donor) DonorCount,(SELECT COUNT_BIG(*) FROM dbo.vEligibleInventory) EligibleUnits,(SELECT COUNT_BIG(*) FROM dbo.vExpiredInventory) ExpiredUnits,(SELECT COUNT_BIG(*) FROM dbo.BloodRequest WHERE Status=\'Pending\') PendingRequests,(SELECT COUNT_BIG(*) FROM dbo.BloodRequest WHERE Status=\'Fulfilled\') FulfilledRequests; SELECT BloodGroup,COUNT_BIG(*) UnitCount FROM dbo.vEligibleInventory GROUP BY BloodGroup ORDER BY BloodGroup;');res.json({data:{summary:r.recordsets[0][0],stockByBloodGroup:r.recordsets[1]}})}catch(e){next(e)}})

router.get('/dashboard', async (_req,res,next)=>{
  try {
    const pool=await getPool()
    const r=await pool.request().input('expiryDays',sql.Int,7).query(`
      SELECT (SELECT COUNT_BIG(*) FROM dbo.Donor) DonorCount,
        (SELECT COUNT_BIG(*) FROM dbo.vEligibleInventory) EligibleUnits,
        (SELECT COUNT_BIG(*) FROM dbo.vExpiredInventory) ExpiredUnits,
        (SELECT COUNT_BIG(*) FROM dbo.vEligibleInventory WHERE ExpiryDate<=DATEADD(day,@expiryDays,CONVERT(date,GETDATE()))) ExpiringUnits,
        (SELECT COUNT_BIG(*) FROM dbo.BloodRequest WHERE Status='Pending') PendingRequests,
        (SELECT COUNT_BIG(*) FROM dbo.BloodRequest WHERE Status='Fulfilled') FulfilledRequests,
        (SELECT COUNT_BIG(iu.InventoryUnitId)
          FROM dbo.BloodIssueUnit iu
          INNER JOIN dbo.BloodIssue bi ON bi.BloodIssueId=iu.BloodIssueId
          WHERE bi.IssuedAt>=DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1)
            AND bi.IssuedAt<DATEADD(month,1,DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1))) IssuedThisMonth;
      SELECT bg.BloodGroup,COUNT_BIG(inv.InventoryUnitId) AS UnitCount
        FROM (VALUES (CONVERT(char(3),'A+')),(CONVERT(char(3),'A-')),
          (CONVERT(char(3),'B+')),(CONVERT(char(3),'B-')),
          (CONVERT(char(3),'O+')),(CONVERT(char(3),'O-')),
          (CONVERT(char(3),'AB+')),(CONVERT(char(3),'AB-'))) AS bg(BloodGroup)
        LEFT JOIN dbo.vEligibleInventory inv ON inv.BloodGroup=bg.BloodGroup
        GROUP BY bg.BloodGroup ORDER BY bg.BloodGroup;
      SELECT TOP (4) d.DonationCode,d.BloodGroup,d.DonationDate,d.Status,p.FullName AS DonorName
        FROM dbo.Donation d JOIN dbo.Donor p ON p.DonorId=d.DonorId ORDER BY d.DonationDate DESC,d.DonationId DESC;
      SELECT TOP (4) RequestCode,RequesterName,BloodGroup,RequestedQuantity,RequestDate,Status
        FROM dbo.vBloodRequestFulfillment ORDER BY RequestDate DESC,BloodRequestId DESC;
      SELECT CONVERT(char(7),DonationDate,126) MonthKey,COUNT_BIG(*) Quantity
        FROM dbo.Donation WHERE Status='Accepted' AND DonationDate>=DATEADD(month,-5,DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1))
        GROUP BY CONVERT(char(7),DonationDate,126);
      SELECT CONVERT(char(7),IssuedAt,126) MonthKey,COUNT_BIG(iu.InventoryUnitId) Quantity
        FROM dbo.BloodIssue i JOIN dbo.BloodIssueUnit iu ON iu.BloodIssueId=i.BloodIssueId
        WHERE IssuedAt>=DATEADD(month,-5,DATEFROMPARTS(YEAR(GETDATE()),MONTH(GETDATE()),1))
        GROUP BY CONVERT(char(7),IssuedAt,126);
    `)
    const monthMap=new Map()
    for(let offset=5;offset>=0;offset--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-offset);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;monthMap.set(key,{month:d.toLocaleDateString('en',{month:'short'}),donations:0,issued:0})}
    for(const row of r.recordsets[4])if(monthMap.has(row.MonthKey))monthMap.get(row.MonthKey).donations=Number(row.Quantity)
    for(const row of r.recordsets[5])if(monthMap.has(row.MonthKey))monthMap.get(row.MonthKey).issued=Number(row.Quantity)
    res.json({data:{summary:r.recordsets[0][0],stockByBloodGroup:r.recordsets[1],recentDonations:r.recordsets[2],recentRequests:r.recordsets[3],monthly:[...monthMap.values()]}})
  } catch(e){next(e)}
})

module.exports = router
