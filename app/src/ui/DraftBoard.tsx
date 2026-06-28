import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { PlayerCard } from './PlayerCard'
import { ALL_POSITIONS, type Position } from '../state/types'
import { canTeamPick } from '../engine/draft'

type Filter = Position | 'ALL'

export function DraftBoard() {
  const game = useStore((s) => s.game)
  const players = useStore((s) => s.players)
  const makePick = useStore((s) => s.makePick)
  const simRestOfDraft = useStore((s) => s.simRestOfDraft)
  const [filter, setFilter] = useState<Filter>('ALL')

  const currentPick = game?.draft.picks[game.draft.currentPickIdx]
  const currentTeam = game?.teams.find((t) => t.id === currentPick?.teamId)

  const usedIds = useMemo(() => {
    const set = new Set<string>()
    if (!game) return set
    for (const t of game.teams) for (const pid of t.roster) if (pid) set.add(pid)
    return set
  }, [game])

  const available = useMemo(() => {
    return players
      .filter((p) => !usedIds.has(p.id))
      .filter((p) => filter === 'ALL' || p.position === filter)
      .sort((a, b) => b.value - a.value)
  }, [players, usedIds, filter])

  if (!game) return null

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <div className="flex gap-2 p-3 bg-slate-900">
        {game.teams.map((t) => {
          const isCurrent = t.id === currentTeam?.id
          const owned = game.draft.picks.filter(
            (p) => p.teamId === t.id && p.playerId,
          ).length
          return (
            <div
              key={t.id}
              className={`flex-1 px-2 py-2 rounded-lg text-center transition ${
                isCurrent ? 'ring-4 ring-white' : ''
              }`}
              style={{ background: t.color }}
            >
              <div className="text-xs font-bold text-white truncate">
                {t.name}
              </div>
              <div className="text-xs text-white/80">{owned}/17</div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 bg-slate-800 text-center">
        {currentPick && currentTeam ? (
          <div className="text-lg">
            <span className="font-bold" style={{ color: currentTeam.color }}>
              {currentTeam.name}
            </span>
            {currentTeam.isComputer ? ' thinking…' : ' on the clock'}
            <span className="text-slate-400">
              {' '}
              · Round {currentPick.round}, Pick {currentPick.pickNumber}
            </span>
          </div>
        ) : (
          <div className="text-slate-400">Draft complete</div>
        )}
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-slate-800">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-white text-black'
              : 'bg-slate-700 text-white'
          }`}
        >
          ALL
        </button>
        {ALL_POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setFilter(pos)}
            className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${
              filter === pos
                ? 'bg-white text-black'
                : 'bg-slate-700 text-white'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {available.slice(0, 80).map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              onTap={() => makePick(p.id)}
              disabled={currentTeam ? !canTeamPick(currentTeam, p.position) : true}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-slate-900">
        <button
          onClick={simRestOfDraft}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg"
        >
          SIM THE REST
        </button>
      </div>
    </div>
  )
}
