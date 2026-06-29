import playersData from './players.json'
import ratingsData from './ratings.json'
import { CUSTOM_PLAYERS } from './customPlayers'
import type { Player, PlayerCore, PlayerRating } from '../state/types'

export const loadAllPlayers = (): Player[] => {
  const ratingsById = new Map<string, PlayerRating>()
  for (const r of ratingsData as PlayerRating[]) {
    ratingsById.set(r.id, r)
  }
  const result: Player[] = []
  for (const core of playersData as PlayerCore[]) {
    const rating = ratingsById.get(core.id)
    if (!rating) continue
    result.push({ ...core, ...rating })
  }
  for (const custom of CUSTOM_PLAYERS) {
    result.push({ ...custom.core, ...custom.rating })
  }
  return result
}
