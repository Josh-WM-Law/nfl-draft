import { useState } from 'react'
import type { Player, Position } from '../state/types'

const POSITION_COLOR: Record<Position, string> = {
  QB: 'bg-red-500',
  RB: 'bg-green-500',
  WR: 'bg-blue-500',
  TE: 'bg-orange-500',
  OL: 'bg-yellow-600',
  DE: 'bg-purple-500',
  DT: 'bg-pink-500',
  LB: 'bg-cyan-500',
  CB: 'bg-emerald-500',
  S: 'bg-amber-500',
  K: 'bg-slate-500',
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

export function PlayerCard({
  player,
  onTap,
  disabled = false,
}: {
  player: Player
  onTap?: () => void
  disabled?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className={`relative flex flex-col items-stretch bg-slate-800 rounded-2xl overflow-hidden w-full text-left transition active:scale-95 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700'
      }`}
    >
      <div className="aspect-square bg-slate-900 relative">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-slate-500">
            {initials(player.name)}
          </div>
        ) : (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white ${
            POSITION_COLOR[player.position] ?? 'bg-slate-500'
          }`}
        >
          {player.position}
        </span>
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-bold text-white">
          {player.value}
        </span>
      </div>
      <div className="p-2">
        <div className="font-bold text-sm leading-tight truncate">
          {player.name}
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">
          {player.nflTeam}
        </div>
      </div>
    </button>
  )
}
