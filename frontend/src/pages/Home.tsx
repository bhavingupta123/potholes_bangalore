import { AlertTriangle, ArrowLeft, CheckCircle, Filter, Layers, RefreshCw, Search, SlidersHorizontal, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import IssueCard from '../components/Issue/IssueCard'
import MapView from '../components/Map/MapView'
import type { Cluster, Issue, IssueType, Severity, Stats } from '../types'
import { ALL_ISSUE_TYPES, ALL_SEVERITIES, ISSUE_TYPE_CONFIG, SEVERITY_CONFIG } from '../utils/constants'

interface HomeProps {
  clusters: Cluster[]
  issues: Issue[]
  stats: Stats | null
  loading: boolean
  selectedCluster: Cluster | null
  clusterIssues: Issue[]
  onClusterClick: (c: Cluster) => void
  onIssueClick: (i: Issue) => void
  onMapClick: (lat: number, lng: number) => void
  onCloseCluster: () => void
  onUpvote: (id: string, n: number) => void
  onReportClick: () => void
  onRefresh: () => void
}

export default function Home({
  clusters, issues, stats, loading,
  selectedCluster, clusterIssues,
  onClusterClick, onIssueClick, onMapClick, onCloseCluster,
  onUpvote, onReportClick, onRefresh,
}: HomeProps) {
  const [search, setSearch] = useState('')
  // Empty arrays = no filter active = show all
  const [activeTypes, setActiveTypes] = useState<IssueType[]>([])
  const [activeSeverities, setActiveSeverities] = useState<Severity[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Scroll feed to top whenever zone selection changes
  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedCluster])

  function toggleType(t: IssueType) {
    setActiveTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])
  }
  function toggleSeverity(s: Severity) {
    setActiveSeverities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }
  function clearFilters() {
    setActiveTypes([])
    setActiveSeverities([])
    setSearch('')
  }

  const hasActiveFilters = activeTypes.length > 0 || activeSeverities.length > 0 || search.trim() !== ''

  // Map markers: only filter if a filter is explicitly active
  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      const typeOk = activeTypes.length === 0 || activeTypes.includes(c.primary_type)
      const sevOk = activeSeverities.length === 0 || activeSeverities.includes(c.max_severity)
      return typeOk && sevOk
    })
  }, [clusters, activeTypes, activeSeverities])

  // Feed: show cluster issues when selected, otherwise all issues
  const feedIssues = useMemo(() => {
    let list = selectedCluster ? clusterIssues : issues
    if (activeTypes.length > 0) list = list.filter(i => activeTypes.includes(i.type))
    if (activeSeverities.length > 0) list = list.filter(i => activeSeverities.includes(i.severity))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.address || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [selectedCluster, clusterIssues, issues, activeTypes, activeSeverities, search])

  const selectedTypeCfg = selectedCluster ? ISSUE_TYPE_CONFIG[selectedCluster.primary_type] : null
  const selectedSevCfg = selectedCluster ? SEVERITY_CONFIG[selectedCluster.max_severity] : null

  return (
    <div className="flex flex-col h-full">

      {/* ── Hero band ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 text-white shrink-0">
        <div className="px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-extrabold leading-tight tracking-tight">
                Fix Bangalore's Roads — Together
              </h1>
              <p className="text-orange-100 text-xs mt-0.5 hidden md:block">
                Citizen-powered. Government-ready. Report, track, and hold officials accountable.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: <AlertTriangle size={12} />, label: 'Reports', value: stats?.total_issues ?? 0 },
                { icon: <Layers size={12} />, label: 'Zones', value: stats?.total_clusters ?? 0 },
                { icon: <Zap size={12} />, label: 'Critical', value: stats?.critical ?? 0 },
                { icon: <CheckCircle size={12} />, label: 'Resolved', value: stats?.resolved ?? 0 },
              ].map(s => (
                <div key={s.label} className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <span className="text-orange-100">{s.icon}</span>
                  <div>
                    <div className="font-extrabold text-sm leading-none">{loading ? '—' : s.value}</div>
                    <div className="text-orange-200 text-xs leading-none mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={onReportClick}
                className="bg-white text-orange-600 font-bold px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors text-sm shadow-sm"
              >
                + Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Map */}
        <div className="flex-1 relative min-w-0">

          {/* Filter bar floating over map */}
          <div className="absolute top-3 left-3 z-[500] flex items-center gap-2 flex-wrap max-w-[calc(100%-16px)]">
            <button
              onClick={() => setShowFilterPanel(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md border-2 transition-all ${
                hasActiveFilters
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
              }`}
            >
              <SlidersHorizontal size={12} />
              {hasActiveFilters ? `Filtered (${activeTypes.length + activeSeverities.length})` : 'Filter'}
            </button>

            {/* Active filter chips (removable) */}
            {activeTypes.map(t => (
              <button key={t} onClick={() => toggleType(t)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md border-2 transition-all"
                style={{ borderColor: ISSUE_TYPE_CONFIG[t].color, background: ISSUE_TYPE_CONFIG[t].color, color: '#fff' }}>
                {ISSUE_TYPE_CONFIG[t].emoji} {ISSUE_TYPE_CONFIG[t].label} <X size={10} />
              </button>
            ))}
            {activeSeverities.map(s => (
              <button key={s} onClick={() => toggleSeverity(s)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md border-2 transition-all"
                style={{ borderColor: SEVERITY_CONFIG[s].color, background: SEVERITY_CONFIG[s].color, color: '#fff' }}>
                {SEVERITY_CONFIG[s].label} <X size={10} />
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="px-2.5 py-1 rounded-full text-xs font-bold shadow-md bg-gray-800 text-white border-2 border-gray-800">
                Clear all
              </button>
            )}

            {/* Selected zone pill */}
            {selectedCluster && (
              <button onClick={onCloseCluster}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md bg-gray-900 text-white border-2 border-gray-700">
                {selectedTypeCfg?.emoji} {selectedCluster.area_name || 'Zone'} <X size={10} />
              </button>
            )}
          </div>

          {/* Filter dropdown panel */}
          {showFilterPanel && (
            <div className="absolute top-14 left-3 z-[500] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-72">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">Filter Reports</span>
                <button onClick={() => setShowFilterPanel(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Issue Type</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ISSUE_TYPES.map(t => {
                    const cfg = ISSUE_TYPE_CONFIG[t]
                    const active = activeTypes.includes(t)
                    return (
                      <button key={t} onClick={() => toggleType(t)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                        style={active
                          ? { borderColor: cfg.color, background: cfg.color, color: '#fff' }
                          : { borderColor: '#e5e7eb', color: '#6b7280', background: '#fff' }}>
                        {cfg.emoji} {cfg.label}
                      </button>
                    )
                  })}
                </div>
                {activeTypes.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">No type selected — showing all types</p>
                )}
              </div>

              <div className="mb-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Severity</div>
                <div className="flex gap-1.5">
                  {ALL_SEVERITIES.map(s => {
                    const cfg = SEVERITY_CONFIG[s]
                    const active = activeSeverities.includes(s)
                    return (
                      <button key={s} onClick={() => toggleSeverity(s)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                        style={active
                          ? { borderColor: cfg.color, background: cfg.color, color: '#fff' }
                          : { borderColor: '#e5e7eb', color: cfg.color, background: '#fff' }}>
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
                {activeSeverities.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">No severity selected — showing all</p>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={clearFilters}
                  className="flex-1 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
                  Clear
                </button>
                <button onClick={() => setShowFilterPanel(false)}
                  className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors">
                  Apply
                </button>
              </div>
            </div>
          )}

          <MapView
            clusters={filteredClusters}
            issues={issues}
            selectedCluster={selectedCluster}
            onClusterClick={onClusterClick}
            onIssueClick={onIssueClick}
            onMapClick={onMapClick}
          />

          {/* Map hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
              Click a marker to view · Click map to report
            </div>
          </div>

          {/* FAB */}
          <button
            onClick={onReportClick}
            className="absolute bottom-8 right-4 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 font-bold text-sm transition-all active:scale-95 z-[400]"
          >
            + Report Issue
          </button>
        </div>

        {/* Right: Issue feed */}
        <div className="w-[400px] flex flex-col bg-gray-50 border-l border-gray-200 shrink-0">

          {/* Zone detail header (shown when a cluster is selected) */}
          {selectedCluster ? (
            <div
              className="shrink-0 px-4 pt-4 pb-3 border-b-2"
              style={{ background: selectedTypeCfg?.bg, borderColor: selectedTypeCfg?.color + '40' }}
            >
              <button
                onClick={onCloseCluster}
                className="flex items-center gap-1 text-xs font-semibold mb-2 hover:underline"
                style={{ color: selectedTypeCfg?.color }}
              >
                <ArrowLeft size={13} /> Back to all reports
              </button>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{selectedTypeCfg?.emoji}</span>
                    <div>
                      <h2 className="font-extrabold text-gray-900 text-base leading-tight">
                        {selectedCluster.area_name || `Zone ${selectedCluster.id.slice(0, 6)}`}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold" style={{ color: selectedTypeCfg?.color }}>
                          {selectedTypeCfg?.label}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: selectedSevCfg?.bg, color: selectedSevCfg?.color }}
                        >
                          {selectedSevCfg?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="shrink-0 text-center px-3 py-1.5 rounded-xl"
                  style={{ background: selectedTypeCfg?.color }}
                >
                  <div className="text-white font-extrabold text-xl leading-none">
                    {clusterIssues.length || selectedCluster.issue_count}
                  </div>
                  <div className="text-white/80 text-xs leading-none mt-0.5">report{selectedCluster.issue_count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: selectedTypeCfg?.color + 'bb' }}>
                These reports are within 2km of each other and grouped as one problem zone.
              </p>
            </div>
          ) : (
            /* Normal header */
            <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">All Reports</h2>
                  <p className="text-xs text-gray-400">{issues.length} total · click a zone on the map to drill in</p>
                </div>
                <button
                  onClick={onRefresh}
                  className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 ${loading ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, area, description…"
                  className="w-full pl-8 pr-8 py-2 text-sm bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading && !selectedCluster ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))
            ) : feedIssues.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Filter size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-gray-500">No reports match</p>
                <p className="text-xs mt-1">
                  {hasActiveFilters ? (
                    <button onClick={clearFilters} className="text-orange-500 hover:underline font-medium">
                      Clear filters to see all
                    </button>
                  ) : 'Be the first to report an issue!'}
                </p>
              </div>
            ) : (
              feedIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onUpvote={onUpvote} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-100 px-4 py-2 shrink-0">
            <p className="text-xs text-gray-400 text-center">
              {feedIssues.length} report{feedIssues.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
              {selectedCluster ? ' in this zone' : ' · click a zone marker on the map'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
