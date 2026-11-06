import { inventoryUnits, issues as seedIssues, requests as seedRequests } from './dashboardMockData.js'
import { api } from '../services/api.js'

let sequence = 0
function createDemoState() {
  const issuedByRequest = new Map()
  seedIssues.forEach((issue) => issuedByRequest.set(issue.requestId, (issuedByRequest.get(issue.requestId) || 0) + issue.unitIds.length))
  return {
    units: inventoryUnits.map((unit) => ({ ...unit })),
    requests: seedRequests.map((request) => {
      const issuedQuantity = issuedByRequest.get(request.id) || 0
      const status = ['Rejected', 'Cancelled'].includes(request.status) ? request.status : issuedQuantity >= request.quantity ? 'Fulfilled' : issuedQuantity > 0 ? 'Partially fulfilled' : request.status
      return { ...request, issuedQuantity, status }
    }),
    issues: seedIssues.map((issue) => ({ ...issue, unitIds: [...issue.unitIds] })),
    dataMode: 'demo',
  }
}
const state = { units: [], requests: [], issues: [], dataMode: 'checking' }
const listeners = new Set()
let snapshot = { ...state }
export const getWorkflowSnapshot = () => snapshot
export function subscribeWorkflow(listener) { listeners.add(listener); return () => listeners.delete(listener) }
function publish() { snapshot = { ...state }; listeners.forEach((listener) => listener()) }
function dateKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const dateValue=(value)=>typeof value==='string'?value.slice(0,10):new Date(value).toISOString().slice(0,10)
const requestStatus=(value)=>value==='PartiallyFulfilled'?'Partially fulfilled':value

async function loadRemote() {
  const [requestRows,unitRows,issueRows]=await Promise.all([api.requests.list(),api.inventory(),api.issues.list()])
  state.requests=requestRows.map((x)=>({id:x.RequestCode,databaseId:x.BloodRequestId,requester:x.RequesterName,bloodGroup:x.BloodGroup,quantity:x.RequestedQuantity,issuedQuantity:Number(x.IssuedQuantity),requestedAt:dateValue(x.RequestDate),status:requestStatus(x.Status)}))
  state.units=unitRows.map((x)=>({id:x.UnitCode,databaseId:x.InventoryUnitId,bloodGroup:x.BloodGroup,status:x.Status,collectedAt:dateValue(x.CollectedDate),expiryDate:dateValue(x.ExpiryDate)}))
  const requestsById=new Map(state.requests.map((x)=>[x.databaseId,x]))
  state.issues=issueRows.map((x)=>({id:x.IssueCode,databaseId:x.BloodIssueId,requestId:requestsById.get(x.BloodRequestId)?.id||String(x.BloodRequestId),issuedAt:dateValue(x.IssuedAt),quantity:Number(x.Quantity),unitIds:x.UnitCodes?x.UnitCodes.split(', '):[]}))
  state.dataMode='database'
  publish()
}
loadRemote().catch(() => {
  Object.assign(state, createDemoState())
  publish()
})

export async function addRequest(request) {
  if(state.dataMode==='checking') return false
  if(state.dataMode==='database'){
    try{await api.requests.create({requester:request.requester,bloodGroup:request.bloodGroup,quantity:request.quantity,requestDate:request.requestedAt});await loadRemote();return true}catch{return false}
  }
  const number = Math.max(800, ...state.requests.map((item) => Number(item.id.slice(4)) || 0)) + 1
  state.requests.unshift({ id: `REQ-${number}`, ...request, issuedQuantity: 0 })
  publish()
  return true
}
export async function transitionRequest(id, status) {
  if(state.dataMode==='checking') return false
  const request = state.requests.find((item) => item.id === id)
  const allowed = { Pending: ['Approved', 'Rejected', 'Cancelled'], Approved: ['Cancelled'], 'Partially fulfilled': ['Cancelled'] }
  if (!request || !allowed[request.status]?.includes(status)) return false
  if(state.dataMode==='database'){
    try{await api.requests.setStatus(request.databaseId,status.replaceAll(' ',''));await loadRemote();return true}catch{return false}
  }
  request.status = status
  publish()
  return true
}
export async function createIssue(requestId, unitIds) {
  if(state.dataMode==='checking') throw new Error('Inventory is still loading. Please try again shortly.')
  const request = state.requests.find((item) => item.id === requestId)
  if (!request || !['Approved', 'Partially fulfilled'].includes(request.status)) throw new Error('Choose an approved request that still needs units.')
  const chosen = [...new Set(unitIds)].map((id) => state.units.find((unit) => unit.id === id))
  if (chosen.length !== unitIds.length || chosen.some((unit) => !unit || unit.status !== 'Available' || unit.expiryDate <= dateKey() || unit.bloodGroup !== request.bloodGroup)) throw new Error('One or more selected units are no longer eligible for this request.')
  const remaining = request.quantity - request.issuedQuantity
  if (!chosen.length || chosen.length > remaining) throw new Error(`Select between 1 and ${remaining} eligible unit(s).`)
  if(state.dataMode==='database'){
    const issued=await api.issues.create({requestId:request.databaseId,inventoryUnitIds:chosen.map((unit)=>unit.databaseId)})
    await loadRemote()
    return {id:issued.IssueCode,requestId,issuedAt:dateValue(issued.IssuedAt),quantity:Number(issued.Quantity),unitIds:issued.UnitCodes?issued.UnitCodes.split(', '):chosen.map((unit)=>unit.id)}
  }
  chosen.forEach((unit) => { unit.status = 'Issued' })
  request.issuedQuantity += chosen.length
  request.status = request.issuedQuantity >= request.quantity ? 'Fulfilled' : 'Partially fulfilled'
  const issue = { id: `ISS-${String(9000 + ++sequence)}`, requestId, issuedAt: dateKey(), quantity: chosen.length, unitIds: chosen.map((unit) => unit.id) }
  state.issues.unshift(issue)
  publish()
  return issue
}
