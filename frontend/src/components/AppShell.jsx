import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Activity, AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, ClipboardList, Command, Droplet,
  HeartPulse, LayoutDashboard, Menu, PackageCheck, Search, UsersRound, X,
} from 'lucide-react'
import { api } from '../services/api.js'
import { useEmergencyDemo } from '../data/emergencyDemo.jsx'
import { StatusBadge } from './ui.jsx'

const navGroups = [
  { label: 'Workspace', links: [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Donors', path: '/donors', icon: UsersRound },
    { label: 'Donations', path: '/donations', icon: HeartPulse },
    { label: 'Blood inventory', path: '/inventory', icon: Droplet },
  ] },
  { label: 'Fulfillment', links: [
    { label: 'Blood requests', path: '/requests', icon: ClipboardList },
    { label: 'Blood issues', path: '/issues', icon: PackageCheck },
  ] },
  { label: 'Insights', links: [{ label: 'Reports', path: '/reports', icon: Activity }] },
]
const pages = navGroups.flatMap((group) => group.links)
function initialDeadline() { const date = new Date(Date.now() + 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000); return date.toISOString().slice(0, 16) }

function EmergencyRequestDialog({ onClose, onCreate }) {
  const dialogRef = useRef(null)
  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ requester: '', bloodGroup: 'O+', quantity: '1', requiredBy: initialDeadline(), location: '', contact: '', notes: '' })
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal() }, [])
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  function submit(event) { event.preventDefault(); if (step === 'details') setStep('confirm'); else { onCreate({ ...form, quantity: Number(form.quantity) }); onClose() } }
  return <dialog ref={dialogRef} aria-labelledby="emergency-title" onCancel={(event) => { event.preventDefault(); onClose() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/55">
    <section className="w-full">
      <form className="space-y-4 p-5 sm:p-6" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">EDUCATIONAL DEMO ONLY</span><h2 id="emergency-title" className="mt-2 text-xl font-semibold">{step === 'details' ? 'Create emergency request' : 'Confirm demo request'}</h2><p className="mt-1 text-sm text-muted">Not connected to emergency services, the API, or SQL Server.</p></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-canvas"><X size={18}/></button></div>
        {step === 'details' ? <>
          <label className="block text-sm font-medium">Requester / hospital<input required maxLength={120} value={form.requester} onChange={update('requester')} className="mt-1.5 min-h-10 w-full rounded-control border border-border px-3 text-sm" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Blood group<select value={form.bloodGroup} onChange={update('bloodGroup')} className="mt-1.5 min-h-10 w-full rounded-control border border-border bg-white px-3 text-sm">{['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((x)=><option key={x}>{x}</option>)}</select></label><label className="block text-sm font-medium">Quantity<input required type="number" min="1" max="100" value={form.quantity} onChange={update('quantity')} className="mt-1.5 min-h-10 w-full rounded-control border border-border px-3 text-sm" /></label></div>
          <label className="block text-sm font-medium">Required by<input required type="datetime-local" min={initialDeadline()} value={form.requiredBy} onChange={update('requiredBy')} className="mt-1.5 min-h-10 w-full rounded-control border border-border px-3 text-sm" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Location<input required maxLength={160} value={form.location} onChange={update('location')} className="mt-1.5 min-h-10 w-full rounded-control border border-border px-3 text-sm" /></label><label className="block text-sm font-medium">Contact<input required type="tel" maxLength={40} value={form.contact} onChange={update('contact')} className="mt-1.5 min-h-10 w-full rounded-control border border-border px-3 text-sm" /></label></div>
          <label className="block text-sm font-medium">Notes (optional)<textarea maxLength={500} rows={2} value={form.notes} onChange={update('notes')} className="mt-1.5 w-full rounded-control border border-border px-3 py-2 text-sm" /></label>
        </> : <div className="rounded-xl border border-border bg-canvas p-4 text-sm"><p className="font-semibold">{form.requester} · {form.bloodGroup} · {form.quantity} unit(s)</p><p className="mt-2 text-muted">Required by {new Date(form.requiredBy).toLocaleString()} · {form.location}</p><p className="mt-1 text-muted">Contact: {form.contact}</p>{form.notes && <p className="mt-2 text-muted">{form.notes}</p>}<p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">This creates an in-memory classroom demo alert only. It will not notify a hospital or change inventory.</p></div>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={step === 'confirm' ? () => setStep('details') : onClose} className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium">{step === 'confirm' ? 'Back' : 'Cancel'}</button><button type="submit" className="min-h-10 rounded-lg bg-crimson px-4 text-sm font-semibold text-white">{step === 'confirm' ? 'Create demo alert' : 'Review request'}</button></div>
      </form>
    </section>
  </dialog>
}

function NotificationPanel({ emergencies, acknowledge, dismiss, updateStatus }) {
  return <section aria-label="Emergency notifications" className="absolute top-12 right-0 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-xl">
    <div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">Demo notifications</h2><p className="mt-1 text-xs text-muted">In-memory for this browser session.</p></div>
    <div className="max-h-[65vh] space-y-3 overflow-y-auto p-3">{emergencies.length ? emergencies.map((item) => <article key={item.id} className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.requester}</p><p className="mt-0.5 text-xs text-muted">{item.bloodGroup} · {item.quantity} unit(s) · {item.id}</p></div><StatusBadge>{item.status}</StatusBadge></div>
      <p className="mt-2 text-xs text-muted">{item.location} · due {new Date(item.requiredBy).toLocaleString()}</p>
      <div className="mt-3 flex flex-wrap gap-2">{item.status === 'New' && <button type="button" onClick={() => acknowledge(item.id)} className="rounded-md bg-crimson-soft px-2.5 py-1.5 text-xs font-semibold text-crimson">Acknowledge</button>}{item.status === 'Acknowledged' && <button type="button" onClick={() => updateStatus(item.id, 'In Progress')} className="rounded-md bg-crimson-soft px-2.5 py-1.5 text-xs font-semibold text-crimson">Start progress</button>}{['In Progress','Partially Fulfilled'].includes(item.status) && <><button type="button" onClick={() => updateStatus(item.id, 'Partially Fulfilled')} className="rounded-md bg-canvas px-2.5 py-1.5 text-xs font-medium">Partially fulfilled</button><button type="button" onClick={() => updateStatus(item.id, 'Fulfilled')} className="rounded-md bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800">Mark fulfilled</button><button type="button" onClick={() => updateStatus(item.id, 'Cancelled')} className="rounded-md bg-canvas px-2.5 py-1.5 text-xs font-medium">Cancel</button></>}{!item.dismissed ? <button type="button" onClick={() => dismiss(item.id)} className="rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-canvas">Dismiss alert</button> : <span className="self-center text-[11px] text-muted">Alert dismissed for this session</span>}</div>
    </article>) : <p className="px-3 py-8 text-center text-sm text-muted">No demo emergency alerts yet.</p>}</div>
    <div className="border-t border-border px-4 py-2 text-[11px] leading-4 text-amber-900">Educational prototype only. Do not use for real emergency response.</div>
  </section>
}

function SidebarContent({ activeLabel, onNavigate, workspaceMode, collapsed, onToggle }) {
  return <>
    <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} py-6`}>
      <Link aria-label="HemoTrack dashboard" className="flex min-w-0 items-center gap-3" to="/" onClick={onNavigate}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-crimson text-white"><Droplet size={22} aria-hidden="true" /></span>
        {!collapsed && <span><span className="block text-base font-semibold text-white">HemoTrack</span><span className="mt-0.5 block text-[11px] text-slate-400">Every Drop Counts.</span></span>}
      </Link>
      {onToggle && <button aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" onClick={onToggle} type="button">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>}
    </div>
    <nav className="mt-3 flex-1 px-3" aria-label="Main navigation">
      {navGroups.map((group) => <div className="mb-6" key={group.label}>
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">{group.label}</p>}
        <ul className="space-y-1">{group.links.map(({ label, path, icon: Icon }) => {
          const active = label === activeLabel
          return <li key={label}><Link aria-current={active ? 'page' : undefined} aria-label={label} title={collapsed ? label : undefined}
            className={`flex min-h-10 items-center rounded-lg text-[13px] font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'border border-white/10 bg-white/10 text-white' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'}`}
            to={path} onClick={onNavigate}><Icon size={17} aria-hidden="true" />{!collapsed && label}</Link></li>
        })}</ul>
      </div>)}
    </nav>
    <div className="border-t border-white/10 p-3">
      <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? (workspaceMode === 'database' ? 'SQL Server connected' : 'Educational demo') : undefined}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">HT</span>
        {!collapsed && <span className="min-w-0"><span className="block truncate text-xs font-medium text-white">Project workspace</span><span className="mt-0.5 block text-[11px] text-slate-400">{workspaceMode === 'database' ? 'SQL Server connected' : workspaceMode === 'checking' ? 'Checking connection' : 'Educational demo'}</span></span>}
      </div>
    </div>
  </>
}

