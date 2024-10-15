import type { QRDecoderWorkerFunctions } from './workers/qr-decode.worker'
import { createBirpc } from 'birpc'
import QRDecodeWorker from './workers/qr-decode.worker?worker'

export function createQRDecodeWorker() {
  const worker = new QRDecodeWorker()

  const rpc = Object.assign(createBirpc<QRDecoderWorkerFunctions>({}, {
    post: worker.postMessage.bind(worker),
    on: fn => worker.addEventListener('message', event => fn(event.data)),
  }), {
    worker,
    dispose() {
      worker.terminate()
    },
  })

  return rpc
}
