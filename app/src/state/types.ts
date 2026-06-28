export const CURRENT_SCHEMA_VERSION = 1

export type TeamSeat = {
  id: string
  name: string
  color: string
  isComputer: boolean
  ownerName?: string
  roster: (string | null)[]
  grade?: { letter: string; score: number }
  record?: {
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
  }
}

export type DraftPick = {
  pickNumber: number
  round: number
  teamId: string
  playerId: string | null
}

export type Draft = {
  order: string[]
  picks: DraftPick[]
  status: 'pending' | 'in_progress' | 'complete'
  currentPickIdx: number
  queueByTeam: Record<string, string[]>
}

export type GameResult = {
  weekNumber: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  headline?: string
}

export type BracketSlot = {
  matchupId: string
  round: 'semifinal' | 'final'
  teamAId: string | null
  teamBId: string | null
  winnerId: string | null
  result?: GameResult
}

export type Season = {
  weeks: {
    weekNumber: number
    matchups: { homeTeamId: string; awayTeamId: string }[]
  }[]
  results: GameResult[]
  standings: {
    teamId: string
    wins: number
    losses: number
    pointDiff: number
  }[]
  bracket: BracketSlot[]
  champion: string | null
  status: 'not_started' | 'regular_season' | 'playoffs' | 'complete'
}

export type Game = {
  schemaVersion: number
  id: string
  name: string
  createdAt: string
  seed: number
  teams: TeamSeat[]
  draft: Draft
  season: Season
}

export const createEmptyGame = (id: string, name: string, seed: number): Game => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id,
  name,
  createdAt: new Date().toISOString(),
  seed,
  teams: [],
  draft: {
    order: [],
    picks: [],
    status: 'pending',
    currentPickIdx: 0,
    queueByTeam: {},
  },
  season: {
    weeks: [],
    results: [],
    standings: [],
    bracket: [],
    champion: null,
    status: 'not_started',
  },
})
