import { useStore } from '../state/store'
import type { BracketSlot } from '../state/types'

const SlotCard = ({
  slot,
  showTeams,
  teamById,
  seedA,
  seedB,
  revealedQuarters,
}: {
  slot: BracketSlot
  showTeams: boolean
  teamById: Map<string, { name: string; color: string }>
  seedA?: number
  seedB?: number
  revealedQuarters: number
}) => {
  const a = showTeams && slot.teamAId ? teamById.get(slot.teamAId) : null
  const b = showTeams && slot.teamBId ? teamById.get(slot.teamBId) : null
  const winnerIsA = slot.winnerId === slot.teamAId
  const isFinal = slot.round === 'final'
  const fullyPlayed = revealedQuarters >= 4

  const quarterScores = slot.quarterScores ?? []
  const visible = quarterScores.slice(0, revealedQuarters)
  const homeRunning = visible.reduce((s, q) => s + q.home, 0)
  const awayRunning = visible.reduce((s, q) => s + q.away, 0)
  const showScores = revealedQuarters > 0 && showTeams

  return (
    <div
      className={`rounded-xl bg-slate-900 overflow-hidden border ${
        fullyPlayed && isFinal
          ? 'border-amber-500/60'
          : 'border-slate-800'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 px-3 pt-2 flex justify-between">
        <span>{isFinal ? 'Championship' : 'Semifinal'}</span>
        {isFinal && <span className="text-amber-400/70">Neutral Site</span>}
      </div>
      <div className="flex">
        <div className="w-1.5" style={{ background: a?.color ?? '#444' }} />
        <div className="flex-1 px-3 py-2">
          <div
            className={`flex justify-between ${
              fullyPlayed
                ? winnerIsA
                  ? 'font-bold'
                  : 'text-slate-500'
                : 'text-slate-300'
            }`}
          >
            <span>
              {seedA !== undefined && (
                <span className="text-amber-400/80 text-[10px] font-bold mr-1.5">
                  #{seedA}
                </span>
              )}
              {a?.name ?? (showTeams ? '—' : 'Semifinal winner')}
              {!isFinal && a && (
                <span className="ml-1.5 text-[9px] text-slate-500 font-normal uppercase tracking-wider">
                  home
                </span>
              )}
            </span>
            <span>{showScores ? homeRunning : ''}</span>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="w-1.5" style={{ background: b?.color ?? '#444' }} />
        <div className="flex-1 px-3 py-2">
          <div
            className={`flex justify-between ${
              fullyPlayed
                ? !winnerIsA
                  ? 'font-bold'
                  : 'text-slate-500'
                : 'text-slate-300'
            }`}
          >
            <span>
              {seedB !== undefined && (
                <span className="text-amber-400/80 text-[10px] font-bold mr-1.5">
                  #{seedB}
                </span>
              )}
              {!isFinal && b && <span className="text-slate-500 mr-1">@</span>}
              {b?.name ?? (showTeams ? '—' : 'Semifinal winner')}
            </span>
            <span>{showScores ? awayRunning : ''}</span>
          </div>
        </div>
      </div>
      {visible.length > 0 && showTeams && (
        <div className="px-3 pb-1.5 text-[10px] text-slate-500 flex gap-2 flex-wrap">
          {visible.map((q, i) => (
            <span key={i}>
              Q{i + 1}: {q.home}–{q.away}
            </span>
          ))}
        </div>
      )}
      {fullyPlayed && (slot.result?.offensiveFeature || slot.result?.defensiveFeature) && (
        <div className="px-3 pb-2 space-y-1.5 text-xs">
          {slot.result.offensiveFeature && (
            <div>
              <div className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                OFF · {slot.result.offensiveFeature.playerName} ({slot.result.offensiveFeature.position})
              </div>
              <div className="text-slate-300">{slot.result.offensiveFeature.statLine}</div>
            </div>
          )}
          {slot.result.defensiveFeature && (
            <div>
              <div className="text-[9px] uppercase tracking-widest text-sky-400 font-bold">
                DEF · {slot.result.defensiveFeature.playerName} ({slot.result.defensiveFeature.position})
              </div>
              <div className="text-slate-300">{slot.result.defensiveFeature.statLine}</div>
            </div>
          )}
        </div>
      )}
      {fullyPlayed && !slot.result?.offensiveFeature && !slot.result?.defensiveFeature && slot.result?.headline && (
        <div className="text-xs text-slate-500 italic px-3 pb-2">
          {slot.result.headline}
        </div>
      )}
    </div>
  )
}

export function BracketScreen() {
  const game = useStore((s) => s.game)
  const advanceSemisQuarter = useStore((s) => s.advanceSemisQuarter)
  const advanceFinalQuarter = useStore((s) => s.advanceFinalQuarter)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const semisQ = game.season.semisQuarter ?? 0
  const finalQ = game.season.finalQuarter ?? 0
  // Back-compat for saves that pre-date quarter counters
  const legacyRevealed = game.season.revealedThrough ?? 0
  const effSemisQ = legacyRevealed >= 8 ? Math.max(semisQ, 4) : semisQ
  const effFinalQ = legacyRevealed >= 9 ? Math.max(finalQ, 4) : finalQ

  const semisComplete = effSemisQ >= 4
  const finalComplete = effFinalQ >= 4

  const teamById = new Map(game.teams.map((t) => [t.id, t]))
  const bracket = game.season.bracket
  const semi1 = bracket.find((b) => b.matchupId === 'semi-1')
  const semi2 = bracket.find((b) => b.matchupId === 'semi-2')
  const finalSlot = bracket.find((b) => b.matchupId === 'final')

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">PLAYOFFS</h1>
        <button
          onClick={() => setScreen('season')}
          className="text-xs text-slate-400 underline"
        >
          Back to season
        </button>
      </div>

      {effSemisQ === 0 && (
        <div className="text-center text-sm text-slate-400 mb-4">
          The matchups are set. Tap below when you're ready for kickoff.
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="space-y-3">
          {semi1 && (
            <SlotCard
              slot={semi1}
              showTeams={true}
              teamById={teamById}
              seedA={1}
              seedB={4}
              revealedQuarters={effSemisQ}
            />
          )}
          {semi2 && (
            <SlotCard
              slot={semi2}
              showTeams={true}
              teamById={teamById}
              seedA={2}
              seedB={3}
              revealedQuarters={effSemisQ}
            />
          )}
        </div>
        <div className="text-slate-600 text-xl">→</div>
        <div>
          {finalSlot && (
            <SlotCard
              slot={finalSlot}
              showTeams={semisComplete}
              teamById={teamById}
              revealedQuarters={effFinalQ}
            />
          )}
        </div>
      </div>

      <div className="mt-8">
        {!semisComplete && (
          <button
            onClick={advanceSemisQuarter}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl"
          >
            Play Q{effSemisQ + 1} of the Semifinals →
          </button>
        )}
        {semisComplete && !finalComplete && (
          <button
            onClick={advanceFinalQuarter}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl"
          >
            Play Q{effFinalQ + 1} of the Championship →
          </button>
        )}
        {finalComplete && (
          <button
            onClick={() => setScreen('trophy')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
          >
            Crown the Champion →
          </button>
        )}
      </div>
    </div>
  )
}
