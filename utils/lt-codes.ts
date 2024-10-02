interface EncodingMeta {
  /**
   * Number of original data blocks
   */
  k: number
  /**
   * Data length
   */
  length: number
  /**
   * Checksum
   */
  sum: number
}

interface EncodingBlock extends EncodingMeta {
  indices: number[]
  data: Uint32Array
}

export function blockToBinary(block: EncodingBlock): Uint32Array {
  const { k, length, sum, indices, data } = block
  const header = [
    indices.length,
    ...indices,
    k,
    length,
    sum,
  ]
  const binary = new Uint32Array(header.length + data.length)
  binary.set(header)
  binary.set(data, header.length)
  return binary
}

export function binaryToBlock(binary: Uint32Array): EncodingBlock {
  const degree = binary[0]!
  const indices = Array.from(binary.slice(1, degree + 1))
  const [
    k,
    length,
    sum,
  ] = Array.from(binary.slice(degree + 1)) as [number, number, number]
  const data = binary.slice(degree + 1 + 3)
  return {
    k,
    length,
    sum,
    indices,
    data,
  }
}

// CRC32 checksum
function checksum(data: Uint32Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i]!
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
    }
  }
  return crc ^ 0xFFFFFFFF
}

// Use Ideal Soliton Distribution to select degree
function getRandomDegree(k: number): number {
  const probability = Math.random()
  let degree = 1

  for (let d = 2; d <= k; d++) {
    const prob = 1 / (d * (d - 1))
    if (probability < prob) {
      degree = d
      break
    }
  }

  return degree
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

function xorUint32Array(a: Uint32Array, b: Uint32Array): Uint32Array {
  const result = new Uint32Array(a.length)
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i]! ^ b[i]!
  }
  return result
}

function sliceData(data: Uint32Array, blockSize: number): Uint32Array[] {
  const blocks: Uint32Array[] = []
  for (let i = 0; i < data.length; i += blockSize) {
    const block = new Uint32Array(blockSize)
    block.set(data.slice(i, i + blockSize))
    blocks.push(block)
  }
  return blocks
}

export function *encodeFountain(data: Uint32Array, indiceSize: number): Generator<EncodingBlock> {
  const sum = checksum(data)
  const indices = sliceData(data, indiceSize)
  const k = indices.length
  const meta: EncodingMeta = {
    k,
    length: data.length,
    sum,
  }

  while (true) {
    const degree = getRandomDegree(k)
    const selectedIndices = getRandomIndices(k, degree)
    let encodedData = new Uint32Array(indiceSize)

    for (const index of selectedIndices) {
      encodedData = xorUint32Array(encodedData, indices[index]!)
    }

    yield {
      ...meta,
      indices: selectedIndices,
      data: encodedData,
    }
  }
}

export function createDecoder(blocks?: EncodingBlock[]) {
  return new LtDecoder(blocks)
}

export class LtDecoder {
  public decodedData: (Uint32Array | undefined)[] = []
  public decodedCount = 0
  public encodedBlocks: Set<EncodingBlock> = new Set()
  public meta: EncodingBlock = undefined!

  constructor(blocks?: EncodingBlock[]) {
    if (blocks) {
      this.addBlock(blocks)
    }
  }

  // Add blocks and decode them on the fly
  addBlock(blocks: EncodingBlock[]): boolean {
    if (!blocks.length) {
      return false
    }

    if (!this.meta) {
      this.meta = blocks[0]!
    }

    for (const block of blocks) {
      this.encodedBlocks.add(block)
    }

    for (const block of this.encodedBlocks) {
      let { data, indices } = block

      for (const index of indices) {
        if (this.decodedData[index] != null) {
          data = xorUint32Array(data, this.decodedData[index]!)
          indices = indices.filter(i => i !== index)
        }
      }

      block.data = data
      block.indices = indices

      if (indices.length === 1) {
        this.decodedData[indices[0]!] = data
        this.decodedCount++
        this.encodedBlocks.delete(block)
      }
    }

    return this.decodedCount === this.meta.k
  }

  getDecoded(): Uint32Array | undefined {
    if (this.decodedCount !== this.meta.k) {
      return
    }
    if (this.decodedData.some(block => block == null)) {
      return
    }
    const indiceSize = this.meta.data.length
    const blocks = this.decodedData as Uint32Array[]
    const decodedData = new Uint32Array(this.meta.length)
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
    const sum = checksum(decodedData)
    if (sum !== this.meta.sum) {
      throw new Error('Checksum mismatch')
    }
    return decodedData
  }
}

export function tringToUint32Array(str: string): Uint32Array {
  const data = new Uint32Array(str.length)
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i)
  }
  return data
}
