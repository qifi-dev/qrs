import type { EncodedBlock } from 'luby-transform'
import type { DecoderWorkerFunctions } from './workers/decode'
import { createBirpc } from 'birpc'
import DecodeWorkerConstructor from './workers/decode?worker'

export function createDecodeWorker() {
  const worker = new DecodeWorker()

  const rpc = Object.assign(createBirpc<DecoderWorkerFunctions>({}, {
    post: worker.decodeWorker.postMessage.bind(worker.decodeWorker),
    on: fn => worker.decodeWorker.addEventListener('message', event => fn(event.data)),
  }), {
    worker,
    dispose() {
      worker.decodeWorker.terminate()
    },
  })

  return rpc
}

class DecodeWorker {
  decodeWorker: Worker
  constructor() {
    this.decodeWorker = new DecodeWorkerConstructor()
  }

  initDecoder(data?: EncodedBlock[]) {
    this.decodeWorker.postMessage({ type: 'createDecoder', data })
  }

  addBlock(data: EncodedBlock) {
    this.decodeWorker.postMessage({ type: 'addBlock', data })
  }

  onDecoded(callback: (data: Uint8Array | undefined) => void) {
    const eventFn = (event: MessageEvent) => {
      const { type, data } = event.data
      if (type === 'decoded') {
        callback(data)
      }
    }
    this.decodeWorker.addEventListener('message', eventFn)

    return () => {
      this.decodeWorker.removeEventListener('message', eventFn)
    }
  }
}
