import type { IssueType, Severity, Status } from '../types'

export const INDIA_CENTER: [number, number] = [20.5937, 78.9629]
export const DEFAULT_ZOOM = 5

export const ISSUE_TYPE_CONFIG: Record<IssueType, { label: string; color: string; bg: string; emoji: string }> = {
  pothole:         { label: 'Pothole',           color: '#ef4444', bg: '#fef2f2', emoji: '🕳️' },
  bad_road:        { label: 'Bad Road',           color: '#f97316', bg: '#fff7ed', emoji: '🛣️' },
  waterlogging:    { label: 'Waterlogging',       color: '#3b82f6', bg: '#eff6ff', emoji: '💧' },
  missing_manhole: { label: 'Missing Manhole',    color: '#8b5cf6', bg: '#f5f3ff', emoji: '⚠️' },
  broken_footpath: { label: 'Broken Footpath',    color: '#a16207', bg: '#fefce8', emoji: '🚶' },
  street_light:    { label: 'Street Light',       color: '#eab308', bg: '#fefce8', emoji: '💡' },
  garbage:         { label: 'Garbage Dumping',    color: '#84cc16', bg: '#f7fee7', emoji: '🗑️' },
  other:           { label: 'Other',              color: '#6b7280', bg: '#f9fafb', emoji: '❓' },
}

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; ring: string }> = {
  low:      { label: 'Low',      color: '#65a30d', bg: '#f7fee7', ring: '#a3e635' },
  medium:   { label: 'Medium',   color: '#d97706', bg: '#fffbeb', ring: '#fcd34d' },
  high:     { label: 'High',     color: '#ea580c', bg: '#fff7ed', ring: '#fb923c' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2', ring: '#f87171' },
}

export const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  reported:            { label: 'Reported',            color: '#6b7280', bg: '#f3f4f6' },
  acknowledged:        { label: 'Acknowledged',        color: '#2563eb', bg: '#eff6ff' },
  in_progress:         { label: 'In Progress',         color: '#d97706', bg: '#fffbeb' },
  pending_resolution:  { label: 'Fix Claimed',         color: '#7c3aed', bg: '#f5f3ff' },
  resolved:            { label: 'Resolved ✓',          color: '#16a34a', bg: '#f0fdf4' },
}

export const ALL_ISSUE_TYPES = Object.keys(ISSUE_TYPE_CONFIG) as IssueType[]
export const ALL_SEVERITIES = Object.keys(SEVERITY_CONFIG) as Severity[]
export const ALL_STATUSES = Object.keys(STATUS_CONFIG) as Status[]
