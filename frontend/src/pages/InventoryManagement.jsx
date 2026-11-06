import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Card, PageHeading, StatusBadge } from '../components/ui.jsx'
import { bloodGroups, dashboardRules } from '../data/dashboardMockData.js'
import { getWorkflowSnapshot, subscribeWorkflow } from '../data/workflowStore.js'

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function daysUntil(value) { return Math.ceil((new Date(`${value}T00:00:00`) - new Date(`${todayKey()}T00:00:00`)) / 86400000) }
function dateLabel(value) { return new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) }
function unitStatus(unit) { return unit.status === 'Available' && unit.expiryDate <= todayKey() ? 'Expired' : unit.status }

export default function InventoryManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState(searchParams.get('bloodGroup') || '')
  const [status, setStatus] = useState('')
  const { units: inventoryUnits, dataMode } = useSyncExternalStore(subscribeWorkflow, getWorkflowSnapshot)
  useEffect(() => setGroup(searchParams.get('bloodGroup') || ''), [searchParams])
  const available = inventoryUnits.filter((unit) => unit.status === 'Available' && unit.expiryDate > todayKey())
  const summary = bloodGroups.map((bloodGroup) => { const count = available.filter((unit) => unit.bloodGroup === bloodGroup).length; return { bloodGroup, count, status: count <= dashboardRules.lowStockThreshold ? 'Low stock' : 'Healthy stock' } })
  const expiring = available.filter((unit) => daysUntil(unit.expiryDate) <= dashboardRules.expiryAlertWindowDays)
  const visible = inventoryUnits.filter((unit) => (!group || unit.bloodGroup === group) && (!status || unitStatus(unit) === status) && `${unit.id} ${unit.bloodGroup}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
  return <AppShell activeLabel="Blood inventory" currentPage="Blood inventory"><div className="space-y-6">
    <PageHeading eyebrow="Workspace · Blood inventory" title="Blood inventory" description="Track inventory units, identify expiry risks, and review eligible stock by blood group." />
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted">{dataMode === 'database' ? 'Inventory loaded from SQL Server. “Eligible” means available and not expired in this project.' : dataMode === 'checking' ? 'Loading inventory from SQL Server…' : 'Educational demonstration data only. “Eligible” means available and not expired in this sample ledger.'} This is not a clinical or transfusion safety determination.</div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Eligible units</p><p className="mt-2 text-2xl font-semibold">{available.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Approaching expiry</p><p className="mt-2 text-2xl font-semibold">{expiring.length}</p><p className="mt-1 text-xs text-muted">Within {dashboardRules.expiryAlertWindowDays} days</p></Card><Card className="p-4"><p className="text-xs text-muted">Tracked units</p><p className="mt-2 text-2xl font-semibold">{inventoryUnits.length}</p></Card></div>
    <Card className="overflow-hidden"><div className="border-b border-border p-4"><h2 className="font-semibold">Stock by blood group</h2><p className="mt-1 text-xs text-muted">Counts are derived from unexpired units with status Available. Select a group to filter the ledger.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{summary.map((item) => <button type="button" key={item.bloodGroup} aria-pressed={group === item.bloodGroup} onClick={() => { const next = group === item.bloodGroup ? '' : item.bloodGroup; setGroup(next); setSearchParams(next ? { bloodGroup: next } : {}) }} className={`rounded-lg border p-3 text-left transition hover:border-crimson focus-visible:outline-2 focus-visible:outline-crimson ${group === item.bloodGroup ? 'border-crimson bg-crimson-soft/50' : 'border-border'}`}><span className="text-xs text-muted">{item.bloodGroup}</span><span className="mt-1 block text-xl font-semibold">{item.count}</span><StatusBadge>{item.status}</StatusBadge></button>)}</div></div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search inventory units</span><Search className="absolute top-3 left-3 text-slate-400" size={17}/><input className="min-h-10 w-full rounded-control border border-border pl-10 pr-3 text-sm" placeholder="Search unit ID" value={search} onChange={(e) => setSearch(e.target.value)}/></label><select aria-label="Filter by blood group" value={group} onChange={(e) => { const next = e.target.value; setGroup(next); setSearchParams(next ? { bloodGroup: next } : {}) }} className="min-h-10 rounded-control border border-border bg-white px-3 text-sm"><option value="">All blood groups</option>{bloodGroups.map((g) => <option key={g}>{g}</option>)}</select><select aria-label="Filter by unit status" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-10 rounded-control border border-border bg-white px-3 text-sm"><option value="">All statuses</option>{['Available','Expired','Quarantined','Issued','Discarded'].map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr>{['Unit ID','Blood group','Collected','Expiry','Status'].map((x) => <th className="px-5 py-3 font-medium" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((unit) => <tr key={unit.id}><td className="px-5 py-3 font-medium">{unit.id}</td><td className="px-5 py-3">{unit.bloodGroup}</td><td className="px-5 py-3">{dateLabel(unit.collectedAt)}</td><td className="px-5 py-3">{dateLabel(unit.expiryDate)}{unitStatus(unit) === 'Available' && daysUntil(unit.expiryDate) <= dashboardRules.expiryAlertWindowDays && <span className="ml-2 text-xs font-medium text-amber-700">Expiring soon</span>}</td><td className="px-5 py-3"><StatusBadge>{unitStatus(unit)}</StatusBadge></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-border md:hidden">{visible.map((unit) => <article className="space-y-2 p-4" key={unit.id}><div className="flex justify-between gap-2"><strong className="text-sm">{unit.id}</strong><StatusBadge>{unitStatus(unit)}</StatusBadge></div><p className="text-sm text-muted">{unit.bloodGroup} · expires {dateLabel(unit.expiryDate)}</p><p className="text-xs text-muted">Collected {dateLabel(unit.collectedAt)}</p></article>)}</div>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">No units match these filters.</p>}
      <p className="border-t border-border px-4 py-3 text-xs text-muted">Showing {visible.length} of {inventoryUnits.length} tracked units</p>
    </Card>
  </div></AppShell>
}
