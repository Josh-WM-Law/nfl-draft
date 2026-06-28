import type { TeamSeat, Player, Position } from '../state/types'
import { ROSTER_SLOTS } from '../state/types'

export const POSITION_WEIGHTS: Record<Position, number> = {
  QB: 2.5,
  RB: 1.0,
  WR: 1.2,
  TE: 0.8,
  OL: 1.0,
  DE: 1.2,
  DT: 1.0,
  LB: 0.9,
  CB: 1.0,
  S: 0.9,
  K: 0.3,
}

const OFFENSE = new Set<Position>(['QB', 'RB', 'WR', 'TE', 'OL'])
const DEFENSE = new Set<Position>(['DE', 'DT', 'LB', 'CB', 'S'])

export const teamStrength = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  side: 'offense' | 'defense',
): number => {
  let sum = 0
  team.roster.forEach((pid, i) => {
    if (!pid) return
    const slot = ROSTER_SLOTS[i]
    const inSide = side === 'offense' ? OFFENSE.has(slot) : DEFENSE.has(slot)
    if (!inSide) return
    const p = playersById.get(pid)
    if (!p) return
    sum += p.value * (POSITION_WEIGHTS[slot] ?? 1.0)
  })
  return sum
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
    OL: ['passPro'],
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
    OL: ['runBlock'],
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
