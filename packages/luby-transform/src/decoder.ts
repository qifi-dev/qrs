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
  public encodedBlocks: Set<EncodedBlock> = new Set()
  public encodedBlockKeyMap: Map<string, EncodedBlock> = new Map()
  public encodedBlockSubkeyMap: Map<string, Set<EncodedBlock>> = new Map()
  public encodedBlockIndexMap: Map<number, Set<EncodedBlock>> = new Map()
  public disposedEncodedBlocks: Map<number, (() => void)[]> = new Map()
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
    this.encodedCount += 1

    block.indices = block.indices.sort((a, b) => a - b)
    this.propagateDecoded(indicesToKey(block.indices), block)

    return this.decodedCount === this.meta.k
  }

  propagateDecoded(key: string, block: EncodedBlock) {
    const { decodedData, encodedBlocks, encodedBlockIndexMap, encodedBlockKeyMap, encodedBlockSubkeyMap, disposedEncodedBlocks } = this

    let index: number
    let blocks: Set<EncodedBlock> | undefined

    let { data, indices } = block
    const indicesSet = new Set(indices)

    let subblock: EncodedBlock | undefined
    let subIndicesSet: Set<number>

    if (encodedBlockKeyMap.has(key) || indices.every(i => decodedData[i] != null)) {
      return
    }

    // XOR the data
    // Current block > degree 1, find decoded subset degree blocks to decode
    if (indices.length > 1) {
      for (const index of indices) {
        if (decodedData[index] != null) {
          block.data = data = xorUint8Array(data, decodedData[index]!)
          indicesSet.delete(index)
        }
      }
      if (indicesSet.size !== indices.length) {
        block.indices = indices = Array.from(indicesSet)
      }
    }

    // Use 1x2x3 XOR 2x3 to get 1
    if (indices.length > 2) {
      const subkeys: [index: number, subkey: string][] = []
      for (const index of indices) {
        const subkey = indicesToKey(indices.filter(i => i !== index))
        if (subblock = encodedBlockKeyMap.get(subkey)) {
          block.data = data = xorUint8Array(data, subblock.data)
          subIndicesSet = new Set(subblock.indices)
          for (const i of subIndicesSet) {
            indicesSet.delete(i)
          }
          block.indices = indices = Array.from(indicesSet)
          break
        }
        else {
          subkeys.push([index, subkey])
        }
      }

      // If we can't find a subblock, store the subkeys for future decoding
      if (indicesSet.size > 1) {
        subkeys.forEach(([index, subkey]) => {
          const dispose = () => encodedBlockSubkeyMap.get(subkey)?.delete(block)
          encodedBlockSubkeyMap.get(subkey)?.add(block) ?? encodedBlockSubkeyMap.set(subkey, new Set([block]))
          disposedEncodedBlocks.get(index)?.push(dispose) ?? disposedEncodedBlocks.set(index, [dispose])
        })
      }
    }

    // After decoding, if the block > degree 1, store it as a pending block awaiting decoding
    if (indices.length > 1) {
      block.indices.forEach((i) => {
        encodedBlocks.add(block)
        encodedBlockIndexMap.get(i)?.add(block) ?? encodedBlockIndexMap.set(i, new Set([block]))
      })

      encodedBlockKeyMap.set(key = indicesToKey(indices), block)

      // Use 1x2 XOR 1x2x3 to get 3
      const superset = encodedBlockSubkeyMap.get(key)
      if (superset) {
        encodedBlockSubkeyMap.delete(key)
        for (const superblock of superset) {
          const superIndicesSet = new Set(superblock.indices)
          superblock.data = xorUint8Array(superblock.data, data)
          for (const i of indices) {
            superIndicesSet.delete(i)
          }
          superblock.indices = Array.from(superIndicesSet)
          this.propagateDecoded(indicesToKey(superblock.indices), superblock)
        }
      }
    }

    // After decoding, if the block is a degree 1 block, store it in decoded data and find blocks that can be decoded
    else if (decodedData[index = indices[0]!] == null) {
      encodedBlocks.delete(block)
      disposedEncodedBlocks.get(index)?.forEach(dispose => dispose())
      decodedData[index] = block.data
      this.decodedCount += 1

      if (blocks = encodedBlockIndexMap.get(index)) {
        encodedBlockIndexMap.delete(index)
        for (const block of blocks) {
          key = indicesToKey(block.indices)
          encodedBlockKeyMap.delete(key)
          this.propagateDecoded(key, block)
        }
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

    const sliceSize = this.meta.data.length
    const blocks = this.decodedData as Uint8Array[]
    const decodedData = new Uint8Array(this.meta.bytes)

    blocks.forEach((block, i) => {
      const start = i * sliceSize
      if (start + sliceSize > decodedData.length) {
        for (let j = 0; j < decodedData.length - start; j++) {
          decodedData[start + j] = block[j]!
        }
      }
      else {
        decodedData.set(block, i * sliceSize)
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

function indicesToKey(indices: number[]) {
  return indices.join(',')
}
