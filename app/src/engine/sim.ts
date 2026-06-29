import type {
  TeamSeat,
  Player,
  GameResult,
  BracketSlot,
  SeasonAward,
  Position,
  QuarterScore,
} from '../state/types'
import { ROSTER_SLOTS } from '../state/types'
import {
  teamStrength,
  passMatchupEdge,
  runMatchupEdge,
  POSITION_WEIGHTS,
} from './teamStrength'
import { makeRng } from './rng'
import type { Matchup } from './schedule'
import { computeAwards } from './awards'

const BASELINE_SCORE = 17
const STRENGTH_SCALE = 20
const MATCHUP_SCALE = 10
const NOISE_AMPLITUDE = 4
const HOME_FIELD_BONUS = 3
const FLUX_CHANCE = 0.05
const FLUX_DELTA = 15
const FLUX_HEADLINE_THRESHOLD = 18

const lastName = (full: string): string => {
  const parts = full.split(' ').filter(Boolean)
  if (parts.length === 0) return full
  return parts.slice(1).join(' ') || parts[0]
}

type FluxEvent = {
  playerName: string
  slot: Position
  delta: number
  impact: number
}

const rollPlayerFlux = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  rng: () => number,
): { fluxMap: Map<string, number>; events: FluxEvent[] } => {
  const fluxMap = new Map<string, number>()
  const events: FluxEvent[] = []
  team.roster.forEach((pid, i) => {
    if (!pid) return
    const r = rng()
    let delta = 0
    if (r < FLUX_CHANCE) delta = FLUX_DELTA
    else if (r > 1 - FLUX_CHANCE) delta = -FLUX_DELTA
    if (delta === 0) return
    const slot = ROSTER_SLOTS[i]
    const player = playersById.get(pid)
    if (!player) return
    fluxMap.set(pid, delta)
    const weight = POSITION_WEIGHTS[slot] ?? 1.0
    events.push({
      playerName: player.name,
      slot,
      delta,
      impact: Math.abs(delta) * weight,
    })
  })
  return { fluxMap, events }
}

const buildHeadline = (
  aPass: number,
  aRun: number,
  bPass: number,
  bRun: number,
  scoreA: number,
  scoreB: number,
  fluxEvents: { team: 'A' | 'B'; event: FluxEvent }[],
): string => {
  // Surface biggest flux event if it meets threshold
  const topFlux = fluxEvents
    .filter((f) => f.event.impact >= FLUX_HEADLINE_THRESHOLD)
    .sort((a, b) => b.event.impact - a.event.impact)[0]
  if (topFlux) {
    const name = lastName(topFlux.event.playerName)
    const slot = topFlux.event.slot
    if (topFlux.event.delta > 0) {
      const great = [
        `${name} (${slot}) had the game of his life`,
        `${name} (${slot}) was unstoppable`,
        `${name} (${slot}) put up vintage numbers`,
      ]
      return great[Math.abs(scoreA + scoreB) % great.length]
    }
    const off = [
      `${name} (${slot}) couldn't find a rhythm`,
      `${name} (${slot}) had a day to forget`,
      `${name} (${slot}) was a no-show`,
    ]
    return off[Math.abs(scoreA + scoreB) % off.length]
  }

  // Fall back to matchup-based headline
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE'
  const edges = [
    { val: aPass, msg: 'Air raid lit up the secondary' },
    { val: aRun, msg: 'Ground game bullied the front' },
    { val: -bPass, msg: 'Pass rush flipped the script' },
    { val: -bRun, msg: 'Stopped on the ground' },
  ]
  edges.sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
  const top = edges[0]
  if (winner === 'TIE') return 'Went to the wire'
  if (Math.abs(top.val) < 5) return 'Tight one all the way'
  return top.msg
}

