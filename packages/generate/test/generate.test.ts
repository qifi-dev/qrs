import { expect, it } from 'vitest'
import { createGeneraterQRCodeArray } from '../src/index'

// it.todo('should generate test', () => {
//   expect(1).toBe(1)
// })

it('generate boolean array', () => {
  const result = createGeneraterQRCodeArray(new Uint8Array(1).fill(23), 1000)
  expect(result).toMatchInlineSnapshot()
})
