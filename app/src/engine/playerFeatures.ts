import type {
  Player,
  TeamSeat,
  Position,
  PlayerFeature,
} from '../state/types'
import { ROSTER_SLOTS } from '../state/types'
import { makeRng } from './rng'

const OFFENSE_SKILL: Position[] = ['QB', 'RB', 'WR', 'TE']
const DEFENSE_ALL: Position[] = ['DE', 'DT', 'LB', 'CB', 'S']

const lastName = (full: string): string => {
  const parts = full.split(' ').filter(Boolean)
  if (parts.length === 0) return full
  return parts.slice(1).join(' ') || parts[0]
}

const teamPlayersAt = (
  team: TeamSeat,
  playersById: Map<string, Player>,
  positions: Position[],
): { player: Player; slot: Position }[] => {
  const allowed = new Set(positions)
  const out: { player: Player; slot: Position }[] = []
  team.roster.forEach((pid, i) => {
    if (!pid) return
    const slot = ROSTER_SLOTS[i]
    if (!allowed.has(slot)) return
    const p = playersById.get(pid)
    if (!p) return
    out.push({ player: p, slot })
  })
  return out
}

const pickFeature = (
  candidates: { player: Player; slot: Position }[],
  fluxMap: Map<string, number>,
  rng: () => number,
): { player: Player; slot: Position; flux: number } | null => {
  if (candidates.length === 0) return null
  const scored = candidates.map((c) => {
    const flux = fluxMap.get(c.player.id) ?? 0
    return {
      ...c,
      flux,
      score: c.player.value + flux * 2 + rng() * 6,
    }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]
}

// ---------- Offensive stat generators ----------

const qbStats = (
  player: Player,
  teamScore: number,
  flux: number,
  rng: () => number,
): string => {
  const arm = player.subscores.arm ?? 0
  const isGreat = flux > 0
  const isBad = flux < 0
  const attempts = 28 + Math.round(rng() * 12)
  let compPct = 0.55 + (player.value - 70) * 0.005
  if (isGreat) compPct += 0.1
  if (isBad) compPct -= 0.1
  compPct = Math.max(0.4, Math.min(0.85, compPct))
  const completions = Math.round(attempts * compPct)
  const ypc = 10 + arm * 0.3 + (isGreat ? 2 : 0) + rng() * 2
  const yards = Math.max(0, Math.round(completions * ypc))
  const totalTds = Math.max(1, Math.floor(teamScore / 7))
  const passTdsRaw = Math.round(totalTds * 0.7) + (isGreat ? 1 : 0)
  const passTds = Math.max(0, Math.min(totalTds, passTdsRaw))
  const intRoll = rng()
  const ints = isGreat
    ? 0
    : isBad
      ? intRoll > 0.3
        ? 2
        : 1
      : intRoll > 0.75
        ? 1
        : 0
  return `${completions}/${attempts}, ${yards} yds, ${passTds} TD, ${ints} INT`
}

const rbStats = (
  player: Player,
  teamScore: number,
  flux: number,
  rng: () => number,
): string => {
  const burst = player.subscores.burst ?? 0
  const isGreat = flux > 0
  const isBad = flux < 0
  const carries = 12 + Math.round(rng() * 14)
  const ypc =
    3.5 +
    (player.value - 70) * 0.04 +
    burst * 0.1 +
    (isGreat ? 1.2 : isBad ? -0.8 : 0) +
    rng() * 0.6
  const yards = Math.max(0, Math.round(carries * ypc))
  const tds =
    teamScore >= 28
      ? rng() > 0.4
        ? 2
        : 1
      : teamScore >= 14
        ? rng() > 0.5
          ? 1
          : 0
        : 0
  const hasRecs = rng() > 0.4
  if (hasRecs) {
    const recs = 1 + Math.round(rng() * 4)
    const recYds = Math.round(recs * (6 + rng() * 5))
    return `${carries} car, ${yards} yds, ${tds} TD · ${recs} rec, ${recYds} yds`
  }
  return `${carries} car, ${yards} yds, ${tds} TD`
}

const wrTeStats = (
  player: Player,
  teamScore: number,
  flux: number,
  rng: () => number,
): string => {
  const separation = player.subscores.separation ?? player.subscores.catch ?? 0
  const deep = player.subscores.deep ?? 0
  const isGreat = flux > 0
  const isBad = flux < 0
  const targets = 5 + Math.round(rng() * 8)
  let catchPct =
    0.55 + (player.value - 70) * 0.003 + separation * 0.015
  if (isGreat) catchPct += 0.1
  if (isBad) catchPct -= 0.15
  catchPct = Math.max(0.3, Math.min(0.85, catchPct))
  const recs = Math.max(1, Math.round(targets * catchPct))
  const ypr = 10 + deep * 0.6 + (isGreat ? 3 : 0)
  const yards = Math.max(0, Math.round(recs * ypr + rng() * 10))
  const tds =
    teamScore >= 28
      ? rng() > 0.5
        ? 2
        : 1
      : teamScore >= 17
        ? rng() > 0.5
          ? 1
          : 0
        : 0
  return `${recs} rec, ${yards} yds, ${tds} TD`
}

const generateOffensiveStats = (
  player: Player,
  slot: Position,
  teamScore: number,
  flux: number,
  rng: () => number,
): string => {
  switch (slot) {
    case 'QB':
      return qbStats(player, teamScore, flux, rng)
    case 'RB':
      return rbStats(player, teamScore, flux, rng)
    case 'WR':
    case 'TE':
      return wrTeStats(player, teamScore, flux, rng)
    default:
      return `${player.value} OVR contribution`
  }
}

// ---------- Defensive stat generators ----------

const deStats = (
  player: Player,
  flux: number,
  rng: () => number,
): string => {
  const passRush = player.subscores.passRush ?? 0
  const isGreat = flux > 0
  const tkl = 3 + Math.round(rng() * 6)
  let sacks = 0
  if (isGreat) sacks = 2 + (rng() > 0.5 ? 1 : 0)
  else if (player.value + passRush >= 100)
    sacks = (rng() > 0.4 ? 1 : 0) + (rng() > 0.8 ? 1 : 0)
  else sacks = rng() > 0.7 ? 1 : 0
  const ff = isGreat && rng() > 0.6 ? 1 : 0
  const parts = [`${tkl} tkl`]
  if (sacks > 0) parts.push(`${sacks} sack${sacks > 1 ? 's' : ''}`)
  if (ff > 0) parts.push(`${ff} FF`)
  return parts.join(', ')
}

const dtStats = (
  player: Player,
  flux: number,
  rng: () => number,
): string => {
  const passRush = player.subscores.passRush ?? 0
  const isGreat = flux > 0
  const tkl = 2 + Math.round(rng() * 5)
  let sacks = 0
  if (isGreat && rng() > 0.4) sacks = 1 + (rng() > 0.5 ? 1 : 0)
  else if (player.value + passRush >= 95 && rng() > 0.5) sacks = 1
  else if (rng() > 0.75) sacks = 1
  const tfl = rng() > 0.5 ? 1 + Math.round(rng()) : 0
  const parts = [`${tkl} tkl`]
  if (sacks > 0) parts.push(`${sacks} sack${sacks > 1 ? 's' : ''}`)
  if (tfl > 0 && sacks === 0) parts.push(`${tfl} TFL`)
  return parts.join(', ')
}

const lbStats = (
  player: Player,
  flux: number,
  rng: () => number,
): string => {
  const coverage = player.subscores.coverage ?? 0
  const isGreat = flux > 0
  const tkl = 7 + Math.round(rng() * 6) + (isGreat ? 3 : 0)
  const sacks = isGreat && rng() > 0.6 ? 1 : 0
  const int =
    isGreat && coverage > 2 && rng() > 0.7 ? 1 : 0
  const pds =
    int === 0 && coverage > 0 && rng() > 0.5
      ? 1 + (rng() > 0.7 ? 1 : 0)
      : 0
  const parts = [`${tkl} tkl`]
  if (sacks > 0) parts.push(`${sacks} sack`)
  if (int > 0) parts.push(`${int} INT`)
  if (pds > 0) parts.push(`${pds} PD${pds > 1 ? 's' : ''}`)
  return parts.join(', ')
}

const cbStats = (
  player: Player,
  flux: number,
  rng: () => number,
): string => {
  const coverage = player.subscores.coverage ?? 0
  const ballHawk = player.subscores.ballHawk ?? 0
  const isGreat = flux > 0
  const tkl = 3 + Math.round(rng() * 4)
  const pds = Math.max(
    0,
    Math.round((coverage + (isGreat ? 5 : 0)) / 4 + rng() * 2),
  )
  const int =
    (ballHawk + (isGreat ? 5 : 0)) > 3 && rng() > 0.55 ? 1 : 0
  const parts = [`${tkl} tkl`]
  if (int > 0) parts.push(`${int} INT`)
  if (pds > 0) parts.push(`${pds} PD${pds > 1 ? 's' : ''}`)
  return parts.join(', ')
}

const sStats = (
  player: Player,
  flux: number,
  rng: () => number,
): string => {
  const coverage = player.subscores.coverage ?? 0
  const ballHawk = player.subscores.ballHawk ?? 0
  const isGreat = flux > 0
  const tkl = 5 + Math.round(rng() * 5)
  const pds = Math.max(0, Math.round(coverage / 3 + rng()))
  let ints = 0
  if (isGreat && ballHawk > 0)
    ints = (rng() > 0.4 ? 1 : 0) + (rng() > 0.85 ? 1 : 0)
  else if (ballHawk > 3 && rng() > 0.65) ints = 1
  const parts = [`${tkl} tkl`]
  if (ints > 0) parts.push(`${ints} INT${ints > 1 ? 's' : ''}`)
  if (pds > 0) parts.push(`${pds} PD${pds > 1 ? 's' : ''}`)
  return parts.join(', ')
}

const generateDefensiveStats = (
  player: Player,
  slot: Position,
  flux: number,
  rng: () => number,
): string => {
  switch (slot) {
    case 'DE':
      return deStats(player, flux, rng)
    case 'DT':
      return dtStats(player, flux, rng)
    case 'LB':
      return lbStats(player, flux, rng)
    case 'CB':
      return cbStats(player, flux, rng)
    case 'S':
      return sStats(player, flux, rng)
    default:
      return `${player.value} OVR contribution`
  }
}

// ---------- Public ----------

export const generateGameFeatures = (
  winningTeam: TeamSeat,
  winningTeamScore: number,
  playersById: Map<string, Player>,
  fluxMap: Map<string, number>,
  seed: number,
): { offense?: PlayerFeature; defense?: PlayerFeature } => {
  const rng = makeRng(seed)
  const result: { offense?: PlayerFeature; defense?: PlayerFeature } = {}

  const offCandidates = teamPlayersAt(
    winningTeam,
    playersById,
    OFFENSE_SKILL,
  )
  const off = pickFeature(offCandidates, fluxMap, rng)
  if (off) {
    result.offense = {
      playerId: off.player.id,
      playerName: lastName(off.player.name),
      position: off.slot,
      statLine: generateOffensiveStats(
        off.player,
        off.slot,
        winningTeamScore,
        off.flux,
        rng,
      ),
    }
  }

  const defCandidates = teamPlayersAt(winningTeam, playersById, DEFENSE_ALL)
  const def = pickFeature(defCandidates, fluxMap, rng)
  if (def) {
    result.defense = {
      playerId: def.player.id,
      playerName: lastName(def.player.name),
      position: def.slot,
      statLine: generateDefensiveStats(
        def.player,
        def.slot,
        def.flux,
        rng,
      ),
    }
  }

  return result
}
