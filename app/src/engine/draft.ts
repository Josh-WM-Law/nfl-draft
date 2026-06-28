import {
  type TeamSeat,
  type Position,
  type Player,
  type DraftPick,
  ROSTER_SLOTS,
} from '../state/types'

export const generateSnakeOrder = (
  teamIds: string[],
  rounds: number,
): string[] => {
  const result: string[] = []
  for (let r = 0; r < rounds; r++) {
    const order = r % 2 === 0 ? teamIds : [...teamIds].reverse()
    result.push(...order)
  }
  return result
}

export const generatePicks = (
  teamIds: string[],
  rounds: number,
): DraftPick[] => {
  const order = generateSnakeOrder(teamIds, rounds)
  return order.map((teamId, idx) => ({
    pickNumber: idx + 1,
    round: Math.floor(idx / teamIds.length) + 1,
    teamId,
    playerId: null,
  }))
}

export const openSlotsByPosition = (
  team: TeamSeat,
): Partial<Record<Position, number>> => {
  const counts: Partial<Record<Position, number>> = {}
  ROSTER_SLOTS.forEach((slot, i) => {
    if (team.roster[i] === null) {
      counts[slot] = (counts[slot] ?? 0) + 1
    }
  })
  return counts
}

export const canTeamPick = (team: TeamSeat, position: Position): boolean => {
  return (openSlotsByPosition(team)[position] ?? 0) > 0
}

export const fillSlot = (
  team: TeamSeat,
  playerId: string,
  position: Position,
): TeamSeat => {
  const idx = ROSTER_SLOTS.findIndex(
    (slot, i) => slot === position && team.roster[i] === null,
  )
  if (idx === -1) {
    throw new Error(`No open ${position} slot on team ${team.id}`)
  }
  const newRoster = team.roster.slice()
  newRoster[idx] = playerId
  return { ...team, roster: newRoster }
}

export const pickForCPU = (
  team: TeamSeat,
  pool: Player[],
  rng: () => number,
): string => {
  const open = openSlotsByPosition(team)
  const eligible = pool.filter((p) => (open[p.position] ?? 0) > 0)
  if (eligible.length === 0) {
    throw new Error(`No eligible players in pool for CPU team ${team.id}`)
  }
  // Light position-need bonus: gently nudge toward needs, never overrides
  // serious value gaps. Empty team: QB +0.5, WR +1.0, OL +2.5 — small vs.
  // value range of ~50..95.
  const scored = eligible.map((p) => ({
    p,
    score: p.value + (open[p.position] ?? 0) * 0.5,
  }))
  scored.sort((a, b) => b.score - a.score)
  const topN = Math.min(8, scored.length)
  const idx = Math.floor(rng() * topN)
  return scored[idx].p.id
}
