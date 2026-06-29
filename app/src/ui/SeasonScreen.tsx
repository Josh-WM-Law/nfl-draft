import { useState, useEffect } from 'react'
import { useStore } from '../state/store'
import type { GameResult } from '../state/types'

export function SeasonScreen() {
  const game = useStore((s) => s.game)
  const advanceReveal = useStore((s) => s.advanceReveal)
  const setScreen = useStore((s) => s.setScreen)
  const [activeWeek, setActiveWeek] = useState(1)

  useEffect(() => {
    const r = game?.season.revealedThrough ?? 0
    if (r > 0) setActiveWeek(Math.min(r, 7))
  }, [game?.season.revealedThrough])

  if (!game) return null

  const teamById = new Map(game.teams.map((t) => [t.id, t]))
  const revealed = game.season.revealedThrough ?? 0
  const resultsByWeek = new Map<number, GameResult[]>()
  for (const r of game.season.results) {
    if (r.weekNumber > 7) continue
    const arr = resultsByWeek.get(r.weekNumber) ?? []
    arr.push(r)
    resultsByWeek.set(r.weekNumber, arr)
  }

  // Standings up to revealed week
  const standingsAtWeek = (week: number) => {
    const rec = new Map<string, { wins: number; losses: number; pd: number }>()
    for (const t of game.teams) rec.set(t.id, { wins: 0, losses: 0, pd: 0 })
    for (const r of game.season.results) {
      if (r.weekNumber > week) continue
      const home = rec.get(r.homeTeamId)
      const away = rec.get(r.awayTeamId)
      if (!home || !away) continue
      home.pd += r.homeScore - r.awayScore
      away.pd += r.awayScore - r.homeScore
      if (r.homeScore > r.awayScore) {
        home.wins++
        away.losses++
      } else if (r.awayScore > r.homeScore) {
        away.wins++
        home.losses++
      } else {
        home.wins += 0.5
        away.wins += 0.5
      }
    }
    return Array.from(rec.entries())
      .map(([id, r]) => ({ teamId: id, ...r }))
      .sort((a, b) => b.wins - a.wins || b.pd - a.pd)
  }

  const standings = standingsAtWeek(revealed)
  const visibleWeek = Math.min(activeWeek, Math.max(1, revealed))
  const weekResults = resultsByWeek.get(visibleWeek) ?? []
  const canSeeWeek = visibleWeek <= revealed

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-black">SEASON</h1>
        <button
          onClick={() => setScreen('grade')}
          className="text-xs text-slate-400 underline"
        >
          Back to grades
        </button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6, 7].map((w) => {
          const unlocked = w <= revealed
          return (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              disabled={!unlocked}
              className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${
                visibleWeek === w
                  ? 'bg-white text-black'
                  : unlocked
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-600'
              }`}
            >
              Wk {w}
            </button>
          )
        })}
      </div>

      <section className="mb-6 space-y-2">
        {canSeeWeek ? (
          weekResults.map((r, i) => {
            const home = teamById.get(r.homeTeamId)
            const away = teamById.get(r.awayTeamId)
            const homeWon = r.homeScore > r.awayScore
            return (
              <div key={i} className="rounded-xl bg-slate-900 overflow-hidden">
                <div className="flex">
                  <div
                    className="w-2"
                    style={{ background: home?.color ?? '#888' }}
                  />
                  <div className="flex-1 p-3">
                    <div
                      className={`flex justify-between ${
                        homeWon ? 'font-bold' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        {home?.name}
                        <span className="ml-1.5 text-[10px] text-slate-500 font-normal uppercase tracking-wider">
                          home
                        </span>
                      </span>
                      <span className="text-2xl">{r.homeScore}</span>
                    </div>
                    <div
                      className={`flex justify-between ${
                        !homeWon ? 'font-bold' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        <span className="text-slate-500 mr-1">@</span>
                        {away?.name}
                      </span>
                      <span className="text-2xl">{r.awayScore}</span>
                    </div>
                    {(r.offensiveFeature || r.defensiveFeature) && (
                      <div className="mt-2 space-y-1.5 text-xs">
                        {r.offensiveFeature && (
                          <div>
                            <div className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                              OFF · {r.offensiveFeature.playerName} ({r.offensiveFeature.position})
                            </div>
                            <div className="text-slate-300">{r.offensiveFeature.statLine}</div>
                          </div>
                        )}
                        {r.defensiveFeature && (
                          <div>
                            <div className="text-[9px] uppercase tracking-widest text-sky-400 font-bold">
                              DEF · {r.defensiveFeature.playerName} ({r.defensiveFeature.position})
                            </div>
                            <div className="text-slate-300">{r.defensiveFeature.statLine}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {!r.offensiveFeature && !r.defensiveFeature && r.headline && (
                      <div className="text-xs text-slate-500 italic mt-1">
                        {r.headline}
                      </div>
                    )}
                  </div>
                  <div
                    className="w-2"
                    style={{ background: away?.color ?? '#888' }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center text-slate-500 py-8">
            Tap "Next Week" to reveal these games.
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Standings · Through Week {Math.min(revealed, 7)}
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
            {standings.map((s, idx) => {
              const t = teamById.get(s.teamId)
              if (!t) return null
              const inPlayoffs = idx < 4 && revealed >= 7
              return (
                <tr
                  key={s.teamId}
                  className={`border-b border-slate-900 ${
                    inPlayoffs ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="py-1.5 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: t.color }}
                    />
                    {t.name}
                    {inPlayoffs && (
                      <span className="text-[10px] text-amber-400 font-bold">
                        × {idx + 1}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{s.wins}</td>
                  <td className="py-1.5 text-right">{s.losses}</td>
                  <td
                    className={`py-1.5 text-right ${
                      s.pd > 0 ? 'text-green-400' : s.pd < 0 ? 'text-red-400' : ''
                    }`}
                  >
                    {s.pd > 0 ? '+' : ''}
                    {s.pd}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-slate-950 border-t border-slate-800">
        {revealed < 7 ? (
          <button
            onClick={advanceReveal}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl"
          >
            Reveal Week {revealed + 1} →
          </button>
        ) : (
          <button
            onClick={() => setScreen('bracket')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
          >
            {revealed === 7 ? 'See the Playoff Bracket →' : 'Back to Playoffs →'}
          </button>
        )}
      </div>
    </div>
  )
}
