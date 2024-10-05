/**
 * Merge multiple Uint8Array into a single Uint8Array
 * Each chunk is prefixed with a 4-byte Uint32 to store the length of the chunk
 */
export function mergeUint8Arrays(arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length + 4, 0) // 4 是為了存每個數組的長度 (Uint32)

  const mergedArray = new Uint8Array(totalLength)
  let offset = 0

  arrays.forEach((arr) => {
    const length = arr.length
    // Store the length as a 4-byte Uint32
    mergedArray[offset++] = (length >> 24) & 0xFF
    mergedArray[offset++] = (length >> 16) & 0xFF
    mergedArray[offset++] = (length >> 8) & 0xFF
    mergedArray[offset++] = length & 0xFF

    // Copy data
    mergedArray.set(arr, offset)
    offset += length
  })

  return mergedArray
}

/**
 * Split a merged Uint8Array into multiple Uint8Array
 */
export function splitUint8Arrays(mergedArray: Uint8Array): Uint8Array[] {
  const arrays = []
  let offset = 0

  while (offset < mergedArray.length) {
    // Read chunk length
    const length = (mergedArray[offset++]! << 24)
      | (mergedArray[offset++]! << 16)
      | (mergedArray[offset++]! << 8)
      | mergedArray[offset++]!

    // Slice the chunk
    const arr = mergedArray.slice(offset, offset + length)
    arrays.push(arr)
    offset += length
  }

  return arrays
}

export function appendMetaToBuffer<T>(data: Uint8Array, meta: T): Uint8Array {
  const json = JSON.stringify(meta)
  const metaBuffer = stringToUint8Array(json)
  return mergeUint8Arrays([metaBuffer, data])
}

export function appendFileHeaderMetaToBuffer(data: Uint8Array, meta: { filename?: string, contentType?: string }): Uint8Array {
  return appendMetaToBuffer(data, meta)
}

export function readMetaFromBuffer<T>(buffer: Uint8Array): [data: Uint8Array, meta: T] {
  const splitted = splitUint8Arrays(buffer) as [Uint8Array, Uint8Array]
  if (splitted.length !== 2) {
    throw new Error('Invalid buffer')
  }

  const [metaBuffer, data] = splitted
  const meta = JSON.parse(uint8ArrayToString(metaBuffer!))
  return [data, meta]
}

export function readFileHeaderMetaFromBuffer(buffer: Uint8Array): [data: Uint8Array, meta: { filename?: string, contentType: string }] {
  const [data, meta] = readMetaFromBuffer<{ filename?: string, contentType?: string }>(buffer)
  if (!meta.contentType) {
    meta.contentType = 'application/octet-stream'
  }

  return [data, meta] as [Uint8Array, { filename?: string, contentType: string }]
}

export function stringToUint8Array(str: string): Uint8Array {
  const data = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i)
  }

  return data
}

export function uint8ArrayToString(data: Uint8Array): string {
  return String.fromCharCode(...data)
}
