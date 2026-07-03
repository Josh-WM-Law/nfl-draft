import type {
  Player,
  PlayerCore,
  PlayerRating,
  Position,
  SeasonAward,
  Coach,
  OffseasonEvent,
} from '../state/types'
import { ALL_POSITIONS, ROSTER_SLOTS } from '../state/types'
import { makeRng } from './rng'
import { coachEffect } from './coachEffects'

// ------------------------- Age helpers -------------------------

// Rookies enter around 22. yearsExp is a decent proxy; nudge slightly older to
// reflect that our top-100 tend to be established starters.
export const seedInitialAge = (yearsExp: number): number => {
  const base = 22 + Math.max(0, yearsExp)
  return Math.min(38, base)
}

// Backfill age on every player in the pool that doesn't have one yet.
export const withInitialAges = (players: Player[]): Player[] => {
  return players.map((p) => (p.age == null ? { ...p, age: seedInitialAge(p.yearsExp) } : p))
}

// ------------------------- Retirement -------------------------

// Base retirement probability by age. Under 33 retires only via the low-OVR
// floor below.
const RETIRE_BASE_BY_AGE: Record<number, number> = {
  33: 0.1,
  34: 0.2,
  35: 0.4,
  36: 0.7,
}

const retireProbability = (age: number, value: number): number => {
  const base = age >= 37 ? 1 : (RETIRE_BASE_BY_AGE[age] ?? 0)
  // Old + poor = retires. A 35 year old with a 60 OVR is almost certainly done.
  const floor = age >= 30 && value < 60 ? 0.5 : 0
  return Math.max(base, floor)
}

export type RetirementResult = {
  survivors: Player[]
  retirees: OffseasonEvent[]
}

// Retirement is only rolled on players who appeared on a roster last season
// (i.e., the pooled livePool includes them). Everyone else just carries on.
export const rollRetirements = (
  pool: Player[],
  seed: number,
): RetirementResult => {
  const rng = makeRng(seed)
  const survivors: Player[] = []
  const retirees: OffseasonEvent[] = []
  for (const p of pool) {
    const age = p.age ?? seedInitialAge(p.yearsExp)
    const prob = retireProbability(age, p.value)
    if (prob > 0 && rng() < prob) {
      retirees.push({
        type: 'retired',
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        age,
        fromValue: p.value,
        reason: age >= 35 ? 'age' : 'age + performance',
      })
      continue
    }
    survivors.push(p)
  }
  return { survivors, retirees }
}

// ------------------------- Development -------------------------

// Award/champ bumps for a player who won or was on a title team.
const awardBumpFor = (won: boolean, awarded: boolean): number => {
  let bump = 0
  if (awarded) bump += 3
  if (won) bump += 2
  return bump
}

type DevelopContext = {
  awardedIds: Set<string>
  championIds: Set<string>
  userTeamRosterIds: Set<string>
  userCoach: Coach | null
}

const developOne = (
  p: Player,
  ctx: DevelopContext,
  rng: () => number,
): { next: Player; event?: OffseasonEvent } => {
  const age = (p.age ?? seedInitialAge(p.yearsExp)) + 1
  const yearsExp = p.yearsExp + 1
  let delta = 0
  // Age-driven baseline curve.
  if (age <= 24) delta = 2 + Math.floor(rng() * 4) // +2..+5
  else if (age <= 26) delta = Math.floor(rng() * 3) // 0..+2
  else if (age <= 29) delta = Math.floor(rng() * 3) - 1 // -1..+1
  else if (age <= 32) delta = -1 - Math.floor(rng() * 3) // -1..-3
  else delta = -2 - Math.floor(rng() * 4) // -2..-5

  // Award / championship bumps overlay the age curve.
  const bump = awardBumpFor(
    ctx.championIds.has(p.id),
    ctx.awardedIds.has(p.id),
  )
  delta += bump

  // Coach effect: Player Developer amplifies development for young players
  // on the user's roster.
  if (ctx.userCoach) {
    const eff = coachEffect(ctx.userCoach)
    if (eff.developerBoost && ctx.userTeamRosterIds.has(p.id) && age <= 27) {
      delta += 1
    }
  }

  const nextValue = Math.max(40, Math.min(99, p.value + delta))
  const changed = nextValue !== p.value
  const next: Player = { ...p, age, yearsExp, value: nextValue }
  if (!changed) return { next }
  const event: OffseasonEvent = {
    type: nextValue > p.value ? 'improved' : 'regressed',
    playerId: p.id,
    playerName: p.name,
    position: p.position,
    fromValue: p.value,
    toValue: nextValue,
    age,
    reason: bump > 0 ? 'award/championship' : undefined,
  }
  return { next, event }
}

export type DevelopmentResult = {
  players: Player[]
  events: OffseasonEvent[]
}

