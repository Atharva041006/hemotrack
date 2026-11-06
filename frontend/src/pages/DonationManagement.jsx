import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Button, Card, PageHeading, StatusBadge } from '../components/ui.jsx'
import { bloodGroups, donations as seedDonations, donors } from '../data/dashboardMockData.js'
import { api } from '../services/api.js'

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function DonationDialog({ donorOptions = donors, onSave, onClose }) {
  const ref = useRef(null)
  const [donorId, setDonorId] = useState(donorOptions[0]?.id ?? '')
  const [date, setDate] = useState(todayKey())
  const [unitCount, setUnitCount] = useState('1')
  const donor = donorOptions.find((item) => item.id === donorId)
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal() }, [])
  return (
    <dialog ref={ref} onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
      <form className="space-y-5 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); onSave({ donorId, donor, bloodGroup: donor.bloodGroup, donatedAt: date, unitCount: Number(unitCount), status: 'Screening' }); ref.current?.close() }}>
        <div><h2 className="text-lg font-semibold">Record donation</h2><p className="mt-1 text-sm text-muted">Creates an illustrative session record with initial status Screening.</p></div>
        <label className="block text-sm font-medium">Donor<select required value={donorId} onChange={(event) => setDonorId(event.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border bg-white px-3 font-normal">{donorOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-muted">Blood group</p><p className="mt-1 font-semibold">{donor?.bloodGroup}</p></div><label className="block text-sm font-medium">Record date<input required type="date" max={todayKey()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border bg-white px-3 font-normal" /></label><label className="block text-sm font-medium">Units<input required type="number" min="1" max="100" value={unitCount} onChange={(event) => setUnitCount(event.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-border bg-white px-3 font-normal" /></label></div>
        <p className="text-xs leading-5 text-muted">No clinical screening, eligibility, or collection guidance is provided.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => ref.current?.close()}>Cancel</Button><Button type="submit">Save record</Button></div>
      </form>
    </dialog>
  )
}

export default function DonationManagement() {
  const [records, setRecords] = useState(seedDonations)
  const [donorOptions, setDonorOptions] = useState(donors)
  const [dataMode, setDataMode] = useState('checking')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active=true
    Promise.all([api.donations.list(),api.donors.list()]).then(([rows,donorRows])=>{
      if(!active)return
      const options=donorRows.map((x)=>({id:x.DonorCode,databaseId:x.DonorId,name:x.FullName,bloodGroup:x.BloodGroup}))
      const byId=new Map(options.map((x)=>[x.databaseId,x]))
      setDonorOptions(options)
      setRecords(rows.map((x)=>{const donor=byId.get(x.DonorId)||{name:x.DonorName,id:String(x.DonorId)};return{id:x.DonationCode,databaseId:x.DonationId,donorId:donor.id,donor,bloodGroup:x.BloodGroup,donatedAt:typeof x.DonationDate==='string'?x.DonationDate.slice(0,10):new Date(x.DonationDate).toISOString().slice(0,10),unitCount:Number(x.UnitCount)||1,status:x.Status}}))
      setDataMode('database')
    }).catch(()=>{if(active)setDataMode('demo')})
    return()=>{active=false}
  },[])
  const visible = useMemo(() => records.filter((item) => (!statusFilter || item.status === statusFilter) && (!groupFilter || item.bloodGroup === groupFilter) && `${item.donor.name} ${item.donorId} ${item.id}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)), [records, search, statusFilter, groupFilter])
  async function save(values) {
    if(dataMode==='database'){
      const donor=donorOptions.find((x)=>x.id===values.donorId)
      try{const item=await api.donations.create({donorId:donor.databaseId,bloodGroup:donor.bloodGroup,donationDate:values.donatedAt,unitCount:values.unitCount});setRecords((items)=>[{id:item.DonationCode,databaseId:item.DonationId,donorId:donor.id,donor,bloodGroup:item.BloodGroup,donatedAt:values.donatedAt,unitCount:Number(item.UnitCount)||values.unitCount,status:item.Status},...items]);setNotice('Donation saved to SQL Server in Screening status.');setDialogOpen(false)}catch{setNotice('Database save failed; no record was created.')}
      return
    }
    setRecords((items) => [{ id: `DON-${2401 + items.length}`, ...values }, ...items])
    setNotice('Donation record added for this session. Inventory was not changed.')
    setDialogOpen(false)
  }
  async function setStatus(id, status) {
    const current=records.find((item)=>item.id===id)
    if(dataMode==='database'){
      let expiryDate
      if(status==='Accepted'){const date=new Date(`${current.donatedAt}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+90);expiryDate=date.toISOString().slice(0,10)}
      try{await api.donations.setStatus(current.databaseId,{status,expiryDate});setRecords((items)=>items.map((item)=>item.id===id?{...item,status}:item));setNotice(status==='Accepted'?'Accepted; sample inventory units were created.':'Rejected; no inventory was created.')}catch{setNotice('Database update failed; donation status was unchanged.')}
      return
    }
    setRecords((items) => items.map((item) => item.id === id ? { ...item, status } : item))
    setNotice(`Donation marked ${status} for this browser session.`)
  }
  const screeningCount = records.filter((item) => item.status === 'Screening').length
  return (
    <AppShell activeLabel="Donations" currentPage="Donations">
      <div className="space-y-6">
        <PageHeading eyebrow="Workspace · Donation management" title="Donations" description="Review donation records and manage their workflow status." actions={<Button disabled={dataMode==='checking'} onClick={() => setDialogOpen(true)}><Plus size={17} />Record donation</Button>} />
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted">{dataMode==='database'?'Connected to SQL Server; accepted records create sample inventory units.':dataMode==='checking'?'Loading donation and donor records…':'Educational demo records; changes are temporary in this browser session.'} The 90-day expiry rule is only a project demonstration and is not clinical guidance.</div>
        {notice && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</div>}
        <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Total records</p><p className="mt-2 text-2xl font-semibold">{records.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Accepted</p><p className="mt-2 text-2xl font-semibold">{records.filter((x) => x.status === 'Accepted').length}</p></Card><Card className="p-4"><p className="text-xs text-muted">In screening</p><p className="mt-2 text-2xl font-semibold">{screeningCount}</p></Card></div>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search donations</span><Search className="absolute top-3 left-3 text-slate-400" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search donor or record ID" className="min-h-10 w-full rounded-control border border-border pl-10 pr-3 text-sm" /></label>
            <select aria-label="Filter by blood group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="min-h-10 rounded-control border border-border bg-white px-3 text-sm"><option value="">All blood groups</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select>
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-10 rounded-control border border-border bg-white px-3 text-sm"><option value="">All statuses</option>{['Screening', 'Accepted', 'Rejected'].map((status) => <option key={status}>{status}</option>)}</select>
          </div>
          <div className="hidden overflow-x-auto xl:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr>{['Record', 'Donor', 'Blood group', 'Units', 'Date', 'Status', 'Workflow'].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((item) => <tr key={item.id}><td className="px-5 py-4 font-medium">{item.id}</td><td className="px-5 py-4">{item.donor.name}<span className="block text-xs text-muted">{item.donorId}</span></td><td className="px-5 py-4">{item.bloodGroup}</td><td className="px-5 py-4">{item.unitCount || 1}</td><td className="px-5 py-4">{formatDate(item.donatedAt)}</td><td className="px-5 py-4"><StatusBadge>{item.status}</StatusBadge></td><td className="px-5 py-4">{item.status === 'Screening' ? <div className="flex gap-1"><Button size="sm" onClick={() => setStatus(item.id, 'Accepted')}>Accept</Button><Button size="sm" variant="secondary" onClick={() => setStatus(item.id, 'Rejected')}>Reject</Button></div> : <span className="text-xs text-muted">No action</span>}</td></tr>)}</tbody></table></div>
          <div className="divide-y divide-border xl:hidden">{visible.map((item) => <article key={item.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.donor.name}</p><p className="text-xs text-muted">{item.donorId} · {item.id}</p></div><StatusBadge>{item.status}</StatusBadge></div><p className="text-sm text-muted">{item.bloodGroup} <span aria-hidden="true">·</span> {item.unitCount || 1} unit(s) · {formatDate(item.donatedAt)}</p>{item.status === 'Screening' && <div className="flex gap-2"><Button size="sm" onClick={() => setStatus(item.id, 'Accepted')}>Accept</Button><Button size="sm" variant="secondary" onClick={() => setStatus(item.id, 'Rejected')}>Reject</Button></div>}</article>)}</div>
          {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">No donation records match these filters.</p>}
        </Card>
        {dialogOpen && <DonationDialog donorOptions={donorOptions} onSave={save} onClose={() => setDialogOpen(false)} />}
      </div>
    </AppShell>
  )
}
