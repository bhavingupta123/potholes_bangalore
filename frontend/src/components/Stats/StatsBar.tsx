import { AlertTriangle, CheckCircle, Layers, TrendingUp } from 'lucide-react'
import type { Stats } from '../../types'

interface StatsBarProps {
  stats: Stats | null
  loading: boolean
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  const cards = [
    {
      icon: <AlertTriangle size={16} className="text-orange-500" />,
      label: 'Total Reports',
      value: stats?.total_issues ?? 0,
      sub: 'across Bangalore',
      bg: 'bg-orange-50',
    },
    {
      icon: <Layers size={16} className="text-blue-500" />,
      label: 'Problem Zones',
      value: stats?.total_clusters ?? 0,
      sub: 'unique locations',
      bg: 'bg-blue-50',
    },
    {
      icon: <TrendingUp size={16} className="text-amber-500" />,
      label: 'In Progress',
      value: stats?.in_progress ?? 0,
      sub: 'being fixed',
      bg: 'bg-amber-50',
    },
    {
      icon: <CheckCircle size={16} className="text-green-500" />,
      label: 'Resolved',
      value: stats?.resolved ?? 0,
      sub: 'issues fixed',
      bg: 'bg-green-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3">
      {cards.map(c => (
        <div key={c.label} className={`${c.bg} rounded-xl p-3 flex items-center gap-3`}>
          <div className="shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
            {c.icon}
          </div>
          <div className="min-w-0">
            <div className={`text-xl font-bold text-gray-900 ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '—' : c.value.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-gray-600 truncate">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
