import { useState } from 'react'
import { useStore } from '../state/store'
import { CustomPlayersSection } from './CustomPlayersSection'
import { COACH_TRAIT_LABELS } from '../state/types'

const PALETTE = [
  '#0a84ff',
  '#ff453a',
  '#30d158',
  '#ffd60a',
  '#bf5af2',
  '#ff9f0a',
  '#64d2ff',
  '#ff375f',
]

export function SetupScreen() {
  const game = useStore((s) => s.game)
  const updateTeam = useStore((s) => s.updateTeam)
  const setHumanCount = useStore((s) => s.setHumanCount)
  const revealDraftOrder = useStore((s) => s.revealDraftOrder)
  const setScreen = useStore((s) => s.setScreen)
  const dynasty = useStore((s) => s.dynasty)
  const mode = useStore((s) => s.mode)
  const leaveDynasty = useStore((s) => s.leaveDynasty)
  const [confirmLeave, setConfirmLeave] = useState(false)

  if (!game) return null
  const humanCount = game.teams.filter((t) => !t.isComputer).length
  const coach = mode === 'dynasty' ? dynasty?.coach : null
  const isDynasty = mode === 'dynasty' && !!dynasty

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          {mode === 'dynasty' && dynasty && (
            <div className="text-xs tracking-widest text-amber-400 uppercase">
              {dynasty.name} · Year {dynasty.currentYear}
            </div>
          )}
          <h1 className="text-2xl font-black mt-1">
            {mode === 'dynasty' ? 'SET UP YEAR' : 'SET UP YOUR LEAGUE'}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={() => setScreen('landing')}
            className="text-xs text-slate-400 underline"
          >
            Cancel
          </button>
          {isDynasty && (
            <button
              onClick={() => setConfirmLeave(true)}
              className="text-xs font-bold px-2 py-1 rounded bg-red-950 text-red-300 border border-red-800 hover:bg-red-900"
            >
              Leave Dynasty
            </button>
          )}
        </div>
      </div>

      {confirmLeave && dynasty && (
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

      {coach && (
        <section className="mb-6 rounded-xl bg-slate-900 p-3">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
            Head Coach
          </div>
          <div className="font-bold">{coach.name}</div>
          <div className="text-xs text-slate-400">
            {coach.traits.map((t) => COACH_TRAIT_LABELS[t]).join(' · ')}
          </div>
        </section>
      )}

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          How many kids are drafting?
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setHumanCount(n)}
              className={`flex-1 py-3 rounded-xl font-bold ${
                humanCount === n
                  ? 'bg-sky-500 text-black'
                  : 'bg-slate-800 text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Teams
        </div>
        <div className="space-y-3">
          {game.teams.map((t) => (
            <div
              key={t.id}
              className="rounded-xl bg-slate-900 overflow-hidden"
            >
              <div className="flex">
                <div className="w-2" style={{ background: t.color }} />
                <div className="flex-1 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {t.isComputer ? (
                      <div className="flex-1 text-slate-400 italic">
                        {t.name}{' '}
                        <span className="text-xs text-slate-600">(CPU)</span>
                      </div>
                    ) : (
                      <input
                        value={t.name}
                        onChange={(e) =>
                          updateTeam(t.id, { name: e.target.value })
                        }
                        maxLength={20}
                        className="flex-1 bg-slate-800 px-3 py-1.5 rounded text-white font-bold"
                      />
                    )}
                  </div>
                  <div className="flex gap-1">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTeam(t.id, { color: c })}
                        className={`w-7 h-7 rounded-full border-2 ${
                          t.color === c
                            ? 'border-white'
                            : 'border-transparent'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CustomPlayersSection variant="panel" />

      <button
        onClick={revealDraftOrder}
        className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-lg"
      >
        Run the Draft Lottery →
      </button>
    </div>
  )
}
