import type { EncodedBlock, LtDecoder } from 'luby-transform'
import { createBirpc } from 'birpc'
import { createDecoder } from 'luby-transform'

let decoder: LtDecoder

const workerFunctions = {
  createDecoder(data?: EncodedBlock[]) {
    decoder = createDecoder(data)
  },
  isInitialized() {
    return !!decoder
  },
  addBlock(...args: Parameters<LtDecoder['addBlock']>) {
    checkDecoder()
    return decoder.addBlock(...args)
  },
  propagateDecoded(...args: Parameters<LtDecoder['propagateDecoded']>) {
    checkDecoder()
    decoder.propagateDecoded(...args)
  },
  getDecoded(...args: Parameters<LtDecoder['getDecoded']>) {
    checkDecoder()
    return decoder.getDecoded(...args)
  },
  getStatus() {
    checkDecoder()
    return {
      decodedCount: decoder.decodedCount,
      encodedCount: decoder.encodedCount,
      meta: decoder.meta,
      decodedData: decoder.decodedData,
      encodedBlocks: decoder.encodedBlocks,
    }
  },
}

export type LTDecoderWorkerFunctions = typeof workerFunctions

createBirpc(workerFunctions, {
  post: globalThis.postMessage,
  on: fn => globalThis.onmessage = event => fn(event.data),
})

function checkDecoder() {
  if (!decoder) {
    throw new Error('Decoder not initialized')
  }
}
