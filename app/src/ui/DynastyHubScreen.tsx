import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import {
  type PlayerCareer,
  type SeasonResult,
  COACH_TRAIT_LABELS,
} from '../state/types'

const AWARD_EMOJI: Record<string, string> = {
  MVP: '🏆',
  OPOY: '⚡',
  DPOY: '🛡️',
  OROY: '🌱',
  DROY: '🌱',
  GM_OF_YEAR: '📋',
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-black leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function ChampionshipRow({
  result,
  teamNameById,
  userTeamId,
}: {
  result: SeasonResult
  teamNameById: Map<string, string>
  userTeamId: string
}) {
  const championName = result.championTeamId
    ? teamNameById.get(result.championTeamId) ?? '—'
    : '—'
  const runnerUpName = result.runnerUpTeamId
    ? teamNameById.get(result.runnerUpTeamId) ?? '—'
    : '—'
  const userFinish = result.finalStandings.findIndex(
    (s) => s.teamId === userTeamId,
  )
  const userWonRing = result.championTeamId === userTeamId
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-10 text-center text-xs text-slate-500 font-bold">
        Y{result.year}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className={userWonRing ? 'font-black text-amber-400' : 'font-bold'}>
            {championName}
          </span>{' '}
          <span className="text-slate-500 text-xs">
            def. {runnerUpName}
          </span>
        </div>
        {userFinish >= 0 && (
          <div className="text-xs text-slate-500">
            You finished #{userFinish + 1} in the regular season
          </div>
        )}
      </div>
      {userWonRing && <div className="text-2xl">💍</div>}
    </div>
  )
}

