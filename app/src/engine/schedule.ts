export type Matchup = { home: string; away: string }

export const roundRobinSchedule = (teamIds: string[]): Matchup[][] => {
  const n = teamIds.length
  if (n < 2 || n % 2 !== 0) {
    throw new Error(`roundRobinSchedule needs an even team count, got ${n}`)
  }
  const numRounds = n - 1
  const half = n / 2
  let positions = teamIds.slice()
  const rounds: Matchup[][] = []
  for (let r = 0; r < numRounds; r++) {
    const round: Matchup[] = []
    for (let i = 0; i < half; i++) {
      const home = positions[i]
      const away = positions[n - 1 - i]
      // Alternate home/away by round for fairness
      if (r % 2 === 0) round.push({ home, away })
      else round.push({ home: away, away: home })
    }
    rounds.push(round)
    // Rotate everything except positions[0]
    const next = positions.slice()
    next[1] = positions[n - 1]
    for (let i = 2; i < n; i++) next[i] = positions[i - 1]
    positions = next
  }
  return rounds
}
