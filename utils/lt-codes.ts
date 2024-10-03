export interface EncodedHeader {
  /**
   * Number of original data blocks
   */
  k: number
  /**
   * Data length for Uint8Array data
   */
  bytes: number
  /**
   * Checksum, CRC32 and XOR of k
   */
  checksum: number
}

export interface EncodedBlock extends EncodedHeader {
  indices: number[]
  data: Uint8Array
}

export function blockToBinary(block: EncodedBlock): Uint8Array {
  const { k, bytes, checksum, indices, data } = block
  const header = new Uint32Array([
    indices.length,
    ...indices,
    k,
    bytes,
    checksum,
  ])
  const binary = new Uint8Array(header.length * 4 + data.length)
  let offset = 0
  binary.set(new Uint8Array(header.buffer), offset)
  offset += header.length * 4
  binary.set(data, offset)
  return binary
}

export function binaryToBlock(binary: Uint8Array): EncodedBlock {
  const degree = new Uint32Array(binary.buffer, 0, 4)[0]!
  const headerRest = Array.from(new Uint32Array(binary.buffer, 4, degree + 3))
  const indices = headerRest.slice(0, degree)
  const [
    k,
    bytes,
    checksum,
  ] = headerRest.slice(degree) as [number, number, number]
  const data = binary.slice(4 * (degree + 4))
  return {
    k,
    bytes,
    checksum,
    indices,
    data,
  }
}

function generateCRCTable() {
  const crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 8; j > 0; j--) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320 // Polynomial used in CRC-32
      }
      else {
        crc = crc >>> 1
      }
    }
    crcTable[i] = crc >>> 0
  }
  return crcTable
}

const crcTable = /* @__PURE__ */ generateCRCTable()

/**
 * Get checksum of the data using CRC32 and XOR with k to ensure uniqueness for different chunking sizes
 */
function getChecksum(uint8Array: Uint8Array, k: number): number {
  let crc = 0xFFFFFFFF // Initial value
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i]!
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF]!
  }

  return (crc ^ k ^ 0xFFFFFFFF) >>> 0 // Final XOR value and ensure 32-bit unsigned
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

function xorUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i]! ^ b[i]!
  }
  return result
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

export function createDecoder(blocks?: EncodedBlock[]) {
  return new LtDecoder(blocks)
}

export function createEncoder(data: Uint8Array, indiceSize: number) {
  return new LtEncoder(data, indiceSize)
}

export class LtEncoder {
  public readonly k: number
  public readonly indices: Uint8Array[]
  public readonly checksum: number
  public readonly bytes: number

  constructor(
    public readonly data: Uint8Array,
    public readonly indiceSize: number,
  ) {
    this.indices = sliceData(data, indiceSize)
    this.k = this.indices.length
    this.checksum = getChecksum(data, this.k)
    this.bytes = data.length
  }

  createBlock(indices: number[]): EncodedBlock {
    const data = new Uint8Array(this.indiceSize)
    for (const index of indices) {
      const indice = this.indices[index]!
      for (let i = 0; i < this.indiceSize; i++) {
        data[i] = data[i]! ^ indice[i]!
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

export class LtDecoder {
  public decodedData: (Uint8Array | undefined)[] = []
  public decodedCount = 0
  public encodedCount = 0
  public encodedBlocks: Set<EncodedBlock> = new Set()
  public meta: EncodedBlock = undefined!

  constructor(blocks?: EncodedBlock[]) {
    if (blocks) {
      for (const block of blocks) {
        this.addBlock(block)
      }
    }
  }

  // Add block and decode them on the fly
  addBlock(block: EncodedBlock): boolean {
    if (!this.meta) {
      this.meta = block
      this.decodedData = Array.from({ length: this.meta.k })
    }

    if (block.checksum !== this.meta.checksum) {
      throw new Error('Adding block with different checksum')
    }
    this.encodedBlocks.add(block)
    this.encodedCount += 1

    this.propagateDecoded()

    return this.decodedCount === this.meta.k
  }

  propagateDecoded() {
    let changed = false
    for (const block of this.encodedBlocks) {
      let { data, indices } = block

      // We already have all the data from this block
      if (indices.every(index => this.decodedData[index] != null)) {
        this.encodedBlocks.delete(block)
        continue
      }

      // XOR the data
      for (const index of indices) {
        if (this.decodedData[index] != null) {
          block.data = data = xorUint8Array(data, this.decodedData[index]!)
          block.indices = indices = indices.filter(i => i !== index)
          changed = true
        }
      }

      if (indices.length === 1 && this.decodedData[indices[0]!] == null) {
        this.decodedData[indices[0]!] = block.data
        this.decodedCount++
        this.encodedBlocks.delete(block)
        changed = true
      }
    }

    for (const block of this.encodedBlocks) {
      const { data, indices } = block

      // Use 1x2x3 XOR 2x3 to get 1
      if (indices.length >= 3) {
        const lowerBlocks = Array.from(this.encodedBlocks).filter(i => i.indices.length === indices.length - 1)
        for (const lower of lowerBlocks) {
          const extraIndices = indices.filter(i => !lower.indices.includes(i))
          if (extraIndices.length === 1 && this.decodedData[extraIndices[0]!] == null) {
            const extraData = xorUint8Array(data, lower.data)
            const extraIndex = extraIndices[0]!
            this.decodedData[extraIndex] = extraData
            this.decodedCount++
            this.encodedBlocks.delete(lower)
            changed = true
          }
        }
      }
    }

    // If making some progress, continue
    if (changed) {
      this.propagateDecoded()
    }
  }

  getDecoded(): Uint8Array | undefined {
    if (this.decodedCount !== this.meta.k) {
      return
    }
    if (this.decodedData.some(block => block == null)) {
      return
    }
    const indiceSize = this.meta.data.length
    const blocks = this.decodedData as Uint8Array[]
    const decodedData = new Uint8Array(this.meta.bytes)
    blocks.forEach((block, i) => {
      const start = i * indiceSize
      if (start + indiceSize > decodedData.length) {
        for (let j = 0; j < decodedData.length - start; j++) {
          decodedData[start + j] = block[j]!
        }
      }
      else {
        decodedData.set(block, i * indiceSize)
      }
    })
    const checksum = getChecksum(decodedData, this.meta.k)
    if (checksum !== this.meta.checksum) {
      throw new Error('Checksum mismatch')
    }
    return decodedData
  }
}

export function stringToUint8Array(str: string): Uint8Array {
  const data = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i)
  }
  return data
}
