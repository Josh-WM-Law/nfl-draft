import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Madden NFL Top 100 ratings — pasted from EA's official ratings site.
// One-time bootstrap. Re-run after a fresh Sleeper refresh.
const MADDEN_TOP_100: { name: string; ovr: number }[] = [
  { name: "Ja'Marr Chase", ovr: 99 },
  { name: 'Josh Allen', ovr: 99 },
  { name: 'Lane Johnson', ovr: 99 },
  { name: 'Myles Garrett', ovr: 99 },
  { name: 'Christian Gonzalez', ovr: 98 },
  { name: 'George Kittle', ovr: 98 },
  { name: 'Jahmyr Gibbs', ovr: 98 },
  { name: 'Matthew Stafford', ovr: 98 },
  { name: 'Micah Parsons', ovr: 98 },
  { name: 'Penei Sewell', ovr: 98 },
  { name: 'Fred Warner', ovr: 97 },
  { name: 'Maxx Crosby', ovr: 97 },
  { name: 'Patrick Surtain II', ovr: 97 },
  { name: 'Puka Nacua', ovr: 97 },
  { name: 'Trent Williams', ovr: 97 },
  { name: 'Trey McBride', ovr: 97 },
  { name: 'Amon-Ra St. Brown', ovr: 96 },
  { name: 'Christian McCaffrey', ovr: 96 },
  { name: 'Derrick Brown', ovr: 96 },
  { name: 'Garett Bolles', ovr: 96 },
  { name: 'Joe Burrow', ovr: 96 },
  { name: 'Joe Thuney', ovr: 96 },
  { name: 'Jonathan Taylor', ovr: 96 },
  { name: 'Bijan Robinson', ovr: 95 },
  { name: 'Cameron Heyward', ovr: 95 },
  { name: 'Creed Humphrey', ovr: 95 },
  { name: 'Jaxon Smith-Njigba', ovr: 95 },
  { name: 'Jeffery Simmons', ovr: 95 },
  { name: 'Nick Bosa', ovr: 95 },
  { name: 'Quinn Meinerz', ovr: 95 },
  { name: 'Tristan Wirfs', ovr: 95 },
  { name: 'Chris Jones', ovr: 94 },
  { name: 'Derrick Henry', ovr: 94 },
  { name: 'Jalen Ramsey', ovr: 94 },
  { name: 'Jessie Bates III', ovr: 94 },
  { name: 'Justin Jefferson', ovr: 94 },
  { name: 'Lamar Jackson', ovr: 94 },
  { name: 'Laremy Tunsil', ovr: 94 },
  { name: 'Quenton Nelson', ovr: 94 },
  { name: 'T.J. Watt', ovr: 94 },
  { name: 'Trent McDuffie', ovr: 94 },
  { name: 'Vita Vea', ovr: 94 },
  { name: 'Will Anderson Jr.', ovr: 94 },
  { name: 'Aidan Hutchinson', ovr: 93 },
  { name: 'Andrew Thomas', ovr: 93 },
  { name: 'Brock Bowers', ovr: 93 },
  { name: 'CeeDee Lamb', ovr: 93 },
  { name: 'Chris Lindstrom', ovr: 93 },
  { name: 'Denzel Ward', ovr: 93 },
  { name: 'Derwin James Jr', ovr: 93 },
  { name: 'Dexter Lawrence II', ovr: 93 },
  { name: 'Drake Maye', ovr: 93 },
  { name: 'James Cook', ovr: 93 },
  { name: 'Kyle Hamilton', ovr: 93 },
  { name: 'Roquan Smith', ovr: 93 },
  { name: 'Antoine Winfield Jr', ovr: 92 },
  { name: 'Danielle Hunter', ovr: 92 },
  { name: 'Derek Stingley Jr', ovr: 92 },
  { name: 'Drake London', ovr: 92 },
  { name: 'Justin Madubuike', ovr: 92 },
  { name: 'Patrick Mahomes', ovr: 92 },
  { name: 'Rashawn Slater', ovr: 92 },
  { name: 'Saquon Barkley', ovr: 92 },
  { name: 'Xavier McKinney', ovr: 92 },
  { name: 'Brian Branch', ovr: 91 },
  { name: 'Dak Prescott', ovr: 91 },
  { name: 'DeForest Buckner', ovr: 91 },
  { name: 'Demario Davis', ovr: 91 },
  { name: 'Devon Witherspoon', ovr: 91 },
  { name: 'DeVonta Smith', ovr: 91 },
  { name: 'Jordan Mailata', ovr: 91 },
  { name: 'Josh Jacobs', ovr: 91 },
  { name: 'Kerby Joseph', ovr: 91 },
  { name: 'Kolton Miller', ovr: 91 },
  { name: 'Mark Andrews', ovr: 91 },
  { name: 'Mike Evans', ovr: 91 },
  { name: 'Nik Bonitto', ovr: 91 },
  { name: 'Trey Smith', ovr: 91 },
  { name: 'Budda Baker', ovr: 90 },
  { name: 'Christian Darrisaw', ovr: 90 },
  { name: 'Davante Adams', ovr: 90 },
  { name: 'Jaylon Johnson', ovr: 90 },
  { name: 'Kenneth Walker III', ovr: 90 },
  { name: 'Quinnen Williams', ovr: 90 },
  { name: 'Sauce Gardner', ovr: 90 },
  { name: 'Terry McLaurin', ovr: 90 },
  { name: 'Travis Kelce', ovr: 90 },
  { name: 'Trey Hendrickson', ovr: 90 },
  { name: 'Zack Baun', ovr: 90 },
  { name: 'A.J. Brown', ovr: 89 },
  { name: 'Brian Burns', ovr: 89 },
  { name: 'Drue Tranquill', ovr: 89 },
  { name: 'Jake Matthews', ovr: 89 },
  { name: 'Jalen Carter', ovr: 89 },
  { name: 'Jaycee Horn', ovr: 89 },
  { name: 'Justin Herbert', ovr: 89 },
  { name: 'Kyren Williams', ovr: 89 },
  { name: 'Minkah Fitzpatrick', ovr: 89 },
  { name: 'Nico Collins', ovr: 89 },
  { name: 'Quinyon Mitchell', ovr: 89 },
]

