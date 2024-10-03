import fs from 'node:fs/promises'
import { join } from 'node:path'

import { fromUint8Array, toUint8Array } from 'js-base64'
import { expect, it } from 'vitest'
import { binaryToBlock, blockToBinary, createDecoder, encodeFountain } from '../utils/lt-codes'

it('slice binary', { repeats: 10 }, async () => {
  const input = (await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer
  const data = new Uint8Array(input)

  const decoder = createDecoder()
  let count = 0
  let k = 0
  for (const block of encodeFountain(data, 1000)) {
    k = block.k
    count += 1
    const rate = count / k
    if (rate > 10) {
      throw new Error('Too many blocks, aborting')
    }
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

  expect(
    +(count / k * 100).toFixed(2),
    'Data rate should be less than 200%',
  )
    .toBeLessThan(200)
})
