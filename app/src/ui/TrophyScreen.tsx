import { useState } from 'react'
import { useStore } from '../state/store'
import type { SeasonAward } from '../state/types'

const initials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

function AwardCard({ award }: { award: SeasonAward }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="flex bg-slate-900/70 rounded-xl overflow-hidden text-left items-stretch backdrop-blur-sm">
      <div className="w-1.5 shrink-0" style={{ background: award.teamColor }} />
      <div className="w-16 h-16 bg-slate-800 shrink-0 relative flex items-center justify-center">
        {award.winnerPhotoUrl && !imgError ? (
          <img
            src={award.winnerPhotoUrl}
            alt={award.winnerName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="text-lg font-black text-white"
            style={{ color: award.teamColor }}
          >
            {initials(award.winnerName)}
          </div>
        )}
      </div>
      <div className="flex-1 p-2.5 min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
          {award.emoji} {award.name}
        </div>
        <div className="font-bold text-white truncate">
          {award.winnerName}
        </div>
        <div className="text-[11px] text-slate-400">
          {award.position === 'TEAM'
            ? award.teamName
            : `${award.position} · ${award.teamName}`}
        </div>
        <div className="text-[11px] text-slate-500 italic leading-tight mt-1">
          {award.reason}
        </div>
      </div>
    </div>
  )
}

export function TrophyScreen() {
  const game = useStore((s) => s.game)
  const startNewLeague = useStore((s) => s.startNewLeague)
  const setScreen = useStore((s) => s.setScreen)

  if (!game) return null

  const championId = game.season.champion
  const champion = championId
    ? game.teams.find((t) => t.id === championId)
    : null

  if (!champion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        No champion yet.
      </div>
    )
  }

  const regSeasonRecord = game.season.standings.find(
    (s) => s.teamId === championId,
  )
  const grade = champion.grade
  const awards = game.season.awards ?? []

  return (
    <div
      className="min-h-screen flex flex-col items-center p-6 text-center"
      style={{
        background: `linear-gradient(180deg, ${champion.color}33 0%, #050b1a 70%)`,
      }}
    >
      <div className="pt-8 pb-6">
        <div className="text-7xl mb-4">🏆</div>
        <div className="text-xs uppercase tracking-[0.5em] text-amber-400 mb-3 font-bold">
          Champion
        </div>
        <h1
          className="text-5xl md:text-6xl font-black leading-tight mb-4"
          style={{ color: champion.color }}
        >
          {champion.name}
        </h1>
        <div className="text-slate-400 text-sm space-y-1">
          {regSeasonRecord && (
            <div>
              Regular season:{' '}
              <span className="font-bold text-white">
                {regSeasonRecord.wins}–{regSeasonRecord.losses}
              </span>{' '}
              ({regSeasonRecord.pointDiff > 0 ? '+' : ''}
              {regSeasonRecord.pointDiff})
            </div>
          )}
          {grade && (
            <div>
              Draft grade was{' '}
              <span className="font-bold text-white">{grade.letter}</span>
            </div>
          )}
        </div>
      </div>

      {awards.length > 0 && (
        <section className="w-full max-w-md mb-6">
          <h2 className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-3 font-bold">
            Season Awards
          </h2>
          <div className="space-y-2">
            {awards.map((a) => (
              <AwardCard key={a.id} award={a} />
            ))}
          </div>
        </section>
      )}

      <div className="w-full max-w-md space-y-2 mb-6">
        <button
          onClick={() => setScreen('bracket')}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
        >
          Back to Bracket
        </button>
        <button
          onClick={() => startNewLeague(1)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
        >
          New League
        </button>
      </div>
    </div>
  )
}
