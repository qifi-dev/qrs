import fs from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { binaryToBlock, blockToBinary, createDecoder, encodeFountain } from '../utils/lt-codes'

describe('lt-codes', () => {
  it('slice binary', async () => {
    const input = (await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer
    const data = new Uint32Array(input)

    const decoder = createDecoder()
    let count = 0
    for (const block of encodeFountain(data, 1000)) {
      count += 1
      if (count > 1000)
        throw new Error('Too many blocks')
      const binary = blockToBinary(block)
      // Use the binary to transfer
      const back = binaryToBlock(binary)
      const result = decoder.addBlock([back])
      if (result)
        break
    }

    const result = decoder.getDecoded()!
    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Uint32Array)
    expect(result.length).toBe(data.length)
  })

  it(`allow loss and disorder`, async () => {
    const input = (await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer
    const data = new Uint32Array(input)

    const decoder = createDecoder()
    let count = 0

    const packets: Uint32Array[] = []

    // Encode the data
    for (const block of encodeFountain(data, 1000)) {
      count += 1
      if (count > 1000)
        break
      packets.push(blockToBinary(block))
    }

    // Dissupt the order of packets
    packets.sort(() => Math.random() - 0.5)
    // Simulate 50% of packet loss
    packets.length = Math.floor(packets.length * 0.5)

    count = 0
    // Decode the data
    for (const packet of packets) {
      count += 1
      if (count > 500)
        throw new Error('Too many blocks')

      // Use the binary to transfer
      const back = binaryToBlock(packet)
      const result = decoder.addBlock([back])
      if (result)
        break
    }

    const result = decoder.getDecoded()!
    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Uint32Array)
    expect(result.length).toBe(data.length)
  })
})
