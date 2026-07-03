import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../state/store'
import { PlayerCard } from './PlayerCard'
import { RosterPanel } from './RosterPanel'
import { ALL_POSITIONS, ROSTER_SIZE, type Position } from '../state/types'
import { canTeamPick } from '../engine/draft'

const UNDO_WINDOW_MS = 5000

function UndoToast() {
  const lastSnapshot = useStore((s) => s.lastPickSnapshot)
  const undoLastPick = useStore((s) => s.undoLastPick)
  const [remaining, setRemaining] = useState(UNDO_WINDOW_MS)

  useEffect(() => {
    if (!lastSnapshot) return
    setRemaining(UNDO_WINDOW_MS)
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const left = Math.max(0, UNDO_WINDOW_MS - elapsed)
      setRemaining(left)
      if (left <= 0) {
        clearInterval(tick)
        // Clear snapshot once window expires
        useStore.setState({ lastPickSnapshot: null })
      }
    }, 100)
    return () => clearInterval(tick)
  }, [lastSnapshot])

  if (!lastSnapshot || remaining <= 0) return null
  const seconds = Math.ceil(remaining / 1000)
  return (
    <button
      onClick={undoLastPick}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white text-black rounded-full font-bold shadow-lg flex items-center gap-2"
    >
      <span>Undo pick</span>
      <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
        {seconds}s
      </span>
    </button>
  )
}

type Filter = Position | 'ALL' | 'ROOKIES'

export function DraftBoard() {
  const game = useStore((s) => s.game)
  const players = useStore((s) => s.players)
  const makePick = useStore((s) => s.makePick)
  const simRestOfDraft = useStore((s) => s.simRestOfDraft)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null)

  const currentPick = game?.draft.picks[game.draft.currentPickIdx]
  const currentTeam = game?.teams.find((t) => t.id === currentPick?.teamId)
  const currentPickIdx = game?.draft.currentPickIdx ?? 0

  // Snap back to current picker whenever the pick advances
  useEffect(() => {
    setViewingTeamId(null)
  }, [currentPickIdx])

  const viewedTeam = viewingTeamId
    ? game?.teams.find((t) => t.id === viewingTeamId)
    : currentTeam
  const isViewingOther =
    viewingTeamId !== null &&
    !!currentTeam &&
    viewingTeamId !== currentTeam.id

  const usedIds = useMemo(() => {
    const set = new Set<string>()
    if (!game) return set
    for (const t of game.teams) for (const pid of t.roster) if (pid) set.add(pid)
    return set
  }, [game])

  const excludedIds = useMemo(
    () => new Set(game?.excludedUserPlayerIds ?? []),
    [game],
  )

  const available = useMemo(() => {
    return players
      .filter((p) => !usedIds.has(p.id) && !excludedIds.has(p.id))
      .filter((p) => {
        if (filter === 'ALL') return true
        if (filter === 'ROOKIES') return p.yearsExp === 0
        return p.position === filter
      })
      .sort((a, b) => b.value - a.value)
  }, [players, usedIds, excludedIds, filter])

  if (!game) return null

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <UndoToast />
      <div className="flex gap-2 p-3 bg-slate-900">
        {game.draft.order.map((teamId, idx) => {
          const t = game.teams.find((x) => x.id === teamId)
          if (!t) return null
          const isCurrent = t.id === currentTeam?.id
          const isViewed = viewingTeamId === t.id && !isCurrent
          const owned = game.draft.picks.filter(
            (p) => p.teamId === t.id && p.playerId,
          ).length
          const pickNumber = idx + 1
          return (
            <button
              key={t.id}
              onClick={() => setViewingTeamId(t.id)}
              className={`flex-1 px-2 py-2 rounded-lg text-center transition active:scale-95 ${
                isCurrent ? 'ring-4 ring-white' : ''
              } ${isViewed ? 'ring-2 ring-amber-400' : ''}`}
              style={{ background: t.color }}
            >
              <div className="text-[9px] uppercase tracking-wider text-white/70 font-bold">
                #{pickNumber}
              </div>
              <div className="text-xs font-bold text-white truncate">
                {t.name}
              </div>
              <div className="text-xs text-white/80">{owned}/{ROSTER_SIZE}</div>
            </button>
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

      <div className="flex-1 flex overflow-hidden">
        {viewedTeam && (
          <RosterPanel
            team={viewedTeam}
            isViewingOtherTeam={isViewingOther}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-slate-800 shrink-0">
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
            <button
              onClick={() => setFilter('ROOKIES')}
              className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${
                filter === 'ROOKIES'
                  ? 'bg-amber-400 text-black'
                  : 'bg-amber-900/60 text-amber-200'
              }`}
            >
              ROOKIES
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
