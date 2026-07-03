import { describe, it, expect } from 'vitest'
import {
  generateSnakeOrder,
  generatePicks,
  openSlotsByPosition,
  canTeamPick,
  fillSlot,
  pickForCPU,
  shuffleArray,
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
  yearsExp: 5,
  value,
  subscores: {},
  tier: value >= 90 ? 'S' : value >= 80 ? 'A' : value >= 70 ? 'B' : 'C',
  archetype: null,
  notes: '',
  needsRating: false,
})

describe('shuffleArray', () => {
  it('preserves all elements', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const shuffled = shuffleArray(input, makeRng(42))
    expect(shuffled.length).toBe(input.length)
    expect(shuffled.slice().sort()).toEqual(input.slice().sort())
  })

  it('is deterministic for the same seed', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(shuffleArray(input, makeRng(42))).toEqual(
      shuffleArray(input, makeRng(42)),
    )
  })

  it('produces different orderings for different seeds (usually)', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const a = shuffleArray(input, makeRng(1))
    const b = shuffleArray(input, makeRng(2))
    expect(a).not.toEqual(b)
  })

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c', 'd']
    const original = input.slice()
    shuffleArray(input, makeRng(99))
    expect(input).toEqual(original)
  })
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
  it('produces picks for an 8-team x ROSTER_SIZE draft', () => {
    const teams = Array.from({ length: 8 }, (_, i) => `t${i + 1}`)
    const picks = generatePicks(teams, ROSTER_SIZE)
    expect(picks.length).toBe(8 * ROSTER_SIZE)
    expect(picks[0]).toMatchObject({ pickNumber: 1, round: 1, teamId: 't1', playerId: null })
    expect(picks[7]).toMatchObject({ pickNumber: 8, round: 1, teamId: 't8' })
    expect(picks[8]).toMatchObject({ pickNumber: 9, round: 2, teamId: 't8' })
    expect(picks[15]).toMatchObject({ pickNumber: 16, round: 2, teamId: 't1' })
    const last = picks.length - 1
    expect(picks[last]).toMatchObject({ pickNumber: picks.length, round: ROSTER_SIZE })
  })
})

describe('openSlotsByPosition', () => {
  it('returns full roster counts for an empty team', () => {
    const team = makeTeam('t1')
    const open = openSlotsByPosition(team)
    expect(open.QB).toBe(1)
    expect(open.WR).toBe(2)
    expect(open.OT).toBe(2)
    expect(open.OG).toBe(2)
    expect(open.C).toBe(1)
    expect(open.LB).toBe(2)
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
  it('allows a filled position through open bench slots', () => {
    // Bench is a fallback destination, so a full QB slot doesn't block
    // picking another QB (they'd land on the bench).
    let team = makeTeam('t1')
    team = fillSlot(team, 'p-qb1', 'QB')
    expect(canTeamPick(team, 'QB')).toBe(true)
    expect(canTeamPick(team, 'WR')).toBe(true)
  })

  it('rejects only when both starter AND bench slots are exhausted', () => {
    let team = makeTeam('t1')
    // Fill every starter slot with a QB where possible; also fill bench.
    ROSTER_SLOTS.forEach((slot, i) => {
      team = {
        ...team,
        roster: team.roster.map((p, j) => (j === i ? `stub-${i}` : p)),
      }
      void slot
    })
    expect(canTeamPick(team, 'QB')).toBe(false)
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
    const choice = pickForCPU(team, pool, rng)
    // Top 5 in pool above by value: qb1, qb2, wr1, wr2, k1
    // All eligible for empty team. CPU picks from top 8 (=5 available).
    expect(['qb1', 'qb2', 'wr1', 'wr2', 'k1']).toContain(choice.playerId)
    expect(choice.target).toBe('starter')
  })

  it('routes to a starter slot when one is open for the player', () => {
    let team = makeTeam('t1')
    team = fillSlot(team, 'qb1', 'QB')
    // QB slot full, so qb2 should NOT be picked as a starter (there's still
    // a WR slot open, so CPU prefers WRs which have an open starter slot).
    const rng = makeRng(42)
    const choice = pickForCPU(team, pool, rng)
    expect(choice.playerId).not.toBe('qb2')
    expect(choice.target).toBe('starter')
  })

  it('throws if no eligible players exist', () => {
    const team = makeTeam('t1')
    const rng = makeRng(1)
    expect(() => pickForCPU(team, [], rng)).toThrow()
  })
})
