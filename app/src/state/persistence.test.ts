import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyGame,
  createEmptyDynasty,
  CURRENT_SCHEMA_VERSION,
  CURRENT_DYNASTY_SCHEMA_VERSION,
  type Game,
  type Dynasty,
  type Player,
  ROSTER_SIZE,
} from './types'
import {
  saveGame,
  loadGame,
  deleteGame,
  listSavedGameIds,
  loadDynasty,
  SchemaVersionError,
} from './persistence'
import { priceOf } from '../engine/salaryCap'

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips an empty game through save/load', () => {
    const game = createEmptyGame('test-1', 'Brothers League', 12345)
    saveGame(game)
    const loaded = loadGame('test-1')
    expect(loaded).toEqual(game)
  })

  it('returns null for a missing game id', () => {
    expect(loadGame('does-not-exist')).toBeNull()
  })

  it('lists saved game ids', () => {
    saveGame(createEmptyGame('a', 'A', 1))
    saveGame(createEmptyGame('b', 'B', 2))
    expect(listSavedGameIds().sort()).toEqual(['a', 'b'])
  })

  it('deletes a saved game', () => {
    saveGame(createEmptyGame('gone', 'Gone', 1))
    deleteGame('gone')
    expect(loadGame('gone')).toBeNull()
  })

  it('throws SchemaVersionError on load when stored schema differs', () => {
    const stale: Game = { ...createEmptyGame('old', 'Old', 1), schemaVersion: 999 }
    localStorage.setItem('ontheclock:game:old', JSON.stringify(stale))
    expect(() => loadGame('old')).toThrow(SchemaVersionError)
  })

  it('throws SchemaVersionError on save when game schema mismatches current', () => {
    const stale: Game = { ...createEmptyGame('x', 'X', 1), schemaVersion: 999 }
    expect(() => saveGame(stale)).toThrow(SchemaVersionError)
    expect(CURRENT_SCHEMA_VERSION).toBe(3)
  })

  it('backfills playerSalaries on load for pre-existing cap dynasties', () => {
    // Reproduces the "dynasty created before the salary book existed" case:
    // capMode is on but playerSalaries is undefined. On load we seed a
    // salary book at current market rates so next offseason's 15% cap has
    // a baseline to grow from.
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
    const alpha = mkPlayer('a', 82)
    const beta = mkPlayer('b', 70)
    const game = createEmptyGame('g1', 'Test', 1)
    const roster: (string | null)[] = Array(ROSTER_SIZE).fill(null)
    roster[0] = 'a'
    roster[1] = 'b'
    game.teams = [
      {
        id: 'team-1',
        name: 'You',
        color: '#000',
        isComputer: false,
        roster,
      },
    ]
    game.capBudget = 220
    const dynasty: Dynasty = {
      ...createEmptyDynasty('dyn-1', 'Test', 'team-1', game, [alpha, beta]),
      capMode: true,
      schemaVersion: CURRENT_DYNASTY_SCHEMA_VERSION,
    }
    // Simulate the old world: playerSalaries never got written.
    localStorage.setItem(
      'ontheclock:dynasty:dyn-1',
      JSON.stringify(dynasty),
    )
    localStorage.setItem('ontheclock:dynasties', JSON.stringify(['dyn-1']))

    const loaded = loadDynasty('dyn-1')
    expect(loaded).not.toBeNull()
    expect(loaded!.playerSalaries).toBeDefined()
    expect(loaded!.playerSalaries!['a']).toBe(priceOf(82))
    expect(loaded!.playerSalaries!['b']).toBe(priceOf(70))
  })

  it('skips backfill for non-cap dynasties', () => {
    const game = createEmptyGame('g2', 'Test', 1)
    const dynasty: Dynasty = {
      ...createEmptyDynasty('dyn-2', 'Test', 'team-1', game, []),
      schemaVersion: CURRENT_DYNASTY_SCHEMA_VERSION,
    }
    localStorage.setItem(
      'ontheclock:dynasty:dyn-2',
      JSON.stringify(dynasty),
    )
    localStorage.setItem('ontheclock:dynasties', JSON.stringify(['dyn-2']))
    const loaded = loadDynasty('dyn-2')
    expect(loaded!.playerSalaries).toBeUndefined()
  })
})
