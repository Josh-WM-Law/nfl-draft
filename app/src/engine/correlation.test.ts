import { describe, it, expect } from 'vitest'
import { loadAllPlayers } from '../data/loadPlayers'
import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SIZE } from '../state/types'
import { generatePicks, pickForCPU, fillSlot } from './draft'
import { computeGrades } from './grade'
import { simSeason } from './sim'
import { roundRobinSchedule } from './schedule'
import { makeRng } from './rng'

const draftLeague = (
  players: Player[],
  playersById: Map<string, Player>,
  seed: number,
): TeamSeat[] => {
  let teams: TeamSeat[] = Array.from({ length: 8 }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    color: '#fff',
    isComputer: true,
    roster: Array(ROSTER_SIZE).fill(null),
  }))
  const teamIds = teams.map((t) => t.id)
  const picks = generatePicks(teamIds, ROSTER_SIZE)
  const rng = makeRng(seed)
  const used = new Set<string>()
  for (const pick of picks) {
    const teamIdx = teams.findIndex((t) => t.id === pick.teamId)
    const team = teams[teamIdx]
    const available = players.filter((p) => !used.has(p.id))
    const pickedId = pickForCPU(team, available, rng)
    const player = playersById.get(pickedId)!
    const newTeams = teams.slice()
    newTeams[teamIdx] = fillSlot(team, pickedId, player.position)
    teams = newTeams
    used.add(pickedId)
  }
  return teams
}

const spearman = (a: number[], b: number[]): number => {
  const rankOf = (arr: number[]): number[] => {
    const idx = arr.map((v, i) => ({ v, i }))
    idx.sort((x, y) => x.v - y.v)
    const ranks = new Array<number>(arr.length)
    idx.forEach((entry, rank) => {
      ranks[entry.i] = rank
    })
    return ranks
  }
  const ra = rankOf(a)
  const rb = rankOf(b)
  const n = a.length
  const meanA = ra.reduce((s, v) => s + v, 0) / n
  const meanB = rb.reduce((s, v) => s + v, 0) / n
  let num = 0,
    denA = 0,
    denB = 0
  for (let i = 0; i < n; i++) {
    const da = ra[i] - meanA
    const db = rb[i] - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  if (denA === 0 || denB === 0) return 0
  return num / Math.sqrt(denA * denB)
}

describe('grade ↔ season correlation harness', () => {
  it('average Spearman correlation lands in [0.20, 0.75] across many leagues', () => {
    // Lower bound 0.20 reflects deliberate variance: home-field, per-game
    // player flux, and amplified matchup leverage all weaken the grade signal
    // on purpose. We still want some correlation (drafts should matter), but
    // upsets are the design intent.
    const players = loadAllPlayers()
    const playersById = new Map(players.map((p) => [p.id, p]))
    const N = 50
    const correlations: number[] = []
    for (let leagueIdx = 0; leagueIdx < N; leagueIdx++) {
      const leagueSeed = leagueIdx * 1009 + 1
      const teams = draftLeague(players, playersById, leagueSeed)
      const graded = computeGrades(teams, playersById)
      const gradeScores = graded.map((t) => t.grade?.score ?? 0)
      const schedule = roundRobinSchedule(teams.map((t) => t.id))
      const season = simSeason(teams, playersById, leagueSeed + 5000, schedule)
      const pdByTeam = new Map<string, number>()
      for (const s of season.standings) pdByTeam.set(s.teamId, s.pointDiff)
      const seasonScores = teams.map((t) => pdByTeam.get(t.id) ?? 0)
      correlations.push(spearman(gradeScores, seasonScores))
    }
    const avg =
      correlations.reduce((s, v) => s + v, 0) / correlations.length
    // eslint-disable-next-line no-console
    console.log(`Avg grade↔season Spearman across ${N} leagues: ${avg.toFixed(3)}`)
    expect(avg).toBeGreaterThanOrEqual(0.2)
    expect(avg).toBeLessThanOrEqual(0.75)
  }, 60000)
})