// Some players have known alias names in different sources.
const NAME_ALIASES: Record<string, string> = {
  'Justin Madubuike': 'Nnamdi Madubuike',
  'Patrick Surtain II': 'Pat Surtain',
}

type PlayerCore = {
  id: string
  name: string
  nflTeam: string
  position: string
  photoUrl: string
  status: string
  yearsExp: number
}

type PlayerRating = {
  id: string
  value: number
  subscores: Record<string, number>
  tier: 'S' | 'A' | 'B' | 'C'
  archetype: string | null
  notes: string
  needsRating: boolean
}

const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[.'’`]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

const tierForValue = (v: number): 'S' | 'A' | 'B' | 'C' =>
  v >= 90 ? 'S' : v >= 80 ? 'A' : v >= 70 ? 'B' : 'C'

async function main() {
  const dataDir = resolve(process.cwd(), 'src/data')
  const playersPath = resolve(dataDir, 'players.json')
  const ratingsPath = resolve(dataDir, 'ratings.json')

  const players = JSON.parse(readFileSync(playersPath, 'utf8')) as PlayerCore[]
  const ratings = JSON.parse(readFileSync(ratingsPath, 'utf8')) as PlayerRating[]

  const playerByNorm = new Map<string, PlayerCore>()
  for (const p of players) playerByNorm.set(normalizeName(p.name), p)

  const ratingIdxById = new Map<string, number>()
  ratings.forEach((r, i) => ratingIdxById.set(r.id, i))

  let matched = 0
  const unmatched: { name: string; ovr: number }[] = []

  for (const entry of MADDEN_TOP_100) {
    let player = playerByNorm.get(normalizeName(entry.name))
    if (!player && NAME_ALIASES[entry.name]) {
      player = playerByNorm.get(normalizeName(NAME_ALIASES[entry.name]))
    }
    if (!player) {
      unmatched.push(entry)
      continue
    }
    const idx = ratingIdxById.get(player.id)
    if (idx === undefined) {
      unmatched.push(entry)
      continue
    }
    ratings[idx] = {
      ...ratings[idx],
      value: entry.ovr,
      tier: tierForValue(entry.ovr),
      needsRating: false,
    }
    matched++
  }

  writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2))

  console.log(`Matched: ${matched} / ${MADDEN_TOP_100.length}`)
  if (unmatched.length > 0) {
    console.log(`\nUnmatched (${unmatched.length}) — not in our Sleeper pool:`)
    for (const u of unmatched) console.log(`  ${u.ovr}  ${u.name}`)
  } else {
    console.log('\nAll matched cleanly.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
