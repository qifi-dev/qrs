import fs from 'node:fs/promises'
import { expect, it } from 'vitest'
import { merge, slice } from '../utils/slicing'

it('slice string', async () => {
  const input = await fs.readFile('package.json', 'utf-8')
  const chunks = await slice(input, 64)
  expect(chunks.length)
    .toMatchInlineSnapshot(`15`)
  const recovered = await merge(chunks)
  expect(input).toBe(recovered)
})

it('slice binary', async () => {
  const input = (await fs.readFile('package.json', null)).buffer
  const chunks = await slice(input, 64)
  expect(chunks.length)
    .toMatchInlineSnapshot(`15`)
  const recovered = await merge(chunks)
  expect(String(input)).toBe(String(recovered))
})