// Split a final score into a sequence of TD (7) / FG (3) / safety (2) events.
const splitScoreIntoEvents = (
  total: number,
  rng: () => number,
): number[] => {
  const events: number[] = []
  let remaining = total
  while (remaining >= 7) {
    if (rng() < 0.7 || remaining < 10) {
      events.push(7)
      remaining -= 7
    } else {
      events.push(3)
      remaining -= 3
    }
  }
  while (remaining >= 3) {
    events.push(3)
    remaining -= 3
  }
  if (remaining === 2) {
    events.push(2)
  } else if (remaining === 1) {
    if (events.length > 0) events[events.length - 1] += 1
    else events.push(1)
  }
  return events
}

const distributeEvents = (
  events: number[],
  rng: () => number,
): [number, number, number, number] => {
  const q: [number, number, number, number] = [0, 0, 0, 0]
  for (const e of events) {
    const i = Math.floor(rng() * 4)
    q[i] += e
  }
  return q
}

export const splitGameByQuarter = (
  homeTotal: number,
  awayTotal: number,
  seed: number,
): QuarterScore[] => {
  const rng = makeRng(seed)
  const homeEvents = splitScoreIntoEvents(homeTotal, rng)
  const awayEvents = splitScoreIntoEvents(awayTotal, rng)
  const homeQ = distributeEvents(homeEvents, rng)
  const awayQ = distributeEvents(awayEvents, rng)
  return homeQ.map((h, i) => ({ home: h, away: awayQ[i] }))
}

export const simGame = (
  teamA: TeamSeat,
  teamB: TeamSeat,
  playersById: Map<string, Player>,
  seed: number,
  weekNumber = 1,
  neutralSite = false,
): GameResult => {
  const rng = makeRng(seed)

  // Per-game flux: each player has a small chance of a great/off game
  const aFlux = rollPlayerFlux(teamA, playersById, rng)
  const bFlux = rollPlayerFlux(teamB, playersById, rng)

  const aOff = teamStrength(teamA, playersById, 'offense', aFlux.fluxMap)
  const aDef = teamStrength(teamA, playersById, 'defense', aFlux.fluxMap)
  const bOff = teamStrength(teamB, playersById, 'offense', bFlux.fluxMap)
  const bDef = teamStrength(teamB, playersById, 'defense', bFlux.fluxMap)

  const aPass = passMatchupEdge(teamA, teamB, playersById)
  const aRun = runMatchupEdge(teamA, teamB, playersById)
  const bPass = passMatchupEdge(teamB, teamA, playersById)
  const bRun = runMatchupEdge(teamB, teamA, playersById)

  let scoreA = BASELINE_SCORE
  scoreA += (aOff - bDef) / STRENGTH_SCALE
  scoreA += (aPass + aRun) / MATCHUP_SCALE
  scoreA += (rng() - 0.5) * 2 * NOISE_AMPLITUDE
  if (!neutralSite) scoreA += HOME_FIELD_BONUS

  let scoreB = BASELINE_SCORE
  scoreB += (bOff - aDef) / STRENGTH_SCALE
  scoreB += (bPass + bRun) / MATCHUP_SCALE
  scoreB += (rng() - 0.5) * 2 * NOISE_AMPLITUDE

  scoreA = Math.max(0, Math.round(scoreA))
  scoreB = Math.max(0, Math.round(scoreB))

  const fluxEventsForHeadline: { team: 'A' | 'B'; event: FluxEvent }[] = [
    ...aFlux.events.map((e) => ({ team: 'A' as const, event: e })),
    ...bFlux.events.map((e) => ({ team: 'B' as const, event: e })),
  ]

  return {
    weekNumber,
    homeTeamId: teamA.id,
    awayTeamId: teamB.id,
    homeScore: scoreA,
    awayScore: scoreB,
    headline: buildHeadline(aPass, aRun, bPass, bRun, scoreA, scoreB, fluxEventsForHeadline),
  }
}

export type SeasonResult = {
  results: GameResult[]
  weeks: {
    weekNumber: number
    matchups: { homeTeamId: string; awayTeamId: string }[]
  }[]
  standings: {
    teamId: string
    wins: number
    losses: number
    pointDiff: number
  }[]
  bracket: BracketSlot[]
  champion: string | null
  awards: SeasonAward[]
}

