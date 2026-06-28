import { useStore } from '../state/store'

export function SeasonScreen() {
  const game = useStore((s) => s.game)
  const startNewLeague = useStore((s) => s.startNewLeague)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const teamById = new Map(game.teams.map((t) => [t.id, t]))
  const champion = game.season.champion
    ? teamById.get(game.season.champion)
    : null
  const bracket = game.season.bracket
  const semis = bracket.filter((b) => b.round === 'semifinal')
  const finalSlot = bracket.find((b) => b.round === 'final')

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-black">SEASON</h1>
        <button
          onClick={() => setScreen('grade')}
          className="text-sm text-slate-400 underline"
        >
          Back to grades
        </button>
      </div>

      {champion && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500 text-black text-center">
          <div className="text-xs uppercase tracking-[0.4em] font-bold">
            Champion
          </div>
          <div className="text-4xl font-black mt-1">{champion.name}</div>
        </div>
      )}

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Standings
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="py-1">Team</th>
              <th className="py-1 text-right">W</th>
              <th className="py-1 text-right">L</th>
              <th className="py-1 text-right">PD</th>
            </tr>
          </thead>
          <tbody>
            {game.season.standings.map((s) => {
              const t = teamById.get(s.teamId)
              if (!t) return null
              return (
                <tr key={s.teamId} className="border-b border-slate-900">
                  <td className="py-1 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: t.color }}
                    />
                    {t.name}
                  </td>
                  <td className="py-1 text-right">{s.wins}</td>
                  <td className="py-1 text-right">{s.losses}</td>
                  <td
                    className={`py-1 text-right ${
                      s.pointDiff > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {s.pointDiff > 0 ? '+' : ''}
                    {s.pointDiff}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Playoffs
        </h2>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {semis.map((s) => (
            <div key={s.matchupId} className="rounded-lg bg-slate-900 p-2">
              <div className="text-[10px] uppercase text-slate-500">
                Semifinal
              </div>
              {s.result && (
                <>
                  <div
                    className={`flex justify-between ${
                      s.winnerId === s.teamAId ? 'font-bold' : 'text-slate-400'
                    }`}
                  >
                    <span>{teamById.get(s.teamAId ?? '')?.name}</span>
                    <span>{s.result.homeScore}</span>
                  </div>
                  <div
                    className={`flex justify-between ${
                      s.winnerId === s.teamBId ? 'font-bold' : 'text-slate-400'
                    }`}
                  >
                    <span>{teamById.get(s.teamBId ?? '')?.name}</span>
                    <span>{s.result.awayScore}</span>
                  </div>
                </>
              )}
            </div>
          ))}
          {finalSlot && finalSlot.result && (
            <div className="rounded-lg bg-amber-900/40 p-2 border border-amber-500/40">
              <div className="text-[10px] uppercase text-amber-400">Final</div>
              <div
                className={`flex justify-between ${
                  finalSlot.winnerId === finalSlot.teamAId
                    ? 'font-bold'
                    : 'text-slate-400'
                }`}
              >
                <span>{teamById.get(finalSlot.teamAId ?? '')?.name}</span>
                <span>{finalSlot.result.homeScore}</span>
              </div>
              <div
                className={`flex justify-between ${
                  finalSlot.winnerId === finalSlot.teamBId
                    ? 'font-bold'
                    : 'text-slate-400'
                }`}
              >
                <span>{teamById.get(finalSlot.teamBId ?? '')?.name}</span>
                <span>{finalSlot.result.awayScore}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Headlines
        </h2>
        <div className="space-y-1 text-sm">
          {game.season.results.slice(0, 10).map((r, i) => {
            const home = teamById.get(r.homeTeamId)
            const away = teamById.get(r.awayTeamId)
            const homeWon = r.homeScore > r.awayScore
            return (
              <div
                key={i}
                className="flex justify-between border-b border-slate-900 py-1"
              >
                <span className="text-slate-300">
                  <span
                    className={homeWon ? 'font-bold' : 'text-slate-500'}
                  >
                    {home?.name}
                  </span>{' '}
                  {r.homeScore}–{r.awayScore}{' '}
                  <span
                    className={!homeWon ? 'font-bold' : 'text-slate-500'}
                  >
                    {away?.name}
                  </span>
                </span>
                <span className="text-slate-400 italic text-xs">
                  {r.headline}
                </span>
              </div>
            )
          })}
          {game.season.results.length > 10 && (
            <div className="text-xs text-slate-500 italic text-center pt-2">
              + {game.season.results.length - 10} more games
            </div>
          )}
        </div>
      </section>

      <button
        onClick={() => startNewLeague(1)}
        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl"
      >
        New League
      </button>
    </div>
  )
}
