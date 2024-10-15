import type { LTDecoderWorkerFunctions } from './workers/lt-decode.worker'
import { createBirpc } from 'birpc'
import DecodeWorker from './workers/lt-decode.worker?worker'

export function createLTDecodeWorker() {
  const worker = new DecodeWorker()

  const rpc = Object.assign(createBirpc<LTDecoderWorkerFunctions>({}, {
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
