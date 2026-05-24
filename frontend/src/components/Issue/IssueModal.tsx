import {
  AlertTriangle, Calendar, Camera, CheckCircle2, Loader2,
  MapPin, Send, ShieldCheck, ThumbsUp, User, X, XCircle
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Issue, Resolution } from '../../types'
import { ISSUE_TYPE_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from '../../utils/constants'
import {
  addComment, confirmResolution, disputeResolution,
  fetchComments, fetchResolution, mediaUrl, submitResolution, upvoteIssue
} from '../../utils/api'
import type { Comment } from '../../utils/api'

interface IssueModalProps {
  issue: Issue
  onClose: () => void
  onUpvote?: (id: string, n: number) => void
}

const CONFIRM_THRESHOLD = 3
const DISPUTE_THRESHOLD = 2

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function IssueModal({ issue, onClose, onUpvote }: IssueModalProps) {
  const [upvoted, setUpvoted] = useState(false)
  const [upvoteCount, setUpvoteCount] = useState(issue.upvotes)
  const [status, setStatus] = useState(issue.status)

  // Comments
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentCount, setCommentCount] = useState(issue.comment_count ?? 0)

  // Resolution
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resPhoto, setResPhoto] = useState<File | null>(null)
  const [resPhotoPreview, setResPhotoPreview] = useState<string | null>(null)
  const [resDescription, setResDescription] = useState('')
  const [resReporter, setResReporter] = useState('')
  const [submittingRes, setSubmittingRes] = useState(false)
  const [voted, setVoted] = useState<'confirm' | 'dispute' | null>(null)
  const [confirmVotes, setConfirmVotes] = useState(0)
  const [disputeVotes, setDisputeVotes] = useState(0)

  const resFileInputRef = useRef<HTMLInputElement>(null)

  const typeCfg = ISSUE_TYPE_CONFIG[issue.type] ?? ISSUE_TYPE_CONFIG.other
  const sevCfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.low
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.reported

  const isResolved = status === 'resolved'
  const isPendingRes = status === 'pending_resolution'
  const canMarkFixed = status === 'reported' || status === 'acknowledged' || status === 'in_progress'

  // Load comments + resolution on mount
  useEffect(() => {
    fetchComments(issue.id).then(d => setComments(d.comments))
    if (isPendingRes || isResolved) {
      fetchResolution(issue.id)
        .then(res => {
          setResolution(res)
          setConfirmVotes(res.confirm_votes)
          setDisputeVotes(res.dispute_votes)
        })
        .catch(() => {})
    }
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpvote() {
    if (upvoted) return
    const data = await upvoteIssue(issue.id)
    setUpvoteCount(data.upvotes)
    setUpvoted(true)
    onUpvote?.(issue.id, data.upvotes)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const c = await addComment(issue.id, commentText, authorName)
      setComments(prev => [...(prev ?? []), c])
      setCommentCount(n => n + 1)
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleSubmitResolution(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingRes(true)
    try {
      const fd = new FormData()
      fd.append('description', resDescription)
      fd.append('reporter_name', resReporter)
      if (resPhoto) fd.append('photo', resPhoto)
      const res = await submitResolution(issue.id, fd)
      setResolution(res)
      setConfirmVotes(0)
      setDisputeVotes(0)
      setStatus('pending_resolution')
      setShowResolveForm(false)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to submit resolution')
    } finally {
      setSubmittingRes(false)
    }
  }

  async function handleConfirm() {
    if (voted) return
    const data = await confirmResolution(issue.id)
    setConfirmVotes(data.confirm_votes)
    setVoted('confirm')
    if (data.resolved) setStatus('resolved')
  }

  async function handleDispute() {
    if (voted) return
    const data = await disputeResolution(issue.id)
    setDisputeVotes(data.dispute_votes)
    setVoted('dispute')
    if (data.reopened) { setStatus('reported'); setResolution(null) }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Status banners */}
        {isResolved && (
          <div className="bg-green-500 text-white px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
            <CheckCircle2 size={14} /> This issue has been resolved and verified by the community
          </div>
        )}
        {isPendingRes && !isResolved && (
          <div className="bg-purple-500 text-white px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
            <ShieldCheck size={14} /> Fix claimed — community verification in progress
          </div>
        )}

        {/* Hero image */}
        {issue.photo_path && (
          <div className="relative shrink-0">
            <img
              src={mediaUrl(issue.photo_path)!}
              alt="Issue photo"
              className="w-full h-56 object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header row (when no image, X is here) */}
        {!issue.photo_path && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
                style={{ background: typeCfg.bg, color: typeCfg.color }}>
                {typeCfg.emoji} {typeCfg.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: sevCfg.bg, color: sevCfg.color }}>
                {sevCfg.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 shrink-0">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">

            {/* Badges (when image present, show here) */}
            {issue.photo_path && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
                  style={{ background: typeCfg.bg, color: typeCfg.color }}>
                  {typeCfg.emoji} {typeCfg.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: sevCfg.bg, color: sevCfg.color }}>
                  {sevCfg.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
            )}

            {/* Title */}
            <h2 className="text-lg font-extrabold text-gray-900 leading-snug">{issue.title}</h2>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {issue.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-orange-400" />
                  {issue.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User size={12} />
                {issue.reporter_name || 'Anonymous'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {timeAgo(issue.created_at)}
              </span>
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  upvoted ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
                }`}
              >
                <ThumbsUp size={12} />
                {upvoteCount} upvote{upvoteCount !== 1 ? 's' : ''}
              </button>
            </div>

            {/* Description */}
            {issue.description && (
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl px-4 py-3">
                {issue.description}
              </p>
            )}

            {/* ── Resolution section ── */}
            <div className={`rounded-2xl p-4 border ${
              isResolved ? 'bg-green-50 border-green-200' :
              isPendingRes ? 'bg-purple-50 border-purple-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              {isResolved || isPendingRes ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={16} className={isResolved ? 'text-green-600' : 'text-purple-600'} />
                    <span className={`text-sm font-bold ${isResolved ? 'text-green-800' : 'text-purple-800'}`}>
                      {isResolved ? 'Issue Resolved' : 'Fix Claimed — Needs Verification'}
                    </span>
                  </div>
                  {resolution?.photo_path && (
                    <img src={mediaUrl(resolution.photo_path)!} alt="Proof of fix"
                      className="w-full h-40 object-cover rounded-xl mb-3 border border-white/50" />
                  )}
                  {resolution?.description && (
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{resolution.description}</p>
                  )}
                  {resolution && (
                    <p className="text-xs text-gray-500 mb-3">
                      Submitted by <span className="font-medium">{resolution.reporter_name || 'Anonymous'}</span>
                      {' '}· {timeAgo(resolution.created_at)}
                    </p>
                  )}
                  {!isResolved && (
                    <>
                      <p className="text-xs text-purple-700 font-medium mb-3">
                        Does this look fixed? {CONFIRM_THRESHOLD - confirmVotes} more "Confirm" vote{CONFIRM_THRESHOLD - confirmVotes !== 1 ? 's' : ''} needed.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleConfirm} disabled={!!voted}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            voted === 'confirm' ? 'bg-green-500 text-white' :
                            voted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                            'bg-green-100 text-green-700 hover:bg-green-500 hover:text-white'
                          }`}>
                          <CheckCircle2 size={15} />
                          Yes, Fixed! {confirmVotes > 0 && `(${confirmVotes})`}
                        </button>
                        <button onClick={handleDispute} disabled={!!voted}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            voted === 'dispute' ? 'bg-red-500 text-white' :
                            voted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                            'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'
                          }`}>
                          <XCircle size={15} />
                          Still Broken {disputeVotes > 0 && `(${disputeVotes})`}
                        </button>
                      </div>
                      {voted && (
                        <p className="text-xs text-center text-gray-500 mt-2">
                          Thanks for verifying! Your vote has been counted.
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : showResolveForm ? (
                <form onSubmit={handleSubmitResolution} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">Submit Proof of Fix</span>
                    <button type="button" onClick={() => setShowResolveForm(false)}
                      className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload a photo showing the issue is fixed. The community will verify it.
                    <span className="font-semibold text-purple-700"> {CONFIRM_THRESHOLD} confirmations</span> needed to mark resolved.
                    <span className="font-semibold text-red-600"> {DISPUTE_THRESHOLD} disputes</span> will reopen it.
                  </p>
                  {resPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={resPhotoPreview} alt="" className="w-full h-36 object-cover" />
                      <button type="button" onClick={() => { setResPhoto(null); setResPhotoPreview(null) }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => resFileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-purple-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-purple-400 hover:border-purple-500 hover:text-purple-600 transition-colors">
                      <Camera size={22} />
                      <span className="text-xs font-semibold">Upload photo of the fix</span>
                    </button>
                  )}
                  <input ref={resFileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setResPhoto(f)
                      setResPhotoPreview(URL.createObjectURL(f))
                    }} />
                  <textarea value={resDescription} onChange={e => setResDescription(e.target.value)}
                    placeholder="Describe what was fixed…" rows={2}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                  <input value={resReporter} onChange={e => setResReporter(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button type="submit" disabled={submittingRes || !resPhoto}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors">
                    {submittingRes ? 'Submitting…' : 'Submit Fix for Verification'}
                  </button>
                </form>
              ) : canMarkFixed ? (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">Know that this issue has been fixed?</p>
                  <button onClick={() => setShowResolveForm(true)}
                    className="flex items-center gap-2 mx-auto px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
                    <CheckCircle2 size={15} />
                    Mark as Fixed
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Requires a photo · Community verifies before resolving</p>
                </div>
              ) : null}
            </div>

            {/* ── Comments ── */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Comments {commentCount > 0 && `(${commentCount})`}
              </div>

              {comments === null ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                  <Loader2 size={13} className="animate-spin" /> Loading comments…
                </div>
              ) : comments.length === 0 ? (
                <div className="text-xs text-gray-400 italic mb-3">No comments yet. Be the first!</div>
              ) : (
                <div className="space-y-2.5 mb-3">
                  {comments.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{c.author_name || 'Anonymous'}</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleComment} className="space-y-2">
                <input value={authorName} onChange={e => setAuthorName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <div className="flex gap-2">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment or update…"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required />
                  <button type="submit" disabled={submittingComment || !commentText.trim()}
                    className="px-3 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shrink-0">
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </div>

          </div>
          {/* Bottom safe-area padding for mobile */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  )
}
