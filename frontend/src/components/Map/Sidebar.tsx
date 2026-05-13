import { ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { Cluster, Issue } from '../../types'
import type { IssueType, Severity } from '../../types'
import { ALL_ISSUE_TYPES, ALL_SEVERITIES, ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from '../../utils/constants'
import IssueDetail from '../Issue/IssueDetail'

interface SidebarProps {
  clusters: Cluster[]
  issues: Issue[]
  selectedCluster: Cluster | null
  clusterIssues: Issue[]
  filterTypes: IssueType[]
  filterSeverities: Severity[]
  onToggleType: (t: IssueType) => void
  onToggleSeverity: (s: Severity) => void
  onClusterClick: (c: Cluster) => void
  onCloseDetail: () => void
  onUpvote: (issueId: string, n: number) => void
  onRefresh: () => void
  loading: boolean
}

export default function Sidebar({
  clusters,
  issues,
  selectedCluster,
  clusterIssues,
  filterTypes,
  filterSeverities,
  onToggleType,
  onToggleSeverity,
  onClusterClick,
  onCloseDetail,
  onUpvote,
  onRefresh,
  loading,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 w-10 bg-white border-l border-gray-200 shadow-lg">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-orange-500" />
          <span className="font-semibold text-sm text-gray-800">Filters & Reports</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selectedCluster ? (
        <IssueDetail
          cluster={selectedCluster}
          issues={clusterIssues}
          onClose={onCloseDetail}
          onUpvote={onUpvote}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Issue type filter */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issue Type</div>
            <div className="space-y-1">
              {ALL_ISSUE_TYPES.map(t => {
                const cfg = ISSUE_TYPE_CONFIG[t]
                const active = filterTypes.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => onToggleType(t)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    <span className={`flex-1 text-left text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                      {cfg.label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                      }`}
                    >
                      {active && <span className="text-white text-xs">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Severity filter */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Severity</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SEVERITIES.map(s => {
                const cfg = SEVERITY_CONFIG[s]
                const active = filterSeverities.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => onToggleSeverity(s)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all"
                    style={
                      active
                        ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color }
                        : { borderColor: '#e5e7eb', color: '#9ca3af' }
                    }
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recent clusters */}
          <div className="px-4 py-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Problem Zones ({clusters.length})
            </div>
            <div className="space-y-2">
              {clusters.slice(0, 20).map(cluster => {
                const typeCfg = ISSUE_TYPE_CONFIG[cluster.primary_type] ?? ISSUE_TYPE_CONFIG.other
                const sevCfg = SEVERITY_CONFIG[cluster.max_severity] ?? SEVERITY_CONFIG.low
                return (
                  <button
                    key={cluster.id}
                    onClick={() => onClusterClick(cluster)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg"
                      style={{ background: typeCfg.bg }}
                    >
                      {typeCfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">
                        {cluster.area_name || `${cluster.center_lat.toFixed(3)}, ${cluster.center_lng.toFixed(3)}`}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-500">{cluster.issue_count} report{cluster.issue_count !== 1 ? 's' : ''}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ background: sevCfg.bg, color: sevCfg.color }}
                        >
                          {sevCfg.label}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
              {clusters.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-6">
                  No reports yet. Be the first to report an issue!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
