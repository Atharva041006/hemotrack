import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Button, Card, PageHeading, StatusBadge } from '../components/ui.jsx'
import { bloodGroups } from '../data/dashboardMockData.js'
import { addRequest, getWorkflowSnapshot, subscribeWorkflow, transitionRequest } from '../data/workflowStore.js'

const statuses = ['Pending', 'Approved', 'Partially fulfilled', 'Fulfilled', 'Rejected', 'Cancelled']
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function dateLabel(value) { return new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) }

function RequestDialog({ onSave, onClose }) {
  const dialogRef = useRef(null)
  const [requester, setRequester] = useState('')
  const [group, setGroup] = useState('O+')
  const [quantity, setQuantity] = useState('1')
  const [date, setDate] = useState(todayKey())
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal() }, [])
  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"><form className="space-y-5 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); onSave({ requester: requester.trim(), bloodGroup: group, quantity: Number(quantity), requestedAt: date, status: 'Pending', issuedQuantity: 0 }) }}><div><h2 className="text-lg font-semibold">Create blood request</h2><p className="mt-1 text-sm text-muted">Use fictional requester information for this project.</p></div><label className="block text-sm font-medium">Requester / hospital<input required maxLength={100} value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Hospital name" className="mt-2 min-h-11 w-full rounded-control border border-border px-3 font-normal" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Blood group<select value={group} onChange={(e) => setGroup(e.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border bg-white px-3 font-normal">{bloodGroups.map((g) => <option key={g}>{g}</option>)}</select></label><label className="block text-sm font-medium">Quantity<input required type="number" min="1" max="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border px-3 font-normal" /></label></div><label className="block text-sm font-medium">Request date<input required type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border px-3 font-normal" /></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create request</Button></div></form></dialog>
}

export default function RequestManagement() {
  const { requests: records, dataMode } = useSyncExternalStore(subscribeWorkflow, getWorkflowSnapshot)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('requestId') || '')
  const [filter, setFilter] = useState('')
  const [dialog, setDialog] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => setSearch(searchParams.get('requestId') || ''), [searchParams])
  const visible = records.filter((x) => (!filter || x.status === filter) && `${x.id} ${x.requester} ${x.bloodGroup}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b) => b.requestedAt.localeCompare(a.requestedAt))
  async function save(values) { const saved = await addRequest(values); if (saved) { setDialog(false); setNotice(dataMode === 'database' ? 'Request saved to SQL Server.' : 'Request saved for this browser session.') } else setNotice('Request could not be saved. Check the database connection.') }
  async function changeStatus(id, value) { if (await transitionRequest(id, value)) setNotice(`Request status changed to ${value}.`); else setNotice('Request status could not be updated.') }
  function actions(item) {
    if (dataMode === 'checking') return <span className="text-xs text-muted">Loading…</span>
    if (item.status === 'Pending') return <><button className="text-xs font-medium text-crimson" onClick={() => changeStatus(item.id, 'Approved')}>Approve</button><button className="ml-3 text-xs text-muted" onClick={() => changeStatus(item.id, 'Rejected')}>Reject</button><button className="ml-3 text-xs text-muted" onClick={() => changeStatus(item.id, 'Cancelled')}>Cancel</button></>
    if (item.status === 'Approved' || item.status === 'Partially fulfilled') return <><Link className="text-xs font-medium text-crimson hover:underline" to={`/issues?requestId=${encodeURIComponent(item.id)}`}>Issue units</Link><button className="ml-3 text-xs text-muted" onClick={() => changeStatus(item.id, 'Cancelled')}>Cancel</button></>
    return <span className="text-xs text-muted">—</span>
  }
  return <AppShell activeLabel="Blood requests" currentPage="Blood requests"><div className="space-y-6">
    <PageHeading eyebrow="Fulfillment · Request management" title="Blood requests" description="Review request progress and connect approved requests to issue records." actions={<Button disabled={dataMode === 'checking'} onClick={() => setDialog(true)}><Plus size={17}/>New request</Button>} />
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted">{dataMode === 'database' ? 'Connected to SQL Server. Issuing links exact inventory units and updates fulfillment.' : dataMode === 'checking' ? 'Loading request and issue records…' : 'Educational demo records only. Changes are temporary in this browser session.'}</div>
    {notice && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{statuses.map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(filter === status ? '' : status)} className={`rounded-xl border bg-white p-3 text-left transition hover:border-crimson focus-visible:outline-2 focus-visible:outline-crimson ${filter === status ? 'border-crimson ring-1 ring-crimson' : 'border-border'}`}><span className="block truncate text-xs text-muted">{status}</span><span className="mt-1 block text-xl font-semibold tabular-nums">{records.filter((item) => item.status === status).length}</span></button>)}</div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search requests</span><Search className="absolute top-3 left-3 text-slate-400" size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search requester or request ID" className="min-h-10 w-full rounded-control border border-border pl-10 pr-3 text-sm"/></label><select aria-label="Filter by request status" value={filter} onChange={(e)=>setFilter(e.target.value)} className="min-h-10 rounded-control border border-border bg-white px-3 text-sm"><option value="">All statuses</option>{statuses.map((s)=><option key={s}>{s}</option>)}</select></div>
      <div className="hidden overflow-x-auto xl:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr>{['Request','Requester','Blood group','Requested','Progress','Status','Actions'].map((s)=><th key={s} className="px-4 py-3 font-medium">{s}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((x)=>{const progress = x.quantity ? Math.min(100, Math.round(x.issuedQuantity / x.quantity * 100)) : 0; return <tr key={x.id}><td className="px-4 py-4 font-medium">{x.id}</td><td className="px-4 py-4">{x.requester}</td><td className="px-4 py-4">{x.bloodGroup}</td><td className="px-4 py-4">{dateLabel(x.requestedAt)}</td><td className="min-w-40 px-4 py-4"><span className="text-xs">{x.issuedQuantity}/{x.quantity} units</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-teal" style={{width:`${progress}%`}} /></span></td><td className="px-4 py-4"><StatusBadge>{x.status}</StatusBadge></td><td className="whitespace-nowrap px-4 py-4">{actions(x)}</td></tr>})}</tbody></table></div>
      <div className="divide-y divide-border xl:hidden">{visible.map((x)=>{const progress=x.quantity?Math.min(100,Math.round(x.issuedQuantity/x.quantity*100)):0;return <article key={x.id} className="space-y-3 p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{x.requester}</p><p className="text-xs text-muted">{x.id} · {dateLabel(x.requestedAt)}</p></div><StatusBadge>{x.status}</StatusBadge></div><p className="text-sm text-muted">{x.bloodGroup} · {x.issuedQuantity} of {x.quantity} units issued</p><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-teal" style={{width:`${progress}%`}} /></div><div>{actions(x)}</div></article>})}</div>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">{dataMode === 'checking' ? 'Loading records…' : 'No requests match these filters.'}</p>}<p className="border-t border-border px-4 py-3 text-xs text-muted">Showing {visible.length} of {records.length} requests</p>
    </Card>
    {dialog && <RequestDialog onSave={save} onClose={() => setDialog(false)} />}
  </div></AppShell>
}
