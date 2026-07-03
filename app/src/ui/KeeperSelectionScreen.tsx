import { useStore } from '../state/store'
import type { Player } from '../state/types'

const KEEPER_LIMIT = 4

const initials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

function KeeperCard({
  player,
  selected,
  onToggle,
  atLimit,
  dead,
}: {
  player: Player
  selected: boolean
  onToggle: () => void
  atLimit: boolean
  dead: boolean
}) {
  const disabled = dead || (!selected && atLimit)
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full text-left rounded-xl p-3 transition ${
        selected
          ? 'bg-sky-500 text-black'
          : dead
            ? 'bg-slate-900 text-slate-600 line-through cursor-not-allowed'
            : disabled
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
            selected
              ? 'bg-black border-black'
              : 'bg-transparent border-slate-600'
          }`}
        >
          {selected && (
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-sky-500"
            >
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4L8.6 12l6.7-6.7a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0 overflow-hidden">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials(player.name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{player.name}</div>
          <div
            className={`text-xs ${
              selected ? 'text-black/70' : 'text-slate-400'
            }`}
          >
            {player.position} · OVR {player.value}
            {player.age != null && ` · Age ${player.age}`}
            {dead && ' · RETIRED'}
          </div>
        </div>
      </div>
    </button>
  )
}

export function KeeperSelectionScreen() {
  const dynasty = useStore((s) => s.dynasty)
  const game = useStore((s) => s.game)
  const playersById = useStore((s) => s.playersById)
  const toggleKeeper = useStore((s) => s.toggleKeeper)
  const confirmKeepers = useStore((s) => s.confirmKeepers)

  if (!dynasty || !game) return null
  const userTeam = game.teams.find((t) => t.id === dynasty.userTeamId)
  if (!userTeam) return null

  const currentKeepers = dynasty.pendingKeepers?.[dynasty.userTeamId] ?? []
  const rosterIds = userTeam.roster.filter((x): x is string => !!x)
  // A "dead" (retired) player is one whose ID is no longer in the live pool.
  const rosterEntries = rosterIds.map((id) => {
    const p = playersById.get(id)
    return { id, player: p, dead: !p }
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="mb-6">
        <div className="text-xs tracking-widest text-amber-400 uppercase">
          {dynasty.name} · Entering Year {dynasty.currentYear + 1}
        </div>
        <h1 className="text-3xl font-black mt-1">KEEP 4 PLAYERS</h1>
        <p className="text-sm text-slate-400 mt-1">
          Choose any 4 to carry into next season. Everyone else goes into the
          redraft pool. Retired players can't be kept.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-slate-400">
          Your Roster
        </div>
        <div className="text-sm font-bold">
          {currentKeepers.length} / {KEEPER_LIMIT} kept
        </div>
      </div>

      <div className="space-y-2">
        {rosterEntries.map((entry) => {
          const player = entry.player
          if (!player) {
            return (
              <div
                key={entry.id}
                className="rounded-xl p-3 bg-slate-900 text-slate-600 italic"
              >
                Retired · unavailable
              </div>
            )
          }
          const selected = currentKeepers.includes(player.id)
          return (
            <KeeperCard
              key={player.id}
              player={player}
              selected={selected}
              onToggle={() => toggleKeeper(player.id)}
              atLimit={currentKeepers.length >= KEEPER_LIMIT}
              dead={entry.dead}
            />
          )
        })}
      </div>

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-slate-950 border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={confirmKeepers}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-lg"
          >
            Confirm Keepers →
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            CPU teams auto-keep their top 4 by OVR. Draft order is random.
          </p>
        </div>
      </div>
    </div>
  )
}
