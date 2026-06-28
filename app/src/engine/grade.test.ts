import { describe, it, expect } from 'vitest'
import { computeGrades, teamValueSum } from './grade'
import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SIZE } from '../state/types'

const mkTeam = (id: string, playerIds: (string | null)[]): TeamSeat => ({
  id,
  name: id,
  color: '#fff',
  isComputer: false,
  roster: [
    ...playerIds,
    ...Array(ROSTER_SIZE - playerIds.length).fill(null),
  ],
})

const mkPlayer = (id: string, value: number): Player => ({
  id,
  name: id,
  nflTeam: 'XXX',
  position: 'QB',
  photoUrl: '',
  status: 'active',
  value,
  subscores: {},
  tier: 'B',
  archetype: null,
  notes: '',
  needsRating: false,
})

describe('teamValueSum', () => {
  it('sums values of filled roster slots, ignoring nulls', () => {
    const players = new Map<string, Player>([
      ['a', mkPlayer('a', 90)],
      ['b', mkPlayer('b', 80)],
    ])
    const team = mkTeam('t1', ['a', 'b'])
    expect(teamValueSum(team, players)).toBe(170)
  })
})

describe('computeGrades', () => {
  it('assigns A to the highest sum and D to the lowest', () => {
    const players = new Map<string, Player>()
    for (let i = 0; i < 8; i++) {
      players.set(`p${i}`, mkPlayer(`p${i}`, 50 + i * 5))
    }
    const teams: TeamSeat[] = Array.from({ length: 8 }, (_, i) =>
      mkTeam(`t${i}`, [`p${i}`]),
    )
    const graded = computeGrades(teams, players)
    const t7 = graded.find((t) => t.id === 't7')!
    const t0 = graded.find((t) => t.id === 't0')!
    expect(t7.grade?.letter).toBe('A')
    expect(t0.grade?.letter).toBe('D')
  })

  it('assigns distinct letters across 8 teams', () => {
    const players = new Map<string, Player>()
    for (let i = 0; i < 8; i++) {
      players.set(`p${i}`, mkPlayer(`p${i}`, 50 + i))
    }
    const teams: TeamSeat[] = Array.from({ length: 8 }, (_, i) =>
      mkTeam(`t${i}`, [`p${i}`]),
    )
    const graded = computeGrades(teams, players)
    const letters = graded
      .map((t) => t.grade?.letter)
      .filter((l): l is string => !!l)
    expect(new Set(letters).size).toBe(8)
  })
})