export const simSeason = (
  teams: TeamSeat[],
  playersById: Map<string, Player>,
  seed: number,
  schedule: Matchup[][],
): SeasonResult => {
  const results: GameResult[] = []
  const weeks: SeasonResult['weeks'] = []
  const teamById = new Map(teams.map((t) => [t.id, t]))

  schedule.forEach((round, weekIdx) => {
    const weekNumber = weekIdx + 1
    weeks.push({
      weekNumber,
      matchups: round.map((m) => ({
        homeTeamId: m.home,
        awayTeamId: m.away,
      })),
    })
    round.forEach((m, gameIdx) => {
      const home = teamById.get(m.home)
      const away = teamById.get(m.away)
      if (!home || !away) return
      const gameSeed = seed + weekNumber * 10000 + gameIdx
      results.push(simGame(home, away, playersById, gameSeed, weekNumber))
    })
  })

  type RecRow = { wins: number; losses: number; pointDiff: number }
  const recordById = new Map<string, RecRow>()
  for (const t of teams) {
    recordById.set(t.id, { wins: 0, losses: 0, pointDiff: 0 })
  }
  for (const r of results) {
    const home = recordById.get(r.homeTeamId)
    const away = recordById.get(r.awayTeamId)
    if (!home || !away) continue
    home.pointDiff += r.homeScore - r.awayScore
    away.pointDiff += r.awayScore - r.homeScore
    if (r.homeScore > r.awayScore) {
      home.wins++
      away.losses++
    } else if (r.awayScore > r.homeScore) {
      away.wins++
      home.losses++
    } else {
      home.wins += 0.5
      away.wins += 0.5
    }
  }

  const standings = teams
    .map((t) => ({ teamId: t.id, ...recordById.get(t.id)! }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointDiff - a.pointDiff
    })

  const seeds = standings.slice(0, 4).map((s) => teamById.get(s.teamId)!)

  const semi1Seed = seed + 999_000
  const semi2Seed = seed + 999_001
  const finalSeed = seed + 999_999

  // Semis: higher seed hosts (home-field applies)
  const semi1 = simGame(seeds[0], seeds[3], playersById, semi1Seed, 8)
  const semi2 = simGame(seeds[1], seeds[2], playersById, semi2Seed, 8)
  const semi1WinnerId =
    semi1.homeScore >= semi1.awayScore ? semi1.homeTeamId : semi1.awayTeamId
  const semi2WinnerId =
    semi2.homeScore >= semi2.awayScore ? semi2.homeTeamId : semi2.awayTeamId

  // Championship: neutral site (no home-field)
  const finalGame = simGame(
    teamById.get(semi1WinnerId)!,
    teamById.get(semi2WinnerId)!,
    playersById,
    finalSeed,
    9,
    true,
  )
  const champion =
    finalGame.homeScore >= finalGame.awayScore
      ? finalGame.homeTeamId
      : finalGame.awayTeamId

  const bracket: BracketSlot[] = [
    {
      matchupId: 'semi-1',
      round: 'semifinal',
      teamAId: seeds[0].id,
      teamBId: seeds[3].id,
      winnerId: semi1WinnerId,
      result: semi1,
      quarterScores: splitGameByQuarter(
        semi1.homeScore,
        semi1.awayScore,
        semi1Seed + 11,
      ),
    },
    {
      matchupId: 'semi-2',
      round: 'semifinal',
      teamAId: seeds[1].id,
      teamBId: seeds[2].id,
      winnerId: semi2WinnerId,
      result: semi2,
      quarterScores: splitGameByQuarter(
        semi2.homeScore,
        semi2.awayScore,
        semi2Seed + 11,
      ),
    },
    {
      matchupId: 'final',
      round: 'final',
      teamAId: semi1WinnerId,
      teamBId: semi2WinnerId,
      winnerId: champion,
      result: finalGame,
      quarterScores: splitGameByQuarter(
        finalGame.homeScore,
        finalGame.awayScore,
        finalSeed + 11,
      ),
    },
  ]

  const awards = computeAwards(teams, standings, playersById)

  return { results, weeks, standings, bracket, champion, awards }
}
