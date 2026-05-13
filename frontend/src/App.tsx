import { useEffect, useState } from 'react'
import Header from './components/Layout/Header'
import ReportModal from './components/Report/ReportModal'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import type { ActiveView, Cluster, Issue, Stats } from './types'
import { fetchCluster, fetchClusters, fetchIssues, fetchStats } from './utils/api'

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('map')
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [clusterIssues, setClusterIssues] = useState<Issue[]>([])

  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportPrefill, setReportPrefill] = useState<{ lat?: number; lng?: number }>({})

  async function loadAll() {
    setLoading(true)
    try {
      const [clusterRes, issueRes, statsRes] = await Promise.all([
        fetchClusters(),
        fetchIssues(),
        fetchStats(),
      ])
      setClusters(clusterRes.clusters)
      setAllIssues(issueRes.issues)
      setStats(statsRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  async function handleClusterClick(cluster: Cluster) {
    setSelectedCluster(cluster)
    const data = await fetchCluster(cluster.id)
    setClusterIssues(data.issues)
  }

  function handleIssueClick(issue: Issue) {
    const cluster = clusters.find(c => c.id === issue.cluster_id)
    if (cluster) handleClusterClick(cluster)
  }

  function handleMapClick(lat: number, lng: number) {
    setReportPrefill({ lat, lng })
    setReportModalOpen(true)
  }

  function handleUpvote(issueId: string, newCount: number) {
    setAllIssues(prev => prev.map(i => i.id === issueId ? { ...i, upvotes: newCount } : i))
    setClusterIssues(prev => prev.map(i => i.id === issueId ? { ...i, upvotes: newCount } : i))
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans overflow-hidden">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onReportClick={() => { setReportPrefill({}); setReportModalOpen(true) }}
      />

      <div className="flex-1 flex flex-col pt-14 overflow-hidden">
        {activeView === 'map' ? (
          <Home
            clusters={clusters}
            issues={allIssues}
            stats={stats}
            loading={loading}
            selectedCluster={selectedCluster}
            clusterIssues={clusterIssues}
            onClusterClick={handleClusterClick}
            onIssueClick={handleIssueClick}
            onMapClick={handleMapClick}
            onCloseCluster={() => { setSelectedCluster(null); setClusterIssues([]) }}
            onUpvote={handleUpvote}
            onReportClick={() => { setReportPrefill({}); setReportModalOpen(true) }}
            onRefresh={loadAll}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Dashboard stats={stats} loading={loading} />
          </div>
        )}
      </div>

      {reportModalOpen && (
        <ReportModal
          prefillLat={reportPrefill.lat}
          prefillLng={reportPrefill.lng}
          onClose={() => setReportModalOpen(false)}
          onSuccess={() => { loadAll(); setReportModalOpen(false) }}
        />
      )}
    </div>
  )
}
