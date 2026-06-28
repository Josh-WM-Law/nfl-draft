import { useEffect } from 'react'
import { useStore } from './state/store'
import { DraftBoard } from './ui/DraftBoard'
import { GradeReveal } from './ui/GradeReveal'
import { SeasonScreen } from './ui/SeasonScreen'
import { BracketScreen } from './ui/BracketScreen'
import { TrophyScreen } from './ui/TrophyScreen'
import { SetupScreen } from './ui/SetupScreen'

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm tracking-[0.4em] uppercase text-sky-400 mb-4">
        A House League
      </p>
      <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-none mb-6">
        ON THE CLOCK
      </h1>
      <p className="text-xl md:text-2xl text-slate-300 max-w-xl mb-12">
        Draft a team. Get graded. Crown a champion.
      </p>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-black font-black uppercase tracking-wider rounded-2xl text-xl"
      >
        Start Draft
      </button>
    </div>
  )
}

export default function App() {
  const game = useStore((s) => s.game)
  const initialize = useStore((s) => s.initialize)
  const startNewLeague = useStore((s) => s.startNewLeague)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!game || game.screen === 'landing') {
    return <Landing onStart={() => startNewLeague(1)} />
  }

  switch (game.screen) {
    case 'setup':
      return <SetupScreen />
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
    default:
      return <Landing onStart={() => startNewLeague(1)} />
  }
}
