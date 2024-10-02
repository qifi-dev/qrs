import fs from 'node:fs/promises'
import { join } from 'node:path'

import { fromUint8Array, toUint8Array } from 'js-base64'
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
    const str = fromUint8Array(binary)
    // Use the str to transfer

    const b2 = toUint8Array(str)
    const back = binaryToBlock(b2)
    const result = decoder.addBlock([back])
    if (result)
      break
  }

  const result = decoder.getDecoded()!
  expect(result).toBeDefined()
  expect(result).toBeInstanceOf(Uint8Array)
  expect(result.length).toBe(data.length)
})
