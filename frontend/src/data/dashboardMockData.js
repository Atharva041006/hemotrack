// Fictional records for the dashboard milestone. Replace this module with API data in Phase 7.
export const dashboardNow = new Date()
const today = new Date(dashboardNow)
today.setHours(0, 0, 0, 0)

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateOffset(days) {
  const date = new Date(today)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function monthOffset(monthsAgo, day = 12) {
  const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  date.setHours(0, 0, 0, 0)
  return localDateKey(date)
}

export const dashboardRules = {
  lowStockThreshold: 4,
  expiryAlertWindowDays: 7,
}

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const donorRecords = [
  { id: 'D-1001', name: 'Amara Shah' },
  { id: 'D-1002', name: 'Kiran Patel' },
  { id: 'D-1003', name: 'Rehan Khan' },
  { id: 'D-1004', name: 'Mira Desai' },
  { id: 'D-1005', name: 'Aarav Mehta' },
  { id: 'D-1006', name: 'Nisha Rao' },
  { id: 'D-1007', name: 'Dev Joshi' },
  { id: 'D-1008', name: 'Leena Shah' },
  { id: 'D-1009', name: 'Sana Qureshi' },
  { id: 'D-1010', name: 'Rohan Kulkarni' },
  { id: 'D-1011', name: 'Isha Nair' },
  { id: 'D-1012', name: 'Kabir Sethi' },
]

const donorGroups = ['A+', 'O+', 'B+', 'AB+', 'O-', 'A+', 'B-', 'A-', 'AB+', 'O+', 'B+', 'AB-']

export const donors = donorRecords.map((donor, index) => ({
  ...donor,
  bloodGroup: donorGroups[index],
  registeredAt: dateOffset(-430 + index * 27),
}))

const donationPlan = [
  [5, 4, 'Accepted'], [5, 8, 'Accepted'], [5, 19, 'Accepted'],
  [4, 3, 'Accepted'], [4, 10, 'Accepted'], [4, 17, 'Accepted'],
  [4, 22, 'Accepted'], [3, 2, 'Accepted'], [3, 11, 'Accepted'],
  [3, 18, 'Screening'], [2, 5, 'Accepted'], [2, 13, 'Accepted'],
  [2, 20, 'Accepted'], [2, 25, 'Accepted'], [1, 4, 'Accepted'],
  [1, 12, 'Accepted'], [1, 21, 'Accepted'], [0, 2, 'Accepted'],
  [0, 8, 'Screening'], [0, 14, 'Accepted'], [0, 18, 'Accepted'],
]

export const donations = donationPlan.map(([monthsAgo, day, status], index) => ({
  id: `DON-${String(2401 + index)}`,
  donorId: donors[(index * 5 + 2) % donors.length].id,
  donor: donors[(index * 5 + 2) % donors.length],
  bloodGroup: donors[(index * 5 + 2) % donors.length].bloodGroup,
  donatedAt: monthOffset(monthsAgo, day),
  status,
}))

export const inventoryUnits = (() => {
  const availableByGroup = {
    'A+': 16,
    'A-': 4,
    'B+': 12,
    'B-': 3,
    'O+': 21,
    'O-': 5,
    'AB+': 7,
    'AB-': 2,
  }
  const expiringGroups = new Set(['B+', 'O+'])
  const units = bloodGroups.flatMap((bloodGroup) =>
    Array.from({ length: availableByGroup[bloodGroup] }, (_, index) => ({
      id: `UNIT-${bloodGroup.replace('+', 'P').replace('-', 'N')}-${String(index + 1).padStart(2, '0')}`,
      bloodGroup,
      status: 'Available',
      collectedAt: dateOffset(-90 - index),
      expiryDate: expiringGroups.has(bloodGroup) && index === 0
        ? dateOffset(4)
        : dateOffset(45 + ((index * 19) % 240)),
    })),
  )

  // Ineligible sample units stay in the unit ledger but must not count as available.
  units.push(
    { id: 'UNIT-O-P-EXPIRED', bloodGroup: 'O+', status: 'Available', collectedAt: dateOffset(-40), expiryDate: dateOffset(-2) },
    { id: 'UNIT-A-P-QUARANTINE', bloodGroup: 'A+', status: 'Quarantined', collectedAt: dateOffset(-5), expiryDate: dateOffset(80) },
    { id: 'UNIT-AB-N-ISSUED', bloodGroup: 'AB-', status: 'Issued', collectedAt: dateOffset(-30), expiryDate: dateOffset(100) },
  )
  return units
})()

const requestPlan = [
  ['Northstar Medical Center', 'O-', 3, 'Pending', 1],
  ['Lakeside Care Hospital', 'A+', 4, 'Approved', 2],
  ['Pineview General', 'B-', 2, 'Pending', 3],
  ['Riverside Health Centre', 'AB+', 2, 'Partially fulfilled', 4],
  ['Northstar Medical Center', 'O+', 5, 'Fulfilled', 6],
  ['Pineview General', 'A-', 2, 'Pending', 8],
  ['Lakeside Care Hospital', 'B+', 3, 'Fulfilled', 13],
  ['Riverside Health Centre', 'AB-', 1, 'Rejected', 20],
]

export const requests = requestPlan.map(([requester, bloodGroup, quantity, status, daysAgo], index) => ({
  id: `REQ-${String(801 + index)}`,
  requester,
  bloodGroup,
  quantity,
  status,
  requestedAt: dateOffset(-daysAgo),
}))

// Issue quantities and unit links are the source of request fulfillment progress.
const issuePlan = [
  [3, 1, 0, 16], // REQ-804: partially fulfilled, A+
  [4, 3, 2, 8],  // REQ-805: fulfilled, O+
  [4, 2, 0, 5],  // REQ-805: fulfilled, O+
  [6, 3, 1, 19], // REQ-807: fulfilled, B+
]

const unitsByGroup = new Map(bloodGroups.map((group) => [
  group,
  inventoryUnits.filter((unit) => unit.bloodGroup === group && unit.status === 'Available'),
]))

export const issues = issuePlan.map(([requestIndex, quantity, monthsAgo, day], index) => {
  const request = requests[requestIndex]
  const eligibleUnits = unitsByGroup.get(request.bloodGroup)
  const unitIds = eligibleUnits.splice(0, quantity).map((unit) => {
    unit.status = 'Issued'
    return unit.id
  })
  return {
    id: `ISS-${String(501 + index)}`,
    requestId: request.id,
    issuedAt: monthOffset(monthsAgo, day),
    quantity: unitIds.length,
    unitIds,
  }
})

export function getAvailableUnits() {
  const todayKey = localDateKey(today)
  return inventoryUnits.filter(
    (unit) => unit.status === 'Available' && unit.expiryDate > todayKey,
  )
}

export function getInventorySummary() {
  const availableUnits = getAvailableUnits()
  return bloodGroups.map((bloodGroup) => {
    const count = availableUnits.filter((unit) => unit.bloodGroup === bloodGroup).length
    return {
      bloodGroup,
      count,
      status: count <= dashboardRules.lowStockThreshold ? 'Low stock' : 'Healthy stock',
    }
  })
}

export function getDonationIssueAnalytics() {
  return Array.from({ length: 6 }, (_, position) => {
    const monthsAgo = 5 - position
    const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1)
    const label = date.toLocaleDateString('en', { month: 'short' })
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    const isInRange = (value) => {
      const current = new Date(`${value}T00:00:00`)
      return current >= start && current < end
    }
    return {
      month: label,
      donations: donations.filter((item) => item.status === 'Accepted' && isInRange(item.donatedAt)).length,
      issued: issues.filter((item) => isInRange(item.issuedAt)).reduce((sum, item) => sum + item.quantity, 0),
    }
  })
}

