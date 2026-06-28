export const CURRENT_SCHEMA_VERSION = 1

export type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'OL'
  | 'DE' | 'DT' | 'LB' | 'CB' | 'S' | 'K'

export const ALL_POSITIONS: Position[] = [
  'QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K',
]

export type Tier = 'S' | 'A' | 'B' | 'C'

export type PlayerCore = {
  id: string
  name: string
  nflTeam: string
  position: Position
  photoUrl: string
  status: 'active' | 'retired' | 'cut'
  yearsExp: number
}

export type PlayerRating = {
  id: string
  value: number
  subscores: Record<string, number>
  tier: Tier
  archetype: string | null
  notes: string
  needsRating: boolean
}

export type Player = PlayerCore & PlayerRating

export const ROSTER_SLOTS: Position[] = [
  'QB',
  'RB',
  'WR', 'WR',
  'TE',
  'OL', 'OL', 'OL', 'OL', 'OL',
  'DE', 'DT', 'LB',
  'CB', 'CB',
  'S',
  'K',
]

export const ROSTER_SIZE = ROSTER_SLOTS.length

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

export type SeasonAward = {
  id: 'MVP' | 'OPOY' | 'DPOY' | 'OROY' | 'DROY' | 'GM_OF_YEAR'
  name: string
  emoji: string
  winnerPlayerId: string | null
  winnerName: string
  winnerPhotoUrl?: string
  teamId: string
  teamName: string
  teamColor: string
  position: string
  reason: string
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
  // Week-by-week reveal: 0 = nothing shown, 1..7 = that many reg-season weeks
  // revealed, 8 = semifinals revealed, 9 = final revealed.
  revealedThrough?: number
  awards?: SeasonAward[]
}

export type LeagueScreen =
  | 'landing'
  | 'setup'
  | 'draft'
  | 'grade'
  | 'season'
  | 'bracket'
  | 'trophy'

export type Game = {
  schemaVersion: number
  id: string
  name: string
  createdAt: string
  seed: number
  screen: LeagueScreen
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
  screen: 'landing',
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
