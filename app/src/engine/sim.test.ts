import { describe, it, expect } from 'vitest'
import { simGame, simSeason } from './sim'
import { roundRobinSchedule } from './schedule'
import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SLOTS } from '../state/types'

const mkPlayer = (
  id: string,
  position: Player['position'],
  value: number,
  subscores: Record<string, number> = {},
): Player => ({
  id,
  name: `${position}-${id}`,
  nflTeam: 'XXX',
  position,
  photoUrl: '',
  status: 'active',
  yearsExp: 5,
  value,
  subscores,
  tier: 'B',
  archetype: null,
  notes: '',
  needsRating: false,
})

const buildTeam = (
  id: string,
  playerValue: number,
): { team: TeamSeat; players: Player[] } => {
  const players: Player[] = []
  const roster: (string | null)[] = []
  ROSTER_SLOTS.forEach((slot, i) => {
    const pid = `${id}-p${i}`
    players.push(mkPlayer(pid, slot, playerValue))
    roster.push(pid)
  })
  return {
    team: {
      id,
      name: id,
      color: '#fff',
      isComputer: true,
      roster,
    },
    players,
  }
}

describe('simGame', () => {
  it('is deterministic for the same seed', () => {
    const a = buildTeam('a', 85)
    const b = buildTeam('b', 75)
    const players = new Map<string, Player>()
    for (const p of [...a.players, ...b.players]) players.set(p.id, p)
    const r1 = simGame(a.team, b.team, players, 42)
    const r2 = simGame(a.team, b.team, players, 42)
    expect(r1).toEqual(r2)
  })

  it('produces different results for different seeds', () => {
    const a = buildTeam('a', 85)
    const b = buildTeam('b', 75)
    const players = new Map<string, Player>()
    for (const p of [...a.players, ...b.players]) players.set(p.id, p)
    const r1 = simGame(a.team, b.team, players, 42)
    const r2 = simGame(a.team, b.team, players, 43)
    expect(r1.homeScore + r1.awayScore).not.toBe(r2.homeScore + r2.awayScore)
  })

  it('stronger team wins more often than not', () => {
    const a = buildTeam('a', 95)
    const b = buildTeam('b', 60)
    const players = new Map<string, Player>()
    for (const p of [...a.players, ...b.players]) players.set(p.id, p)
    let aWins = 0
    for (let s = 0; s < 100; s++) {
      const r = simGame(a.team, b.team, players, s)
      if (r.homeScore > r.awayScore) aWins++
    }
    expect(aWins).toBeGreaterThan(70)
  })

  it('home-field bonus helps the first-arg team when not neutral site', () => {
    const a = buildTeam('a', 80)
    const b = buildTeam('b', 80)
    const players = new Map<string, Player>()
    for (const p of [...a.players, ...b.players]) players.set(p.id, p)
    const withHome = simGame(a.team, b.team, players, 42, 1, false)
    const neutral = simGame(a.team, b.team, players, 42, 1, true)
    expect(withHome.homeScore - neutral.homeScore).toBe(3)
    expect(withHome.awayScore).toBe(neutral.awayScore)
  })

  it('underdog can win when teams are close (neutral site)', () => {
    const a = buildTeam('a', 80)
    const b = buildTeam('b', 78)
    const players = new Map<string, Player>()
    for (const p of [...a.players, ...b.players]) players.set(p.id, p)
    let aWins = 0
    let bWins = 0
    // Neutral site removes home-field; we're testing variance from strength
    // diff + per-game flux + noise, not the home bonus.
    for (let s = 0; s < 100; s++) {
      const r = simGame(a.team, b.team, players, s, 1, true)
      if (r.homeScore > r.awayScore) aWins++
      else if (r.awayScore > r.homeScore) bWins++
    }
    expect(aWins).toBeGreaterThan(50)
    expect(bWins).toBeGreaterThanOrEqual(10)
  })
})

describe('simSeason', () => {
  it('crowns a champion', () => {
    const players = new Map<string, Player>()
    const teams: TeamSeat[] = []
    for (let i = 0; i < 8; i++) {
      const built = buildTeam(`t${i}`, 60 + i * 5)
      for (const p of built.players) players.set(p.id, p)
      teams.push(built.team)
    }
    const schedule = roundRobinSchedule(teams.map((t) => t.id))
    const result = simSeason(teams, players, 12345, schedule)
    expect(result.champion).not.toBeNull()
    expect(result.results.length).toBe(28)
    expect(result.standings.length).toBe(8)
    expect(result.bracket.length).toBe(3)
  })

  it('is deterministic for the same seed', () => {
    const players = new Map<string, Player>()
    const teams: TeamSeat[] = []
    for (let i = 0; i < 8; i++) {
      const built = buildTeam(`t${i}`, 60 + i * 5)
      for (const p of built.players) players.set(p.id, p)
      teams.push(built.team)
    }
    const schedule = roundRobinSchedule(teams.map((t) => t.id))
    const r1 = simSeason(teams, players, 12345, schedule)
    const r2 = simSeason(teams, players, 12345, schedule)
    expect(r1.champion).toBe(r2.champion)
    expect(r1.results).toEqual(r2.results)
  })
})
