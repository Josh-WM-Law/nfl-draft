import type { Player, TeamSeat } from '../state/types'
import { ROSTER_SLOTS } from '../state/types'

// Per-team draft budget in $M for salary-cap dynasties. Tuned so an
// all-average roster (~82 OVR) is comfortably affordable, but stacking the
// top of every position forces cuts elsewhere. Cap year resets each draft.
export const CAP_BUDGET_M = 220

// Absolute minimum a player costs — the "veteran minimum" floor. Used to
// enforce that a team always has budget headroom to complete their roster
// with the cheapest available bodies.
export const MIN_PLAYER_COST_M = 0.5

// Maximum year-over-year growth for a kept player's salary. If you draft a
// rookie for $1.7M and they blossom into an $9M market player, keeping them
// locks in $1.7 × 1.15 ≈ $1.95M — the reward for developing your own guys.
export const KEEPER_MAX_GROWTH = 1.15

// OVR → cost in $M. Piecewise curve that rewards depth over top-heavy
// hoarding: doubling from 88 to 92 costs a lot more than doubling from
// 70 to 74. Yields a stars-and-scrubs equilibrium under the cap.
export const priceOf = (value: number): number => {
  let cost: number
  if (value <= 60) cost = MIN_PLAYER_COST_M
  else if (value <= 69) cost = 0.5 + (value - 60) * 0.15 // 0.5 → 1.85
  else if (value <= 79) cost = 2 + (value - 70) * 0.4 // 2 → 6
  else if (value <= 89) cost = 6.5 + (value - 80) * 1.4 // 6.5 → 20.5
  else if (value <= 95) cost = 22 + (value - 90) * 3 // 22 → 37
  else cost = 40 + (value - 95) * 3 // 40 → 52
  // Round to 1 decimal for cleaner UI.
  return Math.max(MIN_PLAYER_COST_M, Math.round(cost * 10) / 10)
}

// Salary paid for a player right now: whatever's locked in on the dynasty,
// falling back to open-market price. Non-cap games always resolve to
// priceOf, since salaries will be undefined.
export const salaryFor = (
  player: Player,
  salaries?: Record<string, number>,
): number => {
  const locked = salaries?.[player.id]
  if (locked != null) return Math.round(locked * 10) / 10
  return priceOf(player.value)
}

// New salary for a kept player entering next season. Capped at 15% growth
// over the prior salary, but never higher than the market price (so
// regression flows through cleanly).
export const nextKeeperSalary = (
  newValue: number,
  priorSalary: number | undefined,
): number => {
  const market = priceOf(newValue)
  if (priorSalary == null) return market
  const capped = priorSalary * KEEPER_MAX_GROWTH
  const raw = Math.min(market, capped)
  return Math.max(MIN_PLAYER_COST_M, Math.round(raw * 10) / 10)
}

export const formatMoney = (m: number): string => {
  if (m >= 100) return `$${m.toFixed(0)}M`
  return `$${m.toFixed(1)}M`
}

// Sum of salaries of all players currently on a team roster (both starters
// and bench count against the cap).
export const teamSpent = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  salaries?: Record<string, number>,
): number => {
  let sum = 0
  for (const pid of team.roster) {
    if (!pid) continue
    const p = playersById.get(pid)
    if (!p) continue
    sum += salaryFor(p, salaries)
  }
  return sum
}

export const teamRemainingBudget = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  budget: number,
  salaries?: Record<string, number>,
): number =>
  Math.round((budget - teamSpent(team, playersById, salaries)) * 10) / 10

export const emptyRosterSlots = (team: TeamSeat): number => {
  let n = 0
  for (let i = 0; i < ROSTER_SLOTS.length; i++) {
    if (team.roster[i] === null) n += 1
  }
  return n
}

// True if a team can afford to pick `player` this turn and still have enough
// left over to fill their remaining slots with veteran-minimum players.
// Uses the player's locked salary if one exists (keeper carrying over), or
// current market price for a fresh draftee.
export const canAffordPlayer = (
  team: TeamSeat,
  player: Player,
  playersById: Map<string, Player>,
  budget: number,
  salaries?: Record<string, number>,
): boolean => {
  const remaining = teamRemainingBudget(team, playersById, budget, salaries)
  const emptyAfterPick = emptyRosterSlots(team) - 1
  const reserveNeeded = Math.max(0, emptyAfterPick) * MIN_PLAYER_COST_M
  return salaryFor(player, salaries) <= remaining - reserveNeeded + 1e-6
}
