import { describe, it, expect } from 'vitest'
import { roundRobinSchedule } from './schedule'

describe('roundRobinSchedule', () => {
  it('produces n-1 rounds for n teams', () => {
    const rounds = roundRobinSchedule(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(rounds.length).toBe(7)
  })

  it('produces n/2 games per round', () => {
    const rounds = roundRobinSchedule(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    for (const round of rounds) {
      expect(round.length).toBe(4)
    }
  })

  it('each team plays each other exactly once', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const rounds = roundRobinSchedule(teams)
    const matchupCount = new Map<string, number>()
    for (const round of rounds) {
      for (const m of round) {
        const key = [m.home, m.away].sort().join('-')
        matchupCount.set(key, (matchupCount.get(key) ?? 0) + 1)
      }
    }
    // 8 choose 2 = 28 unique matchups, each exactly once
    expect(matchupCount.size).toBe(28)
    for (const count of matchupCount.values()) {
      expect(count).toBe(1)
    }
  })

  it('each team plays once per round', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const rounds = roundRobinSchedule(teams)
    for (const round of rounds) {
      const teamsThisRound = new Set<string>()
      for (const m of round) {
        teamsThisRound.add(m.home)
        teamsThisRound.add(m.away)
      }
      expect(teamsThisRound.size).toBe(8)
    }
  })

  it('throws on odd team count', () => {
    expect(() => roundRobinSchedule(['a', 'b', 'c'])).toThrow()
  })
})
