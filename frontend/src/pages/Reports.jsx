import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Printer } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Button, Card, PageHeading, StatusBadge } from '../components/ui.jsx'
import { dashboardRules, donations, donors } from '../data/dashboardMockData.js'
import { getWorkflowSnapshot, subscribeWorkflow } from '../data/workflowStore.js'
import { api } from '../services/api.js'

function dayKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
function label(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : '—' }
function csvCell(value) { return `"${String(value ?? '').replaceAll('"','""')}"` }
const ReportChart = lazy(() => import('../components/ReportChart.jsx').then((module) => ({ default: module.ReportChart })))

export default function Reports() {
  const { units, requests, issues, dataMode: workflowMode } = useSyncExternalStore(subscribeWorkflow, getWorkflowSnapshot)
  const [liveData,setLiveData]=useState(null)
  useEffect(()=>{let active=true;Promise.all([api.donors.list(),api.donations.list()]).then(([donorRows,donationRows])=>{if(active)setLiveData({donorCount:donorRows.length,donations:donationRows.map((x)=>({id:x.DonationCode,donor:{name:x.DonorName},bloodGroup:x.BloodGroup,donatedAt:typeof x.DonationDate==='string'?x.DonationDate.slice(0,10):new Date(x.DonationDate).toISOString().slice(0,10),unitCount:Number(x.UnitCount)||1,status:x.Status}))})}).catch(()=>{});return()=>{active=false}},[])
  const now = new Date()
  const [from, setFrom] = useState(dayKey(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(dayKey(now))
  const [status, setStatus] = useState('')
  const today = dayKey(now)
  const inRange = (date) => (!from || date >= from) && (!to || date <= to)
  const expiringLimit = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + dashboardRules.expiryAlertWindowDays))
  const inventoryStatus = (unit) => unit.status === 'Available' && unit.expiryDate <= today ? 'Expired' : unit.status
  const eligible = units.filter((unit) => unit.status === 'Available' && unit.expiryDate > today)
  const expired = units.filter((unit) => unitStatus(unit) === 'Expired')
  function unitStatus(unit) { return inventoryStatus(unit) }
  const expiring = eligible.filter((unit) => unit.expiryDate <= expiringLimit)
  const reportDonations = liveData?.donations ?? (workflowMode === 'demo' ? donations : [])
  const filteredDonations = reportDonations.filter((item) => inRange(item.donatedAt) && (!status || item.status === status))
  const filteredRequests = requests.filter((item) => inRange(item.requestedAt) && (!status || item.status === status))
  const filteredIssues = issues.filter((item) => inRange(item.issuedAt) && (!status || status === 'Issued'))
  const rows = [
    ...filteredDonations.map((x) => ({ date:x.donatedAt, type:'Donation', id:x.id, subject:x.donor.name, group:x.bloodGroup, quantity:x.unitCount||1, status:x.status })),
    ...filteredRequests.map((x) => ({ date:x.requestedAt, type:'Request', id:x.id, subject:x.requester, group:x.bloodGroup, quantity:x.quantity, status:x.status })),
    ...filteredIssues.map((x) => ({ date:x.issuedAt, type:'Issue', id:x.id, subject:x.requestId, group:'—', quantity:x.quantity, status:'Issued' })),
  ].sort((a,b)=>b.date.localeCompare(a.date))
  const groupRows = ['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((group) => ({ group, count:eligible.filter((x)=>x.bloodGroup===group).length }))
  const firstMonth = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = to ? new Date(`${to}T00:00:00`) : now
  const monthCount = Math.max(1, (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + lastMonth.getMonth() - firstMonth.getMonth() + 1)
  const months = Array.from({ length: monthCount }, (_, i) => {
    const d = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1)
    const start = dayKey(d)
    const end = dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return {
      month: d.toLocaleDateString('en', { month: 'short', year: monthCount > 12 ? '2-digit' : undefined }),
      donations: (!status || status === 'Accepted') ? reportDonations.filter((x) => x.status === 'Accepted' && inRange(x.donatedAt) && x.donatedAt >= start && x.donatedAt <= end).length : 0,
      issues: (!status || status === 'Issued') ? issues.filter((x) => inRange(x.issuedAt) && x.issuedAt >= start && x.issuedAt <= end).reduce((sum, x) => sum + x.quantity, 0) : 0,
    }
  })
  function exportCsv() {
    const content = [['Date','Type','ID','Subject','Blood group','Quantity','Status'],...rows.map((x)=>[x.date,x.type,x.id,x.subject,x.group,x.quantity,x.status])].map((row)=>row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})); const anchor=document.createElement('a'); anchor.href=url; anchor.download='hemotrack-report.csv'; anchor.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <AppShell activeLabel="Reports" currentPage="Reports"><div className="space-y-6 print:space-y-4"><PageHeading eyebrow="Insights · Reports and analytics" title="Reports" description="Review donation, inventory, request, and issue activity for a selected period." actions={<><Button variant="secondary" onClick={()=>window.print()}><Printer size={16}/>Print</Button><Button onClick={exportCsv}><Download size={16}/>Export CSV</Button></>}/><Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end print:hidden"><label className="text-xs font-medium text-muted">From<input type="date" value={from} max={to||today} onChange={(e)=>setFrom(e.target.value)} className="mt-1 block min-h-10 rounded-control border border-border px-3 text-sm text-ink"/></label><label className="text-xs font-medium text-muted">To<input type="date" value={to} min={from} max={today} onChange={(e)=>setTo(e.target.value)} className="mt-1 block min-h-10 rounded-control border border-border px-3 text-sm text-ink"/></label><label className="text-xs font-medium text-muted">Status<select value={status} onChange={(e)=>setStatus(e.target.value)} className="mt-1 block min-h-10 rounded-control border border-border bg-white px-3 text-sm text-ink"><option value="">All statuses</option>{['Accepted','Screening','Rejected','Pending','Approved','Partially fulfilled','Fulfilled','Cancelled','Issued'].map((x)=><option key={x}>{x}</option>)}</select></label><p className="pb-2 text-xs text-muted">Activity and history follow these filters. Current stock shows present inventory.</p></Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-4"><p className="text-xs text-muted">Registered donors</p><p className="mt-2 text-2xl font-semibold">{liveData?.donorCount ?? donors.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Donations in period</p><p className="mt-2 text-2xl font-semibold">{filteredDonations.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Eligible units now</p><p className="mt-2 text-2xl font-semibold">{eligible.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Issues in period</p><p className="mt-2 text-2xl font-semibold">{filteredIssues.reduce((sum,x)=>sum+x.quantity,0)}</p></Card></div><div className="grid gap-4 lg:grid-cols-2"><Card className="p-4"><h2 className="font-semibold">Donations and issued units</h2><p className="mt-1 text-xs text-muted">Accepted donation records and issue quantities by month.</p><Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-50"/>}><ReportChart data={months}/></Suspense><div className="flex gap-4 text-xs text-muted"><span><i className="mr-1 inline-block size-2 rounded-full bg-crimson"/>Accepted donations</span><span><i className="mr-1 inline-block size-2 rounded-full bg-teal"/>Units issued</span></div></Card><Card className="p-4"><h2 className="font-semibold">Eligible stock by blood group</h2><p className="mt-1 text-xs text-muted">Unexpired units currently marked Available.</p><div className="mt-4 divide-y divide-border">{groupRows.map((x)=><div key={x.group} className="flex items-center justify-between py-2.5 text-sm"><span>{x.group}</span><span className="font-semibold tabular-nums">{x.count} units</span></div>)}</div></Card></div><div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Expired units</p><p className="mt-2 text-2xl font-semibold">{expired.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Approaching expiry</p><p className="mt-2 text-2xl font-semibold">{expiring.length}</p><p className="text-xs text-muted">Within {dashboardRules.expiryAlertWindowDays} days</p></Card><Card className="p-4"><p className="text-xs text-muted">Pending / fulfilled requests</p><p className="mt-2 text-lg font-semibold">{requests.filter((x)=>x.status==='Pending').length} pending · {requests.filter((x)=>x.status==='Fulfilled').length} fulfilled</p></Card></div><Card className="overflow-hidden"><div className="border-b border-border p-4"><h2 className="font-semibold">Donation, request, and issue history</h2><p className="mt-1 text-xs text-muted">{rows.length} filtered records · {label(from)} to {label(to)}</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr>{['Date','Type','Record','Subject','Group','Qty','Status'].map((x)=><th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((x)=><tr key={`${x.type}-${x.id}`}><td className="whitespace-nowrap px-3 py-3">{label(x.date)}</td><td className="px-3 py-3">{x.type}</td><td className="px-3 py-3 font-medium">{x.id}</td><td className="px-3 py-3">{x.subject}</td><td className="px-3 py-3">{x.group}</td><td className="px-3 py-3">{x.quantity}</td><td className="px-3 py-3"><StatusBadge>{x.status}</StatusBadge></td></tr>)}</tbody></table></div>{!rows.length&&<p className="p-8 text-center text-sm text-muted">No activity matches these filters.</p>}</Card><p className="text-xs leading-5 text-muted">Reports use SQL Server data when connected and synthetic demonstration records in offline mode. No clinical or transfusion guidance is provided.</p></div></AppShell>
}
