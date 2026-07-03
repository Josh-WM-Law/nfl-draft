import {
  type Game,
  type Dynasty,
  CURRENT_SCHEMA_VERSION,
  CURRENT_DYNASTY_SCHEMA_VERSION,
} from './types'

const KEY_PREFIX = 'ontheclock:game:'
const DYNASTY_KEY_PREFIX = 'ontheclock:dynasty:'
const DYNASTY_INDEX_KEY = 'ontheclock:dynasties'
const ACTIVE_DYNASTY_KEY = 'ontheclock:activeDynastyId'

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

export const saveDynasty = (dynasty: Dynasty): void => {
  if (dynasty.schemaVersion !== CURRENT_DYNASTY_SCHEMA_VERSION) {
    throw new SchemaVersionError(
      dynasty.schemaVersion,
      CURRENT_DYNASTY_SCHEMA_VERSION,
    )
  }
  const withStamp: Dynasty = { ...dynasty, updatedAt: new Date().toISOString() }
  localStorage.setItem(
    DYNASTY_KEY_PREFIX + dynasty.id,
    JSON.stringify(withStamp),
  )
  // Keep a lightweight index so the landing page can list dynasties without
  // scanning localStorage each render.
  const index = listDynastyIds()
  if (!index.includes(dynasty.id)) {
    localStorage.setItem(
      DYNASTY_INDEX_KEY,
      JSON.stringify([...index, dynasty.id]),
    )
  }
}

export const loadDynasty = (id: string): Dynasty | null => {
  const raw = localStorage.getItem(DYNASTY_KEY_PREFIX + id)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Dynasty
  if (parsed.schemaVersion !== CURRENT_DYNASTY_SCHEMA_VERSION) {
    throw new SchemaVersionError(
      parsed.schemaVersion,
      CURRENT_DYNASTY_SCHEMA_VERSION,
    )
  }
  return parsed
}

export const deleteDynasty = (id: string): void => {
  localStorage.removeItem(DYNASTY_KEY_PREFIX + id)
  const index = listDynastyIds().filter((x) => x !== id)
  localStorage.setItem(DYNASTY_INDEX_KEY, JSON.stringify(index))
  if (getActiveDynastyId() === id) clearActiveDynastyId()
}

export const listDynastyIds = (): string[] => {
  const raw = localStorage.getItem(DYNASTY_INDEX_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export const setActiveDynastyId = (id: string): void => {
  localStorage.setItem(ACTIVE_DYNASTY_KEY, id)
}

export const getActiveDynastyId = (): string | null => {
  return localStorage.getItem(ACTIVE_DYNASTY_KEY)
}

export const clearActiveDynastyId = (): void => {
  localStorage.removeItem(ACTIVE_DYNASTY_KEY)
}
