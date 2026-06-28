import { useStore } from '../state/store'

export function GradeReveal() {
  const game = useStore((s) => s.game)
  const startNewLeague = useStore((s) => s.startNewLeague)

  if (!game) return null

  const sorted = game.teams
    .slice()
    .sort((a, b) => (b.grade?.score ?? 0) - (a.grade?.score ?? 0))

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <h1 className="text-center text-3xl font-black mb-1">DRAFT GRADES</h1>
      <p className="text-center text-slate-400 mb-6 italic">The prediction.</p>

      <div className="grid grid-cols-2 gap-4">
        {sorted.map((team) => (
          <div
            key={team.id}
            className="rounded-2xl overflow-hidden bg-slate-800"
          >
            <div
              className="px-4 py-2"
              style={{ background: team.color }}
            >
              <div className="font-bold text-white truncate">{team.name}</div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="text-7xl font-black leading-none">
                {team.grade?.letter ?? '?'}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider">
                  Score
                </div>
                <div className="text-2xl font-bold">
                  {team.grade?.score ?? '–'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => startNewLeague(1)}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl"
        >
          New League
        </button>
        <button
          disabled
          className="flex-1 py-3 bg-slate-700 text-slate-500 font-bold rounded-xl opacity-50 cursor-not-allowed"
        >
          Play the Season (M3)
        </button>
      </div>
    </div>
  )
}
