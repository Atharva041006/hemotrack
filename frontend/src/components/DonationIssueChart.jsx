import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
      {payload.map((item) => (
        <p className="text-xs leading-5 text-muted" key={item.dataKey}>
          <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}: <span className="font-semibold text-ink">{item.value}</span>
          {item.dataKey === 'issued' ? ' units' : ''}
        </p>
      ))}
    </div>
  )
}

export function DonationIssueChart({ data }) {
  return (
    <div className="h-[245px] w-full min-w-0" role="img" aria-label="Bar chart comparing accepted donations and units issued over six months">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -18 }} barGap={7}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" strokeDasharray="3 5" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-chart-muted)', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-chart-light)', fontSize: 11 }}
            width={34}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-chart-cursor)' }} />
          <Bar dataKey="donations" name="Accepted donations" fill="var(--color-crimson)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="issued" name="Units issued" fill="var(--color-navy)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
