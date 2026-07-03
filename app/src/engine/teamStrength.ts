import type { TeamSeat, Player, Position } from '../state/types'
import { ROSTER_SLOTS } from '../state/types'

export const POSITION_WEIGHTS: Record<Position, number> = {
  QB: 2.5,
  RB: 1.0,
  WR: 1.2,
  TE: 0.8,
  OT: 1.2,
  OG: 0.9,
  C: 0.9,
  DE: 1.2,
  DT: 1.0,
  LB: 0.9,
  CB: 1.0,
  S: 0.9,
  K: 0.3,
}

const OFFENSE = new Set<Position>(['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'])
const DEFENSE = new Set<Position>(['DE', 'DT', 'LB', 'CB', 'S'])

export const teamStrength = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  side: 'offense' | 'defense',
  flux?: Map<string, number>,
  sideMultiplier = 1,
): number => {
  let sum = 0
  team.roster.forEach((pid, i) => {
    if (!pid) return
    const slot = ROSTER_SLOTS[i]
    if (slot === 'BENCH') return
    const inSide = side === 'offense' ? OFFENSE.has(slot) : DEFENSE.has(slot)
    if (!inSide) return
    const p = playersById.get(pid)
    if (!p) return
    const fluxDelta = flux?.get(pid) ?? 0
    sum += (p.value + fluxDelta) * (POSITION_WEIGHTS[slot] ?? 1.0)
  })
  return sum * sideMultiplier
}

const sumSubscores = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  spec: Partial<Record<Position, string[]>>,
): number => {
  let total = 0
  team.roster.forEach((pid, i) => {
    if (!pid) return
    const slot = ROSTER_SLOTS[i]
    if (slot === 'BENCH') return
    const keys = spec[slot]
    if (!keys) return
    const p = playersById.get(pid)
    if (!p) return
    for (const k of keys) total += p.subscores[k] ?? 0
  })
  return total
}

export const passMatchupEdge = (
  attacker: TeamSeat,
  defender: TeamSeat,
  playersById: Map<string, Player>,
): number => {
  const off = sumSubscores(attacker, playersById, {
    QB: ['arm'],
    WR: ['separation', 'deep'],
    TE: ['catch'],
    OT: ['passPro'],
    OG: ['passPro'],
    C: ['passPro'],
  })
  const def = sumSubscores(defender, playersById, {
    DE: ['passRush'],
    DT: ['passRush'],
    LB: ['coverage'],
    CB: ['coverage'],
    S: ['coverage'],
  })
  return off - def
}

export const runMatchupEdge = (
  attacker: TeamSeat,
  defender: TeamSeat,
  playersById: Map<string, Player>,
): number => {
  const off = sumSubscores(attacker, playersById, {
    RB: ['power', 'burst'],
    OT: ['runBlock'],
    OG: ['runBlock'],
    C: ['runBlock'],
    TE: ['block'],
    QB: ['mobility'],
  })
  const def = sumSubscores(defender, playersById, {
    DE: ['runDef'],
    DT: ['runDef'],
    LB: ['runDef'],
    S: ['ballHawk'],
  })
  return off - def
}
