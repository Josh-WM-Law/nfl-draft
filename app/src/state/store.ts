import { create } from 'zustand'
import {
  type Game,
  type Player,
  type LeagueScreen,
  type TeamSeat,
  type Dynasty,
  type DynastySnapshot,
  type Coach,
  type CoachTrait,
  type SeasonResult,
  type OffseasonReport,
  type PlayerCareer,
  ROSTER_SIZE,
  createEmptyGame,
  createEmptyDynasty,
} from './types'
import {
  saveGame,
  loadGame,
  deleteGame,
  saveDynasty,
  loadDynasty,
  deleteDynasty as persistDeleteDynasty,
  getActiveDynastyId,
  setActiveDynastyId,
  clearActiveDynastyId,
  listDynastyIds,
} from './persistence'
import { loadAllPlayers } from '../data/loadPlayers'
import {
  buildUserPlayer,
  loadUserPlayers,
  saveUserPlayers,
  type CreateUserPlayerInput,
  type UserPlayer,
} from '../data/userPlayers'
import {
  generatePicks,
  pickForCPU,
  canTeamPick,
  canTeamStart,
  canTeamBench,
  fillSlot,
  fillBench,
  shuffleArray,
} from '../engine/draft'
import { computeGrades } from '../engine/grade'
import { makeRng } from '../engine/rng'
import { simSeason } from '../engine/sim'
import { roundRobinSchedule } from '../engine/schedule'
import {
  withInitialAges,
  rollRetirements,
  developPlayers,
  generateRookieClass,
  pickTopKeepers,
  rosterWithKeepers,
} from '../engine/offseason'
import { NFL_TEAMS, NFL_TEAM_BY_ID } from '../data/nflTeams'
import {
  CAP_BUDGET_M,
  canAffordPlayer,
  priceOf,
  nextKeeperSalary,
} from '../engine/salaryCap'

const DEFAULT_GAME_ID = 'default'
const TEAM_COLORS = [
  '#0a84ff', '#ff453a', '#30d158', '#ffd60a',
  '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f',
]

export type LeagueMode = 'quick' | 'dynasty'

type Store = {
  players: Player[]
  playersById: Map<string, Player>
  userPlayers: UserPlayer[]
  mode: LeagueMode | null
  dynasty: Dynasty | null
  dynastyIds: string[]
  game: Game | null
  lastPickSnapshot: Game | null
  initialize: () => void
  startNewLeague: (humanCount?: number) => void
  startDynasty: (
    dynastyName: string,
    humanCount?: number,
    capMode?: boolean,
  ) => void
  resumeDynasty: (id: string) => void
  pickNflTeam: (nflTeamId: string) => void
  setCoach: (name: string, traits: CoachTrait[]) => void
  exitToLanding: () => void
  setScreen: (screen: LeagueScreen) => void
  updateTeam: (teamId: string, patch: { name?: string; color?: string }) => void
  setHumanCount: (count: number) => void
  revealDraftOrder: () => void
  revealNextOrderPick: () => void
  beginDraft: () => void
  makePick: (playerId: string, target?: 'starter' | 'bench') => void
  undoLastPick: () => void
  simRestOfDraft: () => void
  playSeason: (mode?: 'weekly' | 'instant') => void
  advanceReveal: () => void
  advanceSemisQuarter: () => void
  advanceFinalQuarter: () => void
  addUserPlayer: (input: CreateUserPlayerInput) => void
  removeUserPlayer: (id: string) => void
  toggleUserPlayerInclusion: (id: string) => void
  startOffseason: () => void
  advanceToKeepers: () => void
  toggleKeeper: (playerId: string, source: 'starter' | 'bench') => void
  confirmKeepers: () => void
  openDynastyHub: () => void
  closeDynastyHub: () => void
  createSnapshot: (name?: string) => void
  loadSnapshot: (id: string) => void
  deleteSnapshot: (id: string) => void
  leaveDynasty: () => void
}

const usedPlayerIds = (game: Game): Set<string> => {
  const used = new Set<string>()
  for (const t of game.teams) {
    for (const pid of t.roster) {
      if (pid) used.add(pid)
    }
  }
  return used
}

const availablePool = (game: Game, playersById: Map<string, Player>): Player[] => {
  const used = usedPlayerIds(game)
  const excluded = new Set(game.excludedUserPlayerIds ?? [])
  return Array.from(playersById.values()).filter(
    (p) => !used.has(p.id) && !excluded.has(p.id),
  )
}

// Only the user has a coach in Phase 2. CPU teams pass `null` implicitly via
// the missing map entry, so all downstream effects fall back to no-op.
const buildCoachMap = (
  dynasty: Dynasty | null,
): Map<string, Coach | null> | undefined => {
  if (!dynasty || !dynasty.coach) return undefined
  const map = new Map<string, Coach | null>()
  map.set(dynasty.userTeamId, dynasty.coach)
  return map
}

// Result of advancing the draft through 0+ CPU picks. When cap mode is on we
// also return the new salaries recorded during this advance so the caller
// can merge them into the dynasty.
type AdvanceResult = {
  game: Game
  addedSalaries: Record<string, number>
}