export function AppShell({ children, activeLabel = 'Dashboard', currentPage = 'Dashboard' }) {
  const { emergencies, createEmergency, updateStatus, acknowledge, dismiss } = useEmergencyDemo()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState('checking')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuButtonRef = useRef(null)
  const searchRef = useRef(null)
  const paletteDialogRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api.health().then(() => { if (active) setWorkspaceMode('database') }).catch(() => { if (active) setWorkspaceMode('demo') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true) }
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => {
    const dialog = paletteDialogRef.current
    if (paletteOpen && dialog && !dialog.open) dialog.showModal()
    if (!paletteOpen && dialog?.open) dialog.close()
    if (paletteOpen) searchRef.current?.focus()
  }, [paletteOpen])
  useEffect(() => {
    if (!isMenuOpen) return undefined
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (event) => { if (event.key === 'Escape') { setIsMenuOpen(false); menuButtonRef.current?.focus() } }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = oldOverflow }
  }, [isMenuOpen])

  const filteredPages = pages.filter(({ label }) => label.toLowerCase().includes(query.trim().toLowerCase()))
  const activeEmergency = emergencies.find((item) => !item.dismissed && !['Fulfilled', 'Cancelled', 'Expired'].includes(item.status))
  function openPage(path) { setPaletteOpen(false); setQuery(''); navigate(path) }

  return <div className="min-h-screen bg-canvas text-ink lg:flex">
    <a className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg" href="#main-content">Skip to main content</a>
    <aside className={`hidden shrink-0 flex-col bg-navy transition-[width] duration-200 motion-reduce:transition-none lg:flex ${collapsed ? 'w-[76px]' : 'w-[250px]'}`}>
      <SidebarContent activeLabel={activeLabel} workspaceMode={workspaceMode} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    </aside>
    {isMenuOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Close navigation menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setIsMenuOpen(false)} type="button" />
      <aside id="mobile-navigation" aria-label="Mobile navigation" className="relative flex h-full w-[min(290px,85vw)] flex-col overflow-y-auto bg-navy shadow-xl">
        <button aria-label="Close navigation menu" className="absolute top-5 right-4 rounded-md p-2 text-slate-300 hover:bg-white/10" onClick={() => setIsMenuOpen(false)} type="button"><X size={18} /></button>
        <SidebarContent activeLabel={activeLabel} workspaceMode={workspaceMode} onNavigate={() => setIsMenuOpen(false)} />
      </aside>
    </div>}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button ref={menuButtonRef} aria-label="Open navigation menu" aria-expanded={isMenuOpen} aria-controls="mobile-navigation" className="rounded-lg p-2 text-muted hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(true)} type="button"><Menu size={20} /></button>
          <span className="hidden text-sm font-medium text-muted sm:inline">HemoTrack</span><span className="hidden text-slate-300 sm:inline" aria-hidden="true">/</span><span className="truncate text-sm font-semibold text-ink">{currentPage}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button aria-label="Search pages (Ctrl+K)" onClick={() => setPaletteOpen(true)} type="button" className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted hover:bg-canvas sm:px-3"><Search size={15} /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd></button>
          <button aria-label="Create emergency demo request" onClick={() => setEmergencyOpen(true)} type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-crimson px-2.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 sm:px-3"><AlertTriangle size={15}/><span className="hidden sm:inline">Emergency Request</span></button>
          <div className="relative"><button aria-label={`Notifications, ${emergencies.length} demo alerts`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} type="button" className="relative rounded-lg p-2 text-muted hover:bg-canvas"><Bell size={18}/>{emergencies.length > 0 && <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-crimson text-[9px] font-bold text-white">{Math.min(emergencies.length, 9)}</span>}</button>{notificationsOpen && <NotificationPanel emergencies={emergencies} acknowledge={acknowledge} dismiss={dismiss} updateStatus={updateStatus}/>}</div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${workspaceMode === 'database' ? 'border-teal-100 bg-teal-50 text-teal-800' : 'border-rose-100 bg-rose-50 text-crimson'}`}><span className={`size-1.5 rounded-full ${workspaceMode === 'database' ? 'bg-teal-600' : 'bg-crimson'}`} aria-hidden="true" /><span className="sm:hidden">{workspaceMode === 'checking' ? '…' : workspaceMode === 'database' ? 'SQL' : 'Demo'}</span><span className="hidden sm:inline">{workspaceMode === 'checking' ? 'Checking connection' : workspaceMode === 'database' ? 'SQL Server connected' : 'Demo workspace'}</span></span>
          <span className="flex size-8 items-center justify-center rounded-full bg-crimson-soft text-[11px] font-semibold text-crimson" aria-label="Project workspace profile">HT</span>
        </div>
      </header>
      {activeEmergency && <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-8"><div className="flex min-w-0 items-start gap-2.5"><AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={17}/><p className="text-xs leading-5 text-amber-950"><span className="mr-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">DEMO ALERT</span><strong>{activeEmergency.requester}</strong> · {activeEmergency.bloodGroup} · {activeEmergency.quantity} unit(s) · due {new Date(activeEmergency.requiredBy).toLocaleString()} <span className="text-amber-800">({activeEmergency.status})</span></p></div><div className="flex shrink-0 gap-2">{activeEmergency.status === 'New' && <button type="button" onClick={() => acknowledge(activeEmergency.id)} className="inline-flex items-center gap-1 rounded-md bg-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-950"><Check size={13}/>Acknowledge</button>}<button type="button" onClick={() => setNotificationsOpen(true)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">View notification</button></div></div>}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">{children}</main>
    </div>
    {paletteOpen && <dialog ref={paletteDialogRef} aria-label="Search dashboard pages" onCancel={(event) => { event.preventDefault(); setPaletteOpen(false) }} onClose={() => setPaletteOpen(false)} className="m-auto w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/40">
      <section className="w-full">
        <div className="flex items-center gap-3 border-b border-border px-4"><Search size={18} className="text-muted" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setPaletteOpen(false); if (event.key === 'Enter' && filteredPages[0]) openPage(filteredPages[0].path) }} placeholder="Search pages…" className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" /><button aria-label="Close search" onClick={() => setPaletteOpen(false)} type="button" className="rounded p-1 text-muted hover:bg-canvas"><X size={17} /></button></div>
        <ul className="max-h-72 overflow-y-auto p-2">{filteredPages.length ? filteredPages.map(({ label, path, icon: Icon }) => <li key={path}><button onClick={() => openPage(path)} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-canvas"><Icon size={17} className="text-muted" />{label}<ChevronRight size={15} className="ml-auto text-slate-400" /></button></li>) : <li className="px-3 py-6 text-center text-sm text-muted">No matching page.</li>}</ul>
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-[11px] text-muted"><Command size={13} /> Search and open implemented pages</div>
      </section>
    </dialog>}
    {emergencyOpen && <EmergencyRequestDialog onClose={() => setEmergencyOpen(false)} onCreate={createEmergency} />}
  </div>
}
