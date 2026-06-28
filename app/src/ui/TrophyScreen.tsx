import { useStore } from '../state/store'

export function TrophyScreen() {
  const game = useStore((s) => s.game)
  const startNewLeague = useStore((s) => s.startNewLeague)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const championId = game.season.champion
  const champion = championId
    ? game.teams.find((t) => t.id === championId)
    : null

  if (!champion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        No champion yet.
      </div>
    )
  }

  const regSeasonRecord = game.season.standings.find(
    (s) => s.teamId === championId,
  )
  const grade = champion.grade

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-6 text-center"
      style={{
        background: `linear-gradient(180deg, ${champion.color}22 0%, #050b1a 60%)`,
      }}
    >
      <div />
      <div>
        <div className="text-7xl mb-4">🏆</div>
        <div className="text-xs uppercase tracking-[0.5em] text-amber-400 mb-3 font-bold">
          Champion
        </div>
        <h1
          className="text-6xl md:text-7xl font-black leading-tight mb-6"
          style={{ color: champion.color }}
        >
          {champion.name}
        </h1>
        <div className="text-slate-400 text-sm space-y-1">
          {regSeasonRecord && (
            <div>
              Regular season:{' '}
              <span className="font-bold text-white">
                {regSeasonRecord.wins}–{regSeasonRecord.losses}
              </span>{' '}
              ({regSeasonRecord.pointDiff > 0 ? '+' : ''}
              {regSeasonRecord.pointDiff})
            </div>
          )}
          {grade && (
            <div>
              Draft grade was{' '}
              <span className="font-bold text-white">{grade.letter}</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-2">
        <button
          onClick={() => setScreen('bracket')}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
        >
          Back to Bracket
        </button>
        <button
          onClick={() => startNewLeague(1)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
        >
          New League
        </button>
      </div>
    </div>
  )
}
