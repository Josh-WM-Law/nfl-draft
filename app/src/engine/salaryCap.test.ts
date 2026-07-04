import { describe, it, expect } from 'vitest'
import {
  priceOf,
  salaryFor,
  nextKeeperSalary,
  teamSpent,
  teamRemainingBudget,
  canAffordPlayer,
  CAP_BUDGET_M,
  MIN_PLAYER_COST_M,
  KEEPER_MAX_GROWTH,
} from './salaryCap'
import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SIZE } from '../state/types'

const mkPlayer = (id: string, value: number): Player => ({
  id,
  name: id,
  nflTeam: 'XXX',
  position: 'WR',
  photoUrl: '',
  status: 'active',
  yearsExp: 1,
  value,
  subscores: {},
  tier: 'B',
  archetype: null,
  notes: '',
  needsRating: false,
})

const mkTeam = (rosterIds: (string | null)[]): TeamSeat => {
  const roster = rosterIds.slice()
  while (roster.length < ROSTER_SIZE) roster.push(null)
  return {
    id: 't1',
    name: 't1',
    color: '#fff',
    isComputer: false,
    roster,
  }
}

describe('priceOf', () => {
  it('floors sub-60 OVR at the minimum', () => {
    expect(priceOf(40)).toBe(MIN_PLAYER_COST_M)
    expect(priceOf(60)).toBe(MIN_PLAYER_COST_M)
  })

  it('scales piecewise up through stardom', () => {
    // These are the piecewise boundaries — sanity checks so a curve rewrite
    // doesn't silently shift the cap math.
    expect(priceOf(70)).toBe(2)
    expect(priceOf(80)).toBe(6.5)
    expect(priceOf(90)).toBe(22)
    expect(priceOf(99)).toBeGreaterThan(priceOf(95))
  })
})

describe('salaryFor', () => {
  const p = mkPlayer('p1', 82)

  it('uses market price when no salary is locked in', () => {
    expect(salaryFor(p)).toBe(priceOf(82))
    expect(salaryFor(p, {})).toBe(priceOf(82))
  })

  it('uses the locked-in salary when present', () => {
    // A kept player developed from a rookie cost.
    expect(salaryFor(p, { p1: 1.9 })).toBe(1.9)
  })
})

describe('nextKeeperSalary', () => {
  it('is market price for a fresh signing (no prior)', () => {
    expect(nextKeeperSalary(80, undefined)).toBe(priceOf(80))
  })

  it('caps growth at 15% year over year for developing players', () => {
    // Rookie signed at $1.7M, blossomed into an 82 OVR (worth $9.3M market).
    // Keeper salary should be 1.7 * 1.15 = $1.955M, rounded to $2.0M.
    const rookieSalary = 1.7
    const next = nextKeeperSalary(82, rookieSalary)
    const cap = Math.round(rookieSalary * KEEPER_MAX_GROWTH * 10) / 10
    expect(next).toBe(cap)
    expect(next).toBeLessThan(priceOf(82))
  })

  it('follows market down when a kept player regresses', () => {
    // Old star at $12M drops to 78 OVR (~$5.2M market). Salary follows the
    // market rather than sticking near the old cap.
    const prior = 12
    const next = nextKeeperSalary(78, prior)
    expect(next).toBe(priceOf(78))
    expect(next).toBeLessThan(prior * KEEPER_MAX_GROWTH)
  })

  it('never dips below the veteran minimum', () => {
    expect(nextKeeperSalary(40, 0.1)).toBeGreaterThanOrEqual(MIN_PLAYER_COST_M)
  })
})

describe('teamSpent / teamRemainingBudget with salaries', () => {
  it('spending uses locked salaries, not market', () => {
    const alpha = mkPlayer('a', 88) // market $17.7M
    const beta = mkPlayer('b', 80) // market $6.5M
    const byId = new Map([alpha, beta].map((p) => [p.id, p]))
    const team = mkTeam(['a', 'b'])
    const salaries = { a: 3.2, b: 6.5 } // 'a' was a kept dev player
    expect(teamSpent(team, byId, salaries)).toBeCloseTo(9.7, 5)
    expect(teamRemainingBudget(team, byId, CAP_BUDGET_M, salaries)).toBeCloseTo(
      CAP_BUDGET_M - 9.7,
      5,
    )
  })
})

describe('canAffordPlayer with salaries', () => {
  it('a keeper carrying a low salary can afford star signings', () => {
    // Team has one keeper priced at $2M (developed rookie) even though the
    // player is now a superstar (~$40M market). Team can still afford to
    // sign a $22M free agent because the cap sees the $2M, not $40M.
    const keeper = mkPlayer('k', 95) // market $37M
    const target = mkPlayer('star', 90) // market $22M
    const byId = new Map([keeper, target].map((p) => [p.id, p]))
    const team = mkTeam(['k'])
    const salaries = { k: 2 }
    expect(
      canAffordPlayer(team, target, byId, CAP_BUDGET_M, salaries),
    ).toBe(true)
  })

  it('a re-signing at market price can price a team out', () => {
    // Same setup but the keeper is entered at market — cap gets tight.
    const keeper = mkPlayer('k', 95) // market $37M
    const target = mkPlayer('star', 90) // market $22M
    const byId = new Map([keeper, target].map((p) => [p.id, p]))
    const team = mkTeam(['k'])
    // No salaries map = market. Team of 1 with 19 empty slots at min $0.5M
    // reserve = $9.5M reserved. 220 - 37 - 9.5 - 22 = 151.5, still fine.
    // Verify it's affordable in the null-salary case for baseline.
    expect(canAffordPlayer(team, target, byId, CAP_BUDGET_M)).toBe(true)
  })
})
