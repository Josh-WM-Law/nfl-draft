import type { Coach } from '../state/types'

export type CoachEffect = {
  offMul: number
  defMul: number
  // Flat points added to the coached team's final score (Motivator + Special
  // Teams Ace both nudge the raw output).
  scoreBonus: number
  // Bonus added to the coached team's draft grade score. Talent Evaluator.
  gradeBonus: number
  // Reserved for Phase 3 — larger young-player development gains each offseason.
  developerBoost: boolean
}

const EMPTY: CoachEffect = {
  offMul: 1,
  defMul: 1,
  scoreBonus: 0,
  gradeBonus: 0,
  developerBoost: false,
}

export const coachEffect = (coach: Coach | null | undefined): CoachEffect => {
  if (!coach) return { ...EMPTY }
  const eff: CoachEffect = { ...EMPTY }
  for (const t of coach.traits) {
    switch (t) {
      case 'offensive_guru':
        eff.offMul += 0.05
        break
      case 'defensive_mastermind':
        eff.defMul += 0.05
        break
      case 'motivator':
        // Small mean nudge; represents better late-game execution.
        eff.scoreBonus += 1
        break
      case 'special_teams_ace':
        // Field-position + FG kick game.
        eff.scoreBonus += 1
        break
      case 'talent_evaluator':
        eff.gradeBonus += 3
        break
      case 'player_developer':
        eff.developerBoost = true
        break
    }
  }
  return eff
}

export const noCoachEffect = (): CoachEffect => ({ ...EMPTY })
