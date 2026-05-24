import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Cluster, Issue } from '../../types'
import { INDIA_CENTER, DEFAULT_ZOOM, ISSUE_TYPE_CONFIG, SEVERITY_CONFIG } from '../../utils/constants'

interface MapViewProps {
  clusters: Cluster[]
  issues: Issue[]
  selectedCluster: Cluster | null
  onClusterClick: (c: Cluster) => void
  onIssueClick: (i: Issue) => void
  onMapClick: (lat: number, lng: number) => void
}

const SEVERITY_SIZES: Record<string, number> = { low: 28, medium: 32, high: 38, critical: 44 }

function makeClusterIcon(cluster: Cluster) {
  const cfg = ISSUE_TYPE_CONFIG[cluster.primary_type] ?? ISSUE_TYPE_CONFIG.other
  const sevCfg = SEVERITY_CONFIG[cluster.max_severity] ?? SEVERITY_CONFIG.low
  const size = SEVERITY_SIZES[cluster.max_severity] ?? 32
  const count = cluster.issue_count

  const pulse = cluster.max_severity === 'critical'
    ? `<span class="absolute inset-0 rounded-full animate-ping opacity-30" style="background:${sevCfg.color}"></span>`
    : ''

  return L.divIcon({
    className: '',
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
    html: `
      <div style="position:relative;width:${size + 16}px;height:${size + 16}px;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${cfg.color};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          cursor:pointer;transition:transform 0.15s;
          color:white;font-weight:700;font-size:${size > 34 ? 11 : 10}px;line-height:1;
        ">
          <span style="font-size:${size > 34 ? 14 : 12}px;line-height:1">${cfg.emoji}</span>
          ${count > 1 ? `<span>${count}</span>` : ''}
        </div>
      </div>
    `,
  })
}

function makeIssueIcon(issue: Issue) {
  const cfg = ISSUE_TYPE_CONFIG[issue.type] ?? ISSUE_TYPE_CONFIG.other
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div style="
        width:24px;height:24px;border-radius:50%;
        background:${cfg.color};opacity:0.85;
        border:2px solid white;
        box-shadow:0 1px 4px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;cursor:pointer;
      ">${cfg.emoji}</div>
    `,
  })
}

export default function MapView({
  clusters,
  issues,
  selectedCluster,
  onClusterClick,
  onIssueClick,
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const clusterLayerRef = useRef<L.LayerGroup | null>(null)
  const issueLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    clusterLayerRef.current = L.layerGroup().addTo(map)
    issueLayerRef.current = L.layerGroup().addTo(map)

    map.on('click', e => onMapClick(e.latlng.lat, e.latlng.lng))

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const layer = clusterLayerRef.current
    if (!layer) return
    layer.clearLayers()

    clusters.forEach(cluster => {
      const marker = L.marker([cluster.center_lat, cluster.center_lng], {
        icon: makeClusterIcon(cluster),
        zIndexOffset: cluster.issue_count * 10,
      })
      marker.on('click', e => { L.DomEvent.stopPropagation(e); onClusterClick(cluster) })
      marker.addTo(layer)
    })
  }, [clusters])

  useEffect(() => {
    const layer = issueLayerRef.current
    if (!layer) return
    layer.clearLayers()

    if (selectedCluster) {
      const related = issues.filter(i => i.cluster_id === selectedCluster.id)
      related.forEach(issue => {
        const marker = L.marker([issue.latitude, issue.longitude], { icon: makeIssueIcon(issue) })
        marker.on('click', e => { L.DomEvent.stopPropagation(e); onIssueClick(issue) })
        marker.addTo(layer)
      })
    }
  }, [selectedCluster, issues])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedCluster) return
    map.flyTo([selectedCluster.center_lat, selectedCluster.center_lng], 15, { duration: 0.8 })
  }, [selectedCluster])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  )
}
