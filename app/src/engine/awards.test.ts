import { describe, it, expect } from 'vitest'
import { computeAwards } from './awards'
import type { Player, TeamSeat, Season } from '../state/types'
import { ROSTER_SIZE, ROSTER_SLOTS } from '../state/types'

const mkPlayer = (
  id: string,
  position: Player['position'],
  value: number,
  yearsExp = 5,
): Player => ({
  id,
  name: `${position}-${id}`,
  nflTeam: 'XXX',
  position,
  photoUrl: '',
  status: 'active',
  yearsExp,
  value,
  subscores: {},
  tier: 'B',
  archetype: null,
  notes: '',
  needsRating: false,
})

const fillTeam = (
  id: string,
  color: string,
  grade: { letter: string; score: number } | undefined,
  perSlot: { id: string; position: Player['position']; value: number; yearsExp?: number }[],
): { team: TeamSeat; players: Player[] } => {
  const players = perSlot.map((s) => mkPlayer(s.id, s.position, s.value, s.yearsExp ?? 5))
  const roster: (string | null)[] = []
  ROSTER_SLOTS.forEach((slot) => {
    const found = perSlot.find((p) => p.position === slot && !roster.includes(p.id))
    roster.push(found?.id ?? null)
  })
  while (roster.length < ROSTER_SIZE) roster.push(null)
  return {
    team: {
      id,
      name: id,
      color,
      isComputer: false,
      roster,
      grade,
    },
    players,
  }
}

describe('computeAwards', () => {
  it('awards MVP to highest-scoring player on winning team', () => {
    const t1 = fillTeam('t1', '#fff', { letter: 'A', score: 90 }, [
      { id: 'mvp-qb', position: 'QB', value: 99 },
    ])
    const t2 = fillTeam('t2', '#000', { letter: 'B', score: 80 }, [
      { id: 'other-qb', position: 'QB', value: 95 },
    ])
    const players = new Map<string, Player>()
    for (const p of [...t1.players, ...t2.players]) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 5, losses: 2, pointDiff: 30 },
      { teamId: 't2', wins: 2, losses: 5, pointDiff: -30 },
    ]
    const awards = computeAwards([t1.team, t2.team], standings, players)
    const mvp = awards.find((a) => a.id === 'MVP')
    expect(mvp).toBeDefined()
    expect(mvp?.winnerPlayerId).toBe('mvp-qb')
  })

  it('OPOY excludes quarterbacks', () => {
    const t = fillTeam('t1', '#fff', { letter: 'A', score: 90 }, [
      { id: 'top-qb', position: 'QB', value: 99 },
      { id: 'top-wr', position: 'WR', value: 90 },
    ])
    const players = new Map<string, Player>()
    for (const p of t.players) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 5, losses: 2, pointDiff: 30 },
    ]
    const awards = computeAwards([t.team], standings, players)
    const opoy = awards.find((a) => a.id === 'OPOY')
    expect(opoy).toBeDefined()
    expect(opoy?.position).not.toBe('QB')
    expect(opoy?.winnerPlayerId).toBe('top-wr')
  })

  it('DPOY only includes defenders', () => {
    const t = fillTeam('t1', '#fff', undefined, [
      { id: 'top-qb', position: 'QB', value: 99 },
      { id: 'top-de', position: 'DE', value: 88 },
    ])
    const players = new Map<string, Player>()
    for (const p of t.players) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 4, losses: 3, pointDiff: 10 },
    ]
    const awards = computeAwards([t.team], standings, players)
    const dpoy = awards.find((a) => a.id === 'DPOY')
    expect(dpoy?.winnerPlayerId).toBe('top-de')
  })

  it('ROY only goes to rookies (yearsExp === 0)', () => {
    const t = fillTeam('t1', '#fff', undefined, [
      { id: 'vet-wr', position: 'WR', value: 95, yearsExp: 8 },
      { id: 'rookie-wr', position: 'WR', value: 80, yearsExp: 0 },
      { id: 'rookie-cb', position: 'CB', value: 78, yearsExp: 0 },
    ])
    const players = new Map<string, Player>()
    for (const p of t.players) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 4, losses: 3, pointDiff: 5 },
    ]
    const awards = computeAwards([t.team], standings, players)
    const oroy = awards.find((a) => a.id === 'OROY')
    const droy = awards.find((a) => a.id === 'DROY')
    expect(oroy?.winnerPlayerId).toBe('rookie-wr')
    expect(droy?.winnerPlayerId).toBe('rookie-cb')
  })

  it('skips ROY awards if no rookies in pool', () => {
    const t = fillTeam('t1', '#fff', undefined, [
      { id: 'vet-qb', position: 'QB', value: 90, yearsExp: 10 },
    ])
    const players = new Map<string, Player>()
    for (const p of t.players) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 4, losses: 3, pointDiff: 5 },
    ]
    const awards = computeAwards([t.team], standings, players)
    expect(awards.find((a) => a.id === 'OROY')).toBeUndefined()
    expect(awards.find((a) => a.id === 'DROY')).toBeUndefined()
  })

  it('GM of the Year goes to biggest overperformer', () => {
    // t1: grade A (rank 1), finishes last (rank 3) → delta = -2 (underperformed)
    // t2: grade C (rank 3), finishes first (rank 1) → delta = +2 (overperformed) ← winner
    // t3: grade B (rank 2), finishes 2nd (rank 2) → delta = 0
    const t1 = fillTeam('t1', '#aaa', { letter: 'A', score: 90 }, [
      { id: 'q1', position: 'QB', value: 95 },
    ])
    const t2 = fillTeam('t2', '#bbb', { letter: 'C', score: 60 }, [
      { id: 'q2', position: 'QB', value: 70 },
    ])
    const t3 = fillTeam('t3', '#ccc', { letter: 'B', score: 75 }, [
      { id: 'q3', position: 'QB', value: 82 },
    ])
    const players = new Map<string, Player>()
    for (const p of [...t1.players, ...t2.players, ...t3.players]) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't2', wins: 5, losses: 2, pointDiff: 30 },
      { teamId: 't3', wins: 3, losses: 4, pointDiff: 0 },
      { teamId: 't1', wins: 2, losses: 5, pointDiff: -25 },
    ]
    const awards = computeAwards(
      [t1.team, t2.team, t3.team],
      standings,
      players,
    )
    const gm = awards.find((a) => a.id === 'GM_OF_YEAR')
    expect(gm?.teamId).toBe('t2')
  })

  it('skips GM award if no team overperformed', () => {
    // All teams finished exactly at their grade rank
    const t1 = fillTeam('t1', '#aaa', { letter: 'A', score: 90 }, [
      { id: 'q1', position: 'QB', value: 95 },
    ])
    const t2 = fillTeam('t2', '#bbb', { letter: 'B', score: 70 }, [
      { id: 'q2', position: 'QB', value: 75 },
    ])
    const players = new Map<string, Player>()
    for (const p of [...t1.players, ...t2.players]) players.set(p.id, p)
    const standings: Season['standings'] = [
      { teamId: 't1', wins: 5, losses: 2, pointDiff: 25 },
      { teamId: 't2', wins: 2, losses: 5, pointDiff: -25 },
    ]
    const awards = computeAwards([t1.team, t2.team], standings, players)
    expect(awards.find((a) => a.id === 'GM_OF_YEAR')).toBeUndefined()
  })
})
