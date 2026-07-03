import { useEffect, useState } from 'react'
import { useStore } from './state/store'
import { DraftBoard } from './ui/DraftBoard'
import { GradeReveal } from './ui/GradeReveal'
import { SeasonScreen } from './ui/SeasonScreen'
import { BracketScreen } from './ui/BracketScreen'
import { TrophyScreen } from './ui/TrophyScreen'
import { SetupScreen } from './ui/SetupScreen'
import { DraftOrderScreen } from './ui/DraftOrderScreen'
import { CoachCreationScreen } from './ui/CoachCreationScreen'
import { NflTeamSelectionScreen } from './ui/NflTeamSelectionScreen'
import { OffseasonSummaryScreen } from './ui/OffseasonSummaryScreen'
import { KeeperSelectionScreen } from './ui/KeeperSelectionScreen'
import { DynastyHubScreen } from './ui/DynastyHubScreen'
import { CustomPlayersSection } from './ui/CustomPlayersSection'

function DynastyNameModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (name: string, capMode: boolean) => void
}) {
  const [name, setName] = useState('')
  const [capMode, setCapMode] = useState(false)
  const submit = () => {
    const trimmed = name.trim() || 'My Dynasty'
    onSubmit(trimmed, capMode)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-black">NAME YOUR DYNASTY</h2>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 underline"
          >
            Cancel
          </button>
        </div>
        <div className="p-5">
          <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
            Dynasty name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            maxLength={40}
            placeholder="Josh's Dynasty"
            className="w-full bg-slate-800 px-3 py-2 rounded text-white font-bold"
          />
          <p className="text-xs text-slate-500 mt-2">
            You'll build a team, draft each year, keep 4 players between seasons,
            and chase a career ring count.
          </p>

          <label className="mt-5 flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={capMode}
              onChange={(e) => setCapMode(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-emerald-500"
            />
            <div className="flex-1">
              <div className="font-bold text-emerald-300">Salary Cap mode</div>
              <div className="text-xs text-slate-400 mt-1">
                Each team drafts within a fixed budget ($220M). Higher-rated
                players cost more, forcing a stars-and-scrubs roster instead
                of stacking 90+ OVR at every position.
              </div>
            </div>
          </label>
        </div>
        <div className="p-5 border-t border-slate-800">
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl font-bold text-lg bg-sky-500 hover:bg-sky-400 text-black"
          >
            Start Dynasty
          </button>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  const startNewLeague = useStore((s) => s.startNewLeague)
  const startDynasty = useStore((s) => s.startDynasty)
  const resumeDynasty = useStore((s) => s.resumeDynasty)
  const openDynastyHub = useStore((s) => s.openDynastyHub)
  const leaveDynasty = useStore((s) => s.leaveDynasty)
  const dynasty = useStore((s) => s.dynasty)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const hasDynasty = !!dynasty
  // Show the Hub button when the dynasty has any history (otherwise the hub
  // is empty and the button is noise).
  const showHubButton = hasDynasty && (dynasty?.history?.length ?? 0) > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-12">
      <p className="text-sm tracking-[0.4em] uppercase text-sky-400 mb-4">
        A House League
      </p>
      <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-none mb-6">
        ON THE CLOCK
      </h1>
      <p className="text-xl md:text-2xl text-slate-300 max-w-xl mb-10">
        Draft a team. Get graded. Crown a champion.
      </p>

      {hasDynasty && dynasty && (
        <div className="w-full max-w-md mb-4 space-y-2">
          <button
            onClick={() => resumeDynasty(dynasty.id)}
            className="w-full px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl text-left"
          >
            <div className="text-xs opacity-70 uppercase tracking-widest">
              Continue Dynasty
            </div>
            <div className="text-lg truncate">
              {dynasty.name} · Year {dynasty.currentYear}
            </div>
          </button>
          {showHubButton && (
            <button
              onClick={openDynastyHub}
              className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-wider text-sm"
            >
              Dynasty Hub
            </button>
          )}
          <button
            onClick={() => setConfirmLeave(true)}
            className="w-full text-xs text-red-400 hover:text-red-300 underline mt-1"
          >
            Leave dynasty
          </button>
        </div>
      )}

      <div className="w-full max-w-md space-y-3 mb-8">
        <button
          onClick={() => setShowDynastyModal(true)}
          className="w-full px-8 py-4 bg-sky-500 hover:bg-sky-400 text-black font-black uppercase tracking-wider rounded-2xl text-xl"
        >
          {hasDynasty ? 'New Dynasty' : 'Start Dynasty'}
        </button>
        <button
          onClick={() => startNewLeague(1)}
          className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-wider"
        >
          Quick League (One Season)
        </button>
      </div>

      <CustomPlayersSection variant="landing" />

      {showDynastyModal && (
        <DynastyNameModal
          onClose={() => setShowDynastyModal(false)}
          onSubmit={(name, capMode) => {
            setShowDynastyModal(false)
            startDynasty(name, 1, capMode)
          }}
        />
      )}

      {confirmLeave && dynasty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-5 text-left">
            <h2 className="text-base font-black mb-2">
              LEAVE {dynasty.name.toUpperCase()}?
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete this dynasty — {dynasty.currentYear}{' '}
              year{dynasty.currentYear === 1 ? '' : 's'} of history and every
              snapshot. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmLeave(false)
                  leaveDynasty()
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Leave & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const game = useStore((s) => s.game)
  const initialize = useStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!game || game.screen === 'landing') {
    return <Landing />
  }

  switch (game.screen) {
    case 'nfl_team_selection':
      return <NflTeamSelectionScreen />
    case 'coach_creation':
      return <CoachCreationScreen />
    case 'setup':
      return <SetupScreen />
    case 'draft_order':
      return <DraftOrderScreen />
    case 'draft':
      return <DraftBoard />
    case 'grade':
      return <GradeReveal />
    case 'season':
      return <SeasonScreen />
    case 'bracket':
      return <BracketScreen />
    case 'trophy':
      return <TrophyScreen />
    case 'offseason_summary':
      return <OffseasonSummaryScreen />
    case 'keeper_selection':
      return <KeeperSelectionScreen />
    case 'dynasty_hub':
      return <DynastyHubScreen />
    default:
      return <Landing />
  }
}
