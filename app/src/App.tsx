import { useEffect } from 'react'
import { useStore } from './state/store'
import { DraftBoard } from './ui/DraftBoard'
import { GradeReveal } from './ui/GradeReveal'

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

function ComingSoon({ screen }: { screen: string }) {
  const startNewLeague = useStore((s) => s.startNewLeague)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm tracking-[0.4em] uppercase text-amber-400 mb-4">
        Coming Soon
      </p>
      <h1 className="text-5xl font-black mb-6 uppercase">{screen}</h1>
      <p className="text-slate-400 mb-12">Ships in a later milestone.</p>
      <button
        onClick={() => startNewLeague(1)}
        className="px-6 py-3 bg-slate-700 text-white font-bold rounded-xl"
      >
        New League
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
    case 'draft':
      return <DraftBoard />
    case 'grade':
      return <GradeReveal />
    case 'season':
    case 'bracket':
    case 'trophy':
      return <ComingSoon screen={game.screen} />
    default:
      return <Landing onStart={() => startNewLeague(1)} />
  }
}
