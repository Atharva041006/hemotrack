import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Pencil, Search, UserRoundPlus, X } from 'lucide-react'
import { AppShell } from '../components/AppShell.jsx'
import { Button, Card, PageHeading, StatusBadge } from '../components/ui.jsx'
import { bloodGroups, donations, donors as initialDonors } from '../data/dashboardMockData.js'
import { api } from '../services/api.js'

function formatDate(value) {
  if (!value) return 'No donation recorded'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function latestDonationFor(donorId) {
  return donations
    .filter((donation) => donation.donorId === donorId)
    .sort((first, second) => second.donatedAt.localeCompare(first.donatedAt))[0]
}

function DonorFormDialog({ donor, onSave, onClose }) {
  const dialogRef = useRef(null)
  const [name, setName] = useState(donor?.name ?? '')
  const [bloodGroup, setBloodGroup] = useState(donor?.bloodGroup ?? bloodGroups[0])
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    const element = dialogRef.current
    if (element && !element.open) element.showModal()
  }, [])

  function submit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setNameError('Enter a name with at least two characters.')
      return
    }
    onSave({ name: trimmedName, bloodGroup })
    dialogRef.current?.close()
  }

  return (
    <dialog
      aria-labelledby="donor-form-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(500px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault()
        dialogRef.current?.close()
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <form className="p-5 sm:p-6" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink" id="donor-form-title">
              {donor ? 'Edit donor' : 'Register donor'}
            </h2>
            <p className="mt-1 text-sm text-muted">Enter the minimum information needed for this demonstration record.</p>
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-control p-2 text-muted hover:bg-slate-100"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-ink" htmlFor="donor-name">
            Donor name
            <input
              autoComplete="off"
              autoFocus
              className={`mt-2 block min-h-11 w-full rounded-control border bg-white px-3 text-sm font-normal text-ink shadow-sm outline-none placeholder:text-slate-400 focus:border-crimson focus:ring-3 focus:ring-crimson/15 ${nameError ? 'border-critical' : 'border-border'}`}
              aria-describedby={nameError ? 'donor-name-error' : undefined}
              aria-invalid={Boolean(nameError)}
              id="donor-name"
              maxLength={80}
              minLength={2}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
              }}
              placeholder="Enter a fictional name"
              required
              value={name}
            />
            {nameError && <span className="mt-1.5 block text-xs font-normal text-critical" id="donor-name-error">{nameError}</span>}
          </label>

          <label className="block text-sm font-medium text-ink" htmlFor="donor-blood-group">
            Blood group
            <select
              className="mt-2 block min-h-11 w-full rounded-control border border-border bg-white px-3 text-sm font-normal text-ink shadow-sm outline-none focus:border-crimson focus:ring-3 focus:ring-crimson/15"
              id="donor-blood-group"
              onChange={(event) => setBloodGroup(event.target.value)}
              value={bloodGroup}
            >
              {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-7 flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()} type="button">Cancel</Button>
          <Button type="submit">{donor ? 'Save changes' : 'Register donor'}</Button>
        </div>
      </form>
    </dialog>
  )
}

