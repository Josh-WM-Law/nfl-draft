import { useStore } from '../state/store'
import type { TeamSeat, Position } from '../state/types'
import { ROSTER_SLOTS } from '../state/types'

const POSITION_COLOR: Record<Position, string> = {
  QB: 'text-red-400',
  RB: 'text-green-400',
  WR: 'text-blue-400',
  TE: 'text-orange-400',
  OT: 'text-yellow-300',
  OG: 'text-yellow-400',
  C: 'text-yellow-500',
  DE: 'text-purple-400',
  DT: 'text-pink-400',
  LB: 'text-cyan-400',
  CB: 'text-emerald-400',
  S: 'text-amber-400',
  K: 'text-slate-400',
}

const lastName = (full: string): string => {
  const parts = full.split(' ').filter(Boolean)
  if (parts.length === 0) return full
  if (parts.length === 1) return parts[0]
  return parts.slice(1).join(' ')
}

export function RosterPanel({
  team,
  isViewingOtherTeam = false,
}: {
  team: TeamSeat
  isViewingOtherTeam?: boolean
}) {
  const playersById = useStore((s) => s.playersById)

  return (
    <aside className="w-24 md:w-28 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
      <div
        className="px-2 py-2 border-b border-slate-800"
        style={{ background: team.color }}
      >
        {isViewingOtherTeam && (
          <div className="text-[8px] uppercase tracking-widest text-white/70 font-bold">
            Viewing
          </div>
        )}
        <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold truncate">
          {team.name}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {ROSTER_SLOTS.map((slot, i) => {
          const pid = team.roster[i]
          const player = pid ? playersById.get(pid) : null
          return (
            <div
              key={i}
              className={`px-2 py-1.5 border-b border-slate-800/50 ${
                player ? '' : 'bg-slate-950/40'
              }`}
            >
              <div
                className={`text-[10px] font-bold tracking-wider ${
                  POSITION_COLOR[slot] ?? 'text-slate-400'
                }`}
              >
                {slot}
              </div>
              <div
                className={`text-xs leading-tight truncate ${
                  player ? 'text-white font-semibold' : 'text-slate-600'
                }`}
              >
                {player ? lastName(player.name) : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
