import type { TeamSeat, Player, Season } from '../state/types'

export type Award = {
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

const OFFENSE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'OL'])
const DEFENSE_POSITIONS = new Set(['DE', 'DT', 'LB', 'CB', 'S'])

const MVP_POSITION_BONUS: Record<string, number> = {
  QB: 1.4,
  RB: 1.1,
  WR: 1.1,
  TE: 0.9,
  OL: 0.6,
  DE: 1.0,
  DT: 0.8,
  LB: 0.9,
  CB: 0.9,
  S: 0.8,
  K: 0.3,
}

type RosterEntry = { player: Player; team: TeamSeat; wins: number }
type Candidate = RosterEntry & { score: number }

const allRosterPlayers = (
  teams: TeamSeat[],
  playersById: Map<string, Player>,
  winsByTeam: Map<string, number>,
): RosterEntry[] => {
  const out: RosterEntry[] = []
  for (const team of teams) {
    for (const pid of team.roster) {
      if (!pid) continue
      const player = playersById.get(pid)
      if (!player) continue
      out.push({ player, team, wins: winsByTeam.get(team.id) ?? 0 })
    }
  }
  return out
}

const pickBest = (candidates: Candidate[]): Candidate | null => {
  if (candidates.length === 0) return null
  candidates.sort(
    (a, b) =>
      b.score - a.score || a.player.id.localeCompare(b.player.id),
  )
  return candidates[0]
}

const buildAwardFromCandidate = (
  c: Candidate,
  id: Award['id'],
  name: string,
  emoji: string,
  reason: string,
): Award => ({
  id,
  name,
  emoji,
  winnerPlayerId: c.player.id,
  winnerName: c.player.name,
  winnerPhotoUrl: c.player.photoUrl,
  teamId: c.team.id,
  teamName: c.team.name,
  teamColor: c.team.color,
  position: c.player.position,
  reason,
})

export const computeAwards = (
  teams: TeamSeat[],
  standings: Season['standings'],
  playersById: Map<string, Player>,
): Award[] => {
  const winsByTeam = new Map<string, number>()
  const lossesByTeam = new Map<string, number>()
  for (const s of standings) {
    winsByTeam.set(s.teamId, s.wins)
    lossesByTeam.set(s.teamId, s.losses)
  }

  const players = allRosterPlayers(teams, playersById, winsByTeam)
  const awards: Award[] = []

  // MVP — any position, with positional bonus
  const mvp = pickBest(
    players.map((p) => ({
      ...p,
      score:
        p.player.value *
        (1 + p.wins) *
        (MVP_POSITION_BONUS[p.player.position] ?? 1.0),
    })),
  )
  if (mvp) {
    const losses = lossesByTeam.get(mvp.team.id) ?? 0
    awards.push(
      buildAwardFromCandidate(
        mvp,
        'MVP',
        'MVP',
        '🏈',
        `${mvp.player.value}-rated ${mvp.player.position} on a ${mvp.wins}-${losses} team`,
      ),
    )
  }

  // OPOY — offense non-QB
  const opoy = pickBest(
    players
      .filter(
        (p) =>
          OFFENSE_POSITIONS.has(p.player.position) &&
          p.player.position !== 'QB',
      )
      .map((p) => ({ ...p, score: p.player.value * (1 + p.wins) })),
  )
  if (opoy) {
    const losses = lossesByTeam.get(opoy.team.id) ?? 0
    awards.push(
      buildAwardFromCandidate(
        opoy,
        'OPOY',
        'Offensive Player of the Year',
        '💨',
        `Engine of the ${opoy.wins}-${losses} ${opoy.team.name} offense`,
      ),
    )
  }

  // DPOY — defense
  const dpoy = pickBest(
    players
      .filter((p) => DEFENSE_POSITIONS.has(p.player.position))
      .map((p) => ({ ...p, score: p.player.value * (1 + p.wins) })),
  )
  if (dpoy) {
    awards.push(
      buildAwardFromCandidate(
        dpoy,
        'DPOY',
        'Defensive Player of the Year',
        '🛡️',
        `${dpoy.player.position} who anchored ${dpoy.wins} wins`,
      ),
    )
  }

  // OROY — offensive rookie (yearsExp === 0)
  const oroy = pickBest(
    players
      .filter(
        (p) =>
          OFFENSE_POSITIONS.has(p.player.position) &&
          p.player.yearsExp === 0,
      )
      .map((p) => ({ ...p, score: p.player.value * (1 + p.wins) })),
  )
  if (oroy) {
    awards.push(
      buildAwardFromCandidate(
        oroy,
        'OROY',
        'Offensive Rookie of the Year',
        '⭐',
        `First-year ${oroy.player.position} who looked like a vet`,
      ),
    )
  }

  // DROY — defensive rookie
  const droy = pickBest(
    players
      .filter(
        (p) =>
          DEFENSE_POSITIONS.has(p.player.position) &&
          p.player.yearsExp === 0,
      )
      .map((p) => ({ ...p, score: p.player.value * (1 + p.wins) })),
  )
  if (droy) {
    awards.push(
      buildAwardFromCandidate(
        droy,
        'DROY',
        'Defensive Rookie of the Year',
        '⭐',
        `Rookie ${droy.player.position} who rewrote the scouting report`,
      ),
    )
  }

  // GM of the Year — biggest grade-to-finish overperformer
  const gradeRanked = teams
    .slice()
    .sort((a, b) => (b.grade?.score ?? 0) - (a.grade?.score ?? 0))
  const gradeRankByTeam = new Map<string, number>()
  gradeRanked.forEach((t, idx) => gradeRankByTeam.set(t.id, idx + 1))
  const standingsRankByTeam = new Map<string, number>()
  standings.forEach((s, idx) => standingsRankByTeam.set(s.teamId, idx + 1))

  let bestGm:
    | { team: TeamSeat; delta: number; gradeRank: number; standingsRank: number }
    | null = null
  for (const team of teams) {
    const gRank = gradeRankByTeam.get(team.id) ?? 999
    const sRank = standingsRankByTeam.get(team.id) ?? 999
    const delta = gRank - sRank
    if (
      !bestGm ||
      delta > bestGm.delta ||
      (delta === bestGm.delta && team.id.localeCompare(bestGm.team.id) < 0)
    ) {
      bestGm = { team, delta, gradeRank: gRank, standingsRank: sRank }
    }
  }
  if (bestGm && bestGm.delta > 0) {
    awards.push({
      id: 'GM_OF_YEAR',
      name: 'GM of the Year',
      emoji: '🎯',
      winnerPlayerId: null,
      winnerName: bestGm.team.name,
      teamId: bestGm.team.id,
      teamName: bestGm.team.name,
      teamColor: bestGm.team.color,
      position: 'TEAM',
      reason: `From #${bestGm.gradeRank} grade to #${bestGm.standingsRank} finish — the biggest leap`,
    })
  }

  return awards
}
