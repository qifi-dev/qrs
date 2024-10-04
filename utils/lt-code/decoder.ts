import type { EncodedBlock } from './shared'
import { inflate } from 'pako'
import { getChecksum } from './checksum'
import { xorUint8Array } from './shared'

export function createDecoder(blocks?: EncodedBlock[]) {
  return new LtDecoder(blocks)
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

    const indicesSize = this.meta.data.length
    const blocks = this.decodedData as Uint8Array[]
    const decodedData = new Uint8Array(this.meta.bytes)

    blocks.forEach((block, i) => {
      const start = i * indicesSize
      if (start + indicesSize > decodedData.length) {
        for (let j = 0; j < decodedData.length - start; j++) {
          decodedData[start + j] = block[j]!
        }
      }
      else {
        decodedData.set(block, i * indicesSize)
      }
    })

    try {
      const decompressed = inflate(decodedData)
      const checksum = getChecksum(decompressed, this.meta.k)
      if (checksum === this.meta.checksum) {
        return decompressed
      }
    }
    catch {
      const checksum = getChecksum(decodedData, this.meta.k)
      if (checksum === this.meta.checksum) {
        return decodedData
      }
    }

    throw new Error('Checksum mismatch')
  }
}