const advanceAfterPick = (
  game: Game,
  playersById: Map<string, Player>,
  salaries: Record<string, number>,
  coachByTeamId?: Map<string, Coach | null>,
): AdvanceResult => {
  let g = game
  const workingSalaries: Record<string, number> = { ...salaries }
  const added: Record<string, number> = {}
  while (g.draft.currentPickIdx < g.draft.picks.length) {
    const currentPick = g.draft.picks[g.draft.currentPickIdx]
    const team = g.teams.find((t) => t.id === currentPick.teamId)
    if (!team) break
    if (!team.isComputer) break
    const rng = makeRng(g.seed + g.draft.currentPickIdx * 7919)
    const pool = availablePool(g, playersById)
    const budgetCtx = g.capBudget
      ? { budget: g.capBudget, playersById, salaries: workingSalaries }
      : undefined
    const cpuChoice = pickForCPU(team, pool, rng, budgetCtx)
    const pickedId = cpuChoice.playerId
    const player = playersById.get(pickedId)!
    const teamIdx = g.teams.findIndex((t) => t.id === team.id)
    const newTeams = g.teams.slice()
    newTeams[teamIdx] =
      cpuChoice.target === 'bench'
        ? fillBench(team, pickedId)
        : fillSlot(team, pickedId, player.position)
    const newPicks = g.draft.picks.slice()
    newPicks[g.draft.currentPickIdx] = { ...currentPick, playerId: pickedId }
    // Salary: locked-in (keeper) if already present, else market price now.
    if (g.capBudget != null && workingSalaries[pickedId] == null) {
      const signed = priceOf(player.value)
      workingSalaries[pickedId] = signed
      added[pickedId] = signed
    }
    g = {
      ...g,
      teams: newTeams,
      draft: {
        ...g.draft,
        picks: newPicks,
        currentPickIdx: g.draft.currentPickIdx + 1,
      },
    }
  }
  if (g.draft.currentPickIdx >= g.draft.picks.length) {
    const gradedTeams = computeGrades(g.teams, playersById, coachByTeamId)
    g = {
      ...g,
      teams: gradedTeams,
      draft: { ...g.draft, status: 'complete' },
      screen: 'grade',
    }
  }
  return { game: g, addedSalaries: added }
}

// In dynasty mode, the truth of the current season lives on
// `dynasty.currentGame`. This helper writes an updated Game to whichever
// storage backs the active mode, so mutation actions don't have to branch.
const persistGame = (
  updatedGame: Game,
  get: () => Store,
  set: (partial: Partial<Store>) => void,
): void => {
  const { dynasty, mode } = get()
  if (mode === 'dynasty' && dynasty) {
    const nextDynasty: Dynasty = {
      ...dynasty,
      currentGame: updatedGame,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty } as Partial<Store>)
  } else {
    saveGame(updatedGame)
  }
}

// Persist the result of advancing the draft: merge any newly-signed salaries
// into the dynasty as well as writing the updated Game. In non-dynasty mode
// the salaries payload is ignored (Quick League has no cap).
const commitAdvance = (
  advanced: AdvanceResult,
  get: () => Store,
  set: (partial: Partial<Store>) => void,
): void => {
  const { dynasty, mode } = get()
  if (mode === 'dynasty' && dynasty) {
    const mergedSalaries = {
      ...(dynasty.playerSalaries ?? {}),
      ...advanced.addedSalaries,
    }
    const nextDynasty: Dynasty = {
      ...dynasty,
      currentGame: advanced.game,
      playerSalaries: mergedSalaries,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty, game: advanced.game } as Partial<Store>)
  } else {
    saveGame(advanced.game)
    set({ game: advanced.game } as Partial<Store>)
  }
}

