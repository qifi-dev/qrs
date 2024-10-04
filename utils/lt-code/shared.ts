export enum ContentType {
  /**
   * Binary data
   */
  Binary,
  /**
   * Plain text
   */
  Text,
  /**
   * JSON data
   */
  JSON,
}

export interface EncodedHeader {
  /**
   * Number of original data blocks
   */
  k: number
  /**
   * Data length for Uint8Array data
   */
  bytes: number
  /**
   * Checksum, CRC32 and XOR of k
   */
  checksum: number
  /**
   * Content Type, @see ContentType .
   * For converting Content-Type string to ContentType enum, use @see mapContentType .
   */
  contentType: number
}

export interface EncodedBlock extends EncodedHeader {
  indices: number[]
  data: Uint8Array
}

export function blockToBinary(block: EncodedBlock): Uint8Array {
  const { k, bytes, checksum, indices, data, contentType } = block
  const header = new Uint32Array([
    indices.length,
    ...indices,
    k,
    bytes,
    checksum,
    contentType,
  ])

  console.log('to:', bytes, checksum)
  const binary = new Uint8Array(header.length * 4 + data.length)
  let offset = 0
  binary.set(new Uint8Array(header.buffer), offset)
  offset += header.length * 4
  binary.set(data, offset)

  return binary
}

export function binaryToBlock(binary: Uint8Array): EncodedBlock {
  const degree = new Uint32Array(binary.buffer, 0, 4)[0]!

  const headerRest = Array.from(new Uint32Array(binary.buffer, 4, degree + 3))
  const indices = headerRest.slice(0, degree)
  const [
    k,
    bytes,
    checksum,
    contentType,
  ] = headerRest.slice(degree) as [number, number, number, number]
  console.log('from:', bytes, checksum)
  const data = binary.slice(4 * (degree + 4))

  return {
    k,
    bytes,
    checksum,
    contentType,
    indices,
    data,
  }
}

export function xorUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i]! ^ b[i]!
  }

  return result
}

/**
 * Convert Content-Type string to @see ContentType enum.
 *
 * @param contentType Content-Type string
 * @returns {ContentType} enum
 */
export function mapContentType(contentType: string): ContentType {
  if (contentType.startsWith('text/'))
    return ContentType.Text
  if (contentType.startsWith('application/json'))
    return ContentType.JSON

  return ContentType.Binary
}
