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
import { OffseasonSummaryScreen } from './ui/OffseasonSummaryScreen'
import { KeeperSelectionScreen } from './ui/KeeperSelectionScreen'
import { DynastyHubScreen } from './ui/DynastyHubScreen'
import { CustomPlayersSection } from './ui/CustomPlayersSection'

function DynastyNameModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState('')
  const submit = () => {
    const trimmed = name.trim() || 'My Dynasty'
    onSubmit(trimmed)
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
  const dynasty = useStore((s) => s.dynasty)
  const [showDynastyModal, setShowDynastyModal] = useState(false)

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
          onSubmit={(name) => {
            setShowDynastyModal(false)
            startDynasty(name, 1)
          }}
        />
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
