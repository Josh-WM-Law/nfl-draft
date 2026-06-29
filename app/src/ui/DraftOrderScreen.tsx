import { useStore } from '../state/store'
import type { TeamSeat } from '../state/types'

function PickRow({
  pickNumber,
  team,
  isRevealed,
  isFirstOverall,
  justRevealed,
}: {
  pickNumber: number
  team: TeamSeat | undefined
  isRevealed: boolean
  isFirstOverall: boolean
  justRevealed: boolean
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-300 ${
        isFirstOverall && isRevealed
          ? 'bg-amber-500 text-black ring-2 ring-amber-300'
          : isRevealed
            ? 'bg-slate-800'
            : 'bg-slate-900'
      } ${justRevealed ? 'scale-105' : 'scale-100'}`}
    >
      <div className="flex items-center">
        <div
          className="w-2"
          style={{
            background:
              isRevealed && team ? team.color : 'transparent',
          }}
        />
        <div
          className={`w-14 px-3 py-3 text-center text-2xl font-black ${
            isRevealed ? '' : 'text-slate-600'
          }`}
        >
          {pickNumber}
        </div>
        <div className="flex-1 px-2 py-3">
          {isRevealed && team ? (
            <div className="font-bold text-lg truncate">{team.name}</div>
          ) : (
            <div className="text-slate-600 text-lg italic">— pending —</div>
          )}
        </div>
        {isFirstOverall && isRevealed && (
          <div className="pr-3 text-[10px] font-black uppercase tracking-widest">
            1st Overall
          </div>
        )}
      </div>
    </div>
  )
}

export function DraftOrderScreen() {
  const game = useStore((s) => s.game)
  const revealNext = useStore((s) => s.revealNextOrderPick)
  const beginDraft = useStore((s) => s.beginDraft)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const teamById = new Map(game.teams.map((t) => [t.id, t]))
  const order = game.draft.order
  const revealedCount = game.draft.orderRevealedCount ?? 0
  const total = order.length
  const allRevealed = revealedCount >= total
  const nextToReveal = total - revealedCount

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black">DRAFT LOTTERY</h1>
        <button
          onClick={() => setScreen('setup')}
          className="text-xs text-slate-400 underline"
        >
          Back to setup
        </button>
      </div>
      <p className="text-center text-xs text-slate-500 italic mb-4">
        Picks revealed worst → first
      </p>

      <div className="space-y-2 flex-1">
        {order.map((teamId, idx) => {
          const pickNumber = idx + 1
          const isRevealed = pickNumber > total - revealedCount
          const justRevealed = pickNumber === total - revealedCount + 1
          const team = teamById.get(teamId)
          return (
            <PickRow
              key={pickNumber}
              pickNumber={pickNumber}
              team={team}
              isRevealed={isRevealed}
              isFirstOverall={pickNumber === 1}
              justRevealed={justRevealed && isRevealed}
            />
          )
        })}
      </div>

      <div className="mt-4">
        {!allRevealed ? (
          <button
            onClick={revealNext}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-lg"
          >
            Reveal Pick #{nextToReveal} →
          </button>
        ) : (
          <button
            onClick={beginDraft}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg"
          >
            Begin the Draft →
          </button>
        )}
      </div>
    </div>
  )
}
