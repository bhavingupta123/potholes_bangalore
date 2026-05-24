import { ArrowUpCircle, Calendar, ChevronDown, ChevronUp, MapPin, ThumbsUp, User, X } from 'lucide-react'
import { useState } from 'react'
import type { Cluster, Issue } from '../../types'
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from '../../utils/constants'
import { mediaUrl, upvoteIssue } from '../../utils/api'

interface IssueDetailProps {
  cluster: Cluster | null
  issues: Issue[]
  onClose: () => void
  onUpvote: (issueId: string, newCount: number) => void
  onOpen: (issue: Issue) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function IssueCard({
  issue, onUpvote, onOpen,
}: {
  issue: Issue
  onUpvote: (id: string, n: number) => void
  onOpen: (issue: Issue) => void
}) {
  const [upvoted, setUpvoted] = useState(false)
  const [count, setCount] = useState(issue.upvotes)
  const typeCfg = ISSUE_TYPE_CONFIG[issue.type]
  const sevCfg = SEVERITY_CONFIG[issue.severity]
  const statusCfg = STATUS_CONFIG[issue.status]

  async function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation()
    if (upvoted) return
    const data = await upvoteIssue(issue.id)
    setCount(data.upvotes)
    setUpvoted(true)
    onUpvote(issue.id, data.upvotes)
  }

  return (
    <button
      onClick={() => onOpen(issue)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md active:scale-[0.99] transition-all"
    >
      {issue.photo_path && (
        <img
          src={mediaUrl(issue.photo_path)!}
          alt="Issue photo"
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{issue.title}</h3>
          <span
            className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
            style={{ background: typeCfg.bg, color: typeCfg.color }}
          >
            {typeCfg.emoji} {typeCfg.label}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: sevCfg.bg, color: sevCfg.color }}
          >
            {sevCfg.label}
          </span>
        </div>

        {issue.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{issue.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            {issue.reporter_name && (
              <span className="flex items-center gap-1">
                <User size={11} /> {issue.reporter_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {formatDate(issue.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                upvoted
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              <ThumbsUp size={11} />
              <span className="font-medium">{count}</span>
            </button>
            <span className="text-orange-500 font-semibold text-xs">View →</span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function IssueDetail({ cluster, issues, onClose, onUpvote, onOpen }: IssueDetailProps) {
  const [expanded, setExpanded] = useState(false)
  if (!cluster) return null

  const typeCfg = ISSUE_TYPE_CONFIG[cluster.primary_type] ?? ISSUE_TYPE_CONFIG.other
  const sevCfg = SEVERITY_CONFIG[cluster.max_severity] ?? SEVERITY_CONFIG.low
  const visible = expanded ? issues : issues.slice(0, 2)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeCfg.emoji}</span>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {cluster.issue_count} Report{cluster.issue_count !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500">in this zone</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {cluster.area_name && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <MapPin size={11} />
            {cluster.area_name}
          </div>
        )}

        <div className="flex gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
            style={{ background: typeCfg.bg, color: typeCfg.color }}
          >
            {typeCfg.emoji} {typeCfg.label}
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: sevCfg.bg, color: sevCfg.color }}
          >
            ▲ {sevCfg.label}
          </span>
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {issues.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">Loading reports…</div>
        ) : (
          <>
            {visible.map(issue => (
              <IssueCard key={issue.id} issue={issue} onUpvote={onUpvote} onOpen={onOpen} />
            ))}
            {issues.length > 2 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-orange-600 font-medium hover:bg-orange-50 rounded-lg transition-colors"
              >
                {expanded ? <><ChevronUp size={15} /> Show less</> : <><ChevronDown size={15} /> {issues.length - 2} more reports</>}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowUpCircle size={12} className="text-orange-500" />
          Reports within 2km are grouped together · tap a card to view details
        </div>
      </div>
    </div>
  )
}
