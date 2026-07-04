import {
  type Game,
  type Dynasty,
  CURRENT_SCHEMA_VERSION,
  CURRENT_DYNASTY_SCHEMA_VERSION,
} from './types'
import { priceOf } from '../engine/salaryCap'

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

// v2 → v3 migration: 18-slot rosters gain 2 trailing nulls for the new
// bench slots. Applied to any Game before we hand it to the app.
const migrateGameV2ToV3 = (game: Game): Game => {
  const teams = game.teams.map((t) => {
    if (t.roster.length >= 20) return t
    const padded = t.roster.slice()
    while (padded.length < 20) padded.push(null)
    return { ...t, roster: padded }
  })
  return { ...game, teams, schemaVersion: 3 }
}

const migrateGame = (game: Game): Game => {
  let g = game
  if (g.schemaVersion === 2) g = migrateGameV2ToV3(g)
  return g
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
  if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) return parsed
  const migrated = migrateGame(parsed)
  if (migrated.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SchemaVersionError(parsed.schemaVersion, CURRENT_SCHEMA_VERSION)
  }
  // Persist the migration so future loads are quick and consistent.
  localStorage.setItem(KEY_PREFIX + id, JSON.stringify(migrated))
  return migrated
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

// Dynasty v2 → v3: pad currentGame.teams rosters + rewrite pendingKeepers
// from string[] to { starters, bench }.
const migrateDynastyV2ToV3 = (dynasty: Dynasty): Dynasty => {
  const currentGame = migrateGame({
    ...dynasty.currentGame,
    // v2 games had schemaVersion 2; force through the migration path.
    schemaVersion: dynasty.currentGame.schemaVersion ?? 2,
  } as Game)
  // Rewrite legacy pendingKeepers (old string[] shape) into the new
  // {starters, bench} object. Any old flat list becomes all starters.
  let pendingKeepers = dynasty.pendingKeepers
  if (pendingKeepers) {
    const rewritten: NonNullable<Dynasty['pendingKeepers']> = {}
    for (const [teamId, val] of Object.entries(pendingKeepers)) {
      if (Array.isArray(val)) {
        rewritten[teamId] = { starters: val, bench: [] }
      } else {
        rewritten[teamId] = val
      }
    }
    pendingKeepers = rewritten
  }
  return {
    ...dynasty,
    currentGame,
    pendingKeepers,
    schemaVersion: 3,
  }
}

const migrateDynasty = (dynasty: Dynasty): Dynasty => {
  let d = dynasty
  if (d.schemaVersion === 2) d = migrateDynastyV2ToV3(d)
  return d
}

// One-shot backfill for cap-mode dynasties created before playerSalaries
// existed. For every player on any roster, seed a locked-in salary at their
// current market rate — no earlier data to reward with, so today's market is
// the fair baseline. Next keeper cycle then applies the 15% growth cap on
// top of these seeded numbers.
const backfillPlayerSalaries = (dynasty: Dynasty): Dynasty => {
  if (!dynasty.capMode) return dynasty
  if (dynasty.playerSalaries) return dynasty
  const byId = new Map(dynasty.livePool.map((p) => [p.id, p]))
  const salaries: Record<string, number> = {}
  for (const t of dynasty.currentGame.teams) {
    for (const pid of t.roster) {
      if (!pid) continue
      const p = byId.get(pid)
      if (!p) continue
      salaries[pid] = priceOf(p.value)
    }
  }
  return { ...dynasty, playerSalaries: salaries }
}

export const loadDynasty = (id: string): Dynasty | null => {
  const raw = localStorage.getItem(DYNASTY_KEY_PREFIX + id)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Dynasty
  let d =
    parsed.schemaVersion === CURRENT_DYNASTY_SCHEMA_VERSION
      ? parsed
      : migrateDynasty(parsed)
  if (d.schemaVersion !== CURRENT_DYNASTY_SCHEMA_VERSION) {
    throw new SchemaVersionError(
      parsed.schemaVersion,
      CURRENT_DYNASTY_SCHEMA_VERSION,
    )
  }
  // Additive fix-ups that don't require a schema bump — safe to run on every
  // load. Currently: seed playerSalaries for cap dynasties that predate it.
  const backfilled = backfillPlayerSalaries(d)
  if (backfilled !== d) {
    d = backfilled
    localStorage.setItem(DYNASTY_KEY_PREFIX + id, JSON.stringify(d))
  } else if (d !== parsed) {
    // Legit v2→v3 migration; persist the upgraded form.
    localStorage.setItem(DYNASTY_KEY_PREFIX + id, JSON.stringify(d))
  }
  return d
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
