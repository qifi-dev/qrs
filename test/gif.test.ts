import { describe, expect, it } from 'vitest'
import { GIFEncoder } from 'gifenc'
import { encode } from 'uqr'
import { GIF_PALETTE, gifFilename, qrMatrixToIndexedPixels } from '../utils/gif'

describe('qrMatrixToIndexedPixels', () => {
  it('centers crisp QR modules inside the requested border', () => {
    const pixels = qrMatrixToIndexedPixels([
      [true, false],
      [false, true],
    ], 8, 1)

    const rows = Array.from({ length: 8 }, (_, row) =>
      Array.from(pixels.slice(row * 8, row * 8 + 8)).join(''))

    expect(rows).toEqual([
      '00000000',
      '00000000',
      '00110000',
      '00110000',
      '00001100',
      '00001100',
      '00000000',
      '00000000',
    ])
  })

  it('rejects output that cannot fit one pixel per module', () => {
    expect(() => qrMatrixToIndexedPixels([[true]], 2, 1))
      .toThrow('Image size is too small')
  })
})

describe('gifFilename', () => {
  it('replaces the original extension and unsafe filename characters', () => {
    expect(gifFilename('demo<copy>.zip')).toBe('demo-copy-.gif')
  })

  it('provides a useful default', () => {
    expect(gifFilename()).toBe('qrs-transfer.gif')
  })
})

it('encodes multiple QR matrices as a valid animated GIF', () => {
  const gif = GIFEncoder()

  for (let frame = 0; frame < 3; frame++) {
    const qr = encode(`qrs-test-frame-${frame}`)
    const pixels = qrMatrixToIndexedPixels(qr.data, 128, 5)
    gif.writeFrame(pixels, 128, 128, {
      palette: frame === 0 ? GIF_PALETTE : undefined,
      delay: 100,
      repeat: 0,
    })
  }

  gif.finish()
  const output = gif.bytes()
  const signature = new TextDecoder().decode(output.slice(0, 6))

  expect(signature).toBe('GIF89a')
  expect(output.byteLength).toBeGreaterThan(1000)
  expect(output.at(-1)).toBe(0x3B)
})
