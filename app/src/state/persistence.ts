import { type Game, CURRENT_SCHEMA_VERSION } from './types'

const KEY_PREFIX = 'ontheclock:game:'

export class SchemaVersionError extends Error {
  readonly found: number
  readonly expected: number
  constructor(found: number, expected: number) {
    super(
      `Saved game schema v${found} != current v${expected}; migration not yet implemented.`,
    )
    this.name = 'SchemaVersionError'
    this.found = found
    this.expected = expected
  }
}

export const saveGame = (game: Game): void => {
  if (game.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SchemaVersionError(game.schemaVersion, CURRENT_SCHEMA_VERSION)
  }
  localStorage.setItem(KEY_PREFIX + game.id, JSON.stringify(game))
}

export const loadGame = (id: string): Game | null => {
  const raw = localStorage.getItem(KEY_PREFIX + id)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Game
  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SchemaVersionError(parsed.schemaVersion, CURRENT_SCHEMA_VERSION)
  }
  return parsed
}

export const deleteGame = (id: string): void => {
  localStorage.removeItem(KEY_PREFIX + id)
}

export const listSavedGameIds = (): string[] => {
  const ids: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(KEY_PREFIX)) {
      ids.push(key.slice(KEY_PREFIX.length))
    }
  }
  return ids
}
