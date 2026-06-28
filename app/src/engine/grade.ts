import type { TeamSeat, Player } from '../state/types'

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
): TeamSeat[] => {
  const sums = teams.map((team) => ({
    team,
    sum: teamValueSum(team, playersById),
  }))
  const sorted = sums.slice().sort((a, b) => b.sum - a.sum)
  const gradeByTeamId = new Map<string, { letter: string; score: number }>()
  sorted.forEach((entry, idx) => {
    gradeByTeamId.set(entry.team.id, {
      letter: LETTERS[idx] ?? 'D',
      score: Math.round(entry.sum / Math.max(1, entry.team.roster.length)),
    })
  })
  return teams.map((team) => ({
    ...team,
    grade: gradeByTeamId.get(team.id),
  }))
}
