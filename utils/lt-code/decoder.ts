/* eslint-disable no-cond-assign */
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
  public encodedBlocks: Map<string, EncodedBlock> = new Map()
  public encodedBlockIndexMap: Map<number, Set<EncodedBlock>> = new Map()
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
    this.propagateDecoded(block)

    return this.decodedCount === this.meta.k
  }

  private count = 0

  propagateDecoded(block: EncodedBlock = this.meta) {
    if (this.count > 100) {
      throw new Error('Too many blocks, aborting')
    }
    const { decodedData, encodedBlockIndexMap } = this
    let { data, indices } = block
    let index: number
    let blocks: Set<EncodedBlock> | undefined

    if (indices.every(i => decodedData[i] != null)) {
      return
    }
    this.encodedCount += 1

    // XOR the data
    // Current block > degree 1, find decoded child degree 1 blocks to decode
    for (index of indices) {
      if (decodedData[index] != null) {
        block.data = data = xorUint8Array(data, decodedData[index]!)
        block.indices = indices = indices.filter(i => i !== index)
      }
    }

    // After decoding, if the block > degree 1, store it as a pending block awaiting decoding
    if (indices.length > 1) {
      block.indices.forEach((i) => {
        encodedBlockIndexMap.get(i)?.add(block) ?? encodedBlockIndexMap.set(i, new Set([block]))
      })
    }

    // After decoding, if the block is a degree 1 block, store it in decoded data and find blocks that can be decoded
    else if (decodedData[index = indices[0]!] == null) {
      decodedData[index] = block.data
      this.decodedCount += 1

      if (blocks = encodedBlockIndexMap.get(index)) {
        this.count += 1
        encodedBlockIndexMap.delete(index)
        for (const block of blocks) {
          this.propagateDecoded(block)
        }
        this.count -= 1
      }
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
