import { compress, compressToBase64, decompress, decompressFromBase64 } from 'lz-string'
import { hash as getHash } from 'ohash'

export type SliceData = [
  hash: string,
  total: number,
  index: number,
  type: 0 | 1, /* 0 for binary | 1 for string */
  chunk: string,
]

function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const blob = new Blob([buffer], { type: 'text/plain; charset=utf-8' })
  return blob.text()
}

function base64ToArrayBuffer(str: string): Promise<ArrayBuffer> {
  const blob = new Blob([str], { type: 'text/plain; charset=utf-8' })
  return blob.arrayBuffer()
}

export async function slice(input: string | ArrayBuffer, chunkSize = 256): Promise<SliceData[]> {
  const hash = getHash(input)
  const isBinary = typeof input !== 'string'
  const processed = typeof input !== 'string'
    ? await arrayBufferToBase64(input)
    : input.toString()
  const compressed = compressToBase64(processed)

  const chunks = Math.ceil(compressed.length / chunkSize)
  return Array.from(
    { length: chunks },
    (_, idx): SliceData => [
      hash,
      chunks,
      idx,
      isBinary ? 0 : 1,
      compressed.slice(idx * chunkSize, (idx + 1) * chunkSize),
    ],
  )
}

export async function merge(slices: SliceData[]): Promise<string | ArrayBuffer> {
  const merged = slices.map(i => i[4]).join('')
  const decompressed = decompressFromBase64(merged)
  const targetHash = slices[0]![0]
  const isBinary = slices[0]![3] === 0

  const data: string | ArrayBuffer = isBinary
    ? await base64ToArrayBuffer(decompressed)
    : decompressed

  const hash = getHash(data)
  if (hash !== targetHash) {
    throw new Error('Hash mismatch')
  }
  return data
}
