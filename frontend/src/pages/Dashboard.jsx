import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowUpRight,
  AlertTriangle,
  CalendarDays,
  Clock3,
  Droplet,
  HeartPulse,
  PackageCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router'
import { AppShell } from '../components/AppShell.jsx'
import { Card, StatusBadge } from '../components/ui.jsx'
import {
  dashboardRules,
  donations,
  getDashboardAlerts,
  getDonationIssueAnalytics,
  getInventorySummary,
  getIssuedThisMonth,
  donors,
  requests,
} from '../data/dashboardMockData.js'
import { api } from '../services/api.js'

const DonationIssueChart = lazy(() => import('../components/DonationIssueChart.jsx').then((module) => ({ default: module.DonationIssueChart })))

const iconsByStat = {
  donors: UsersRound,
  inventory: Droplet,
  requests: Clock3,
  issued: PackageCheck,
}

function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en', options)
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ kind, label, value, detail }) {
  const Icon = iconsByStat[kind]
  const iconStyle = {
    donors: 'bg-rose-50 text-crimson',
    inventory: 'bg-teal-50 text-teal',
    requests: 'bg-amber-50 text-amber',
    issued: 'bg-slate-100 text-navy',
  }[kind]

  return (
      <Card className="group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-crimson/80 to-rose-100 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-3 text-[30px] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
          <p className="mt-2 text-xs text-muted">{detail}</p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
    </Card>
  )
}

function SectionHeading({ title, description, trailing }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
      </div>
      {trailing}
    </div>
  )
}

function InventoryOverview({ summary }) {
  return (
    <section aria-labelledby="inventory-heading">
      <SectionHeading
        title={<span id="inventory-heading">Blood inventory</span>}
        description="Eligible units currently available by blood group."
        trailing={<span className="hidden text-xs text-muted sm:block">Low stock ≤ {dashboardRules.lowStockThreshold}</span>}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {summary.map(({ bloodGroup, count, status }) => {
          const isLow = status === 'Low stock'
          return (
            <Link aria-label={`View ${bloodGroup} inventory units`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson" key={bloodGroup} to={`/inventory?bloodGroup=${encodeURIComponent(bloodGroup)}`}>
            <Card className={`relative h-full overflow-hidden p-3.5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${isLow ? 'border-amber-200' : ''}`}>
              <span className={`absolute inset-x-0 top-0 h-0.5 ${isLow ? 'bg-amber' : 'bg-teal'}`} />
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-ink">{bloodGroup}</span>
                <span className={`size-2 rounded-full ${isLow ? 'bg-amber' : 'bg-teal'}`} aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-ink tabular-nums">{count}</p>
              <p className={`mt-0.5 text-[11px] font-medium ${isLow ? 'text-amber-800' : 'text-teal-800'}`}>
                {isLow ? 'Low stock' : 'Available'}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${count} eligible units`}>
                <span className={`block h-full rounded-full ${isLow ? 'bg-amber' : 'bg-teal'}`} style={{ width: `${Math.min(100, count / Math.max(dashboardRules.lowStockThreshold * 2, 1) * 100)}%` }} />
              </div>
            </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function AlertPanel({ alerts }) {
  const styleByKind = {
    critical: { icon: AlertTriangle, classes: 'bg-red-50 text-critical' },
    warning: { icon: CalendarDays, classes: 'bg-amber-50 text-amber-800' },
    info: { icon: Clock3, classes: 'bg-teal-50 text-teal-800' },
  }

  return (
    <Card className="h-full p-5">
      <SectionHeading title="Alerts & reminders" description="Based on current inventory and request records." />
      <div className="space-y-3">
        {alerts.length ? alerts.map((alert) => {
          const style = styleByKind[alert.kind]
          const Icon = style.icon
          return (
            <div className="flex gap-3 rounded-lg border border-border p-3" key={alert.id}>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.classes}`}>
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{alert.description}</p>
                <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-crimson hover:underline focus-visible:outline-2 focus-visible:outline-crimson" to={alert.kind === 'info' ? '/requests' : '/inventory'}>
                  {alert.kind === 'info' ? 'Review requests' : 'Review inventory'} <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )
        }) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            No alerts for the current records.
          </div>
        )}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted">
        Low-stock threshold: {dashboardRules.lowStockThreshold} units · Expiry window: {dashboardRules.expiryAlertWindowDays} days
      </p>
    </Card>
  )
}

