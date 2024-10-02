import fs from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'
import { merge, slice } from '../utils/slicing'

it('slice string', async () => {
  const input = await fs.readFile('test/mock-data.json', 'utf-8')

  const chunks = slice(input, 64)
  expect(chunks.length)
    .toMatchInlineSnapshot(`15`)

  const recovered = merge(chunks)
  expect(input).toBe(recovered)
})

it('slice binary', async () => {
  const input = (await fs.readFile('test/mock-data.json', null)).buffer
  const inputBytes = new Uint8Array(input).length

  const chunks = slice(input, 64)
  expect(chunks.length)
    .toMatchInlineSnapshot(`24`)

  const recovered = merge(chunks)
  expect(new Uint8Array(recovered as any).length).toBe(inputBytes)
  expect(String(input)).toBe(String(recovered))
})

it('slice image binary', async () => {
  // Sample file from Download Sample JPG Image for Demo Use
  // https:// sample-videos.com/download-sample-jpg-image.php
  const input = (await fs.readFile(join('test', 'SampleJPGImage_100kbmb.jpg'), null)).buffer
  const inputBytes = new Uint8Array(input).length

  const chunks = slice(input, 64)
  expect(chunks.length)
    .toMatchInlineSnapshot(`2554`)

  const recovered = merge(chunks)
  expect(new Uint8Array(recovered as any).length).toBe(inputBytes)
  expect(String(input)).toBe(String(recovered))
})
