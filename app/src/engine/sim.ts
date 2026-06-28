import type {
  TeamSeat,
  Player,
  GameResult,
  BracketSlot,
  SeasonAward,
} from '../state/types'
import {
  teamStrength,
  passMatchupEdge,
  runMatchupEdge,
} from './teamStrength'
import { makeRng } from './rng'
import type { Matchup } from './schedule'
import { computeAwards } from './awards'

const BASELINE_SCORE = 17
const STRENGTH_SCALE = 20
const MATCHUP_SCALE = 15
const NOISE_AMPLITUDE = 4

const buildHeadline = (
  aPass: number,
  aRun: number,
  bPass: number,
  bRun: number,
  scoreA: number,
  scoreB: number,
): string => {
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

export const simGame = (
  teamA: TeamSeat,
  teamB: TeamSeat,
  playersById: Map<string, Player>,
  seed: number,
  weekNumber = 1,
): GameResult => {
  const rng = makeRng(seed)

  const aOff = teamStrength(teamA, playersById, 'offense')
  const aDef = teamStrength(teamA, playersById, 'defense')
  const bOff = teamStrength(teamB, playersById, 'offense')
  const bDef = teamStrength(teamB, playersById, 'defense')

  const aPass = passMatchupEdge(teamA, teamB, playersById)
  const aRun = runMatchupEdge(teamA, teamB, playersById)
  const bPass = passMatchupEdge(teamB, teamA, playersById)
  const bRun = runMatchupEdge(teamB, teamA, playersById)

  let scoreA = BASELINE_SCORE
  scoreA += (aOff - bDef) / STRENGTH_SCALE
  scoreA += (aPass + aRun) / MATCHUP_SCALE
  scoreA += (rng() - 0.5) * 2 * NOISE_AMPLITUDE

  let scoreB = BASELINE_SCORE
  scoreB += (bOff - aDef) / STRENGTH_SCALE
  scoreB += (bPass + bRun) / MATCHUP_SCALE
  scoreB += (rng() - 0.5) * 2 * NOISE_AMPLITUDE

  scoreA = Math.max(0, Math.round(scoreA))
  scoreB = Math.max(0, Math.round(scoreB))

  return {
    weekNumber,
    homeTeamId: teamA.id,
    awayTeamId: teamB.id,
    homeScore: scoreA,
    awayScore: scoreB,
    headline: buildHeadline(aPass, aRun, bPass, bRun, scoreA, scoreB),
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

  const semi1 = simGame(seeds[0], seeds[3], playersById, semi1Seed, 8)
  const semi2 = simGame(seeds[1], seeds[2], playersById, semi2Seed, 8)
  const semi1WinnerId =
    semi1.homeScore >= semi1.awayScore ? semi1.homeTeamId : semi1.awayTeamId
  const semi2WinnerId =
    semi2.homeScore >= semi2.awayScore ? semi2.homeTeamId : semi2.awayTeamId

  const finalGame = simGame(
    teamById.get(semi1WinnerId)!,
    teamById.get(semi2WinnerId)!,
    playersById,
    finalSeed,
    9,
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
    },
    {
      matchupId: 'semi-2',
      round: 'semifinal',
      teamAId: seeds[1].id,
      teamBId: seeds[2].id,
      winnerId: semi2WinnerId,
      result: semi2,
    },
    {
      matchupId: 'final',
      round: 'final',
      teamAId: semi1WinnerId,
      teamBId: semi2WinnerId,
      winnerId: champion,
      result: finalGame,
    },
  ]

  const awards = computeAwards(teams, standings, playersById)

  return { results, weeks, standings, bracket, champion, awards }
}
