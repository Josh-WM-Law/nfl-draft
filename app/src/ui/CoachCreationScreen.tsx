import { useState } from 'react'
import { useStore } from '../state/store'
import {
  type CoachTrait,
  COACH_TRAIT_LABELS,
  COACH_TRAIT_DESCRIPTIONS,
} from '../state/types'

const ALL_TRAITS: CoachTrait[] = [
  'offensive_guru',
  'defensive_mastermind',
  'talent_evaluator',
  'player_developer',
  'motivator',
  'special_teams_ace',
]

export function CoachCreationScreen() {
  const dynasty = useStore((s) => s.dynasty)
  const setCoach = useStore((s) => s.setCoach)
  const exitToLanding = useStore((s) => s.exitToLanding)
  const [name, setName] = useState('')
  const [traits, setTraits] = useState<CoachTrait[]>([])

  const toggleTrait = (t: CoachTrait) => {
    if (traits.includes(t)) {
      setTraits(traits.filter((x) => x !== t))
      return
    }
    if (traits.length >= 2) return
    setTraits([...traits, t])
  }

  const canSubmit = name.trim().length > 0 && traits.length === 2
  const submit = () => {
    if (!canSubmit) return
    setCoach(name.trim(), traits)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-widest text-amber-400 uppercase">
            {dynasty?.name ?? 'New Dynasty'} · Year 1
          </div>
          <h1 className="text-2xl font-black mt-1">HIRE YOUR HEAD COACH</h1>
        </div>
        <button
          onClick={exitToLanding}
          className="text-xs text-slate-400 underline"
        >
          Cancel
        </button>
      </div>

      <section className="mb-6">
        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
          Coach name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Coach Name"
          className="w-full bg-slate-800 px-3 py-2 rounded text-white font-bold"
        />
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Pick 2 strengths
          </div>
          <div className="text-xs text-slate-500">{traits.length} / 2</div>
        </div>
        <div className="grid gap-2">
          {ALL_TRAITS.map((t) => {
            const selected = traits.includes(t)
            const atMax = traits.length >= 2 && !selected
            return (
              <button
                key={t}
                onClick={() => toggleTrait(t)}
                disabled={atMax}
                className={`text-left rounded-xl p-3 transition ${
                  selected
                    ? 'bg-sky-500 text-black'
                    : atMax
                      ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <div className="font-bold">{COACH_TRAIT_LABELS[t]}</div>
                <div
                  className={`text-xs ${
                    selected ? 'text-black/70' : 'text-slate-400'
                  }`}
                >
                  {COACH_TRAIT_DESCRIPTIONS[t]}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl text-lg font-bold ${
          canSubmit
            ? 'bg-sky-500 hover:bg-sky-400 text-black'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        Hire Coach →
      </button>
    </div>
  )
}
