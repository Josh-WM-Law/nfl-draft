import { useState } from 'react'
import { useStore } from '../state/store'
import { NFL_TEAMS, type NflTeam } from '../data/nflTeams'

const DIVISIONS: Array<{
  conf: 'AFC' | 'NFC'
  div: 'East' | 'North' | 'South' | 'West'
}> = [
  { conf: 'AFC', div: 'East' },
  { conf: 'AFC', div: 'North' },
  { conf: 'AFC', div: 'South' },
  { conf: 'AFC', div: 'West' },
  { conf: 'NFC', div: 'East' },
  { conf: 'NFC', div: 'North' },
  { conf: 'NFC', div: 'South' },
  { conf: 'NFC', div: 'West' },
]

function TeamTile({
  team,
  selected,
  onClick,
}: {
  team: NflTeam
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl overflow-hidden transition active:scale-95 ${
        selected ? 'ring-4 ring-white' : 'ring-1 ring-slate-800'
      }`}
      style={{ background: team.primaryColor }}
    >
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">
          {team.city}
        </div>
        <div className="text-white font-black text-lg leading-tight">
          {team.nickname}
        </div>
      </div>
    </button>
  )
}

export function NflTeamSelectionScreen() {
  const dynasty = useStore((s) => s.dynasty)
  const pickNflTeam = useStore((s) => s.pickNflTeam)
  const exitToLanding = useStore((s) => s.exitToLanding)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const submit = () => {
    if (!selectedId) return
    pickNflTeam(selectedId)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-widest text-amber-400 uppercase">
            {dynasty?.name ?? 'New Dynasty'} · Year 1
          </div>
          <h1 className="text-2xl font-black mt-1">PICK YOUR TEAM</h1>
          <p className="text-xs text-slate-400 mt-1">
            The other 7 NFL teams will be your CPU rivals.
          </p>
        </div>
        <button
          onClick={exitToLanding}
          className="text-xs text-slate-400 underline"
        >
          Cancel
        </button>
      </div>

      {DIVISIONS.map(({ conf, div }) => {
        const teams = NFL_TEAMS.filter(
          (t) => t.conference === conf && t.division === div,
        )
        return (
          <section key={`${conf}-${div}`} className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
              {conf} {div}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((t) => (
                <TeamTile
                  key={t.id}
                  team={t}
                  selected={selectedId === t.id}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          </section>
        )
      })}

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-slate-950 border-t border-slate-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={submit}
            disabled={!selectedId}
            className={`w-full py-3 rounded-xl font-bold text-lg ${
              selectedId
                ? 'bg-sky-500 hover:bg-sky-400 text-black'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {selectedId
              ? `Continue as ${NFL_TEAMS.find((t) => t.id === selectedId)?.nickname} →`
              : 'Pick a team'}
          </button>
        </div>
      </div>
    </div>
  )
}
