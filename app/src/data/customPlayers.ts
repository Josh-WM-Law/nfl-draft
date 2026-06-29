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
      value: 89,
      subscores: { separation: 6, deep: 4 },
      tier: 'A',
      archetype: null,
      notes: '',
      needsRating: false,
    },
  },
]
