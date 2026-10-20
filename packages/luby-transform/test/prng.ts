/**
 * Small seeded PRNG (mulberry32) so encoder tests and benchmarks are reproducible.
 * Returns floats in [0, 1) like `Math.random`.
 */
export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
