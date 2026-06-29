import { useStore } from '../state/store'
import type { BracketSlot } from '../state/types'

const SlotCard = ({
  slot,
  revealed,
  showTeams,
  teamById,
  seedA,
  seedB,
}: {
  slot: BracketSlot
  revealed: boolean
  showTeams: boolean
  teamById: Map<string, { name: string; color: string }>
  seedA?: number
  seedB?: number
}) => {
  const a = showTeams && slot.teamAId ? teamById.get(slot.teamAId) : null
  const b = showTeams && slot.teamBId ? teamById.get(slot.teamBId) : null
  const winnerIsA = slot.winnerId === slot.teamAId
  const isFinal = slot.round === 'final'
  return (
    <div
      className={`rounded-xl bg-slate-900 overflow-hidden border ${
        revealed && isFinal
          ? 'border-amber-500/60'
          : 'border-slate-800'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 px-3 pt-2 flex justify-between">
        <span>{isFinal ? 'Championship' : 'Semifinal'}</span>
        {isFinal && (
          <span className="text-amber-400/70">Neutral Site</span>
        )}
      </div>
      <div className="flex">
        <div className="w-1.5" style={{ background: a?.color ?? '#444' }} />
        <div className="flex-1 px-3 py-2">
          <div
            className={`flex justify-between ${
              revealed
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
            <span>{revealed && slot.result ? slot.result.homeScore : ''}</span>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="w-1.5" style={{ background: b?.color ?? '#444' }} />
        <div className="flex-1 px-3 py-2">
          <div
            className={`flex justify-between ${
              revealed
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
            <span>{revealed && slot.result ? slot.result.awayScore : ''}</span>
          </div>
        </div>
      </div>
      {revealed && slot.result?.headline && (
        <div className="text-xs text-slate-500 italic px-3 pb-2">
          {slot.result.headline}
        </div>
      )}
    </div>
  )
}

export function BracketScreen() {
  const game = useStore((s) => s.game)
  const advanceReveal = useStore((s) => s.advanceReveal)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const revealed = game.season.revealedThrough ?? 0
  const semisRevealed = revealed >= 8
  const finalRevealed = revealed >= 9

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

      {!semisRevealed && (
        <div className="text-center text-sm text-slate-400 mb-4">
          The matchups are set. Tap below when you're ready to play the
          semifinals.
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="space-y-3">
          {semi1 && (
            <SlotCard
              slot={semi1}
              revealed={semisRevealed}
              showTeams={true}
              teamById={teamById}
              seedA={1}
              seedB={4}
            />
          )}
          {semi2 && (
            <SlotCard
              slot={semi2}
              revealed={semisRevealed}
              showTeams={true}
              teamById={teamById}
              seedA={2}
              seedB={3}
            />
          )}
        </div>
        <div className="text-slate-600 text-xl">→</div>
        <div>
          {finalSlot && (
            <SlotCard
              slot={finalSlot}
              revealed={finalRevealed}
              showTeams={semisRevealed}
              teamById={teamById}
            />
          )}
        </div>
      </div>

      <div className="mt-8">
        {!semisRevealed && (
          <button
            onClick={advanceReveal}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl"
          >
            Play the Semifinals →
          </button>
        )}
        {semisRevealed && !finalRevealed && (
          <button
            onClick={advanceReveal}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
          >
            Play the Championship →
          </button>
        )}
        {finalRevealed && (
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
