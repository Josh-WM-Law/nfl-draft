import type { TeamSeat, Player, Coach } from '../state/types'
import { coachEffect } from './coachEffects'

const LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D']

export const teamValueSum = (
  team: TeamSeat,
  playersById: Map<string, Player>,
): number => {
  return team.roster.reduce<number>((acc, pid) => {
    if (!pid) return acc
    const p = playersById.get(pid)
    return acc + (p?.value ?? 0)
  }, 0)
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
    const baseScore = Math.round(
      entry.sum / Math.max(1, entry.team.roster.length),
    )
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
