/* eslint-disable no-console */
/**
 * Compares LT degree distributions using this repo's decoder, with a seeded RNG
 * so every run prints the same numbers.
 *
 * Usage: pnpm tsx __benchmarks__/degree-distribution.ts [runs=30] [k,k,...] [loss=0] [name-regex]
 *
 * Uncapped distributions get very slow (and run out of memory at k = 3000)
 * because the decoder's bookkeeping grows quadratically with block degree;
 * use the name filter to skip them for large k.
 *
 * Ratios are received blocks / k (with loss > 0: sent blocks / k).
 * Header bytes = 4 bytes per index + 16 fixed bytes (degree, k, bytes, checksum).
 */
import process from 'node:process'
import { createDecoder } from '../packages/luby-transform/src/decoder'
import { createDegreeSampler, idealSoliton, robustSoliton, sampleIndices, truncateDistribution } from '../packages/luby-transform/src/degree'
import { createEncoder } from '../packages/luby-transform/src/encoder'
import { mulberry32 } from '../packages/luby-transform/test/prng'

const runs = Number(process.argv[2] ?? 30)
const ks = (process.argv[3] ?? '10,100,1000,3000').split(',').map(Number)
const loss = Number(process.argv[4] ?? 0)
const only = process.argv[5]
const sliceSize = 8

interface Candidate {
  name: string
  /** Omitted: use the encoder's own `fountain()` with its defaults. */
  pmf?: (k: number) => number[]
}

const candidates: Candidate[] = [
  { name: 'fountain() default' },
  { name: 'ideal (current)', pmf: idealSoliton },
  ...[8, 16, 32].map(d => ({ name: `ideal cap ${d}`, pmf: (k: number) => truncateDistribution(idealSoliton(k), d) })),
  ...([[0.03, 0.5], [0.1, 0.5], [0.15, 0.5], [0.2, 0.5]] as const).flatMap(([c, delta]) => [
    { name: `robust c=${c} δ=${delta}`, pmf: (k: number) => robustSoliton(k, c, delta) },
    ...[16, 32, 64].map(d => ({ name: `robust c=${c} δ=${delta} cap ${d}`, pmf: (k: number) => truncateDistribution(robustSoliton(k, c, delta), d) })),
  ]),
].filter(c => !only || new RegExp(only).test(c.name))

function runOnce(k: number, pmf: number[] | undefined, seed: number) {
  const random = mulberry32(seed)
  const data = new Uint8Array(k * sliceSize).map(() => Math.floor(random() * 256))
  const encoder = createEncoder(data, sliceSize, { compress: false, random })
  const decoder = createDecoder()
  const degree = pmf && createDegreeSampler(pmf, random)
  const fountain = encoder.fountain()

  let sent = 0
  let received = 0
  let indexCount = 0
  while (true) {
    sent += 1
    if (sent > k * 20)
      throw new Error(`Did not converge (k=${k})`)
    const block = degree
      ? encoder.createBlock(sampleIndices(k, degree(), random))
      : fountain.next().value
    indexCount += block.indices.length
    if (random() < loss)
      continue
    received += 1
    if (decoder.addBlock(block))
      break
  }
  return { ratio: (loss ? sent : received) / k, headerBytes: 4 * (indexCount / sent + 4) }
}

function quantile(sorted: number[], q: number) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]!
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

console.log(`runs=${runs} loss=${loss} sliceSize=${sliceSize}\n`)
console.log('| k | distribution | mean | p95 | worst | header bytes | ms/run |')
console.log('| --: | --- | --: | --: | --: | --: | --: |')
for (const k of ks) {
  for (const candidate of candidates) {
    const pmf = candidate.pmf?.(k)
    const ratios: number[] = []
    let header = 0
    const start = performance.now()
    for (let run = 0; run < runs; run++) {
      const result = runOnce(k, pmf, k * 1000 + run + 1)
      ratios.push(result.ratio)
      header += result.headerBytes
    }
    const ms = (performance.now() - start) / runs
    ratios.sort((a, b) => a - b)
    const mean = ratios.reduce((a, b) => a + b, 0) / runs
    console.log(`| ${k} | ${candidate.name} | ${pct(mean)} | ${pct(quantile(ratios, 0.95))} | ${pct(ratios.at(-1)!)} | ${(header / runs).toFixed(1)} | ${ms.toFixed(0)} |`)
  }
}
