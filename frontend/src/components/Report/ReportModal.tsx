import { Camera, CheckCircle, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { IssueType, Severity } from '../../types'
import { ALL_ISSUE_TYPES, ALL_SEVERITIES, ISSUE_TYPE_CONFIG, SEVERITY_CONFIG } from '../../utils/constants'
import { createIssue, geocodeAddress } from '../../utils/api'

interface ReportModalProps {
  prefillLat?: number
  prefillLng?: number
  onClose: () => void
  onSuccess: () => void
}

type Step = 'location' | 'details' | 'success'

interface GeoResult { display_name: string; lat: number; lng: number }

export default function ReportModal({ prefillLat, prefillLng, onClose, onSuccess }: ReportModalProps) {
  const [step, setStep] = useState<Step>(prefillLat ? 'details' : 'location')
  const [lat, setLat] = useState(prefillLat ?? 0)
  const [lng, setLng] = useState(prefillLng ?? 0)
  const [locLabel, setLocLabel] = useState(
    prefillLat ? `${prefillLat.toFixed(5)}, ${prefillLng?.toFixed(5)}` : ''
  )

  const [locating, setLocating] = useState(false)
  const [locErr, setLocErr] = useState('')

  // Address search
  const [addressQuery, setAddressQuery] = useState('')
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<IssueType>('pothole')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleGPSLocate() {
    setLocating(true)
    setLocErr('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocLabel(`GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setLocating(false)
        setStep('details')
      },
      () => {
        setLocErr('Location access denied. Please search by address below.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  function handleAddressInput(value: string) {
    setAddressQuery(value)
    setGeoResults([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.trim().length < 3) return
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await geocodeAddress(`${value}, Bangalore, Karnataka, India`)
        setGeoResults(results.slice(0, 4))
      } catch {
        // silently fail
      } finally {
        setSearching(false)
      }
    }, 500)
  }

  function selectGeoResult(r: GeoResult) {
    setLat(r.lat)
    setLng(r.lng)
    setLocLabel(r.display_name.split(',').slice(0, 3).join(', '))
    setAddress(r.display_name.split(',').slice(0, 3).join(', '))
    setAddressQuery('')
    setGeoResults([])
    setStep('details')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Please enter a title')
    if (!lat || !lng) return setError('Please set a location')

    setSubmitting(true)
    setError('')
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('type', type)
    fd.append('severity', severity)
    fd.append('description', description)
    fd.append('latitude', String(lat))
    fd.append('longitude', String(lng))
    fd.append('address', address)
    fd.append('reporter_name', reporterName)
    if (photo) fd.append('photo', photo)

    try {
      await createIssue(fd)
      setStep('success')
      setTimeout(() => { onSuccess(); onClose() }, 2200)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div>
            <h2 className="font-extrabold text-gray-900 text-base">Report a Road Issue</h2>
            <p className="text-xs text-gray-500 mt-0.5">Help fix Bangalore's roads</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 border-b border-gray-100">
          {(['location', 'details'] as const).map((s, i) => {
            const done = step === 'success' || (s === 'location' && (step === 'details' || step === 'success'))
            const active = step === s
            return (
              <div key={s} className={`flex-1 flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                active ? 'border-orange-500 text-orange-600 bg-orange-50/50' :
                done ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  active ? 'bg-orange-500 text-white' :
                  done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {done && !active ? '✓' : i + 1}
                </div>
                <span className="capitalize">{s}</span>
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Location ── */}
          {step === 'location' && (
            <div className="p-5 space-y-5">
              {/* GPS */}
              <button
                onClick={handleGPSLocate}
                disabled={locating}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-sm hover:from-orange-600 hover:to-red-600 disabled:opacity-60 transition-all shadow-sm"
              >
                {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
                {locating ? 'Detecting your location…' : 'Use my current location (GPS)'}
              </button>

              {locErr && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{locErr}</p>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or search by address</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Address search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={addressQuery}
                    onChange={e => handleAddressInput(e.target.value)}
                    placeholder="e.g. Indiranagar 100ft Road…"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  {searching && (
                    <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                  )}
                </div>

                {geoResults.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {geoResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectGeoResult(r)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-orange-50 text-left border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <MapPin size={14} className="text-orange-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 leading-snug">
                          {r.display_name.split(',').slice(0, 4).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or enter coordinates</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="12.9716"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    onChange={e => setLat(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="77.5946"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    onChange={e => setLng(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2.5 rounded-xl">
                <MapPin size={12} className="text-blue-400 shrink-0 mt-0.5" />
                <span>Tip: Close this and click anywhere on the map to auto-fill the location.</span>
              </div>

              <button
                onClick={() => lat && lng && setStep('details')}
                disabled={!lat || !lng}
                className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Location badge */}
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                <MapPin size={13} className="text-green-500 shrink-0" />
                <span className="text-xs text-green-800 flex-1 truncate font-medium">{locLabel || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span>
                <button type="button" onClick={() => setStep('location')} className="text-xs text-green-600 font-semibold hover:underline shrink-0">
                  Change
                </button>
              </div>

              {/* Issue type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Issue Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ISSUE_TYPES.map(t => {
                    const cfg = ISSUE_TYPE_CONFIG[t]
                    return (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                        style={type === t
                          ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color }
                          : { borderColor: '#e5e7eb', color: '#6b7280' }
                        }
                      >
                        <span className="text-base">{cfg.emoji}</span>
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Large pothole near bus stop"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Severity *</label>
                <div className="flex gap-2">
                  {ALL_SEVERITIES.map(s => {
                    const cfg = SEVERITY_CONFIG[s]
                    return (
                      <button key={s} type="button" onClick={() => setSeverity(s)}
                        className="flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all"
                        style={severity === s
                          ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color }
                          : { borderColor: '#e5e7eb', color: cfg.color }
                        }
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the issue — how long it's been there, how bad it is…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {/* Address / Landmark */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Landmark / Address</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Near Indiranagar Metro Station"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Photo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Photo Evidence</label>
                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                  >
                    <Camera size={24} />
                    <span className="text-xs font-semibold">Tap to add photo or video</span>
                    <span className="text-xs text-gray-300">Helps the government prioritise</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </div>

              {/* Reporter name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Your Name <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {error && <p className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold hover:from-orange-600 hover:to-red-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Report'}
              </button>
            </form>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={44} className="text-green-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-xl">Report Submitted!</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Thank you for making Bangalore better.<br />
                  Your report is now live on the map.
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs text-gray-400">
                <span>It will be grouped with nearby reports automatically.</span>
                <span>Others can upvote and comment on your report.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