export const developPlayers = (
  pool: Player[],
  awards: SeasonAward[],
  championTeamRoster: string[],
  userTeamRoster: string[],
  userCoach: Coach | null,
  seed: number,
): DevelopmentResult => {
  const rng = makeRng(seed)
  const awardedIds = new Set(
    awards.map((a) => a.winnerPlayerId).filter((x): x is string => !!x),
  )
  const championIds = new Set(championTeamRoster.filter(Boolean))
  const userIds = new Set(userTeamRoster.filter(Boolean))
  const ctx: DevelopContext = {
    awardedIds,
    championIds,
    userTeamRosterIds: userIds,
    userCoach,
  }
  const nextPool: Player[] = []
  const events: OffseasonEvent[] = []
  for (const p of pool) {
    const { next, event } = developOne(p, ctx, rng)
    nextPool.push(next)
    if (event && Math.abs((event.toValue ?? 0) - (event.fromValue ?? 0)) >= 2) {
      events.push(event)
    }
  }
  return { players: nextPool, events }
}

// ------------------------- Rookie generation -------------------------

const FIRST_NAMES = [
  'Deuce', 'Marcus', 'Jamal', 'Trey', 'Cade', 'Xavier', 'Kai', 'Nico',
  'Rashad', 'Terrell', 'Devon', 'Tyrese', 'Bo', 'Jaxon', 'Dallas', 'Beau',
  'Malik', 'Isaiah', 'Elijah', 'Jayden', 'Amari', 'Zion', 'Kobe', 'Kingsley',
  'Ronan', 'Sebastian', 'Kai', 'Sione', 'Tanner', 'Colt', 'Wyatt', 'Grayson',
  'Silas', 'Josiah', 'Micah', 'Otis', 'Rex', 'Levi', 'Chance', 'Damarion',
  'Tre', 'Quan', 'Jace', 'Bryson', 'Preston', 'Kaden', 'Emory', 'Ronaldo',
  'Cooper', 'Camden', 'Blake', 'Deion', 'Reggie', 'Chase', 'Hayes', 'Corbin',
]

const LAST_NAMES = [
  'Blackwell', 'Hayes', 'Kingsley', 'Mercer', 'Ellis', 'Vaughn', 'Reeves',
  'Cortez', 'Salvador', 'Delgado', 'Fontaine', 'Sinclair', 'Rowland', 'Whitaker',
  'Blackmon', 'Rivers', 'Ashford', 'Chandler', 'Everett', 'Vance', 'Holt',
  'Kingston', 'Hollister', 'Cross', 'Steele', 'Faraday', 'Kensington', 'Beckett',
  'Ravenna', 'Locke', 'Priestley', 'Constantine', 'Dumont', 'Riordan', 'Talbot',
  'Sinclair', 'Ashe', 'Emerson', 'Callahan', 'Devereaux', 'Ashcroft', 'Rutledge',
  'Wentworth', 'Bellamy', 'Shackleton', 'Redmond', 'Ainsworth', 'Everhart',
  'Kensington', 'Whitfield', 'Harrington', 'Sinclair', 'Merriweather', 'Dashwood',
  'Ashworth', 'Radcliffe', 'Vane', 'Winters', 'Frost', 'Storm',
]

// Position weights for a "balanced" rookie class — how many rookies of each
// position land in the class before any archetype template applies.
const BALANCED_COUNTS: Record<Position, number> = {
  QB: 4,
  RB: 4,
  WR: 6,
  TE: 3,
  OT: 5,
  OG: 4,
  C: 3,
  DE: 5,
  DT: 4,
  LB: 5,
  CB: 5,
  S: 4,
  K: 2,
}

// Archetype = shape modifier applied on top of balanced counts.
type Archetype =
  | 'balanced'
  | 'qb_heavy'
  | 'wr_heavy'
  | 'trenches'
  | 'skill_heavy'
  | 'defensive_class'

const ARCHETYPES: Archetype[] = [
  'balanced',
  'qb_heavy',
  'wr_heavy',
  'trenches',
  'skill_heavy',
  'defensive_class',
]

const archetypeModifiers = (
  a: Archetype,
): { counts?: Partial<Record<Position, number>>; stars?: Position[] } => {
  switch (a) {
    case 'balanced':
      return {}
    case 'qb_heavy':
      return { counts: { QB: 6 }, stars: ['QB', 'QB', 'QB'] }
    case 'wr_heavy':
      return { counts: { WR: 10 }, stars: ['WR', 'WR', 'WR', 'WR'] }
    case 'trenches':
      return {
        counts: { OT: 7, OG: 6, C: 4, DE: 7, DT: 6 },
        stars: ['OT', 'DE', 'DT'],
      }
    case 'skill_heavy':
      return {
        counts: { RB: 6, WR: 8, TE: 5 },
        stars: ['RB', 'WR', 'TE'],
      }
    case 'defensive_class':
      return {
        counts: { DE: 7, LB: 7, CB: 7, S: 6 },
        stars: ['DE', 'LB', 'CB', 'S'],
      }
  }
}

