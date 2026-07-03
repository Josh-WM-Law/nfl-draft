import type { TeamSeat, Player, Coach } from '../state/types'
import { ROSTER_SLOTS, STARTER_ROSTER_SIZE } from '../state/types'
import { coachEffect } from './coachEffects'

const LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D']

// Grade reflects the starting lineup only — bench prospects don't help win
// today, so they shouldn't drag the grade up or down.
export const teamValueSum = (
  team: TeamSeat,
  playersById: Map<string, Player>,
): number => {
  let sum = 0
  team.roster.forEach((pid, i) => {
    if (!pid) return
    if (ROSTER_SLOTS[i] === 'BENCH') return
    const p = playersById.get(pid)
    sum += p?.value ?? 0
  })
  return sum
}

export const computeGrades = (
  teams: TeamSeat[],
  playersById: Map<string, Player>,
  coachByTeamId?: Map<string, Coach | null>,
): TeamSeat[] => {
  const sums = teams.map((team) => ({
    team,
    sum: teamValueSum(team, playersById),
  }))
  // Ranking uses raw talent (no coach bonus) so a coached team can't leapfrog
  // a better roster just from scouting. The bonus only shifts the numeric
  // score readout, not the letter tier.
  const sorted = sums.slice().sort((a, b) => b.sum - a.sum)
  const gradeByTeamId = new Map<string, { letter: string; score: number }>()
  sorted.forEach((entry, idx) => {
    const eff = coachEffect(coachByTeamId?.get(entry.team.id) ?? null)
    // Divide by starter count (not roster.length) so adding bench slots
    // doesn't dilute the numeric score.
    const baseScore = Math.round(entry.sum / STARTER_ROSTER_SIZE)
    gradeByTeamId.set(entry.team.id, {
      letter: LETTERS[idx] ?? 'D',
      score: baseScore + eff.gradeBonus,
    })
  })
  return teams.map((team) => ({
    ...team,
    grade: gradeByTeamId.get(team.id),
  }))
}
