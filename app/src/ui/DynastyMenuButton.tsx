import { useState } from 'react'
import { useStore } from '../state/store'

// Small floating menu button that appears in dynasty mode so the user can
// always reach the Dynasty Hub or leave the dynasty, no matter which
// mid-flow screen they're on (draft, season, bracket, offseason).
export function DynastyMenuButton() {
  const mode = useStore((s) => s.mode)
  const dynasty = useStore((s) => s.dynasty)
  const openDynastyHub = useStore((s) => s.openDynastyHub)
  const leaveDynasty = useStore((s) => s.leaveDynasty)
  const [open, setOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  if (mode !== 'dynasty' || !dynasty) return null

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Dynasty menu"
        style={{ zIndex: 9999 }}
        className="fixed top-3 right-3 px-3 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 shadow-lg border-2 border-black font-black uppercase text-xs tracking-widest"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" />
        </svg>
        Menu
      </button>

      {open && (
        <>
          <div
            style={{ zIndex: 9998 }}
            className="fixed inset-0"
            onClick={() => setOpen(false)}
          />
          <div
            style={{ zIndex: 9999 }}
            className="fixed top-14 right-3 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-slate-800">
              <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                {dynasty.name}
              </div>
              <div className="text-xs text-slate-500">
                Year {dynasty.currentYear}
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false)
                openDynastyHub()
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-bold text-white hover:bg-slate-800"
            >
              Dynasty Hub
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setConfirmLeave(true)
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-bold text-red-400 hover:bg-slate-800 border-t border-slate-800"
            >
              Leave Dynasty
            </button>
          </div>
        </>
      )}

      {confirmLeave && (
        <div
          style={{ zIndex: 10000 }}
          className="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5 text-left">
            <h2 className="text-base font-black mb-2">
              LEAVE {dynasty.name.toUpperCase()}?
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete this dynasty — {dynasty.currentYear}{' '}
              year{dynasty.currentYear === 1 ? '' : 's'} of history, career
              stats, and every snapshot. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmLeave(false)
                  leaveDynasty()
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Leave & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
