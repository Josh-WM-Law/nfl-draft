import { describe, it, expect } from 'vitest'
import {
  generateSnakeOrder,
  generatePicks,
  openSlotsByPosition,
  canTeamPick,
  fillSlot,
  pickForCPU,
} from './draft'
import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SIZE, ROSTER_SLOTS } from '../state/types'
import { makeRng } from './rng'

const makeTeam = (id: string, isComputer = true): TeamSeat => ({
  id,
  name: id,
  color: '#fff',
  isComputer,
  roster: Array(ROSTER_SIZE).fill(null),
})

const makePlayer = (
  id: string,
  position: Player['position'],
  value: number,
): Player => ({
  id,
  name: `${position}-${id}`,
  nflTeam: 'XXX',
  position,
  photoUrl: '',
  status: 'active',
  value,
  subscores: {},
  tier: value >= 90 ? 'S' : value >= 80 ? 'A' : value >= 70 ? 'B' : 'C',
  archetype: null,
  notes: '',
  needsRating: false,
})

describe('generateSnakeOrder', () => {
  it('snakes 8 teams over 3 rounds', () => {
    const teams = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
    const order = generateSnakeOrder(teams, 3)
    expect(order.length).toBe(24)
    expect(order.slice(0, 8)).toEqual(teams)
    expect(order.slice(8, 16)).toEqual([...teams].reverse())
    expect(order.slice(16, 24)).toEqual(teams)
  })
})

describe('generatePicks', () => {
  it('produces 136 picks for 8 teams x 17 rounds', () => {
    const teams = Array.from({ length: 8 }, (_, i) => `t${i + 1}`)
    const picks = generatePicks(teams, 17)
    expect(picks.length).toBe(136)
    expect(picks[0]).toMatchObject({ pickNumber: 1, round: 1, teamId: 't1', playerId: null })
    expect(picks[7]).toMatchObject({ pickNumber: 8, round: 1, teamId: 't8' })
    expect(picks[8]).toMatchObject({ pickNumber: 9, round: 2, teamId: 't8' })
    expect(picks[15]).toMatchObject({ pickNumber: 16, round: 2, teamId: 't1' })
    expect(picks[135]).toMatchObject({ pickNumber: 136, round: 17, teamId: 't8' })
  })
})

describe('openSlotsByPosition', () => {
  it('returns full roster counts for an empty team', () => {
    const team = makeTeam('t1')
    const open = openSlotsByPosition(team)
    expect(open.QB).toBe(1)
    expect(open.WR).toBe(2)
    expect(open.OL).toBe(5)
    expect(open.CB).toBe(2)
    expect(open.K).toBe(1)
  })

  it('decrements after fillSlot', () => {
    const team = makeTeam('t1')
    const next = fillSlot(team, 'p-qb1', 'QB')
    expect(openSlotsByPosition(next).QB).toBe(undefined)
  })
})

describe('canTeamPick', () => {
  it('rejects a position with no open slots', () => {
    let team = makeTeam('t1')
    team = fillSlot(team, 'p-qb1', 'QB')
    expect(canTeamPick(team, 'QB')).toBe(false)
    expect(canTeamPick(team, 'WR')).toBe(true)
  })
})

describe('fillSlot', () => {
  it('throws if no open slot exists', () => {
    let team = makeTeam('t1')
    team = fillSlot(team, 'p-qb1', 'QB')
    expect(() => fillSlot(team, 'p-qb2', 'QB')).toThrow()
  })

  it('keeps roster length stable', () => {
    let team = makeTeam('t1')
    team = fillSlot(team, 'a', 'QB')
    expect(team.roster.length).toBe(ROSTER_SLOTS.length)
  })
})

describe('pickForCPU', () => {
  const pool: Player[] = [
    makePlayer('qb1', 'QB', 99),
    makePlayer('qb2', 'QB', 95),
    makePlayer('wr1', 'WR', 92),
    makePlayer('wr2', 'WR', 90),
    makePlayer('k1', 'K', 60),
  ]

  it('picks from top-value eligible players', () => {
    const team = makeTeam('t1')
    const rng = makeRng(42)
    const picked = pickForCPU(team, pool, rng)
    // Top 5 in pool above by value: qb1, qb2, wr1, wr2, k1
    // All eligible for empty team. CPU picks from top 8 (=5 available).
    expect(['qb1', 'qb2', 'wr1', 'wr2', 'k1']).toContain(picked)
  })

  it('skips players whose position has no open slots', () => {
    let team = makeTeam('t1')
    team = fillSlot(team, 'qb1', 'QB')
    // QB slot full, so qb2 (which is by far the best remaining) should NOT be picked
    const rng = makeRng(42)
    const picked = pickForCPU(team, pool, rng)
    expect(picked).not.toBe('qb2')
  })

  it('throws if no eligible players exist', () => {
    const team = makeTeam('t1')
    const rng = makeRng(1)
    expect(() => pickForCPU(team, [], rng)).toThrow()
  })
})
