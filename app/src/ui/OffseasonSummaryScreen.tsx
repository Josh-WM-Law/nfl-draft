import { useStore } from '../state/store'
import type { OffseasonEvent, Player } from '../state/types'

const initials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

function EventRow({ e }: { e: OffseasonEvent }) {
  const delta =
    e.fromValue != null && e.toValue != null ? e.toValue - e.fromValue : 0
  const arrow = e.type === 'retired' ? '' : e.type === 'improved' ? '▲' : '▼'
  const color =
    e.type === 'retired'
      ? 'text-slate-500'
      : e.type === 'improved'
        ? 'text-emerald-400'
        : 'text-red-400'
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
        {initials(e.playerName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{e.playerName}</div>
        <div className="text-xs text-slate-500">
          {e.position}
          {e.age != null && ` · Age ${e.age}`}
          {e.reason && ` · ${e.reason}`}
        </div>
      </div>
      <div className={`text-sm font-bold ${color}`}>
        {e.type === 'retired'
          ? 'Retired'
          : `${arrow} ${e.fromValue} → ${e.toValue} (${delta > 0 ? '+' : ''}${delta})`}
      </div>
    </div>
  )
}

function RookieMini({ r }: { r: Player }) {
  return (
    <div className="rounded-lg bg-slate-900 p-2 flex items-center gap-2">
      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
        {initials(r.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{r.name}</div>
        <div className="text-xs text-slate-500">
          {r.position} · OVR {r.value}
        </div>
      </div>
    </div>
  )
}

export function OffseasonSummaryScreen() {
  const dynasty = useStore((s) => s.dynasty)
  const advanceToKeepers = useStore((s) => s.advanceToKeepers)

  if (!dynasty || !dynasty.lastOffseason) return null
  const report = dynasty.lastOffseason
  const topImproved = report.developments
    .filter((e) => e.type === 'improved')
    .sort(
      (a, b) => (b.toValue ?? 0) - (b.fromValue ?? 0) - ((a.toValue ?? 0) - (a.fromValue ?? 0)),
    )
    .slice(0, 8)
  const topRegressed = report.developments
    .filter((e) => e.type === 'regressed')
    .sort(
      (a, b) => (a.toValue ?? 0) - (a.fromValue ?? 0) - ((b.toValue ?? 0) - (b.fromValue ?? 0)),
    )
    .slice(0, 6)
  const topRookies = [...report.rookies]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="mb-6">
        <div className="text-xs tracking-widest text-amber-400 uppercase">
          {dynasty.name} · Offseason after Year {report.atYear}
        </div>
        <h1 className="text-3xl font-black mt-1">OFFSEASON REPORT</h1>
        <p className="text-sm text-slate-400 mt-1">
          Players aged a year. Some retired, some improved, some fell off.
          A new rookie class has arrived.
        </p>
      </div>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Retirements
          </div>
          <div className="text-xs text-slate-500">
            {report.retirements.length}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {report.retirements.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              No retirements this year.
            </div>
          ) : (
            report.retirements
              .slice(0, 12)
              .map((e) => <EventRow key={e.playerId} e={e} />)
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Biggest Risers
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {topImproved.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              No standout gains.
            </div>
          ) : (
            topImproved.map((e) => <EventRow key={e.playerId} e={e} />)
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Biggest Fallers
        </div>
        <div className="rounded-xl bg-slate-900 px-3 divide-y divide-slate-800">
          {topRegressed.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-3">
              No big regressions.
            </div>
          ) : (
            topRegressed.map((e) => <EventRow key={e.playerId} e={e} />)
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Rookie Class · Top 10
          </div>
          <div className="text-xs text-slate-500">
            {report.rookies.length} rookies
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {topRookies.map((r) => (
            <RookieMini key={r.id} r={r} />
          ))}
        </div>
      </section>

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-slate-950 border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={advanceToKeepers}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-lg"
          >
            Pick Your Keepers →
          </button>
        </div>
      </div>
    </div>
  )
}
