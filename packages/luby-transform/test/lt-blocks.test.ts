import { expect, it } from 'vitest'
import { createDecoder, createEncoder } from '../src'

function randomBuffer(length: number) {
  return new Uint8Array(length).map(() => Math.floor(Math.random() * 256))
}

function createEncoderWithIndices(count: number) {
  const buffer = randomBuffer(count * 100 - 5)
  const encoder = createEncoder(buffer, 100, false)
  expect(encoder.k).toBe(count)

  return {
    buffer,
    encoder,
  }
}

it('cross-blocks resolving 1', () => {
  const { buffer, encoder } = createEncoderWithIndices(3)

  const decoder = createDecoder()
  decoder.addBlock(encoder.createBlock([0, 1, 2]))
  decoder.addBlock(encoder.createBlock([1, 2]))
  // Here we know [0]
  decoder.addBlock(encoder.createBlock([0, 2]))

  const data = decoder.getDecoded()
  expect(data).toBeDefined()
  expect(data).toEqual(buffer)
})

it('cross-blocks resolving 2', () => {
  const { buffer, encoder } = createEncoderWithIndices(3)

  const decoder = createDecoder()
  decoder.addBlock(encoder.createBlock([1, 2]))
  decoder.addBlock(encoder.createBlock([0, 1, 2]))
  // Here we know [0]
  decoder.addBlock(encoder.createBlock([0, 2]))

  const data = decoder.getDecoded()
  expect(data).toBeDefined()
  expect(data).toEqual(buffer)
})

it('cross-blocks resolving 3', () => {
  const { buffer, encoder } = createEncoderWithIndices(5)

  const decoder = createDecoder()
  decoder.addBlock(encoder.createBlock([0, 1, 2, 3, 4]))
  decoder.addBlock(encoder.createBlock([0, 1]))
  expect(decoder.decodedCount).toBe(0)
  // Here we know [0, 1] and [2, 3, 4]
  decoder.addBlock(encoder.createBlock([2, 3]))
  // Here we can have [4]
  expect(decoder.decodedCount).toBe(1)
  decoder.addBlock(encoder.createBlock([1]))
  // Here we can have [0] and [1]
  expect(decoder.decodedCount).toBe(3)
  decoder.addBlock(encoder.createBlock([4]))
  decoder.addBlock(encoder.createBlock([2, 4]))
  // Here we can have [2] and [3]
  expect(decoder.decodedCount).toBe(5)

  const data = decoder.getDecoded()
  expect(data).toBeDefined()
  expect(data).toEqual(buffer)
})
