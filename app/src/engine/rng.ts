export const makeRng = (seed: number): (() => number) => {
  let state = (seed >>> 0) || 1
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0xffffffff
  }
}
