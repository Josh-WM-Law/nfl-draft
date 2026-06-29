import type { PlayerCore, PlayerRating } from '../state/types'

// Hardcoded family/custom players. Lives outside players.json so the
// season refresh script doesn't wipe them. Merged into the pool by
// loadAllPlayers.
export const CUSTOM_PLAYERS: { core: PlayerCore; rating: PlayerRating }[] = [
  {
    core: {
      id: 'custom-brady-woolsey',
      name: 'Brady Woolsey',
      nflTeam: 'WLY',
      position: 'WR',
      photoUrl: '/players/brady-woolsey.png',
      status: 'active',
      yearsExp: 0,
    },
    rating: {
      id: 'custom-brady-woolsey',
      value: 91,
      subscores: { separation: 6, deep: 4 },
      tier: 'S',
      archetype: null,
      notes: '',
      needsRating: false,
    },
  },
  {
    core: {
      id: 'custom-jake-woolsey',
      name: 'Jake Woolsey',
      nflTeam: 'WLY',
      position: 'RB',
      photoUrl: '/players/jake-woolsey.png',
      status: 'active',
      yearsExp: 0,
    },
    rating: {
      id: 'custom-jake-woolsey',
      value: 91,
      subscores: { power: 5, burst: 5 },
      tier: 'S',
      archetype: null,
      notes: '',
      needsRating: false,
    },
  },
]
