export type IssueType =
  | 'pothole'
  | 'bad_road'
  | 'waterlogging'
  | 'missing_manhole'
  | 'broken_footpath'
  | 'street_light'
  | 'garbage'
  | 'other'

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Status = 'reported' | 'acknowledged' | 'in_progress' | 'pending_resolution' | 'resolved'

export interface Resolution {
  id: string
  issue_id: string
  photo_path: string | null
  description: string
  reporter_name: string
  confirm_votes: number
  dispute_votes: number
  created_at: string
}

export interface Issue {
  id: string
  title: string
  type: IssueType
  severity: Severity
  description: string
  latitude: number
  longitude: number
  address: string
  photo_path: string | null
  status: Status
  cluster_id: string
  reporter_name: string
  upvotes: number
  comment_count: number
  created_at: string
}

export interface Cluster {
  id: string
  center_lat: number
  center_lng: number
  issue_count: number
  primary_type: IssueType
  max_severity: Severity
  area_name: string
  created_at: string
  updated_at: string
}

export interface Stats {
  total_issues: number
  total_clusters: number
  resolved: number
  in_progress: number
  critical: number
  total_comments: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
  by_status: Record<string, number>
  top_clusters: Cluster[]
  recent_7d: { date: string; count: number }[]
}

export type ActiveView = 'map' | 'dashboard'