function DonorDetailsDialog({ donor, onClose, history }) {
  const dialogRef = useRef(null)
  const donorHistory = history

  useEffect(() => {
    const element = dialogRef.current
    if (element && !element.open) element.showModal()
  }, [])

  return (
    <dialog
      aria-labelledby="donor-details-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(600px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Donor profile</p>
            <h2 className="mt-1 text-xl font-semibold text-ink" id="donor-details-title">{donor.name}</h2>
            <p className="mt-1 text-sm text-muted">Record {donor.id}</p>
          </div>
          <button
            aria-label="Close donor details"
            className="rounded-control p-2 text-muted hover:bg-slate-100"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-canvas p-3.5">
            <p className="text-xs text-muted">Blood group</p>
            <p className="mt-1 text-base font-semibold text-ink">{donor.bloodGroup}</p>
          </div>
          <div className="rounded-lg bg-canvas p-3.5">
            <p className="text-xs text-muted">Registered</p>
            <p className="mt-1 text-sm font-medium text-ink">{formatDate(donor.registeredAt)}</p>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="eligibility-heading">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink" id="eligibility-heading">Eligibility information</h3>
            <StatusBadge>Not assessed</StatusBadge>
          </div>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
            HemoTrack does not assess clinical donor eligibility. A qualified professional must make any real-world eligibility decision.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="donation-history-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink" id="donation-history-heading">Donation history</h3>
            <span className="text-xs text-muted">{donorHistory.length} {donorHistory.length === 1 ? 'record' : 'records'}</span>
          </div>
          {donorHistory.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {donorHistory.map((donation) => (
                <li className="flex items-center justify-between gap-3 px-3.5 py-3" key={donation.id}>
                  <div>
                    <p className="text-sm font-medium text-ink">{formatDate(donation.donatedAt)}</p>
                    <p className="mt-0.5 text-xs text-muted">{donation.bloodGroup} · {donation.id}</p>
                  </div>
                  <StatusBadge>{donation.status}</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">No donation history recorded.</p>
          )}
        </section>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()} type="button">Close</Button>
        </div>
      </div>
    </dialog>
  )
}

function DonorActions({ onView, onEdit, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button aria-label="View donor details" className="size-9 min-h-9 px-0" onClick={onView} size="sm" variant="quiet">
          <Eye size={16} aria-hidden="true" />
        </Button>
        <Button aria-label="Edit donor" className="size-9 min-h-9 px-0" onClick={onEdit} size="sm" variant="quiet">
          <Pencil size={16} aria-hidden="true" />
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button className="px-2.5 sm:px-3" onClick={onView} size="sm" variant="quiet">View</Button>
      <Button className="px-2.5 sm:px-3" onClick={onEdit} size="sm" variant="quiet">Edit</Button>
    </div>
  )
}

export default function DonorManagement() {
  const [donors, setDonors] = useState(initialDonors)
  const [search, setSearch] = useState('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('')
  const [editingDonor, setEditingDonor] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [notice, setNotice] = useState('')
  const [dataMode, setDataMode] = useState('checking')
  const [databaseDonations, setDatabaseDonations] = useState([])

  useEffect(() => {
    let current = true
    Promise.all([api.donors.list(), api.donations.list()]).then(([items, history]) => {
      if (!current) return
      setDonors(items.map((item) => ({ id: item.DonorCode, databaseId: item.DonorId, name: item.FullName, bloodGroup: item.BloodGroup, registeredAt: String(item.CreatedAt).slice(0, 10) })))
      setDatabaseDonations(history.map((item) => ({ id: item.DonationCode, donorId: item.DonorId, bloodGroup: item.BloodGroup, donatedAt: typeof item.DonationDate === 'string' ? item.DonationDate.slice(0, 10) : new Date(item.DonationDate).toISOString().slice(0, 10), status: item.Status })))
      setDataMode('database')
    }).catch(() => { if (current) setDataMode('demo') })
    return () => { current = false }
  }, [])

  const visibleDonors = useMemo(() => donors
    .filter((donor) => donor.bloodGroup === bloodGroupFilter || !bloodGroupFilter)
    .filter((donor) => `${donor.name} ${donor.id}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((first, second) => first.name.localeCompare(second.name)), [donors, bloodGroupFilter, search])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function saveDonor(values) {
    if (dataMode === 'checking') return
    if (dataMode === 'database') {
      try {
        const result = editingDonor
          ? await api.donors.update(editingDonor.databaseId, values)
          : await api.donors.create(values)
        const saved = { id: result.DonorCode, databaseId: result.DonorId, name: result.FullName, bloodGroup: result.BloodGroup, registeredAt: String(result.CreatedAt).slice(0, 10) }
        setDonors((current) => editingDonor ? current.map((donor) => donor.id === editingDonor.id ? saved : donor) : [saved, ...current])
        setNotice(editingDonor ? 'Donor record updated.' : 'Donor registered.')
        setIsFormOpen(false)
        setEditingDonor(null)
        return
      } catch {
        setNotice('Database save failed; no session-only record was created.')
        return
      }
    }
    if (editingDonor) {
      setDonors((current) => current.map((donor) => donor.id === editingDonor.id ? { ...donor, ...values } : donor))
      setNotice('Donor record updated in this session.')
    } else {
      setDonors((current) => {
        const lastNumber = current.reduce((max, donor) => Math.max(max, Number(donor.id.slice(2)) || 1000), 1000)
        return [{
          id: `D-${lastNumber + 1}`,
          ...values,
          registeredAt: todayKey(),
        }, ...current]
      })
      setNotice('Donor registered in this session.')
    }
    setIsFormOpen(false)
    setEditingDonor(null)
  }

  function openCreateDialog() {
    setEditingDonor(null)
    setIsFormOpen(true)
  }

  function openEditDialog(donor) {
    setEditingDonor(donor)
    setIsFormOpen(true)
  }

  return (
    <AppShell activeLabel="Donors" currentPage="Donors">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Workspace · Donor management"
          title="Donors"
          description="Register fictional donors, find records quickly, and review donation history."
          actions={(
            <Button disabled={dataMode === 'checking'} onClick={openCreateDialog}>
              <UserRoundPlus size={17} aria-hidden="true" />
              Register donor
            </Button>
          )}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{dataMode === 'database' ? 'Connected to SQL Server. No contact details are collected.' : dataMode === 'checking' ? 'Loading donor records…' : 'Demonstration records only. Changes are temporary in this browser session.'}</p>
          <p className="shrink-0 font-medium text-ink">{donors.length} {dataMode === 'database' ? '' : 'fictional'} donor records</p>
        </div>

        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">
            <p>{notice}</p>
            <button aria-label="Dismiss message" className="rounded p-1 hover:bg-teal-100" onClick={() => setNotice('')} type="button"><X size={16} /></button>
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <label className="sr-only" htmlFor="donor-search">Search donors by name or ID</label>
              <input
                className="min-h-10 w-full rounded-control border border-border bg-white pr-3 pl-9 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-crimson focus:ring-3 focus:ring-crimson/15"
                id="donor-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search donor name or ID"
                type="search"
                value={search}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="blood-group-filter">Filter by blood group</label>
              <select
                className="min-h-10 min-w-40 rounded-control border border-border bg-white px-3 text-sm text-ink outline-none focus:border-crimson focus:ring-3 focus:ring-crimson/15"
                id="blood-group-filter"
                onChange={(event) => setBloodGroupFilter(event.target.value)}
                value={bloodGroupFilter}
              >
                <option value="">All blood groups</option>
                {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
              {(search || bloodGroupFilter) && (
                <Button onClick={() => { setSearch(''); setBloodGroupFilter('') }} size="sm" variant="quiet">Clear</Button>
              )}
            </div>
          </div>

          {visibleDonors.length ? (
            <>
              <div className="divide-y divide-border md:hidden">
                {visibleDonors.map((donor) => {
                  const lastDonation = latestDonationFor(donor.id)
                  return (
                    <div className="px-4 py-3.5" key={donor.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{donor.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted">{donor.id}</p>
                        </div>
                        <DonorActions compact onEdit={() => openEditDialog(donor)} onView={() => setSelectedDonor(donor)} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-ink">{donor.bloodGroup}</span>
                        <span className="text-xs text-muted">Last donation: {lastDonation ? formatDate(lastDonation.donatedAt) : 'None'}</span>
                        <StatusBadge>Not assessed</StatusBadge>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden md:block">
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-50 text-[11px] font-medium text-muted">
                  <tr>
                    <th className="w-[32%] px-4 py-3 font-medium lg:px-5">Donor</th>
                    <th className="w-[14%] px-2 py-3 font-medium">Blood group</th>
                    <th className="w-[19%] px-3 py-3 font-medium">Last donation</th>
                    <th className="w-[17%] px-2 py-3 font-medium">Eligibility</th>
                    <th className="w-[18%] px-3 py-3 text-right font-medium lg:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleDonors.map((donor) => {
                    const lastDonation = latestDonationFor(donor.id)
                    return (
                      <tr className="hover:bg-slate-50/70" key={donor.id}>
                        <td className="px-4 py-3 lg:px-5">
                          <p className="truncate text-sm font-medium text-ink">{donor.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted">{donor.id}</p>
                        </td>
                        <td className="px-2 py-3 text-sm font-medium text-ink">{donor.bloodGroup}</td>
                        <td className="px-3 py-3 text-xs text-muted">{formatDate(lastDonation?.donatedAt)}</td>
                        <td className="px-2 py-3"><StatusBadge>Not assessed</StatusBadge></td>
                        <td className="px-3 py-3 lg:px-5">
                          <DonorActions onEdit={() => openEditDialog(donor)} onView={() => setSelectedDonor(donor)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-ink">No donors found</p>
              <p className="mt-1 text-sm text-muted">Try a different name, ID, or blood group filter.</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
            <span>Showing {visibleDonors.length} of {donors.length} donor records</span>
            <span className="hidden sm:inline">{dataMode === 'database' ? 'SQL Server records' : dataMode === 'checking' ? 'Loading…' : 'Fictional demo data'}</span>
          </div>
        </Card>

        <p className="text-xs leading-5 text-muted">
          Eligibility is not calculated. Review the history for project demonstration purposes only; this interface does not provide clinical guidance.
        </p>
      </div>

      {isFormOpen && (
        <DonorFormDialog
          donor={editingDonor}
          onClose={() => setIsFormOpen(false)}
          onSave={saveDonor}
        />
      )}
      {selectedDonor && (
        <DonorDetailsDialog donor={selectedDonor} history={(dataMode === 'database' ? databaseDonations.filter((item) => item.donorId === selectedDonor.databaseId) : donations.filter((item) => item.donorId === selectedDonor.id)).sort((a, b) => b.donatedAt.localeCompare(a.donatedAt))} onClose={() => setSelectedDonor(null)} />
      )}
    </AppShell>
  )
}
