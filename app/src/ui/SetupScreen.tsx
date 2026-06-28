import { useStore } from '../state/store'

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
  const startDraft = useStore((s) => s.startDraftFromSetup)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null
  const humanCount = game.teams.filter((t) => !t.isComputer).length

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">SET UP YOUR LEAGUE</h1>
        <button
          onClick={() => setScreen('landing')}
          className="text-xs text-slate-400 underline"
        >
          Cancel
        </button>
      </div>

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

      <button
        onClick={startDraft}
        className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-lg"
      >
        Start the Draft →
      </button>
    </div>
  )
}
