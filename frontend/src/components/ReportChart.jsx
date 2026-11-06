import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ReportChart({ data }) {
  return <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{ fill: 'var(--color-chart-muted)' }}/><YAxis allowDecimals={false} tick={{ fill: 'var(--color-chart-muted)' }}/><Tooltip/><Bar dataKey="donations" fill="var(--color-crimson)" radius={[4,4,0,0]}/><Bar dataKey="issues" fill="var(--color-success)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
}