function RecentDonations({ rows }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading
        title="Recent donations"
        description="Latest recorded donation activity."
        trailing={(
          <Link aria-label="View all donations" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-slate-100 hover:text-crimson focus-visible:outline-2 focus-visible:outline-crimson" to="/donations">
            View all <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      />
      {rows.length ? (
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="text-[11px] font-medium text-muted">
              <tr className="border-b border-border">
                <th className="w-[42%] pb-2.5 font-medium">Donor</th>
                <th className="w-[17%] pb-2.5 font-medium">Group</th>
                <th className="hidden w-[20%] pb-2.5 font-medium sm:table-cell">Date</th>
                <th className="w-[25%] pb-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((donation) => (
                <tr className="align-middle" key={donation.id}>
                  <td className="py-3 pr-2">
                    <span className="block truncate text-sm font-medium text-ink">{donation.donor.name}</span>
                    <span className="mt-0.5 block text-[11px] text-muted sm:hidden">{formatDate(donation.donatedAt)}</span>
                  </td>
                  <td className="py-3 text-sm font-medium text-ink">{donation.bloodGroup}</td>
                  <td className="hidden py-3 text-xs text-muted sm:table-cell">{formatDate(donation.donatedAt)}</td>
                  <td className="py-3"><StatusBadge>{donation.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No donations have been recorded yet." />
      )}
    </Card>
  )
}

function RecentRequests({ rows }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading
        title="Recent blood requests"
        description="Latest blood requests and their fulfillment status."
        trailing={(
          <Link aria-label="View all blood requests" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-slate-100 hover:text-crimson focus-visible:outline-2 focus-visible:outline-crimson" to="/requests">
            View all <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      />
      {rows.length ? (
        <ul className="divide-y divide-border">
          {rows.map((request) => (
            <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={request.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{request.requester}</p>
                <p className="mt-1 text-xs text-muted">
                  <span className="font-medium text-ink">{request.bloodGroup}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {request.quantity} {request.quantity === 1 ? 'unit' : 'units'}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {formatDate(request.requestedAt)}
                </p>
              </div>
              <StatusBadge className="shrink-0">{request.status}</StatusBadge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No blood requests have been recorded yet." />
      )}
    </Card>
  )
}

function EmptyState({ message }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{message}</div>
}

export default function Dashboard() {
  const [liveData, setLiveData] = useState(null)
  useEffect(() => { let active=true; api.dashboard().then((data)=>{if(active)setLiveData(data)}).catch(()=>{}); return()=>{active=false} }, [])
  const inventory = liveData ? liveData.stockByBloodGroup.map((x)=>({bloodGroup:x.BloodGroup,count:Number(x.UnitCount),status:Number(x.UnitCount)<=dashboardRules.lowStockThreshold?'Low stock':'Healthy stock'})) : getInventorySummary()
  const availableCount = inventory.reduce((sum, group) => sum + group.count, 0)
  const pendingCount = liveData ? Number(liveData.summary.PendingRequests) : requests.filter((request) => request.status === 'Pending').length
  const analytics = liveData ? liveData.monthly : getDonationIssueAnalytics()
  const alerts = liveData ? [
    ...(inventory.filter((x)=>x.count<=dashboardRules.lowStockThreshold).length?[{id:'low',kind:'critical',title:'Low inventory',description:`${inventory.filter((x)=>x.count<=dashboardRules.lowStockThreshold).length} blood groups are at or below ${dashboardRules.lowStockThreshold} units`}]:[]),
    ...(Number(liveData.summary.ExpiringUnits)?[{id:'expiry',kind:'warning',title:'Approaching expiry',description:`${liveData.summary.ExpiringUnits} units expire within ${dashboardRules.expiryAlertWindowDays} days`}]:[]),
    ...(pendingCount?[{id:'requests',kind:'info',title:'Requests awaiting review',description:`${pendingCount} blood requests are pending`}]:[]),
  ] : getDashboardAlerts()
  const toKey=(value)=>typeof value==='string'?value.slice(0,10):new Date(value).toISOString().slice(0,10)
  const recentDonations = liveData ? liveData.recentDonations.map((x)=>({id:x.DonationCode,donor:{name:x.DonorName},bloodGroup:x.BloodGroup,donatedAt:toKey(x.DonationDate),status:x.Status})) : [...donations].sort((a,b)=>b.donatedAt.localeCompare(a.donatedAt)).slice(0,4)
  const recentRequests = liveData ? liveData.recentRequests.map((x)=>({id:x.RequestCode,requester:x.RequesterName,bloodGroup:x.BloodGroup,quantity:x.RequestedQuantity,requestedAt:toKey(x.RequestDate),status:x.Status==='PartiallyFulfilled'?'Partially fulfilled':x.Status})) : [...requests].sort((a,b)=>b.requestedAt.localeCompare(a.requestedAt)).slice(0,4)
  const issuedThisMonth = liveData ? Number(liveData.summary.IssuedThisMonth) : getIssuedThisMonth()

  return (
    <AppShell>
      <div className="space-y-7 sm:space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-muted"><CalendarDays size={14} aria-hidden="true" />{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{greeting()}, welcome back</h1>
            <p className="mt-1 text-sm text-muted">A snapshot of donor activity, available blood, and requests needing attention.</p>
          </div>
          <Link className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-crimson px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson" to="/donations">
            <HeartPulse size={16} aria-hidden="true" /> Record donation <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard kind="donors" label="Registered donors" value={liveData ? Number(liveData.summary.DonorCount) : donors.length} detail={liveData ? 'SQL Server records' : 'Fictional demo records'} />
          <StatCard kind="inventory" label="Available blood units" value={liveData ? Number(liveData.summary.EligibleUnits) : availableCount} detail="Eligible stock across 8 groups" />
          <StatCard kind="requests" label="Pending requests" value={pendingCount} detail="Awaiting review" />
          <StatCard kind="issued" label="Units issued" value={issuedThisMonth} detail={liveData ? 'Month to date · SQL Server' : 'Month to date · demo records'} />
        </div>

        <InventoryOverview summary={inventory} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.9fr)]">
          <Card className="min-w-0 p-5 sm:p-6">
            <SectionHeading
              title="Donation & issue activity"
              description="Six-month comparison from current records."
              trailing={<span className="rounded-md bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">Last 6 months</span>}
            />
            <div className="mb-1 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><span className="size-2 rounded-sm bg-crimson" />Accepted donations</span>
              <span className="inline-flex items-center gap-2"><span className="size-2 rounded-sm bg-navy" />Units issued</span>
            </div>
            <Suspense fallback={<div className="h-[245px] rounded-lg bg-canvas" aria-label="Loading donation analytics" />}>
              <DonationIssueChart data={analytics} />
            </Suspense>
            <p className="mt-1 text-[11px] leading-5 text-muted">Donations count accepted records; issues are shown as individual units issued.</p>
          </Card>
          <AlertPanel alerts={alerts} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <RecentDonations rows={recentDonations} />
          <RecentRequests rows={recentRequests} />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-muted">
          <PackageCheck size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
          <p>{liveData ? 'Connected to SQL Server. This college project is not a medically validated clinical system.' : 'Illustrative synthetic data only. This college project is not a medically validated clinical system.'}</p>
        </div>
      </div>
    </AppShell>
  )
}
