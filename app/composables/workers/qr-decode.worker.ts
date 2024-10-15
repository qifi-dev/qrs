import { createBirpc } from 'birpc'
import jsQR from 'jsqr-es6'

interface GrayscaleWeights {
  red: number
  green: number
  blue: number
  useIntegerApproximation: boolean
}

let inversionAttempts: 'dontInvert' | 'onlyInvert' | 'attemptBoth' = 'dontInvert'
const grayscaleWeights: GrayscaleWeights = {
  // weights for quick luma integer approximation (https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601)
  red: 77,
  green: 150,
  blue: 29,
  useIntegerApproximation: true,
}

const workerFunctions = {
  decode(data: Uint8ClampedArray, options: { width: number, height: number }) {
    return jsQR(data, options.width, options.height, {
      inversionAttempts,
      greyScaleWeights: grayscaleWeights,
    })
  },
  setGrayscaleWeights(data: GrayscaleWeights) {
    // update grayscaleWeights in a closure compiler compatible fashion
    grayscaleWeights.red = data.red
    grayscaleWeights.green = data.green
    grayscaleWeights.blue = data.blue
    grayscaleWeights.useIntegerApproximation = data.useIntegerApproximation
  },
  setInversionMode(inversionMode: 'original' | 'invert' | 'both') {
    switch (inversionMode) {
      case 'original':
        inversionAttempts = 'dontInvert'
        break
      case 'invert':
        inversionAttempts = 'onlyInvert'
        break
      case 'both':
        inversionAttempts = 'attemptBoth'
        break
      default:
        throw new Error('Invalid inversion mode')
    }
  },
}

export type QRDecoderWorkerFunctions = typeof workerFunctions

createBirpc(workerFunctions, {
  post: globalThis.postMessage,
  on: fn => globalThis.onmessage = event => fn(event.data),
})
