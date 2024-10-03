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
}

export interface EncodedBlock extends EncodedHeader {
  indices: number[]
  data: Uint8Array
}

export function blockToBinary(block: EncodedBlock): Uint8Array {
  const { k, bytes, checksum, indices, data } = block
  const header = new Uint32Array([
    indices.length,
    ...indices,
    k,
    bytes,
    checksum,
  ])
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
  ] = headerRest.slice(degree) as [number, number, number]
  const data = binary.slice(4 * (degree + 4))
  return {
    k,
    bytes,
    checksum,
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

export function stringToUint8Array(str: string): Uint8Array {
  const data = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i)
  }
  return data
}
