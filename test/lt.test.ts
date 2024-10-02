import fs from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'
import { binaryToBlock, blockToBinary, createDecoder, encodeFountain } from '../utils/lt-codes'

it('slice binary', async () => {
  const input = (await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer
  const data = new Uint8Array(input)

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
  expect(result).toBeInstanceOf(Uint8Array)
  expect(result.length).toBe(data.length)
})
