import type { PlayerCore, PlayerRating, Position } from '../state/types'

const USER_PLAYERS_KEY = 'ontheclock:userPlayers'

export type UserPlayer = { core: PlayerCore; rating: PlayerRating }

// Per-position subscore templates (sum ~= 10 like the hardcoded custom set).
// Only the keys the sim/features engines read are populated — anything else is
// noise. Positions the engine ignores get an empty map.
const SUBSCORE_TEMPLATES: Record<Position, Record<string, number>> = {
  QB: { arm: 7, mobility: 3 },
  RB: { power: 5, burst: 5 },
  WR: { separation: 6, deep: 4 },
  TE: { catch: 6, block: 4 },
  OT: { passPro: 5, runBlock: 5 },
  OG: { passPro: 5, runBlock: 5 },
  C: { passPro: 5, runBlock: 5 },
  DE: { passRush: 6, runDef: 4 },
  DT: { passRush: 4, runDef: 6 },
  LB: { coverage: 4, runDef: 6 },
  CB: { coverage: 7, ballHawk: 3 },
  S: { coverage: 5, ballHawk: 5 },
  K: {},
}

export const defaultSubscoresFor = (position: Position): Record<string, number> =>
  ({ ...SUBSCORE_TEMPLATES[position] })

const tierFor = (value: number): 'S' | 'A' | 'B' | 'C' => {
  if (value >= 90) return 'S'
  if (value >= 82) return 'A'
  if (value >= 74) return 'B'
  return 'C'
}

export type CreateUserPlayerInput = {
  name: string
  position: Position
  value: number
  nflTeam: string
  photoDataUrl?: string
}

const newUserPlayerId = (): string => {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
  return `user-${rand}`
}

export const buildUserPlayer = (input: CreateUserPlayerInput): UserPlayer => {
  const id = newUserPlayerId()
  return {
    core: {
      id,
      name: input.name.trim() || 'Custom Player',
      nflTeam: (input.nflTeam || 'YOU').trim().toUpperCase().slice(0, 4),
      position: input.position,
      photoUrl: input.photoDataUrl ?? '',
      status: 'active',
      yearsExp: 0,
    },
    rating: {
      id,
      value: Math.max(40, Math.min(99, Math.round(input.value))),
      subscores: defaultSubscoresFor(input.position),
      tier: tierFor(input.value),
      archetype: null,
      notes: '',
      needsRating: false,
    },
  }
}

export const loadUserPlayers = (): UserPlayer[] => {
  try {
    const raw = localStorage.getItem(USER_PLAYERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as UserPlayer[]
  } catch {
    return []
  }
}

export const saveUserPlayers = (players: UserPlayer[]): void => {
  localStorage.setItem(USER_PLAYERS_KEY, JSON.stringify(players))
}