export const useStore = create<Store>()((set, get) => ({
  players: [],
  playersById: new Map(),
  userPlayers: [],
  mode: null,
  dynasty: null,
  dynastyIds: [],
  game: null,
  lastPickSnapshot: null,

  initialize: () => {
    if (get().players.length > 0) return
    const basePlayers = loadAllPlayers()
    const userPlayers = loadUserPlayers()
    const dynastyIds = listDynastyIds()
    set({ userPlayers, dynastyIds })
    // Priority: an active dynasty resumes automatically, otherwise fall back
    // to whatever Quick League save might exist.
    const activeDynastyId = getActiveDynastyId()
    if (activeDynastyId) {
      try {
        const dynasty = loadDynasty(activeDynastyId)
        if (dynasty) {
          // In dynasty mode, the player pool is the dynasty's livePool —
          // aged, developed, with rookies. Base is ignored.
          const players = dynasty.livePool
          const playersById = new Map(players.map((p) => [p.id, p]))
          set({
            dynasty,
            game: dynasty.currentGame,
            mode: 'dynasty',
            players,
            playersById,
          })
          return
        }
      } catch (e) {
        console.warn(
          'Could not restore active dynasty (likely schema mismatch); clearing it:',
          e,
        )
        clearActiveDynastyId()
      }
    }
    const playersById = new Map(basePlayers.map((p) => [p.id, p]))
    set({ players: basePlayers, playersById })
    try {
      const saved = loadGame(DEFAULT_GAME_ID)
      if (saved) set({ game: saved, mode: 'quick' })
    } catch (e) {
      console.warn('Could not restore saved game (likely schema mismatch); clearing it:', e)
      deleteGame(DEFAULT_GAME_ID)
    }
  },

  addUserPlayer: (input) => {
    const player = buildUserPlayer(input)
    const { userPlayers, players, playersById } = get()
    const nextUser = [...userPlayers, player]
    const flat: Player = { ...player.core, ...player.rating }
    const nextPlayers = [...players, flat]
    const nextById = new Map(playersById)
    nextById.set(flat.id, flat)
    saveUserPlayers(nextUser)
    set({ userPlayers: nextUser, players: nextPlayers, playersById: nextById })
  },

  removeUserPlayer: (id) => {
    const { userPlayers, players, playersById, game } = get()
    // Can't yank a player out from under an in-flight draft that already
    // picked them, so silently no-op in that case.
    if (game) {
      for (const t of game.teams) {
        if (t.roster.includes(id)) return
      }
    }
    const nextUser = userPlayers.filter((u) => u.core.id !== id)
    const nextPlayers = players.filter((p) => p.id !== id)
    const nextById = new Map(playersById)
    nextById.delete(id)
    saveUserPlayers(nextUser)
    set({ userPlayers: nextUser, players: nextPlayers, playersById: nextById })
  },

  toggleUserPlayerInclusion: (id) => {
    const { game } = get()
    if (!game) return
    // Locked once the draft is under way — otherwise CPU/human state gets
    // ambiguous mid-draft.
    if (game.draft.status !== 'pending') return
    const current = new Set(game.excludedUserPlayerIds ?? [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    const updated: Game = {
      ...game,
      excludedUserPlayerIds: Array.from(current),
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  startNewLeague: (humanCount = 1) => {
    const seed = Math.floor(Math.random() * 1_000_000)
    const game = createEmptyGame(DEFAULT_GAME_ID, 'Brothers League', seed)
    const teams: TeamSeat[] = Array.from({ length: 8 }, (_, i) => ({
      id: `team-${i + 1}`,
      name:
        i < humanCount
          ? i === 0
            ? 'You'
            : `Player ${i + 1}`
          : `CPU ${i - humanCount + 1}`,
      color: TEAM_COLORS[i],
      isComputer: i >= humanCount,
      roster: Array(ROSTER_SIZE).fill(null),
    }))
    game.teams = teams
    game.draft.order = teams.map((t) => t.id)
    game.draft.picks = generatePicks(game.draft.order, ROSTER_SIZE)
    game.screen = 'setup'
    clearActiveDynastyId()
    // Reset the store's player pool back to base — if we just came out of a
    // dynasty, `players` still holds that dynasty's livePool.
    const basePool = loadAllPlayers()
    set({
      game,
      dynasty: null,
      mode: 'quick',
      lastPickSnapshot: null,
      players: basePool,
      playersById: new Map(basePool.map((p) => [p.id, p])),
    })
    saveGame(game)
  },

  startDynasty: (dynastyName, humanCount = 1, capMode = false) => {
    const seed = Math.floor(Math.random() * 1_000_000)
    const gameId = `dyn-${Date.now().toString(36)}-y1`
    const game = createEmptyGame(gameId, dynastyName, seed)
    if (capMode) game.capBudget = CAP_BUDGET_M
    const teams: TeamSeat[] = Array.from({ length: 8 }, (_, i) => ({
      id: `team-${i + 1}`,
      name:
        i < humanCount
          ? i === 0
            ? 'You'
            : `Player ${i + 1}`
          : `CPU ${i - humanCount + 1}`,
      color: TEAM_COLORS[i],
      isComputer: i >= humanCount,
      roster: Array(ROSTER_SIZE).fill(null),
    }))
    game.teams = teams
    game.draft.order = teams.map((t) => t.id)
    game.draft.picks = generatePicks(game.draft.order, ROSTER_SIZE)
    // Dynasty first stop: pick an NFL team. Coach hire + setup follow.
    game.screen = 'nfl_team_selection'
    // Snapshot the pool with initial ages so retirement/development curves
    // have something to work with once the offseason hits.
    const basePool = get().players.length > 0 ? get().players : loadAllPlayers()
    const livePool = withInitialAges(basePool)
    const dynastyId = `dyn-${Date.now().toString(36)}`
    const dynasty: Dynasty = {
      ...createEmptyDynasty(
        dynastyId,
        dynastyName || 'My Dynasty',
        'team-1',
        game,
        livePool,
      ),
      capMode,
    }
    saveDynasty(dynasty)
    setActiveDynastyId(dynastyId)
    set({
      dynasty,
      game,
      mode: 'dynasty',
      dynastyIds: listDynastyIds(),
      lastPickSnapshot: null,
      players: livePool,
      playersById: new Map(livePool.map((p) => [p.id, p])),
    })
  },

  setCoach: (name, traits) => {
    const { dynasty, game } = get()
    if (!dynasty || !game) return
    // Guard against accidental over/undercount at the call site.
    const clean = traits.slice(0, 2)
    const coach: Coach = {
      name: name.trim() || 'Coach',
      traits: clean,
      createdAt: new Date().toISOString(),
    }
    const updatedGame: Game = { ...game, screen: 'setup' }
    const nextDynasty: Dynasty = {
      ...dynasty,
      coach,
      currentGame: updatedGame,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty, game: updatedGame })
  },

  resumeDynasty: (id) => {
    const dynasty = loadDynasty(id)
    if (!dynasty) return
    setActiveDynastyId(id)
    set({
      dynasty,
      game: dynasty.currentGame,
      mode: 'dynasty',
      lastPickSnapshot: null,
      players: dynasty.livePool,
      playersById: new Map(dynasty.livePool.map((p) => [p.id, p])),
    })
  },

  pickNflTeam: (nflTeamId) => {
    const { game, dynasty } = get()
    if (!game || !dynasty) return
    const chosen = NFL_TEAM_BY_ID.get(nflTeamId)
    if (!chosen) return

    // Assign remaining 7 CPU teams uniquely from the other 31 NFL franchises.
    const others = NFL_TEAMS.filter((t) => t.id !== chosen.id)
    // Fisher-Yates on a fresh copy.
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = others[i]
      others[i] = others[j]
      others[j] = tmp
    }
    const cpuTeams = others.slice(0, game.teams.length - 1)

    const newTeams = game.teams.map((t, i) => {
      if (i === 0) {
        return { ...t, name: chosen.nickname, color: chosen.primaryColor }
      }
      const cpu = cpuTeams[i - 1]
      return { ...t, name: cpu.nickname, color: cpu.primaryColor }
    })

    const updatedGame: Game = {
      ...game,
      teams: newTeams,
      screen: 'coach_creation',
    }
    const nextDynasty: Dynasty = {
      ...dynasty,
      currentGame: updatedGame,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty, game: updatedGame })
  },

  startOffseason: () => {
    const { game, dynasty, mode } = get()
    if (!game || !dynasty || mode !== 'dynasty') return

    // Snapshot the season we just finished into history.
    const finalMatch = game.season.bracket.find((b) => b.round === 'final')
    let runnerUpTeamId: string | null = null
    if (finalMatch) {
      runnerUpTeamId =
        finalMatch.winnerId === finalMatch.teamAId
          ? finalMatch.teamBId
          : finalMatch.teamAId
    }
    const userTeam = game.teams.find((t) => t.id === dynasty.userTeamId)
    const seasonRecord: SeasonResult = {
      year: dynasty.currentYear,
      championTeamId: game.season.champion,
      runnerUpTeamId,
      awards: game.season.awards ?? [],
      finalStandings: game.season.standings.map((s) => {
        const t = game.teams.find((x) => x.id === s.teamId)
        return {
          teamId: s.teamId,
          teamName: t?.name ?? s.teamId,
          wins: s.wins,
          losses: s.losses,
          pointDiff: s.pointDiff,
        }
      }),
      userGrade: userTeam?.grade,
      draftGrade: userTeam?.grade,
    }

    // Anything currently on any roster is potentially retirable; but the
    // full livePool is aged/developed regardless (rookies from the last
    // year's class are in there too).
    const seed = game.seed + 100_000 * dynasty.currentYear
    const retResult = rollRetirements(dynasty.livePool, seed)
    const championTeam = game.teams.find(
      (t) => t.id === game.season.champion,
    )
    const championRoster = championTeam
      ? (championTeam.roster.filter((x): x is string => !!x))
      : []
    const userRoster = userTeam
      ? (userTeam.roster.filter((x): x is string => !!x))
      : []
    const devResult = developPlayers(
      retResult.survivors,
      game.season.awards ?? [],
      championRoster,
      userRoster,
      dynasty.coach ?? null,
      seed + 1,
    )
    const existingIds = new Set(devResult.players.map((p) => p.id))
    const rookies = generateRookieClass(
      dynasty.currentYear + 1,
      seed + 2,
      existingIds,
    )
    const nextPool = [...devResult.players, ...rookies]
    const nextPlayersById = new Map(nextPool.map((p) => [p.id, p]))

    // ----- Career stats (Phase 4) -----
    // Update peak values, championship years, award years, and user-team
    // years for every player who was on a roster last season. Rookies get a
    // fresh career entry. Retirees are marked retired.
    const userRosterIds = new Set<string>(userRoster)
    const champRosterIds = new Set<string>(championRoster)
    const awardWinnerByPid = new Map<
      string,
      SeasonResult['awards'][number]['id']
    >()
    for (const a of game.season.awards ?? []) {
      if (a.winnerPlayerId) awardWinnerByPid.set(a.winnerPlayerId, a.id)
    }
    const stats: Record<string, PlayerCareer> = {
      ...(dynasty.playerCareerStats ?? {}),
    }
    const upsertCareer = (p: Player, forceInit = false): PlayerCareer => {
      const existing = stats[p.id]
      if (existing && !forceInit) {
        existing.playerName = p.name
        existing.position = p.position
        if (p.value > existing.peakValue) existing.peakValue = p.value
        return existing
      }
      const fresh: PlayerCareer = {
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        peakValue: p.value,
        status: 'active',
        championshipYears: [],
        awardYears: [],
        yearsOnUserTeam: [],
      }
      stats[p.id] = fresh
      return fresh
    }
    // Snapshot pre-retirement livePool (still the season-just-played roster
    // ratings). Peak update runs BEFORE development so a peak from last year
    // isn't overwritten by regression.
    for (const p of dynasty.livePool) {
      const c = upsertCareer(p)
      if (userRosterIds.has(p.id)) c.yearsOnUserTeam.push(dynasty.currentYear)
      if (champRosterIds.has(p.id))
        c.championshipYears.push(dynasty.currentYear)
      const awardId = awardWinnerByPid.get(p.id)
      if (awardId) c.awardYears.push({ year: dynasty.currentYear, awardId })
    }
    for (const r of retResult.retirees) {
      const c = stats[r.playerId]
      if (c) c.status = 'retired'
    }
    for (const rookie of rookies) upsertCareer(rookie, true)

    const report: OffseasonReport = {
      atYear: dynasty.currentYear,
      retirements: retResult.retirees,
      developments: devResult.events,
      rookies,
    }
    const updatedGame: Game = { ...game, screen: 'offseason_summary' }
    const nextDynasty: Dynasty = {
      ...dynasty,
      livePool: nextPool,
      lastOffseason: report,
      history: [...dynasty.history, seasonRecord],
      currentGame: updatedGame,
      pendingKeepers: {},
      playerCareerStats: stats,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({
      dynasty: nextDynasty,
      game: updatedGame,
      players: nextPool,
      playersById: nextPlayersById,
    })
  },

  advanceToKeepers: () => {
    const { dynasty, game } = get()
    if (!dynasty || !game) return
    const updated: Game = { ...game, screen: 'keeper_selection' }
    const nextDynasty: Dynasty = {
      ...dynasty,
      currentGame: updated,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty, game: updated })
  },

  toggleKeeper: (playerId, source) => {
    const { dynasty, game } = get()
    if (!dynasty || !game) return
    const userTeamId = dynasty.userTeamId
    const currentEntry = dynasty.pendingKeepers?.[userTeamId] ?? {
      starters: [],
      bench: [],
    }
    const limits = { starter: 4, bench: 2 } as const
    const key = source === 'bench' ? 'bench' : 'starters'
    const currentList = currentEntry[key]
    let nextList: string[]
    if (currentList.includes(playerId)) {
      nextList = currentList.filter((id) => id !== playerId)
    } else {
      const limit = source === 'bench' ? limits.bench : limits.starter
      if (currentList.length >= limit) return
      nextList = [...currentList, playerId]
    }
    const nextEntry = { ...currentEntry, [key]: nextList }
    const pending = {
      ...(dynasty.pendingKeepers ?? {}),
      [userTeamId]: nextEntry,
    }
    const nextDynasty: Dynasty = {
      ...dynasty,
      pendingKeepers: pending,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty })
  },

  confirmKeepers: () => {
    const { dynasty, game, playersById } = get()
    if (!dynasty || !game) return

    const nextYear = dynasty.currentYear + 1
    const seed = Math.floor(Math.random() * 1_000_000)
    const newGameId = `${dynasty.id}-y${nextYear}`
    const newGame = createEmptyGame(newGameId, dynasty.name, seed)
    if (dynasty.capMode) newGame.capBudget = CAP_BUDGET_M

    // Split each team's roster into its starter and bench sub-rosters, then
    // apply keepers. User keepers come from pendingKeepers; CPUs auto-pick
    // top-4 starters + top-2 bench by value.
    const KEEPER_STARTER_LIMIT = 4
    const KEEPER_BENCH_LIMIT = 2
    const newTeams: TeamSeat[] = game.teams.map((t) => {
      const starterIds: (string | null)[] = t.roster.slice(0, 18)
      const benchIds: (string | null)[] = t.roster.slice(18)
      const isUser = t.id === dynasty.userTeamId
      const explicit = isUser ? dynasty.pendingKeepers?.[t.id] : undefined
      const starterKeepers = explicit
        ? explicit.starters
        : pickTopKeepers(starterIds, playersById, KEEPER_STARTER_LIMIT)
      const benchKeepers = explicit
        ? explicit.bench
        : pickTopKeepers(benchIds, playersById, KEEPER_BENCH_LIMIT)
      return {
        ...t,
        roster: rosterWithKeepers(
          starterKeepers,
          benchKeepers,
          playersById,
        ),
        grade: undefined,
        record: undefined,
      }
    })

    newGame.teams = newTeams
    // Draft order is fully random each year.
    const orderRng = makeRng(seed + 7)
    const shuffledIds = shuffleArray(
      newTeams.map((t) => t.id),
      orderRng,
    )
    newGame.draft.order = shuffledIds
    // Each team keeps 6 (4 starters + 2 bench), so we draft ROSTER_SIZE - 6.
    newGame.draft.picks = generatePicks(
      shuffledIds,
      ROSTER_SIZE - KEEPER_STARTER_LIMIT - KEEPER_BENCH_LIMIT,
    )
    newGame.draft.orderRevealedCount = 0
    newGame.draft.status = 'pending'
    newGame.screen = 'draft_order'

    // Roll the salary book forward: kept players keep their salary (capped
    // at 15% growth over last year, or market if regressing); everyone else
    // drops off and will pay market when re-drafted.
    let nextSalaries: Record<string, number> | undefined
    if (dynasty.capMode) {
      const prior = dynasty.playerSalaries ?? {}
      nextSalaries = {}
      for (const t of newTeams) {
        for (const pid of t.roster) {
          if (!pid) continue
          const p = playersById.get(pid)
          if (!p) continue
          nextSalaries[pid] = nextKeeperSalary(p.value, prior[pid])
        }
      }
    }

    const nextDynasty: Dynasty = {
      ...dynasty,
      currentYear: nextYear,
      currentGame: newGame,
      pendingKeepers: undefined,
      playerSalaries: nextSalaries,
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({
      dynasty: nextDynasty,
      game: newGame,
      lastPickSnapshot: null,
    })
  },

  openDynastyHub: () => {
    const { game, mode } = get()
    if (!game || mode !== 'dynasty') return
    if (game.screen === 'dynasty_hub') return
    const updated: Game = {
      ...game,
      screenBeforeHub: game.screen,
      screen: 'dynasty_hub',
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  closeDynastyHub: () => {
    const { game } = get()
    if (!game) return
    const returnTo = game.screenBeforeHub ?? 'trophy'
    const updated: Game = {
      ...game,
      screenBeforeHub: undefined,
      screen: returnTo,
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  createSnapshot: (name) => {
    const { dynasty } = get()
    if (!dynasty) return
    // Strip the snapshots list before serializing to avoid a snapshot-in-a-
    // snapshot recursion that would balloon storage.
    const { snapshots, ...rest } = dynasty
    void snapshots
    const snapshotId = `snap-${Date.now().toString(36)}`
    const snapshotName =
      name?.trim() || `Year ${dynasty.currentYear} bookmark`
    const snap: DynastySnapshot = {
      id: snapshotId,
      name: snapshotName,
      atYear: dynasty.currentYear,
      createdAt: new Date().toISOString(),
      snapshotJson: JSON.stringify(rest),
    }
    const nextDynasty: Dynasty = {
      ...dynasty,
      snapshots: [...dynasty.snapshots, snap],
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty })
  },

  loadSnapshot: (id) => {
    const { dynasty } = get()
    if (!dynasty) return
    const snap = dynasty.snapshots.find((s) => s.id === id)
    if (!snap) return
    let parsed: Omit<Dynasty, 'snapshots'>
    try {
      parsed = JSON.parse(snap.snapshotJson) as Omit<Dynasty, 'snapshots'>
    } catch (e) {
      console.warn('Could not parse snapshot:', e)
      return
    }
    // Preserve the current bookmarks list — rewinding shouldn't wipe the
    // user's other snapshots.
    const restored: Dynasty = {
      ...parsed,
      snapshots: dynasty.snapshots,
      updatedAt: new Date().toISOString(),
    } as Dynasty
    saveDynasty(restored)
    set({
      dynasty: restored,
      game: restored.currentGame,
      players: restored.livePool,
      playersById: new Map(restored.livePool.map((p) => [p.id, p])),
      lastPickSnapshot: null,
    })
  },

  deleteSnapshot: (id) => {
    const { dynasty } = get()
    if (!dynasty) return
    const nextDynasty: Dynasty = {
      ...dynasty,
      snapshots: dynasty.snapshots.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }
    saveDynasty(nextDynasty)
    set({ dynasty: nextDynasty })
  },

  leaveDynasty: () => {
    const { dynasty } = get()
    if (!dynasty) return
    // Wipe the saved dynasty + snapshots from localStorage and reset the
    // store back to the fresh-app state so the landing shows the mode
    // picker without any resume affordance.
    persistDeleteDynasty(dynasty.id)
    const basePool = loadAllPlayers()
    set({
      dynasty: null,
      game: null,
      mode: null,
      lastPickSnapshot: null,
      dynastyIds: listDynastyIds(),
      players: basePool,
      playersById: new Map(basePool.map((p) => [p.id, p])),
    })
  },

  exitToLanding: () => {
    // Bounce the user back to the landing page without wiping saves. When
    // there's a Quick League game in memory, put its screen back to landing;
    // otherwise there's nothing to update.
    const { game, mode, dynasty } = get()
    if (mode === 'dynasty' && dynasty) {
      const updated: Game = { ...dynasty.currentGame, screen: 'landing' }
      const nextDynasty: Dynasty = {
        ...dynasty,
        currentGame: updated,
        updatedAt: new Date().toISOString(),
      }
      saveDynasty(nextDynasty)
      set({ dynasty: nextDynasty, game: updated })
    } else if (game) {
      const updated: Game = { ...game, screen: 'landing' }
      persistGame(updated, get, set)
      set({ game: updated })
    }
  },

  updateTeam: (teamId, patch) => {
    const { game } = get()
    if (!game) return
    const newTeams = game.teams.map((t) =>
      t.id === teamId ? { ...t, ...patch } : t,
    )
    const updated = { ...game, teams: newTeams }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  setHumanCount: (count) => {
    const { game } = get()
    if (!game) return
    const clamped = Math.max(1, Math.min(8, count))
    const newTeams = game.teams.map((t, i) => ({
      ...t,
      isComputer: i >= clamped,
      name:
        i < clamped
          ? t.name.startsWith('CPU')
            ? i === 0
              ? 'You'
              : `Player ${i + 1}`
            : t.name
          : `CPU ${i - clamped + 1}`,
    }))
    const updated = { ...game, teams: newTeams }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  revealDraftOrder: () => {
    const { game } = get()
    if (!game) return
    const teamIds = game.teams.map((t) => t.id)
    const rng = makeRng(game.seed + 12345)
    const shuffled = shuffleArray(teamIds, rng)
    const updated: Game = {
      ...game,
      draft: {
        ...game.draft,
        order: shuffled,
        picks: generatePicks(shuffled, ROSTER_SIZE),
        orderRevealedCount: 0,
        currentPickIdx: 0,
        status: 'pending',
      },
      screen: 'draft_order',
    }
    set({ game: updated, lastPickSnapshot: null })
    persistGame(updated, get, set)
  },

  revealNextOrderPick: () => {
    const { game } = get()
    if (!game) return
    const current = game.draft.orderRevealedCount ?? 0
    if (current >= game.teams.length) return
    const updated: Game = {
      ...game,
      draft: { ...game.draft, orderRevealedCount: current + 1 },
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  beginDraft: () => {
    const { game, playersById, dynasty } = get()
    if (!game) return
    const ready: Game = {
      ...game,
      draft: { ...game.draft, status: 'in_progress', currentPickIdx: 0 },
      screen: 'draft',
    }
    const salaries = dynasty?.playerSalaries ?? {}
    const advanced = advanceAfterPick(
      ready,
      playersById,
      salaries,
      buildCoachMap(dynasty),
    )
    commitAdvance(advanced, get, set)
    set({ lastPickSnapshot: null })
  },

  setScreen: (screen) => {
    const { game } = get()
    if (!game) return
    const updated = { ...game, screen }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  makePick: (playerId, target) => {
    const { game, playersById, dynasty } = get()
    if (!game) return
    const player = playersById.get(playerId)
    if (!player) return
    const currentPick = game.draft.picks[game.draft.currentPickIdx]
    if (!currentPick) return
    const teamIdx = game.teams.findIndex((t) => t.id === currentPick.teamId)
    const team = game.teams[teamIdx]
    if (!team || team.isComputer) return
    if (!canTeamPick(team, player.position)) return
    if (usedPlayerIds(game).has(playerId)) return
    // Salary-cap enforcement: reject the tap ONLY if the user still has
    // other affordable options. If nothing in the pool is affordable, the
    // team's boxed in and we let this pick go through (cap waived) rather
    // than dead-end the draft.
    const salaries = dynasty?.playerSalaries ?? {}
    if (
      game.capBudget != null &&
      !canAffordPlayer(team, player, playersById, game.capBudget, salaries)
    ) {
      const usedNow = usedPlayerIds(game)
      const anyAffordable = get().players.some(
        (p) =>
          !usedNow.has(p.id) &&
          canAffordPlayer(team, p, playersById, game.capBudget!, salaries),
      )
      if (anyAffordable) return
      // else fall through: cap waived for a forced pick
    }

    // Auto-resolve target when the caller didn't specify: prefer starter if
    // a starter slot is open for this position, otherwise fall to bench.
    let resolvedTarget: 'starter' | 'bench'
    if (target === 'bench') {
      if (!canTeamBench(team)) return
      resolvedTarget = 'bench'
    } else if (target === 'starter') {
      if (!canTeamStart(team, player.position)) return
      resolvedTarget = 'starter'
    } else if (canTeamStart(team, player.position)) {
      resolvedTarget = 'starter'
    } else if (canTeamBench(team)) {
      resolvedTarget = 'bench'
    } else {
      return
    }

    const snapshot: Game = JSON.parse(JSON.stringify(game))

    const newTeams = game.teams.slice()
    newTeams[teamIdx] =
      resolvedTarget === 'bench'
        ? fillBench(team, playerId)
        : fillSlot(team, playerId, player.position)
    const newPicks = game.draft.picks.slice()
    newPicks[game.draft.currentPickIdx] = { ...currentPick, playerId }
    const updated: Game = {
      ...game,
      teams: newTeams,
      draft: {
        ...game.draft,
        picks: newPicks,
        currentPickIdx: game.draft.currentPickIdx + 1,
      },
    }
    // Register a market-rate salary for this user pick if it isn't already
    // a locked-in keeper carrying over.
    const humanSalaries: Record<string, number> = {}
    if (game.capBudget != null && salaries[playerId] == null) {
      humanSalaries[playerId] = priceOf(player.value)
    }
    const combinedSalaries = { ...salaries, ...humanSalaries }
    const advanced = advanceAfterPick(
      updated,
      playersById,
      combinedSalaries,
      buildCoachMap(dynasty),
    )
    const merged: AdvanceResult = {
      game: advanced.game,
      addedSalaries: { ...humanSalaries, ...advanced.addedSalaries },
    }
    set({ lastPickSnapshot: snapshot })
    commitAdvance(merged, get, set)
  },

  undoLastPick: () => {
    const { lastPickSnapshot } = get()
    if (!lastPickSnapshot) return
    set({ game: lastPickSnapshot, lastPickSnapshot: null })
    persistGame(lastPickSnapshot, get, set)
  },

  playSeason: (mode = 'weekly') => {
    const { game, playersById, dynasty } = get()
    if (!game) return
    const teamIds = game.teams.map((t) => t.id)
    const schedule = roundRobinSchedule(teamIds)
    const seasonResult = simSeason(
      game.teams,
      playersById,
      game.seed + 50_000,
      schedule,
      buildCoachMap(dynasty),
    )
    const isInstant = mode === 'instant'
    const updated: Game = {
      ...game,
      season: {
        weeks: seasonResult.weeks,
        results: seasonResult.results,
        standings: seasonResult.standings,
        bracket: seasonResult.bracket,
        champion: seasonResult.champion,
        awards: seasonResult.awards,
        status: 'complete',
        revealedThrough: isInstant ? 9 : 0,
        semisQuarter: isInstant ? 4 : 0,
        finalQuarter: isInstant ? 4 : 0,
      },
      screen: isInstant ? 'trophy' : 'season',
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  advanceReveal: () => {
    const { game } = get()
    if (!game) return
    const current = game.season.revealedThrough ?? 0
    if (current >= 9) return
    const next = current + 1
    let screen = game.screen
    if (next === 8 && game.screen === 'season') screen = 'bracket'
    if (next === 9) screen = 'trophy'
    const updated: Game = {
      ...game,
      season: { ...game.season, revealedThrough: next },
      screen,
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  advanceSemisQuarter: () => {
    const { game } = get()
    if (!game) return
    const current = game.season.semisQuarter ?? 0
    if (current >= 4) return
    const next = current + 1
    const newRevealed =
      next === 4
        ? Math.max(8, game.season.revealedThrough ?? 0)
        : game.season.revealedThrough
    const updated: Game = {
      ...game,
      season: {
        ...game.season,
        semisQuarter: next,
        revealedThrough: newRevealed,
      },
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  advanceFinalQuarter: () => {
    const { game } = get()
    if (!game) return
    const current = game.season.finalQuarter ?? 0
    if (current >= 4) return
    const next = current + 1
    const newRevealed =
      next === 4 ? 9 : game.season.revealedThrough
    const updated: Game = {
      ...game,
      season: {
        ...game.season,
        finalQuarter: next,
        revealedThrough: newRevealed,
      },
    }
    set({ game: updated })
    persistGame(updated, get, set)
  },

  simRestOfDraft: () => {
    const { game, playersById, dynasty } = get()
    if (!game) return
    let g = game
    const carryingSalaries: Record<string, number> = {
      ...(dynasty?.playerSalaries ?? {}),
    }
    const added: Record<string, number> = {}
    while (g.draft.currentPickIdx < g.draft.picks.length) {
      const currentPick = g.draft.picks[g.draft.currentPickIdx]
      const team = g.teams.find((t) => t.id === currentPick.teamId)
      if (!team) break
      const rng = makeRng(g.seed + g.draft.currentPickIdx * 7919 + 31)
      const pool = availablePool(g, playersById)
      const budgetCtx = g.capBudget
        ? { budget: g.capBudget, playersById, salaries: carryingSalaries }
        : undefined
      const cpuChoice = pickForCPU(team, pool, rng, budgetCtx)
      const pickedId = cpuChoice.playerId
      const player = playersById.get(pickedId)!
      const teamIdx = g.teams.findIndex((t) => t.id === team.id)
      const newTeams = g.teams.slice()
      newTeams[teamIdx] =
        cpuChoice.target === 'bench'
          ? fillBench(team, pickedId)
          : fillSlot(team, pickedId, player.position)
      const newPicks = g.draft.picks.slice()
      newPicks[g.draft.currentPickIdx] = { ...currentPick, playerId: pickedId }
      if (g.capBudget != null && carryingSalaries[pickedId] == null) {
        const signed = priceOf(player.value)
        carryingSalaries[pickedId] = signed
        added[pickedId] = signed
      }
      g = {
        ...g,
        teams: newTeams,
        draft: {
          ...g.draft,
          picks: newPicks,
          currentPickIdx: g.draft.currentPickIdx + 1,
        },
      }
    }
    const gradedTeams = computeGrades(g.teams, playersById, buildCoachMap(dynasty))
    g = {
      ...g,
      teams: gradedTeams,
      draft: { ...g.draft, status: 'complete' },
      screen: 'grade',
    }
    commitAdvance({ game: g, addedSalaries: added }, get, set)
  },
}))
