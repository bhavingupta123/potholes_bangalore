import { Calendar, MessageCircle, ThumbsUp, User, MapPin } from 'lucide-react'
import type { Issue } from '../../types'
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from '../../utils/constants'
import { mediaUrl } from '../../utils/api'

interface IssueCardProps {
  issue: Issue
  onUpvote?: (id: string, n: number) => void
  onOpen: (issue: Issue) => void
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function IssueCard({ issue, onOpen }: IssueCardProps) {
  const typeCfg = ISSUE_TYPE_CONFIG[issue.type] ?? ISSUE_TYPE_CONFIG.other
  const sevCfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.low
  const statusCfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.reported

  const isResolved = issue.status === 'resolved'
  const isPendingRes = issue.status === 'pending_resolution'

  return (
    <button
      onClick={() => onOpen(issue)}
      className={`w-full text-left bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] transition-all ${
        isResolved ? 'border-green-200' : isPendingRes ? 'border-purple-200' : 'border-gray-200'
      }`}
    >
      {/* Status banner */}
      {isResolved && (
        <div className="bg-green-500 text-white px-4 py-1.5 flex items-center gap-2 text-xs font-bold">
          ✓ Resolved
        </div>
      )}
      {isPendingRes && !isResolved && (
        <div className="bg-purple-500 text-white px-4 py-1.5 flex items-center gap-2 text-xs font-bold">
          🔍 Fix claimed — verifying
        </div>
      )}

      {/* Thumbnail */}
      {issue.photo_path && (
        <img
          src={mediaUrl(issue.photo_path)!}
          alt=""
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-4">
        {/* Badges */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
              style={{ background: typeCfg.bg, color: typeCfg.color }}>
              {typeCfg.emoji} {typeCfg.label}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: sevCfg.bg, color: sevCfg.color }}>
              {sevCfg.label}
            </span>
          </div>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5">{issue.title}</h3>

        {/* Address */}
        {issue.address && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin size={11} className="shrink-0 text-orange-400" />
            <span className="truncate">{issue.address}</span>
          </div>
        )}

        {/* Description preview */}
        {issue.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{issue.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><User size={11} />{issue.reporter_name || 'Anonymous'}</span>
            <span className="flex items-center gap-1"><Calendar size={11} />{timeAgo(issue.created_at)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} />
              <span className="font-semibold">{issue.upvotes}</span>
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={11} />
              <span className="font-semibold">{issue.comment_count ?? 0}</span>
            </span>
            <span className="text-orange-500 font-semibold text-xs">View →</span>
          </div>
        </div>
      </div>
    </button>
  )
}
