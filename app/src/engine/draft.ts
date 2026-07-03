import {
  type TeamSeat,
  type Position,
  type Player,
  type DraftPick,
  ROSTER_SLOTS,
} from '../state/types'

export const shuffleArray = <T>(arr: T[], rng: () => number): T[] => {
  const result = arr.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}

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

// Count open starter slots per position. Bench slots are tracked separately
// via openBenchSlots(); they're position-agnostic so folding them into this
// map would be misleading.
export const openSlotsByPosition = (
  team: TeamSeat,
): Partial<Record<Position, number>> => {
  const counts: Partial<Record<Position, number>> = {}
  ROSTER_SLOTS.forEach((slot, i) => {
    if (slot === 'BENCH') return
    if (team.roster[i] === null) {
      counts[slot] = (counts[slot] ?? 0) + 1
    }
  })
  return counts
}

export const openBenchSlots = (team: TeamSeat): number => {
  let n = 0
  ROSTER_SLOTS.forEach((slot, i) => {
    if (slot === 'BENCH' && team.roster[i] === null) n += 1
  })
  return n
}

// True if the player can land somewhere on this team — either a matching
// starter slot or an open bench slot.
export const canTeamPick = (team: TeamSeat, position: Position): boolean => {
  const starterOpen = (openSlotsByPosition(team)[position] ?? 0) > 0
  return starterOpen || openBenchSlots(team) > 0
}

export const canTeamStart = (team: TeamSeat, position: Position): boolean => {
  return (openSlotsByPosition(team)[position] ?? 0) > 0
}

export const canTeamBench = (team: TeamSeat): boolean => {
  return openBenchSlots(team) > 0
}

// Place a player into their first open starter slot for their position.
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

// Place a player into the first open bench slot regardless of position.
export const fillBench = (team: TeamSeat, playerId: string): TeamSeat => {
  const idx = ROSTER_SLOTS.findIndex(
    (slot, i) => slot === 'BENCH' && team.roster[i] === null,
  )
  if (idx === -1) {
    throw new Error(`No open bench slot on team ${team.id}`)
  }
  const newRoster = team.roster.slice()
  newRoster[idx] = playerId
  return { ...team, roster: newRoster }
}

export type CpuPickChoice = {
  playerId: string
  target: 'starter' | 'bench'
}

export const pickForCPU = (
  team: TeamSeat,
  pool: Player[],
  rng: () => number,
): CpuPickChoice => {
  const open = openSlotsByPosition(team)
  const benchOpen = openBenchSlots(team)
  const anyStarterOpen = Object.values(open).some((n) => (n ?? 0) > 0)

  // Prefer to fill starter slots first — bench is for later-round stash picks.
  if (anyStarterOpen) {
    const eligible = pool.filter((p) => (open[p.position] ?? 0) > 0)
    if (eligible.length > 0) {
      const scored = eligible.map((p) => ({
        p,
        score: p.value + (open[p.position] ?? 0) * 0.5,
      }))
      scored.sort((a, b) => b.score - a.score)
      const topN = Math.min(8, scored.length)
      const idx = Math.floor(rng() * topN)
      return { playerId: scored[idx].p.id, target: 'starter' }
    }
  }
  if (benchOpen > 0 && pool.length > 0) {
    // For bench picks, take best-available; light preference for younger
    // players (rookies) so bench actually stashes prospects.
    const scored = pool.map((p) => {
      const age = p.age ?? p.yearsExp + 22
      const youthBonus = age <= 23 ? 3 : age <= 25 ? 1 : 0
      return { p, score: p.value + youthBonus }
    })
    scored.sort((a, b) => b.score - a.score)
    const topN = Math.min(6, scored.length)
    const idx = Math.floor(rng() * topN)
    return { playerId: scored[idx].p.id, target: 'bench' }
  }
  throw new Error(`No eligible players in pool for CPU team ${team.id}`)
}
