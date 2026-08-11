import { expect, it } from 'vitest'
import { appendFileHeaderMetaToBuffer, readFileHeaderMetaFromBuffer } from '../src'

it('preserves Unicode file metadata', () => {
  const file = new TextEncoder().encode('file contents')
  const filename = '中文文件-测试.json'
  const contentType = 'application/json'

  const encoded = appendFileHeaderMetaToBuffer(file, { filename, contentType })
  const [decoded, meta] = readFileHeaderMetaFromBuffer(encoded)

  expect(decoded).toEqual(file)
  expect(meta).toEqual({ filename, contentType })
})
