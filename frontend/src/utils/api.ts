import axios from 'axios'
import type { Cluster, Issue, Stats } from '../types'

export interface Comment {
  id: string
  issue_id: string
  content: string
  author_name: string
  created_at: string
}

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({ baseURL: `${API_ORIGIN}/api` })

export const mediaUrl = (path: string | null): string | null =>
  path ? `${API_ORIGIN}${path}` : null

export const fetchIssues = async (params?: Record<string, string>) => {
  const { data } = await api.get<{ issues: Issue[]; total: number }>('/issues', { params })
  return data
}

export const fetchIssue = async (id: string) => {
  const { data } = await api.get<{ issue: Issue; cluster: Cluster; related_reports: Issue[] }>(`/issues/${id}`)
  return data
}

export const fetchClusters = async (params?: Record<string, string>) => {
  const { data } = await api.get<{ clusters: Cluster[]; total: number }>('/clusters', { params })
  return data
}

export const fetchCluster = async (id: string) => {
  const { data } = await api.get<{ cluster: Cluster; issues: Issue[] }>(`/clusters/${id}`)
  return data
}

export const fetchStats = async () => {
  const { data } = await api.get<Stats>('/stats')
  return data
}

export const upvoteIssue = async (id: string) => {
  const { data } = await api.post<{ upvotes: number }>(`/issues/${id}/upvote`)
  return data
}

export const updateStatus = async (id: string, status: string) => {
  const { data } = await api.put(`/issues/${id}/status`, null, { params: { status } })
  return data
}

export const createIssue = async (formData: FormData) => {
  const { data } = await api.post('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const fetchComments = async (issueId: string) => {
  const { data } = await api.get<{ comments: Comment[] }>(`/issues/${issueId}/comments`)
  return data
}

export const addComment = async (issueId: string, content: string, authorName: string) => {
  const fd = new FormData()
  fd.append('content', content)
  fd.append('author_name', authorName)
  const { data } = await api.post<Comment>(`/issues/${issueId}/comments`, fd)
  return data
}

export const geocodeAddress = async (q: string) => {
  const { data } = await api.get<{ display_name: string; lat: number; lng: number }[]>('/geocode', { params: { q } })
  return data
}

export const fetchResolution = async (issueId: string) => {
  const { data } = await api.get(`/issues/${issueId}/resolution`)
  return data
}

export const submitResolution = async (issueId: string, formData: FormData) => {
  const { data } = await api.post(`/issues/${issueId}/resolve`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const confirmResolution = async (issueId: string) => {
  const { data } = await api.post(`/issues/${issueId}/resolution/confirm`)
  return data
}

export const disputeResolution = async (issueId: string) => {
  const { data } = await api.post(`/issues/${issueId}/resolution/dispute`)
  return data
}
