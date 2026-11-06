const groups = new Set(['A+','A-','B+','B-','O+','O-','AB+','AB-'])
const statuses = new Set(['Pending','Approved','PartiallyFulfilled','Fulfilled','Rejected','Cancelled'])
const isText = (value, limit=120) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= limit
const isPositiveInt = (value) => Number.isInteger(value) && value > 0
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value
const objectValue = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

module.exports = {
  groups,
  statuses,
  isText,
  isPositiveInt,
  isDate,
  validDonor: (value) => { const { fullName, bloodGroup }=objectValue(value); return isText(fullName) && groups.has(bloodGroup) },
  validDonation: (value) => { const { donorId, bloodGroup, donationDate, unitCount=1 }=objectValue(value); return isPositiveInt(Number(donorId)) && groups.has(bloodGroup) && isDate(donationDate) && isPositiveInt(Number(unitCount)) && Number(unitCount)<=100 },
  validRequest: (value) => { const { requester, bloodGroup, quantity, requestDate }=objectValue(value); return isText(requester,160) && groups.has(bloodGroup) && isPositiveInt(Number(quantity)) && Number(quantity)<=100 && isDate(requestDate) },
  validIssue: (value) => { const { requestId, inventoryUnitIds }=objectValue(value); return isPositiveInt(Number(requestId)) && Array.isArray(inventoryUnitIds) && inventoryUnitIds.length>0 && inventoryUnitIds.length<=100 && new Set(inventoryUnitIds.map(Number)).size===inventoryUnitIds.length && inventoryUnitIds.every((id)=>isPositiveInt(Number(id))) },
}