export function getDashboardAlerts() {
  const inventory = getInventorySummary()
  const todayKey = localDateKey(today)
  const expiryLimit = dateOffset(dashboardRules.expiryAlertWindowDays)
  const expiringCount = getAvailableUnits().filter(
    (unit) => unit.expiryDate >= todayKey && unit.expiryDate <= expiryLimit,
  ).length
  const lowStockGroups = inventory.filter((group) => group.count <= dashboardRules.lowStockThreshold)
  const pendingCount = requests.filter((request) => request.status === 'Pending').length

  return [
    ...(lowStockGroups.length ? [{
      id: 'low-stock',
      kind: 'critical',
      title: 'Low inventory',
      description: `${lowStockGroups.map((group) => group.bloodGroup).join(', ')} at or below ${dashboardRules.lowStockThreshold} units`,
      count: lowStockGroups.length,
    }] : []),
    ...(expiringCount ? [{
      id: 'expiring',
      kind: 'warning',
      title: 'Approaching expiry',
      description: `${expiringCount} eligible units expire within ${dashboardRules.expiryAlertWindowDays} days`,
      count: expiringCount,
    }] : []),
    ...(pendingCount ? [{
      id: 'pending-requests',
      kind: 'info',
      title: 'Requests awaiting review',
      description: `${pendingCount} blood requests are pending`,
      count: pendingCount,
    }] : []),
  ]
}

export function getIssuedThisMonth() {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  return issues
    .filter((issue) => {
      const issuedAt = new Date(`${issue.issuedAt}T00:00:00`)
      return issuedAt.getMonth() === currentMonth && issuedAt.getFullYear() === currentYear
    })
    .reduce((sum, issue) => sum + issue.quantity, 0)
}
