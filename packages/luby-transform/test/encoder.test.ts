import type { EncodedBlock } from '../src'
import { describe, expect, it } from 'vitest'
import { binaryToBlock, blockToBinary, createDecoder, createEncoder, DEFAULT_MAX_DEGREE } from '../src'
import { idealSoliton, robustSoliton, sampleIndices, truncateDistribution } from '../src/degree'
import { mulberry32 } from './prng'

function randomData(length: number, random: () => number) {
  return new Uint8Array(length).map(() => Math.floor(random() * 256))
}

function take<T>(iterator: Iterator<T>, count: number): T[] {
  return Array.from({ length: count }, () => iterator.next().value as T)
}

function decodeAll(encoder: ReturnType<typeof createEncoder>, limit = 20) {
  const decoder = createDecoder()
  let count = 0
  for (const block of encoder.fountain()) {
    count += 1
    if (count > encoder.k * limit)
      throw new Error('Too many blocks')
    if (decoder.addBlock(binaryToBlock(blockToBinary(block))))
      break
  }
  return { decoded: decoder.getDecoded(), count }
}

describe('encoder degree', () => {
  it('never exceeds maxDegree', () => {
    const encoder = createEncoder(randomData(100 * 10, mulberry32(1)), 10, { compress: false, maxDegree: 8, random: mulberry32(2) })
    expect(encoder.k).toBe(100)
    const blocks = take(encoder.fountain(), 5000)
    const degrees = blocks.map(b => b.indices.length)
    expect(Math.max(...degrees)).toBe(8)
    expect(Math.min(...degrees)).toBe(1)
  })

  it('caps the degree by default', () => {
    const encoder = createEncoder(randomData(3000, mulberry32(1)), 1, { compress: false, random: mulberry32(3) })
    expect(encoder.k).toBe(3000)
    expect(encoder.maxDegree).toBe(DEFAULT_MAX_DEGREE)
    for (const block of take(encoder.fountain(), 5000)) {
      expect(block.indices.length).toBeLessThanOrEqual(DEFAULT_MAX_DEGREE)
      expect(new Set(block.indices).size).toBe(block.indices.length)
      expect(block.indices.every(i => Number.isInteger(i) && i >= 0 && i < encoder.k)).toBe(true)
    }
  })

  it('clamps the degree to k', () => {
    const encoder = createEncoder(randomData(50, mulberry32(1)), 10, { compress: false, maxDegree: 1000, random: mulberry32(4) })
    expect(encoder.k).toBe(5)
    for (const block of take(encoder.fountain(), 1000))
      expect(block.indices.length).toBeLessThanOrEqual(5)
  })

  it.each([0, -3, Number.NaN])('treats maxDegree %s as 1', (maxDegree) => {
    const encoder = createEncoder(randomData(50, mulberry32(1)), 10, { compress: false, maxDegree, random: mulberry32(5) })
    for (const block of take(encoder.fountain(), 100))
      expect(block.indices).toHaveLength(1)
  })

  it('handles k = 1', () => {
    const data = new Uint8Array([23])
    const encoder = createEncoder(data, 1000, { random: mulberry32(6) })
    expect(encoder.k).toBe(1)
    for (const block of take(encoder.fountain(), 20))
      expect(block.indices).toEqual([0])
    expect(decodeAll(encoder).decoded).toEqual(data)
  })

  it('is deterministic with a seeded random', () => {
    const data = randomData(5000, mulberry32(1))
    const a = take(createEncoder(data, 50, { random: mulberry32(42) }).fountain(), 200)
    const b = take(createEncoder(data, 50, { random: mulberry32(42) }).fountain(), 200)
    const c = take(createEncoder(data, 50, { random: mulberry32(43) }).fountain(), 200)
    expect(a.map(x => x.indices)).toEqual(b.map(x => x.indices))
    expect(a.map(x => x.indices)).not.toEqual(c.map(x => x.indices))
  })

  it('keeps the positional compress argument', () => {
    const data = randomData(100, mulberry32(1))
    expect(createEncoder(data, 10, false).compress).toBe(false)
    expect(createEncoder(data, 10, false).k).toBe(10)
    expect(createEncoder(data, 10).compress).toBe(true)
    expect(createEncoder(data, 10, { compress: false }).compress).toBe(false)
  })
})

