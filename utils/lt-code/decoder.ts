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
    block.indices = block.indices.sort((a, b) => a - b)
    this.propagateDecoded(indicesToKey(block.indices), block)

    return this.decodedCount === this.meta.k
  }

  private count = 0

  propagateDecoded(key: string, block: EncodedBlock) {
    if (this.count > 100) {
      throw new Error('Too many blocks, aborting')
    }

    const { decodedData, encodedBlocks, encodedBlockIndexMap, encodedBlockKeyMap } = this

    let index: number
    let blocks: Set<EncodedBlock> | undefined

    let { data, indices } = block

    let subblock: EncodedBlock | undefined
    let subIndicesSet: Set<number>
    let updated = false

    if (encodedBlockKeyMap.has(key) || indices.every(i => decodedData[i] != null)) {
      return
    }
    this.encodedCount += 1

    // XOR the data
    // Current block > degree 1, find decoded subset degree blocks to decode
    // if (indices.length > 2) {
    //   for (const subkey of getSubset(indices, indices.length - 1).map(indicesToKey)) {
    //     if (indices.length < subkey.includes.length) {
    //       break
    //     }
    //     if (subblock = encodedBlockKeyMap.get(subkey)) {
    //       block.data = data = xorUint8Array(data, subblock.data)
    //       subIndicesSet = new Set(subblock.indices)
    //       block.indices = indices = indices.filter(i => !subIndicesSet.has(i))
    //       updated = true
    //     }
    //   }
    // }
    if (indices.length > 1) {
      for (const index of indices) {
        if (decodedData[index] != null) {
          block.data = data = xorUint8Array(data, decodedData[index]!)
          block.indices = indices = indices.filter(i => i !== index)
          updated = true
        }
      }
    }
    if (updated) {
      key = indicesToKey(indices)
    }
    encodedBlockKeyMap.set(key, block)

    // After decoding, if the block > degree 1, store it as a pending block awaiting decoding
    if (indices.length > 1) {
      block.indices.forEach((i) => {
        encodedBlocks.add(block)
        encodedBlockIndexMap.get(i)?.add(block) ?? encodedBlockIndexMap.set(i, new Set([block]))
      })
    }

    // After decoding, if the block is a degree 1 block, store it in decoded data and find blocks that can be decoded
    else if (decodedData[index = indices[0]!] == null) {
      encodedBlocks.delete(block)
      decodedData[index] = block.data
      this.decodedCount += 1

      if (blocks = encodedBlockIndexMap.get(index)) {
        this.count += 1
        encodedBlockIndexMap.delete(index)
        for (const block of blocks) {
          key = indicesToKey(block.indices)
          encodedBlockKeyMap.delete(key)
          this.propagateDecoded(key, block)
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

function indicesToKey(indices: number[]) {
  return indices.join(',')
}

function getSubset(indices: number[], k: number) {
  const result: number[][] = []
  const dfs = (start: number, path: number[]) => {
    if (path.length === k) {
      result.push(path.slice())
      return
    }
    for (let i = start; i < indices.length; i++) {
      path.push(indices[i]!)
      dfs(i + 1, path)
      path.pop()
    }
  }
  dfs(0, [])
  return result
}
