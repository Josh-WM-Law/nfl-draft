import { describe, it, expect, beforeEach } from 'vitest'
import { createEmptyGame, CURRENT_SCHEMA_VERSION, type Game } from './types'
import {
  saveGame,
  loadGame,
  deleteGame,
  listSavedGameIds,
  SchemaVersionError,
} from './persistence'

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
})