describe('round trip', () => {
  it.each([1, 10, 100, 1000])('decodes k = %i', (k) => {
    const random = mulberry32(k)
    const data = randomData(k * 16 - 3, random)
    const encoder = createEncoder(data, 16, { compress: false, random })
    expect(encoder.k).toBe(k)
    expect(decodeAll(encoder).decoded).toEqual(data)
  })
})

describe('wire format', () => {
  /**
   * Re-implements the frame layout from `shared.ts` independently, so a change
   * to the encoder that would break existing scanners fails here.
   */
  function parseFrame(binary: Uint8Array) {
    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
    const u32 = (i: number) => view.getUint32(i * 4, true)
    const degree = u32(0)
    return {
      indices: Array.from({ length: degree }, (_, i) => u32(1 + i)),
      k: u32(1 + degree),
      bytes: u32(2 + degree),
      checksum: u32(3 + degree),
      data: binary.slice(4 * (degree + 4)),
    }
  }

  it('produces frames in the existing layout', () => {
    const encoder = createEncoder(randomData(4000, mulberry32(1)), 100, { compress: false, random: mulberry32(7) })
    for (const block of take<EncodedBlock>(encoder.fountain(), 200)) {
      const binary = blockToBinary(block)
      expect(binary.length).toBe(4 * (block.indices.length + 4) + 100)
      const frame = parseFrame(binary)
      expect(frame).toEqual({
        indices: block.indices,
        k: encoder.k,
        bytes: encoder.bytes,
        checksum: encoder.checksum,
        data: block.data,
      })
      expect(binaryToBlock(binary)).toEqual(frame)
    }
  })
})

describe('degree distributions', () => {
  const sum = (pmf: number[]) => pmf.reduce((a, b) => a + b, 0)

  it.each([
    [10, 0, 0.5],
    [10, 0.1, 10],
    [10, 0.1, 100],
    [1, 0.2, 0.5],
  ])('robustSoliton(%i, %s, %s) is a valid distribution', (k, c, delta) => {
    const pmf = robustSoliton(k, c, delta)
    expect(pmf).toHaveLength(k)
    expect(pmf.every(p => Number.isFinite(p) && p >= 0)).toBe(true)
    expect(sum(pmf)).toBeCloseTo(1)
  })

  it('falls back to ideal soliton when R is not positive', () => {
    expect(robustSoliton(10, 0, 0.5)).toEqual(idealSoliton(10))
  })

  it('omits the spike when k / R is beyond k', () => {
    const k = 2
    const c = 0.01
    const delta = 0.5
    const R = c * Math.log(k / delta) * Math.sqrt(k)
    expect(k / R).toBeGreaterThan(k)
    const raw = [1 / 2 + R / k, 1 / 2 + R / (2 * k)]
    const total = raw[0]! + raw[1]!
    const pmf = robustSoliton(k, c, delta)
    expect(pmf[0]).toBeCloseTo(raw[0]! / total, 12)
    expect(pmf[1]).toBeCloseTo(raw[1]! / total, 12)
  })

  it('returns no distribution or indices for k = 0', () => {
    expect(idealSoliton(0)).toEqual([])
    expect(robustSoliton(0)).toEqual([])
    expect(truncateDistribution([], 32)).toEqual([])
    expect(sampleIndices(0, 1, mulberry32(1))).toEqual([])
  })
})

describe('empty input', () => {
  it('never produces out-of-range indices when k = 0', () => {
    const encoder = createEncoder(new Uint8Array(0), 10, { compress: false, random: mulberry32(8) })
    expect(encoder.k).toBe(0)
    for (const block of take(encoder.fountain(), 10)) {
      expect(block.indices).toEqual([])
      expect(binaryToBlock(blockToBinary(block)).indices).toEqual([])
    }
  })
})
