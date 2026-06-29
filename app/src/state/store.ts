import { create } from 'zustand'
import {
  type Game,
  type Player,
  type LeagueScreen,
  type TeamSeat,
  ROSTER_SIZE,
  createEmptyGame,
} from './types'
import { saveGame, loadGame, deleteGame } from './persistence'
import { loadAllPlayers } from '../data/loadPlayers'
import {
  generatePicks,
  pickForCPU,
  canTeamPick,
  fillSlot,
  shuffleArray,
} from '../engine/draft'
import { computeGrades } from '../engine/grade'
import { makeRng } from '../engine/rng'
import { simSeason } from '../engine/sim'
import { roundRobinSchedule } from '../engine/schedule'

const DEFAULT_GAME_ID = 'default'
const TEAM_COLORS = [
  '#0a84ff', '#ff453a', '#30d158', '#ffd60a',
  '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f',
]

type Store = {
  players: Player[]
  playersById: Map<string, Player>
  game: Game | null
  lastPickSnapshot: Game | null
  initialize: () => void
  startNewLeague: (humanCount?: number) => void
  setScreen: (screen: LeagueScreen) => void
  updateTeam: (teamId: string, patch: { name?: string; color?: string }) => void
  setHumanCount: (count: number) => void
  revealDraftOrder: () => void
  revealNextOrderPick: () => void
  beginDraft: () => void
  makePick: (playerId: string) => void
  undoLastPick: () => void
  simRestOfDraft: () => void
  playSeason: (mode?: 'weekly' | 'instant') => void
  advanceReveal: () => void
  advanceSemisQuarter: () => void
  advanceFinalQuarter: () => void
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
  return Array.from(playersById.values()).filter((p) => !used.has(p.id))
}

const advanceAfterPick = (
  game: Game,
  playersById: Map<string, Player>,
): Game => {
  let g = game
  while (g.draft.currentPickIdx < g.draft.picks.length) {
    const currentPick = g.draft.picks[g.draft.currentPickIdx]
    const team = g.teams.find((t) => t.id === currentPick.teamId)
    if (!team) break
    if (!team.isComputer) break
    const rng = makeRng(g.seed + g.draft.currentPickIdx * 7919)
    const pool = availablePool(g, playersById)
    const pickedId = pickForCPU(team, pool, rng)
    const player = playersById.get(pickedId)!
    const teamIdx = g.teams.findIndex((t) => t.id === team.id)
    const newTeams = g.teams.slice()
    newTeams[teamIdx] = fillSlot(team, pickedId, player.position)
    const newPicks = g.draft.picks.slice()
    newPicks[g.draft.currentPickIdx] = { ...currentPick, playerId: pickedId }
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
    const gradedTeams = computeGrades(g.teams, playersById)
    g = {
      ...g,
      teams: gradedTeams,
      draft: { ...g.draft, status: 'complete' },
      screen: 'grade',
    }
  }
  return g
}

export const useStore = create<Store>()((set, get) => ({
  players: [],
  playersById: new Map(),
  game: null,
  lastPickSnapshot: null,

  initialize: () => {
    if (get().players.length > 0) return
    const players = loadAllPlayers()
    const playersById = new Map(players.map((p) => [p.id, p]))
    set({ players, playersById })
    try {
      const saved = loadGame(DEFAULT_GAME_ID)
      if (saved) set({ game: saved })
    } catch (e) {
      console.warn('Could not restore saved game (likely schema mismatch); clearing it:', e)
      deleteGame(DEFAULT_GAME_ID)
    }
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
    set({ game, lastPickSnapshot: null })
    saveGame(game)
  },

  updateTeam: (teamId, patch) => {
    const { game } = get()
    if (!game) return
    const newTeams = game.teams.map((t) =>
      t.id === teamId ? { ...t, ...patch } : t,
    )
    const updated = { ...game, teams: newTeams }
    set({ game: updated })
    saveGame(updated)
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
    saveGame(updated)
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
    saveGame(updated)
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
    saveGame(updated)
  },

  beginDraft: () => {
    const { game, playersById } = get()
    if (!game) return
    const ready: Game = {
      ...game,
      draft: { ...game.draft, status: 'in_progress', currentPickIdx: 0 },
      screen: 'draft',
    }
    const advanced = advanceAfterPick(ready, playersById)
    set({ game: advanced, lastPickSnapshot: null })
    saveGame(advanced)
  },

  setScreen: (screen) => {
    const { game } = get()
    if (!game) return
    const updated = { ...game, screen }
    set({ game: updated })
    saveGame(updated)
  },

  makePick: (playerId) => {
    const { game, playersById } = get()
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

    const snapshot: Game = JSON.parse(JSON.stringify(game))

    const newTeams = game.teams.slice()
    newTeams[teamIdx] = fillSlot(team, playerId, player.position)
    const newPicks = game.draft.picks.slice()
    newPicks[game.draft.currentPickIdx] = { ...currentPick, playerId }
    let updated: Game = {
      ...game,
      teams: newTeams,
      draft: {
        ...game.draft,
        picks: newPicks,
        currentPickIdx: game.draft.currentPickIdx + 1,
      },
    }
    updated = advanceAfterPick(updated, playersById)
    set({ game: updated, lastPickSnapshot: snapshot })
    saveGame(updated)
  },

  undoLastPick: () => {
    const { lastPickSnapshot } = get()
    if (!lastPickSnapshot) return
    set({ game: lastPickSnapshot, lastPickSnapshot: null })
    saveGame(lastPickSnapshot)
  },

  playSeason: (mode = 'weekly') => {
    const { game, playersById } = get()
    if (!game) return
    const teamIds = game.teams.map((t) => t.id)
    const schedule = roundRobinSchedule(teamIds)
    const seasonResult = simSeason(
      game.teams,
      playersById,
      game.seed + 50_000,
      schedule,
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
    saveGame(updated)
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
    saveGame(updated)
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
    saveGame(updated)
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
    saveGame(updated)
  },

  simRestOfDraft: () => {
    const { game, playersById } = get()
    if (!game) return
    let g = game
    while (g.draft.currentPickIdx < g.draft.picks.length) {
      const currentPick = g.draft.picks[g.draft.currentPickIdx]
      const team = g.teams.find((t) => t.id === currentPick.teamId)
      if (!team) break
      const rng = makeRng(g.seed + g.draft.currentPickIdx * 7919 + 31)
      const pool = availablePool(g, playersById)
      const pickedId = pickForCPU(team, pool, rng)
      const player = playersById.get(pickedId)!
      const teamIdx = g.teams.findIndex((t) => t.id === team.id)
      const newTeams = g.teams.slice()
      newTeams[teamIdx] = fillSlot(team, pickedId, player.position)
      const newPicks = g.draft.picks.slice()
      newPicks[g.draft.currentPickIdx] = { ...currentPick, playerId: pickedId }
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
    const gradedTeams = computeGrades(g.teams, playersById)
    g = {
      ...g,
      teams: gradedTeams,
      draft: { ...g.draft, status: 'complete' },
      screen: 'grade',
    }
    set({ game: g })
    saveGame(g)
  },
}))
