import fs from 'node:fs/promises'
import { join } from 'node:path'

import { fromUint8Array, toUint8Array } from 'js-base64'
import { expect, it } from 'vitest'
import { binaryToBlock, blockToBinary, createDecoder, createEncoder } from '../utils/lt-code'

const list: {
  name: string
  data: Uint8Array
  only?: boolean
  repeats?: number
  size?: number
}[] = [
  {
    name: 'generated-1',
    data: new Uint8Array(1).fill(23),
    // only: true,
    // repeats: 0,
  },
  {
    name: 'generated-2',
    data: new Uint8Array(1000).fill(1),
  },
  {
    name: 'generated-3',
    data: new Uint8Array(1031).fill(1),
  },
  {
    name: 'sample-jpg',
    data: new Uint8Array((await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer),
    size: 1200,
  },
]

for (const item of list) {
  let test = it
  if (item.only)
    test = (it as any).only
  const {
    data,
    name,
    repeats = 10,
    size = 1000,
  } = item

  test(`slice binary: ${name} (size: ${size})`, { repeats }, async () => {
    const encoder = createEncoder(data, size)
    const decoder = createDecoder()

    let count = 0

    for (const block of encoder.fountain()) {
      count += 1
      const rate = count / encoder.k
      if (rate > 10) {
        throw new Error('Too many blocks, aborting')
      }
      const binary = blockToBinary(block)
      const str = fromUint8Array(binary)
      // Use the str to transfer

      const b2 = toUint8Array(str)
      const back = binaryToBlock(b2)
      const result = decoder.addBlock(back)
      if (result)
        break
    }

    const result = decoder.getDecoded()!
    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(data.length)

    expect(
      +(count / encoder.k * 100).toFixed(2),
      'Data rate should be less than 200%',
    )
      .toBeLessThan(250) // TODO: target 180%
  })
}
