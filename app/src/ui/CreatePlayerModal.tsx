import { useRef, useState } from 'react'
import { ALL_POSITIONS, type Position } from '../state/types'

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })

const resizeDataUrl = (dataUrl: string, maxSize = 512): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = dataUrl
  })

export type CreatePlayerSubmit = {
  name: string
  position: Position
  value: number
  nflTeam: string
  photoDataUrl?: string
}

export function CreatePlayerModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (input: CreatePlayerSubmit) => void
}) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState<Position>('WR')
  const [value, setValue] = useState(85)
  const [nflTeam, setNflTeam] = useState('YOU')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const raw = await readFileAsDataUrl(file)
      const resized = await resizeDataUrl(raw)
      setPhotoDataUrl(resized)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const canSave = name.trim().length > 0 && !uploading

  const submit = () => {
    if (!canSave) return
    onSave({
      name: name.trim(),
      position,
      value,
      nflTeam: nflTeam.trim() || 'YOU',
      photoDataUrl,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-black">CREATE PLAYER</h2>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 underline"
          >
            Cancel
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Your name"
              className="w-full bg-slate-800 px-3 py-2 rounded text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
              Photo
            </label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center">
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-slate-600">
                    {name
                      .split(' ')
                      .map((n) => n[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('') || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded font-bold text-sm"
                >
                  {uploading
                    ? 'Uploading...'
                    : photoDataUrl
                      ? 'Change Photo'
                      : 'Choose Photo'}
                </button>
                {photoDataUrl && (
                  <button
                    onClick={() => setPhotoDataUrl(undefined)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
              Position
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ALL_POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`py-2 rounded-lg font-bold text-sm ${
                    position === p
                      ? 'bg-sky-500 text-black'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
              Overall Rating: {value}
            </label>
            <input
              type="range"
              min={60}
              max={99}
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>60</span>
              <span>99</span>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
              Team Tag (3–4 letters)
            </label>
            <input
              value={nflTeam}
              onChange={(e) => setNflTeam(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full bg-slate-800 px-3 py-2 rounded text-white font-bold uppercase"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
        </div>

        <div className="p-5 border-t border-slate-800">
          <button
            onClick={submit}
            disabled={!canSave}
            className={`w-full py-3 rounded-xl font-bold text-lg ${
              canSave
                ? 'bg-sky-500 hover:bg-sky-400 text-black'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Add Player
          </button>
        </div>
      </div>
    </div>
  )
}
