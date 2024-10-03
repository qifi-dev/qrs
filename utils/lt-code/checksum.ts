function generateCRCTable() {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 8; j > 0; j--) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320; // Polynomial used in CRC-32
      }
      else {
        crc = crc >>> 1;
      }
    }
    crcTable[i] = crc >>> 0;
  }
  return crcTable;
}
const crcTable = /* @__PURE__ */ generateCRCTable();
/**
 * Get checksum of the data using CRC32 and XOR with k to ensure uniqueness for different chunking sizes
 */

export function getChecksum(uint8Array: Uint8Array, k: number): number {
  let crc = 0xFFFFFFFF; // Initial value
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i]!;
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF]!;
  }

  return (crc ^ k ^ 0xFFFFFFFF) >>> 0; // Final XOR value and ensure 32-bit unsigned
}