function AwardsForYear({
  result,
  teamNameById,
  userTeamId,
}: {
  result: SeasonResult
  teamNameById: Map<string, string>
  userTeamId: string
}) {
  if (result.awards.length === 0) return null
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
        Year {result.year}
      </div>
      <div className="space-y-1">
        {result.awards.map((a) => {
          const teamName = teamNameById.get(a.teamId) ?? a.teamName
          const yours = a.teamId === userTeamId
          return (
            <div
              key={a.id}
              className={`flex items-center gap-2 text-sm ${
                yours ? 'text-amber-300' : ''
              }`}
            >
              <span className="w-6 text-center">
                {AWARD_EMOJI[a.id] ?? a.emoji}
              </span>
              <span className="font-bold w-24 shrink-0 text-xs uppercase tracking-wider text-slate-400">
                {a.name}
              </span>
              <span className="truncate">
                {a.winnerName}{' '}
                <span className="text-slate-500 text-xs">· {teamName}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CareerLeaderRow({
  c,
  userTeamId,
}: {
  c: PlayerCareer
  userTeamId: string
}) {
  void userTeamId
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
        {initials(c.playerName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">
          {c.playerName}
          {c.status === 'retired' && (
            <span className="text-xs text-slate-500 ml-2">(retired)</span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {c.position} · peak {c.peakValue}
          {c.championshipYears.length > 0 &&
            ` · ${c.championshipYears.length}× ring`}
          {c.awardYears.length > 0 && ` · ${c.awardYears.length}× award`}
          {c.yearsOnUserTeam.length > 0 &&
            ` · ${c.yearsOnUserTeam.length}yr with you`}
        </div>
      </div>
    </div>
  )
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function SnapshotNameModal({
  currentYear,
  onClose,
  onSubmit,
}: {
  currentYear: number
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState('')
  const submit = () => {
    onSubmit(name.trim())
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-black">SNAPSHOT YEAR {currentYear}</h2>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 underline"
          >
            Cancel
          </button>
        </div>
        <div className="p-4">
          <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
            Bookmark name (optional)
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            maxLength={40}
            placeholder={`Year ${currentYear} bookmark`}
            className="w-full bg-slate-800 px-3 py-2 rounded text-white font-bold"
          />
          <p className="text-xs text-slate-500 mt-2">
            Freezes the current dynasty state — pool, teams, coach, history —
            so you can rewind to this year later.
          </p>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={submit}
            className="w-full py-2.5 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-black"
          >
            Save Bookmark
          </button>
        </div>
      </div>
    </div>
  )
}

export function DynastyHubScreen() {
  const dynasty = useStore((s) => s.dynasty)
  const game = useStore((s) => s.game)
  const closeDynastyHub = useStore((s) => s.closeDynastyHub)
  const createSnapshot = useStore((s) => s.createSnapshot)
  const loadSnapshot = useStore((s) => s.loadSnapshot)
  const deleteSnapshot = useStore((s) => s.deleteSnapshot)
  const [leadersFilter, setLeadersFilter] = useState<'all' | 'yours'>('all')
  const [showSnapshotModal, setShowSnapshotModal] = useState(false)
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (!dynasty || !game) return null
  const userTeam = game.teams.find((t) => t.id === dynasty.userTeamId)
  const teamNameById = new Map(game.teams.map((t) => [t.id, t.name]))

  const ringsWon = dynasty.history.filter(
    (h) => h.championTeamId === dynasty.userTeamId,
  ).length
  const runnerUps = dynasty.history.filter(
    (h) => h.runnerUpTeamId === dynasty.userTeamId,
  ).length
  const gradeScores = dynasty.history
    .map((h) => h.userGrade?.score)
    .filter((n): n is number => typeof n === 'number')
  const avgGrade =
    gradeScores.length > 0
      ? Math.round(
          gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length,
        )
      : null
  const seasonsPlayed = dynasty.history.length

  const stats = dynasty.playerCareerStats ?? {}
  const careerList = useMemo(() => {
    const all = Object.values(stats)
    const filtered = leadersFilter === 'yours'
      ? all.filter((c) => c.yearsOnUserTeam.length > 0)
      : all
    return filtered
      .slice()
      .sort((a, b) => {
        // Rings first, then awards, then peak OVR.
        if (a.championshipYears.length !== b.championshipYears.length) {
          return b.championshipYears.length - a.championshipYears.length
        }
        if (a.awardYears.length !== b.awardYears.length) {
          return b.awardYears.length - a.awardYears.length
        }
        return b.peakValue - a.peakValue
      })
      .slice(0, 20)
  }, [stats, leadersFilter])

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={closeDynastyHub}
          className="text-xs text-slate-400 underline"
        >
          ← Back
        </button>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Dynasty Hub
        </div>
      </div>

      <div className="mb-6">
        <div className="text-xs tracking-widest text-amber-400 uppercase">
          {dynasty.name}
        </div>
        <h1 className="text-3xl font-black mt-1 leading-tight">
          Year {dynasty.currentYear}
        </h1>
        <div className="text-xs text-slate-500 mt-1">
          {userTeam && (
            <>
              You are{' '}
              <span
                className="font-bold"
                style={{ color: userTeam.color }}
              >
                {userTeam.name}
              </span>
              {dynasty.coach && (
                <>
                  {' '}
                  · Coach{' '}
                  <span className="font-bold text-white">
                    {dynasty.coach.name}
                  </span>{' '}
                  ({dynasty.coach.traits
                    .map((t) => COACH_TRAIT_LABELS[t])
                    .join(', ')})
                </>
              )}
            </>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 mb-6">
        <StatCard label="Rings" value={ringsWon} sub={`${runnerUps} runner-up`} />
        <StatCard label="Seasons" value={seasonsPlayed} />
        <StatCard
          label="Avg draft"
          value={avgGrade ?? '—'}
          sub={avgGrade == null ? 'no data yet' : undefined}
        />
        <StatCard
          label="Best finish"
          value={
            ringsWon > 0
              ? '🏆'
              : runnerUps > 0
                ? 'Runner-up'
                : dynasty.history.length > 0
                  ? (() => {
                      const bestIdx = Math.min(
                        ...dynasty.history.map((h) =>
                          Math.max(
                            0,
                            h.finalStandings.findIndex(
                              (s) => s.teamId === dynasty.userTeamId,
                            ),
                          ),
                        ),
                      )
                      return `#${bestIdx + 1}`
                    })()
                  : '—'
          }
        />
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Championship History
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {dynasty.history.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              No championships crowned yet.
            </div>
          ) : (
            dynasty.history
              .slice()
              .reverse()
              .map((h) => (
                <ChampionshipRow
                  key={h.year}
                  result={h}
                  teamNameById={teamNameById}
                  userTeamId={dynasty.userTeamId}
                />
              ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Season Awards
        </div>
        <div className="space-y-2">
          {dynasty.history.length === 0 ? (
            <div className="rounded-xl bg-slate-900 px-3 py-3 text-sm text-slate-500 italic">
              No awards handed out yet.
            </div>
          ) : (
            dynasty.history
              .slice()
              .reverse()
              .map((h) => (
                <AwardsForYear
                  key={h.year}
                  result={h}
                  teamNameById={teamNameById}
                  userTeamId={dynasty.userTeamId}
                />
              ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Career Leaders
          </div>
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setLeadersFilter('all')}
              className={`px-2 py-1 rounded font-bold ${
                leadersFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLeadersFilter('yours')}
              className={`px-2 py-1 rounded font-bold ${
                leadersFilter === 'yours'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500'
              }`}
            >
              Yours
            </button>
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {careerList.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              Play a season and career stats will start filling in.
            </div>
          ) : (
            careerList.map((c) => (
              <CareerLeaderRow
                key={c.playerId}
                c={c}
                userTeamId={dynasty.userTeamId}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Snapshots
          </div>
          <button
            onClick={() => setShowSnapshotModal(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-500 text-black"
          >
            + Bookmark
          </button>
        </div>
        {dynasty.snapshots.length === 0 ? (
          <div className="rounded-xl bg-slate-900 px-3 py-3 text-sm text-slate-500 italic">
            Bookmark a year to rewind to it later — good for &ldquo;what if&rdquo;
            replays or when you're about to make a bold move.
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
            {dynasty.snapshots
              .slice()
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-10 text-center text-xs text-slate-500 font-bold">
                    Y{s.atYear}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      Saved {formatShortDate(s.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmLoadId(s.id)}
                    className="text-xs font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="text-xs text-slate-500 hover:text-red-400 px-2 py-1"
                    aria-label={`Delete ${s.name}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Your Draft Grades
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {dynasty.history.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              No drafts graded yet.
            </div>
          ) : (
            dynasty.history
              .slice()
              .reverse()
              .map((h) => (
                <div
                  key={h.year}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-10 text-center text-xs text-slate-500 font-bold">
                    Y{h.year}
                  </div>
                  <div className="flex-1">
                    <span className="text-2xl font-black">
                      {h.userGrade?.letter ?? '—'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400">
                    score{' '}
                    <span className="font-bold text-white">
                      {h.userGrade?.score ?? '—'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      {showSnapshotModal && (
        <SnapshotNameModal
          currentYear={dynasty.currentYear}
          onClose={() => setShowSnapshotModal(false)}
          onSubmit={(name) => {
            createSnapshot(name)
            setShowSnapshotModal(false)
          }}
        />
      )}

      {confirmLoadId && (() => {
        const target = dynasty.snapshots.find((s) => s.id === confirmLoadId)
        if (!target) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5">
              <h2 className="text-base font-black mb-2">
                REWIND TO YEAR {target.atYear}?
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Loading &ldquo;{target.name}&rdquo; will replace your current
                dynasty state. Anything you've done since won't be recoverable
                unless you snapshot first.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLoadId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    loadSnapshot(confirmLoadId)
                    setConfirmLoadId(null)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  Rewind
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {confirmDeleteId && (() => {
        const target = dynasty.snapshots.find((s) => s.id === confirmDeleteId)
        if (!target) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5">
              <h2 className="text-base font-black mb-2">DELETE BOOKMARK?</h2>
              <p className="text-sm text-slate-400 mb-4">
                &ldquo;{target.name}&rdquo; will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteSnapshot(confirmDeleteId)
                    setConfirmDeleteId(null)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
