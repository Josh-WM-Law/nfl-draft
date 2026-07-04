export const CURRENT_SCHEMA_VERSION = 3

export type Position =
  | 'QB' | 'RB' | 'WR' | 'TE'
  | 'OT' | 'OG' | 'C'
  | 'DE' | 'DT' | 'LB' | 'CB' | 'S' | 'K'

export const ALL_POSITIONS: Position[] = [
  'QB', 'RB', 'WR', 'TE',
  'OT', 'OG', 'C',
  'DE', 'DT', 'LB', 'CB', 'S', 'K',
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
  // Populated when a dynasty is initialized; used for retirement +
  // development curves. Missing = treated as ~24 by the offseason engine.
  age?: number
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

// Roster shape: 18 positional starters followed by 2 flex bench slots. The
// starter slots contribute to team strength, sim, and grade; bench slots are
// stash spots for rookies / long-term prospects and are inert until they get
// promoted (which today only happens via keeper selection each offseason).
export type RosterSlotType = Position | 'BENCH'

export const ROSTER_SLOTS: RosterSlotType[] = [
  'QB',
  'RB',
  'WR', 'WR',
  'TE',
  'OT', 'OT',
  'OG', 'OG',
  'C',
  'DE', 'DT',
  'LB', 'LB',
  'CB', 'CB',
  'S',
  'K',
  'BENCH', 'BENCH',
]

export const STARTER_ROSTER_SIZE = 18
export const BENCH_ROSTER_SIZE = 2
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
  // Lottery reveal: 0 = nothing revealed, N = bottom N picks revealed (so
  // when N=8, all 8 picks have been shown, starting from #8 down to #1).
  orderRevealedCount?: number
}

export type PlayerFeature = {
  playerId: string
  playerName: string
  position: Position
  statLine: string
}

export type GameResult = {
  weekNumber: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  headline?: string
  offensiveFeature?: PlayerFeature
  defensiveFeature?: PlayerFeature
}

export type QuarterScore = { home: number; away: number }

export type BracketSlot = {
  matchupId: string
  round: 'semifinal' | 'final'
  teamAId: string | null
  teamBId: string | null
  winnerId: string | null
  result?: GameResult
  quarterScores?: QuarterScore[]
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
  // Playoff quarter reveal (0..4). Semis advance in lockstep, then the
  // championship. revealedThrough still records the high-water mark.
  semisQuarter?: number
  finalQuarter?: number
  awards?: SeasonAward[]
}

export type LeagueScreen =
  | 'landing'
  | 'nfl_team_selection'
  | 'coach_creation'
  | 'setup'
  | 'draft_order'
  | 'draft'
  | 'grade'
  | 'season'
  | 'bracket'
  | 'trophy'
  | 'offseason_summary'
  | 'keeper_selection'
  | 'dynasty_hub'

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
  // User-created players (from customPlayers via localStorage) whose IDs are
  // in this list are kept out of THIS league's draft pool. Missing = none
  // excluded. Only meaningful while draft.status === 'pending'.
  excludedUserPlayerIds?: string[]
  // Screen to return to when the user closes the Dynasty Hub. Written by
  // openDynastyHub, cleared by closeDynastyHub.
  screenBeforeHub?: LeagueScreen
  // Present only in salary-cap dynasties. Each team gets this budget (in $M)
  // to spend on their roster this draft year. Not set = uncapped mode.
  capBudget?: number
}

export const CURRENT_DYNASTY_SCHEMA_VERSION = 3

export type CoachTrait =
  | 'offensive_guru'
  | 'defensive_mastermind'
  | 'talent_evaluator'
  | 'player_developer'
  | 'motivator'
  | 'special_teams_ace'

export const COACH_TRAIT_LABELS: Record<CoachTrait, string> = {
  offensive_guru: 'Offensive Guru',
  defensive_mastermind: 'Defensive Mastermind',
  talent_evaluator: 'Talent Evaluator',
  player_developer: 'Player Developer',
  motivator: 'Motivator',
  special_teams_ace: 'Special Teams Ace',
}

