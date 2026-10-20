import type { EncodedBlock } from './shared'
import { deflate } from 'pako'
import { getChecksum } from './checksum'
import {
  createDegreeSampler,
  DEFAULT_MAX_DEGREE,
  DEFAULT_ROBUST_C,
  DEFAULT_ROBUST_DELTA,
  robustSoliton,
  sampleIndices,
  truncateDistribution,
} from './degree'

export interface LtEncoderOptions {
  /**
   * Deflate the data before slicing it.
   * @default true
   */
  compress?: boolean
  /**
   * Upper bound for the number of slices combined into one block (the number
   * of indices in a frame header). Always clamped to `[1, k]`.
   * @default DEFAULT_MAX_DEGREE
   */
  maxDegree?: number
  /**
   * Source of randomness in `[0, 1)`, injectable for reproducible output.
   * @default Math.random
   */
  random?: () => number
}

/**
 * The third argument also accepts a plain boolean for `compress`, for backward compatibility.
 */
export function createEncoder(data: Uint8Array, sliceSize: number, options: boolean | LtEncoderOptions = true): LtEncoder {
  return new LtEncoder(data, sliceSize, options)
}

export class LtEncoder {
  public readonly k: number
  public readonly indices: Uint8Array[]
  public readonly checksum: number
  public readonly bytes: number
  public readonly compressed: Uint8Array
  public readonly compress: boolean
  public readonly maxDegree: number
  private readonly random: () => number
  private sampleDegree?: () => number

  constructor(
    public readonly data: Uint8Array,
    public readonly sliceSize: number,
    options: boolean | LtEncoderOptions = true,
  ) {
    const {
      compress = true,
      maxDegree = DEFAULT_MAX_DEGREE,
      random = Math.random,
    } = typeof options === 'boolean' ? { compress: options } : options

    this.compress = compress
    this.random = random
    this.compressed = compress ? deflate(data) : data
    this.indices = sliceData(this.compressed, sliceSize)
    this.k = this.indices.length
    this.checksum = getChecksum(this.data, this.k)
    this.bytes = this.compressed.length
    this.maxDegree = Math.min(this.k, maxDegree >= 1 ? Math.floor(maxDegree) : 1)
  }

  createBlock(indices: number[]): EncodedBlock {
    const data = new Uint8Array(this.sliceSize)
    for (const index of indices) {
      const indicesIndex = this.indices[index]!
      for (let i = 0; i < this.sliceSize; i++) {
        data[i] = data[i]! ^ indicesIndex[i]!
      }
    }

    return {
      k: this.k,
      bytes: this.bytes,
      checksum: this.checksum,
      indices,
      data,
    }
  }

  /**
   * Generate random encoded blocks that **never** ends.
   *
   * Degrees follow a Robust Soliton distribution truncated at `maxDegree`.
   * Only the sender decides the degree, so any decoder that reads the frame
   * format in `shared.ts` can consume these blocks.
   */
  *fountain(): Generator<EncodedBlock, never> {
    this.sampleDegree ||= createDegreeSampler(
      truncateDistribution(robustSoliton(this.k, DEFAULT_ROBUST_C, DEFAULT_ROBUST_DELTA), this.maxDegree),
      this.random,
    )
    while (true)
      yield this.createBlock(sampleIndices(this.k, this.sampleDegree(), this.random))
  }
}

function sliceData(data: Uint8Array, blockSize: number): Uint8Array[] {
  const blocks: Uint8Array[] = []
  for (let i = 0; i < data.length; i += blockSize) {
    const block = new Uint8Array(blockSize)
    block.set(data.slice(i, i + blockSize))
    blocks.push(block)
  }

  return blocks
}
