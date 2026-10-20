/**
 * Default cap on the number of source blocks XOR-ed into one encoded block.
 *
 * Every index costs 4 bytes in the frame header, and the decoder's bookkeeping
 * grows quadratically with the degree of a block, so the long tail of the
 * Soliton distribution is cut off here. Chosen from
 * `__benchmarks__/degree-distribution.ts`.
 */
export const DEFAULT_MAX_DEGREE = 32

/**
 * Robust Soliton tuning used by `fountain()`, chosen from the same benchmark.
 */
export const DEFAULT_ROBUST_C = 0.2
export const DEFAULT_ROBUST_DELTA = 0.5

/**
 * Ideal Soliton distribution over degrees `1..k`.
 * Element `d - 1` is the probability of degree `d`.
 */
export function idealSoliton(k: number): number[] {
  const pmf = Array.from<number>({ length: k }).fill(0)
  pmf[0] = 1 / k
  for (let d = 2; d <= k; d++)
    pmf[d - 1] = 1 / (d * (d - 1))
  return pmf
}

/**
 * Robust Soliton distribution (Luby 2002) over degrees `1..k`.
 *
 * `c` and `delta` are the usual tuning constants: larger `c` adds more low
 * degree blocks (and a spike at `k / R`), `delta` bounds the failure probability.
 */
export function robustSoliton(k: number, c = DEFAULT_ROBUST_C, delta = DEFAULT_ROBUST_DELTA): number[] {
  const rho = idealSoliton(k)
  const R = c * Math.log(k / delta) * Math.sqrt(k)
  const spike = Math.max(1, Math.min(k, Math.floor(k / R)))
  const tau = Array.from<number>({ length: k }).fill(0)
  for (let d = 1; d < spike; d++)
    tau[d - 1] = R / (d * k)
  tau[spike - 1] = R * Math.log(R / delta) / k
  return normalize(rho.map((p, i) => p + Math.max(0, tau[i]!)))
}

/**
 * Drops every degree above `maxDegree`, folding their probability mass into
 * `maxDegree` itself so low degrees keep their original weight.
 */
export function truncateDistribution(pmf: number[], maxDegree: number): number[] {
  const cap = Math.min(pmf.length, maxDegree >= 1 ? Math.floor(maxDegree) : 1)
  const result = pmf.slice(0, cap)
  result[cap - 1] = pmf.slice(cap - 1).reduce((a, b) => a + b, 0)
  return normalize(result)
}

/**
 * Builds the CDF once and returns an O(log k) sampler of degrees in `1..pmf.length`.
 */
export function createDegreeSampler(pmf: number[], random: () => number): () => number {
  const cdf: number[] = []
  let sum = 0
  for (const p of pmf) {
    sum += p
    cdf.push(sum)
  }
  const max = pmf.length

  return () => {
    const value = random() * sum
    let lo = 0
    let hi = max - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (value < cdf[mid]!)
        hi = mid
      else
        lo = mid + 1
    }
    return lo + 1
  }
}

/**
 * Picks `degree` distinct indices in `0..k-1`. `degree` is clamped to `k`.
 */
export function sampleIndices(k: number, degree: number, random: () => number): number[] {
  const count = Math.max(1, Math.min(k, degree))
  if (count * 2 > k) {
    const all = Array.from({ length: k }, (_, i) => i)
    for (let i = 0; i < count; i++) {
      const j = Math.min(k - 1, i + Math.floor(random() * (k - i)))
      ;[all[i], all[j]] = [all[j]!, all[i]!]
    }
    return all.slice(0, count)
  }

  const indices = new Set<number>()
  while (indices.size < count)
    indices.add(Math.min(k - 1, Math.floor(random() * k)))
  return Array.from(indices)
}

function normalize(pmf: number[]): number[] {
  const sum = pmf.reduce((a, b) => a + b, 0)
  return pmf.map(p => p / sum)
}