export const COACH_TRAIT_DESCRIPTIONS: Record<CoachTrait, string> = {
  offensive_guru: 'Small offensive boost in sim.',
  defensive_mastermind: 'Small defensive boost in sim.',
  talent_evaluator: 'Better draft-pick suggestions.',
  player_developer: 'Larger young-player gains each offseason.',
  motivator: 'Edge in close, late-game situations.',
  special_teams_ace: 'Kicker + return game boost.',
}

export type Coach = {
  name: string
  traits: CoachTrait[]
  createdAt: string
}

export type SeasonResult = {
  year: number
  championTeamId: string | null
  runnerUpTeamId: string | null
  userGrade?: { letter: string; score: number }
  awards: SeasonAward[]
  finalStandings: {
    teamId: string
    teamName: string
    wins: number
    losses: number
    pointDiff: number
  }[]
  draftGrade?: { letter: string; score: number }
}

export type DynastySnapshot = {
  id: string
  name: string
  createdAt: string
  atYear: number
  // Frozen JSON of the dynasty at snapshot time (excluding its own snapshots
  // list to keep it flat).
  snapshotJson: string
}

export type OffseasonEvent = {
  type: 'retired' | 'improved' | 'regressed'
  playerId: string
  playerName: string
  position: Position
  fromValue?: number
  toValue?: number
  age?: number
  reason?: string
}

export type OffseasonReport = {
  atYear: number
  retirements: OffseasonEvent[]
  developments: OffseasonEvent[]
  rookies: Player[]
}

export type PlayerCareer = {
  playerId: string
  playerName: string
  position: Position
  peakValue: number
  status: 'active' | 'retired'
  championshipYears: number[]
  awardYears: { year: number; awardId: SeasonAward['id'] }[]
  yearsOnUserTeam: number[]
}

export type Dynasty = {
  schemaVersion: number
  id: string
  name: string
  createdAt: string
  updatedAt: string
  userTeamId: string
  coach: Coach | null
  currentYear: number
  // When true, every draft this dynasty enforces a per-team salary cap
  // (Game.capBudget) so users can't stockpile 90+ OVR at every position.
  capMode?: boolean
  currentGame: Game
  history: SeasonResult[]
  snapshots: DynastySnapshot[]
  // The living player pool for this dynasty (base + custom + rookies,
  // minus retirees, with ratings/ages that evolve each offseason).
  livePool: Player[]
  // Populated during the keeper_selection screen. Missing entries fall back
  // to top-4 starters + top-2 bench at confirm time.
  pendingKeepers?: Record<
    string,
    { starters: string[]; bench: string[] }
  >
  // Latest offseason report — drives the offseason summary screen.
  lastOffseason?: OffseasonReport
  // Career-long stats accumulated across every offseason. Keyed by playerId.
  playerCareerStats?: Record<string, PlayerCareer>
  // Salary-cap dynasties only: current locked-in salary (in $M) for each
  // player currently on any team's roster. Fresh draft signings enter at
  // priceOf(value); kept players carry their prior salary forward capped at
  // 15% year-over-year growth, so developing a rookie into a star gives the
  // owner huge value. Players who go back to the pool drop their entry.
  // Missing entry (or non-cap dynasty) → fall back to priceOf(value).
  playerSalaries?: Record<string, number>
}

export const createEmptyDynasty = (
  id: string,
  name: string,
  userTeamId: string,
  firstGame: Game,
  livePool: Player[],
): Dynasty => {
  const now = new Date().toISOString()
  return {
    schemaVersion: CURRENT_DYNASTY_SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    userTeamId,
    coach: null,
    currentYear: 1,
    currentGame: firstGame,
    history: [],
    snapshots: [],
    livePool,
  }
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
    orderRevealedCount: 0,
  },
  season: {
    weeks: [],
    results: [],
    standings: [],
    bracket: [],
    champion: null,
    status: 'not_started',
  },
  excludedUserPlayerIds: [],
})