// Deterministic OVR draw: most rookies between 60-75; a small fraction rise
// into 76-84; rare stars 85-92.
const rollRookieValue = (star: boolean, rng: () => number): number => {
  if (star) return 85 + Math.floor(rng() * 8) // 85..92
  const r = rng()
  if (r < 0.15) return 76 + Math.floor(rng() * 9) // 76..84 tier
  return 60 + Math.floor(rng() * 16) // 60..75 tier
}

// Same subscore templates the user-player builder uses. Kept here to avoid
// depending on userPlayers module in engine code.
const ROOKIE_SUBSCORES: Record<Position, Record<string, number>> = {
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

const tierFor = (value: number): 'S' | 'A' | 'B' | 'C' => {
  if (value >= 90) return 'S'
  if (value >= 82) return 'A'
  if (value >= 74) return 'B'
  return 'C'
}

const generateName = (rng: () => number): string => {
  const f = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]
  const l = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]
  return `${f} ${l}`
}

export const generateRookieClass = (
  year: number,
  seed: number,
  existingIds: Set<string>,
): Player[] => {
  const rng = makeRng(seed)
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)]
  const mod = archetypeModifiers(archetype)
  const counts: Record<Position, number> = { ...BALANCED_COUNTS }
  if (mod.counts) {
    for (const p of Object.keys(mod.counts) as Position[]) {
      counts[p] = mod.counts[p] ?? counts[p]
    }
  }
  const stars = new Set(mod.stars ?? [])

  const rookies: Player[] = []
  let idx = 0
  for (const pos of ALL_POSITIONS) {
    const total = counts[pos] ?? 0
    let starsRemaining = mod.stars ? mod.stars.filter((s) => s === pos).length : 0
    // Every class also gets a small chance at a "true star" per position if
    // it's not already in the archetype list.
    if (!stars.has(pos) && rng() < 0.15) starsRemaining += 1
    for (let i = 0; i < total; i++) {
      const isStar = starsRemaining > 0
      if (isStar) starsRemaining -= 1
      const value = rollRookieValue(isStar, rng)
      let name = generateName(rng)
      // Ensure ID uniqueness against existing dynasty pool (very unlikely
      // collision given the string, but cheap to check).
      let id = `rook-${year}-${idx}`
      while (existingIds.has(id)) {
        idx += 1
        id = `rook-${year}-${idx}`
      }
      existingIds.add(id)
      idx += 1
      // Tiny chance of a suffix so we get repeat surnames without dupes.
      if (rng() < 0.05) name = `${name} Jr.`
      const core: PlayerCore = {
        id,
        name,
        nflTeam: 'RKY',
        position: pos,
        photoUrl: '',
        status: 'active',
        yearsExp: 0,
        age: 21 + Math.floor(rng() * 3),
      }
      const rating: PlayerRating = {
        id,
        value,
        subscores: { ...(ROOKIE_SUBSCORES[pos] ?? {}) },
        tier: tierFor(value),
        archetype: null,
        notes: '',
        needsRating: false,
      }
      rookies.push({ ...core, ...rating })
    }
  }
  return rookies
}

// ------------------------- Keeper auto-pick -------------------------

// Top-N-by-value keeper picker. CPUs and (as a fallback) any user roster
// that doesn't submit an explicit pick.
export const pickTopKeepers = (
  rosterIds: (string | null)[],
  playersById: Map<string, Player>,
  n: number,
): string[] => {
  const withPlayers = rosterIds
    .filter((x): x is string => !!x)
    .map((id) => ({ id, value: playersById.get(id)?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)
  return withPlayers.slice(0, n).map((x) => x.id)
}

// ------------------------- Roster reset for new year -------------------------

// Turn a roster of 18 slots into a new empty roster, then place the kept
// players back into their position slots. Any excess keeper of a position
// (shouldn't happen: max 4 keepers, positions rarely stack that high) is
// silently dropped.
export const rosterWithKeepers = (
  keeperIds: string[],
  playersById: Map<string, Player>,
): (string | null)[] => {
  const roster: (string | null)[] = ROSTER_SLOTS.map(() => null)
  for (const pid of keeperIds) {
    const player = playersById.get(pid)
    if (!player) continue
    const idx = ROSTER_SLOTS.findIndex(
      (slot, i) => slot === player.position && roster[i] === null,
    )
    if (idx === -1) continue
    roster[idx] = pid
  }
  return roster
}
