import { describe, it, expect } from 'vitest'
import { developPlayers } from './offseason'
import type { Player } from '../state/types'

const mkPlayer = (
  id: string,
  value: number,
  age: number,
  yearsExp = 5,
): Player => ({
  id,
  name: id,
  nflTeam: 'XXX',
  position: 'WR',
  photoUrl: '',
  status: 'active',
  yearsExp,
  age,
  value,
  subscores: {},
  tier: 'B',
  archetype: null,
  notes: '',
  needsRating: false,
})

describe('developPlayers OVR floor', () => {
  it('never lets an aging player fall below 60', () => {
    // A 34-year-old at OVR 62 rolls in the -2..-5 tier every offseason.
    // Deterministic across seeds: whatever the delta, output is floored at 60.
    const p = mkPlayer('vet', 62, 34)
    // Try a spread of seeds so we cover different rng draws.
    for (let seed = 1; seed <= 20; seed++) {
      const { players } = developPlayers([p], [], [], [], null, seed)
      expect(players.length).toBe(1)
      expect(players[0].value).toBeGreaterThanOrEqual(60)
    }
  })

  it('does not artificially inflate a mid-tier player', () => {
    // A 30-year-old at OVR 78 rolls in the -1..-3 range and shouldn't rise.
    const p = mkPlayer('mid', 78, 30)
    const { players } = developPlayers([p], [], [], [], null, 42)
    expect(players[0].value).toBeLessThanOrEqual(78)
    expect(players[0].value).toBeGreaterThanOrEqual(60)
  })
})
