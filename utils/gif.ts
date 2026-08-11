export const GIF_PALETTE: [number, number, number][] = [
  [255, 255, 255],
  [0, 0, 0],
]

export function qrMatrixToIndexedPixels(
  matrix: readonly (readonly boolean[])[],
  imageSize: number,
  border = 5,
): Uint8Array {
  if (!Number.isInteger(imageSize) || imageSize < 1)
    throw new RangeError('Image size must be a positive integer')
  if (!Number.isInteger(border) || border < 0)
    throw new RangeError('Border must be a non-negative integer')

  const matrixSize = matrix.length
  if (matrixSize === 0 || matrix.some(row => row.length !== matrixSize))
    throw new TypeError('QR matrix must be a non-empty square')

  const moduleSize = Math.floor(imageSize / (matrixSize + border * 2))
  if (moduleSize < 1)
    throw new RangeError('Image size is too small for this QR code')

  const pixels = new Uint8Array(imageSize * imageSize)
  const renderedSize = matrixSize * moduleSize
  const offset = Math.floor((imageSize - renderedSize) / 2)

  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (!matrix[y]![x])
        continue

      const pixelX = offset + x * moduleSize
      const pixelY = offset + y * moduleSize
      for (let row = 0; row < moduleSize; row++) {
        const start = (pixelY + row) * imageSize + pixelX
        pixels.fill(1, start, start + moduleSize)
      }
    }
  }

  return pixels
}

export function gifFilename(filename?: string): string {
  const withoutExtension = (filename || 'qrs-transfer').replace(/\.[^.]*$/, '')
  const printableName = Array.from(withoutExtension, char => char.charCodeAt(0) < 32 ? '-' : char).join('')
  const safeName = printableName
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()

  return `${safeName || 'qrs-transfer'}.gif`
}
