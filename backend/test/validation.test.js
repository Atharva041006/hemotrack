const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validDonor, validDonation, validRequest, validIssue, isDate } = require('../src/validation')

test('donor validation accepts supported groups and rejects invalid details', () => {
  assert.equal(validDonor({ fullName: 'Sample Donor', bloodGroup: 'O+' }), true)
  assert.equal(validDonor({ fullName: 'A', bloodGroup: 'O+' }), false)
  assert.equal(validDonor({ fullName: 'Sample Donor', bloodGroup: 'X' }), false)
})

test('donation validation checks donor, group, date, and quantity', () => {
  assert.equal(validDonation({ donorId: 1, bloodGroup: 'AB-', donationDate: '2026-10-21', unitCount: 2 }), true)
  assert.equal(validDonation({ donorId: 0, bloodGroup: 'AB-', donationDate: '2026-10-21', unitCount: 2 }), false)
  assert.equal(validDonation({ donorId: 1, bloodGroup: 'AB-', donationDate: '2026-02-30', unitCount: 2 }), false)
  assert.equal(validDonation({ donorId: 1, bloodGroup: 'AB-', donationDate: '2026-10-21', unitCount: 0 }), false)
})

test('request validation rejects invalid groups, dates, and quantities', () => {
  assert.equal(validRequest({ requester: 'Example Hospital', bloodGroup: 'A+', quantity: 2, requestDate: '2026-10-21' }), true)
  assert.equal(validRequest({ requester: 'Example Hospital', bloodGroup: 'A+', quantity: -1, requestDate: '2026-10-21' }), false)
  assert.equal(validRequest({ requester: 'Example Hospital', bloodGroup: 'A+', quantity: 2, requestDate: '2026-99-99' }), false)
})

test('issue validation requires a bounded nonempty unit list', () => {
  assert.equal(validIssue({ requestId: 1, inventoryUnitIds: [2,3] }), true)
  assert.equal(validIssue({ requestId: 1, inventoryUnitIds: [] }), false)
  assert.equal(validIssue({ requestId: 1, inventoryUnitIds: [2,'invalid'] }), false)
  assert.equal(validIssue({ requestId: 1, inventoryUnitIds: [2,2] }), false)
  assert.equal(validIssue(null), false)
})

test('date validation rejects impossible calendar dates', () => {
  assert.equal(isDate('2024-02-29'), true)
  assert.equal(isDate('2025-02-29'), false)
})
