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

export const formatMoney = (m: number): string => {
  if (m >= 100) return `$${m.toFixed(0)}M`
  return `$${m.toFixed(1)}M`
}

// Sum of prices of all players currently on a team roster (both starters
// and bench count against the cap).
export const teamSpent = (
  team: TeamSeat,
  playersById: Map<string, Player>,
): number => {
  let sum = 0
  for (const pid of team.roster) {
    if (!pid) continue
    const p = playersById.get(pid)
    if (!p) continue
    sum += priceOf(p.value)
  }
  return sum
}

export const teamRemainingBudget = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  budget: number,
): number => Math.round((budget - teamSpent(team, playersById)) * 10) / 10

export const emptyRosterSlots = (team: TeamSeat): number => {
  let n = 0
  for (let i = 0; i < ROSTER_SLOTS.length; i++) {
    if (team.roster[i] === null) n += 1
  }
  return n
}

// True if a team can afford to pick `player` this turn and still have enough
// left over to fill their remaining slots with veteran-minimum players.
export const canAffordPlayer = (
  team: TeamSeat,
  player: Player,
  playersById: Map<string, Player>,
  budget: number,
): boolean => {
  const remaining = teamRemainingBudget(team, playersById, budget)
  const emptyAfterPick = emptyRosterSlots(team) - 1
  const reserveNeeded = Math.max(0, emptyAfterPick) * MIN_PLAYER_COST_M
  return priceOf(player.value) <= remaining - reserveNeeded + 1e-6
}
