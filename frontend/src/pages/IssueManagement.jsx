import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Button, Card, PageHeading } from '../components/ui.jsx'
import { getWorkflowSnapshot, subscribeWorkflow, createIssue } from '../data/workflowStore.js'

function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function dateLabel(value) { return new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) }

function IssueDialog({ requests, units, onClose, onComplete, initialRequestId }) {
  const dialogRef = useRef(null)
  const [requestId, setRequestId] = useState(() => requests.some((item) => item.id === initialRequestId) ? initialRequestId : requests[0]?.id ?? '')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const request = requests.find((item) => item.id === requestId)
  const eligible = units.filter((unit) => unit.status === 'Available' && unit.expiryDate > todayKey() && unit.bloodGroup === request?.bloodGroup).sort((a,b) => a.expiryDate.localeCompare(b.expiryDate))
  const remaining = request ? request.quantity - request.issuedQuantity : 0
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal() }, [])
  async function submit(event) { event.preventDefault(); try { await onComplete(requestId, selected); } catch (e) { setError(e.message) } }
  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(580px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"><form className="space-y-5 p-5 sm:p-6" onSubmit={submit}><div><h2 className="text-lg font-semibold">Issue blood units</h2><p className="mt-1 text-sm text-muted">Only eligible, unexpired units matching the request are listed.</p></div><label className="block text-sm font-medium">Approved request<select value={requestId} onChange={(e)=>{setRequestId(e.target.value);setSelected([]);setError('')}} className="mt-2 min-h-11 w-full rounded-control border border-border bg-white px-3 font-normal">{requests.map((x)=><option key={x.id} value={x.id}>{x.id} · {x.requester} · {x.bloodGroup} · {x.quantity-x.issuedQuantity} needed</option>)}</select></label>{request&&<p className="text-xs text-muted">Remaining: {remaining} unit(s). Available matching units: {eligible.length}.</p>}<div className="max-h-64 overflow-y-auto rounded-lg border border-border">{eligible.map((unit)=><label key={unit.id} className="flex min-h-11 items-center gap-3 border-b border-border px-3 text-sm last:border-0"><input type="checkbox" checked={selected.includes(unit.id)} disabled={!selected.includes(unit.id)&&selected.length>=remaining} onChange={(e)=>setSelected((ids)=>e.target.checked?[...ids,unit.id]:ids.filter((id)=>id!==unit.id))}/><span className="flex-1">{unit.id}</span><span className="text-muted">Expires {dateLabel(unit.expiryDate)}</span></label>)}{eligible.length===0&&<p className="p-4 text-sm text-muted">No eligible matching units available.</p>}</div>{error&&<p role="alert" className="text-sm text-critical">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!selected.length}>Issue {selected.length||''} unit(s)</Button></div></form></dialog>
}

export default function IssueManagement() {
  const { requests, units, issues, dataMode } = useSyncExternalStore(subscribeWorkflow, getWorkflowSnapshot)
  const [searchParams] = useSearchParams()
  const targetRequestId = searchParams.get('requestId') || ''
  const handledRequest = useRef('')
  const [dialog, setDialog] = useState(false)
  const [notice, setNotice] = useState('')
  const issuable = requests.filter((item)=>['Approved','Partially fulfilled'].includes(item.status)&&item.issuedQuantity<item.quantity)
  useEffect(() => {
    if (dataMode !== 'checking' && targetRequestId && handledRequest.current !== targetRequestId && issuable.some((item) => item.id === targetRequestId)) {
      handledRequest.current = targetRequestId
      setDialog(true)
    }
  }, [dataMode, targetRequestId, issuable])
  async function complete(requestId, unitIds) { const issue=await createIssue(requestId,unitIds); setDialog(false); setNotice(`${issue.quantity} unit(s) issued as ${issue.id}. Inventory and request progress updated.`) }
  return <AppShell activeLabel="Blood issues" currentPage="Blood issues"><div className="space-y-6"><PageHeading eyebrow="Fulfillment · Issue management" title="Blood issues" description="Issue eligible inventory against approved requests and keep an auditable unit-level history." actions={<Button onClick={()=>setDialog(true)} disabled={!issuable.length}><Plus size={17}/>Record issue</Button>}/><div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted">{dataMode === 'database' ? 'SQL Server connected; issuing updates linked units and requests transactionally.' : dataMode === 'checking' ? 'Loading request and inventory records…' : 'Demo mode. Changes last for this browser session and do not indicate clinical guidance.'}</div>{notice&&<div role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</div>}<div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Issue records</p><p className="mt-2 text-2xl font-semibold">{issues.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Units issued</p><p className="mt-2 text-2xl font-semibold">{issues.reduce((sum,x)=>sum+x.quantity,0)}</p></Card><Card className="p-4"><p className="text-xs text-muted">Requests awaiting issue</p><p className="mt-2 text-2xl font-semibold">{issuable.length}</p></Card></div><Card className="overflow-hidden"><div className="border-b border-border p-4"><h2 className="font-semibold">Issue history</h2><p className="mt-1 text-xs text-muted">Each issue links to its request and exact inventory units.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr>{['Issue','Request','Date','Units','Quantity'].map((x)=><th className="px-4 py-3 font-medium" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-border">{issues.map((item)=><tr key={item.id}><td className="px-4 py-4 font-medium">{item.id}</td><td className="px-4 py-4"><Link className="font-medium text-crimson hover:underline" to={`/requests?requestId=${encodeURIComponent(item.requestId)}`}>{item.requestId}</Link></td><td className="px-4 py-4">{dateLabel(item.issuedAt)}</td><td className="max-w-72 px-4 py-4 text-xs text-muted">{item.unitIds.length?item.unitIds.join(', '):'Historical demo record'}</td><td className="px-4 py-4">{item.quantity} units</td></tr>)}</tbody></table></div>{!issues.length&&<p className="p-8 text-center text-sm text-muted">No issue records yet.</p>}</Card>{dialog&&<IssueDialog requests={issuable} units={units} initialRequestId={targetRequestId} onClose={()=>setDialog(false)} onComplete={complete}/>}</div></AppShell>
}
