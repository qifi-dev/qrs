import type { EncodedBlock } from './shared'
import { deflate, inflate } from 'pako'
import { getChecksum } from './checksum'

export function createEncoder(data: Uint8Array, indicesSize: number, compress = true): LtEncoder {
  return new LtEncoder(data, indicesSize, compress)
}

export class LtEncoder {
  public readonly k: number
  public readonly indices: Uint8Array[]
  public readonly checksum: number
  public readonly bytes: number
  public readonly compressed: Uint8Array

  constructor(
    public readonly data: Uint8Array,
    public readonly indicesSize: number,
    public readonly compress = true,
  ) {
    this.compressed = compress ? deflate(data) : data
    this.indices = sliceData(this.compressed, indicesSize)
    this.k = this.indices.length
    this.checksum = getChecksum(this.data, this.k)
    this.bytes = this.compressed.length
  }

  createBlock(indices: number[]): EncodedBlock {
    const data = new Uint8Array(this.indicesSize)
    for (const index of indices) {
      const indicesIndex = this.indices[index]!
      for (let i = 0; i < this.indicesSize; i++) {
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
   * Generate random encoded blocks that **never** ends
   */
  *fountain(): Generator<EncodedBlock> {
    while (true) {
      const degree = getRandomDegree(this.k)
      const selectedIndices = getRandomIndices(this.k, degree)
      yield this.createBlock(selectedIndices)
    }
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

// Use Ideal Soliton Distribution to select degree
function getRandomDegree(k: number): number {
  const probabilities: number[] = Array.from({ length: k }, () => 0)

  // Calculate the probabilities of the Ideal Soliton Distribution
  probabilities[0] = 1 / k // P(1) = 1/k
  for (let d = 2; d <= k; d++) {
    probabilities[d - 1] = 1 / (d * (d - 1))
  }

  // Accumulate the probabilities to generate the cumulative distribution
  const cumulativeProbabilities: number[] = probabilities.reduce((acc, p, index) => {
    acc.push(p + (acc[index - 1] || 0))
    return acc
  }, [] as number[])

  // Generate a random number between [0,1] and select the corresponding degree in the cumulative probabilities
  const randomValue = Math.random()
  for (let i = 0; i < cumulativeProbabilities.length; i++) {
    if (randomValue < cumulativeProbabilities[i]!) {
      return i + 1
    }
  }

  return k // Theoretically, this line should never be reached
}

// Randomly select indices of degree number of original data blocks
function getRandomIndices(k: number, degree: number): number[] {
  const indices: Set<number> = new Set()
  while (indices.size < degree) {
    const randomIndex = Math.floor(Math.random() * k)
    indices.add(randomIndex)
  }

  return Array.from(indices)
}
