import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type SleeperPlayer = {
  player_id: string
  first_name?: string
  last_name?: string
  full_name?: string
  team?: string | null
  position?: string | null
  search_rank?: number | null
  depth_chart_order?: number | null
  years_exp?: number | null
  age?: number | null
  status?: string | null
}

type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'OL'
  | 'DE' | 'DT' | 'LB' | 'CB' | 'S' | 'K'

const POSITION_MAP: Record<string, Position> = {
  QB: 'QB',
  RB: 'RB', FB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OT: 'OL', T: 'OL', LT: 'OL', RT: 'OL',
  G: 'OL', OG: 'OL', LG: 'OL', RG: 'OL',
  C: 'OL', OL: 'OL',
  DE: 'DE',
  DT: 'DT', NT: 'DT',
  LB: 'LB', OLB: 'LB', ILB: 'LB', MLB: 'LB',
  CB: 'CB',
  S: 'S', SS: 'S', FS: 'S', DB: 'S',
  K: 'K', PK: 'K',
}

const POSITION_TARGETS: Record<Position, number> = {
  QB: 24, RB: 48, WR: 64, TE: 24, OL: 48,
  DE: 24, DT: 24, LB: 24, CB: 48, S: 24, K: 16,
}

const valueForPositionRank = (rank: number): number =>
  Math.max(95 - 2 * rank, 50)

const tierForValue = (v: number): 'S' | 'A' | 'B' | 'C' =>
  v >= 90 ? 'S' : v >= 80 ? 'A' : v >= 70 ? 'B' : 'C'

const seedFromId = (id: string): number => {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

const makeIdRng = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0xffffffff
  }
}

const randInt = (rng: () => number, min: number, max: number): number =>
  Math.round(min + rng() * (max - min))

const SUBSCORE_SCHEMA: Record<Position, { keys: string[]; range: number }> = {
  QB: { keys: ['arm', 'mobility'], range: 8 },
  RB: { keys: ['power', 'burst'], range: 6 },
  WR: { keys: ['separation', 'deep'], range: 6 },
  TE: { keys: ['catch', 'block'], range: 5 },
  OL: { keys: ['passPro', 'runBlock'], range: 5 },
  DE: { keys: ['passRush', 'runDef'], range: 7 },
  DT: { keys: ['passRush', 'runDef'], range: 6 },
  LB: { keys: ['coverage', 'runDef'], range: 5 },
  CB: { keys: ['coverage', 'ballHawk'], range: 7 },
  S: { keys: ['coverage', 'ballHawk'], range: 5 },
  K: { keys: [], range: 0 },
}

const seedSubscores = (id: string, position: Position): Record<string, number> => {
  const { keys, range } = SUBSCORE_SCHEMA[position]
  if (keys.length === 0) return {}
  const rng = makeIdRng(seedFromId(id))
  const out: Record<string, number> = {}
  for (const k of keys) out[k] = randInt(rng, -range, range)
  return out
}

const SLEEPER_URL = 'https://api.sleeper.app/v1/players/nfl'

async function main() {
  console.log(`Fetching ${SLEEPER_URL} ...`)
  const res = await fetch(SLEEPER_URL)
  if (!res.ok) {
    throw new Error(`Sleeper fetch failed: ${res.status} ${res.statusText}`)
  }
  const raw = (await res.json()) as Record<string, SleeperPlayer>
  const all = Object.values(raw)
  console.log(`  → ${all.length} total players from Sleeper`)

  const candidates = all.filter((p) => {
    if (p.status !== 'Active') return false
    if (!p.team) return false
    if (!p.position) return false
    return p.position in POSITION_MAP
  })
  console.log(`  → ${candidates.length} active candidates after status/team/position filter`)

  const byPosition: Record<Position, SleeperPlayer[]> = {
    QB: [], RB: [], WR: [], TE: [], OL: [],
    DE: [], DT: [], LB: [], CB: [], S: [], K: [],
  }
  for (const p of candidates) {
    const pos = POSITION_MAP[p.position!]
    byPosition[pos].push(p)
  }

  const cores: unknown[] = []
  const ratings: unknown[] = []

  const positions = Object.keys(POSITION_TARGETS) as Position[]
  for (const pos of positions) {
    const target = POSITION_TARGETS[pos]
    const sorted = byPosition[pos].slice().sort((a, b) => {
      const sa = a.search_rank ?? 99999
      const sb = b.search_rank ?? 99999
      if (sa !== sb) return sa - sb
      const da = a.depth_chart_order ?? 99
      const db = b.depth_chart_order ?? 99
      if (da !== db) return da - db
      const ea = a.years_exp ?? 0
      const eb = b.years_exp ?? 0
      return eb - ea
    })
    const top = sorted.slice(0, target)
    top.forEach((p, idx) => {
      const value = valueForPositionRank(idx)
      const name =
        p.full_name?.trim() ||
        `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
        `Player ${p.player_id}`
      cores.push({
        id: p.player_id,
        name,
        nflTeam: p.team,
        position: pos,
        photoUrl: `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`,
        status: 'active',
      })
      ratings.push({
        id: p.player_id,
        value,
        subscores: seedSubscores(p.player_id, pos),
        tier: tierForValue(value),
        archetype: null,
        notes: '',
        needsRating: true,
      })
    })
    console.log(`  ${pos}: selected ${top.length}/${byPosition[pos].length} candidates`)
  }

  const dataDir = resolve(process.cwd(), 'src/data')
  const playersPath = resolve(dataDir, 'players.json')
  const ratingsPath = resolve(dataDir, 'ratings.json')
  writeFileSync(playersPath, JSON.stringify(cores, null, 2))
  writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2))
  console.log(`\nWrote ${cores.length} players → ${playersPath}`)
  console.log(`Wrote ${ratings.length} ratings → ${ratingsPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
