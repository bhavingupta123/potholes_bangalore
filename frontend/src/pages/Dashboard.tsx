import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import type { Stats } from '../types'
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from '../utils/constants'

interface DashboardProps {
  stats: Stats | null
  loading: boolean
}

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Dashboard({ stats, loading }: DashboardProps) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const typeData = Object.entries(stats.by_type).map(([key, value]) => ({
    name: ISSUE_TYPE_CONFIG[key as keyof typeof ISSUE_TYPE_CONFIG]?.label ?? key,
    value,
    color: ISSUE_TYPE_CONFIG[key as keyof typeof ISSUE_TYPE_CONFIG]?.color ?? '#6b7280',
    emoji: ISSUE_TYPE_CONFIG[key as keyof typeof ISSUE_TYPE_CONFIG]?.emoji ?? '❓',
  }))

  const severityData = Object.entries(stats.by_severity).map(([key, value]) => ({
    name: SEVERITY_CONFIG[key as keyof typeof SEVERITY_CONFIG]?.label ?? key,
    value,
    color: SEVERITY_CONFIG[key as keyof typeof SEVERITY_CONFIG]?.color ?? '#6b7280',
  }))

  const statusData = Object.entries(stats.by_status).map(([key, value]) => ({
    name: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG]?.label ?? key,
    value,
    color: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG]?.color ?? '#6b7280',
  }))

  const trend7d = stats.recent_7d.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Reports: d.count,
  }))

  const resolutionRate = stats.total_issues > 0
    ? Math.round((stats.resolved / stats.total_issues) * 100)
    : 0

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Top summary cards */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bangalore Road Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time dashboard for civic authorities</p>
        </div>
        <a
          href="/api/export/csv"
          download
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Download size={15} />
          Export CSV
        </a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total_issues.toLocaleString(), sub: 'All time', color: 'from-orange-400 to-red-500' },
          { label: 'Problem Zones', value: stats.total_clusters.toLocaleString(), sub: 'Clustered areas', color: 'from-blue-400 to-indigo-500' },
          { label: 'Resolution Rate', value: `${resolutionRate}%`, sub: 'Issues resolved', color: 'from-green-400 to-emerald-500' },
          { label: 'In Progress', value: stats.in_progress.toLocaleString(), sub: 'Being addressed', color: 'from-amber-400 to-orange-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className={`text-3xl font-extrabold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
              {card.value}
            </div>
            <div className="font-semibold text-gray-800 mt-1 text-sm">{card.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Issue type pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 text-sm">Issues by Type</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {typeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [v, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* 7-day trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-orange-500" />
            <h2 className="font-bold text-gray-900 text-sm">Reports — Last 7 Days</h2>
          </div>
          {trend7d.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend7d} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Reports" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Severity breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 text-sm">Severity Breakdown</h2>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} width={60} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {severityData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 text-sm">Status Overview</h2>
          {statusData.length > 0 ? (
            <div className="space-y-3">
              {statusData.map(s => {
                const pct = stats.total_issues > 0 ? (s.value / stats.total_issues) * 100 : 0
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <span className="text-gray-500">{s.value} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: s.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Top problem zones */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4 text-sm">Top Problem Zones</h2>
        {stats.top_clusters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 font-semibold">#</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-semibold">Location</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-semibold">Type</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-semibold">Severity</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-semibold">Reports</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_clusters.map((c, i) => {
                  const typeCfg = ISSUE_TYPE_CONFIG[c.primary_type] ?? ISSUE_TYPE_CONFIG.other
                  const sevCfg = SEVERITY_CONFIG[c.max_severity] ?? SEVERITY_CONFIG.low
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="text-xs font-medium text-gray-800">
                          {c.area_name || `${c.center_lat.toFixed(4)}, ${c.center_lng.toFixed(4)}`}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {c.center_lat.toFixed(4)}, {c.center_lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: typeCfg.bg, color: typeCfg.color }}
                        >
                          {typeCfg.emoji} {typeCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: sevCfg.bg, color: sevCfg.color }}
                        >
                          {sevCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{c.issue_count}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Footer note */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-orange-800">
          This data is collected by citizens of Bangalore and compiled for government action.
        </p>
        <p className="text-xs text-orange-600 mt-1">
          Reports are automatically grouped when they fall within a 2km radius of each other.
        </p>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-32 flex items-center justify-center text-sm text-gray-400">
      No data yet — reports will appear here
    </div>
  )
}
