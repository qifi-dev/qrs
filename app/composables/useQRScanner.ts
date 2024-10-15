import type { QRCode } from 'jsqr-es6'
import { type MaybeRefOrGetter, onWatcherCleanup } from 'vue'
import { createQRDecodeWorker } from './qr-decode'

export async function setupUserMedia(options?: { deviceId?: ConstrainDOMString }) {
  options ||= {}
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: 512,
      height: 512,
      deviceId: options.deviceId,
    },
  })

  return {
    play: async (video: HTMLVideoElement) => {
      video.srcObject = stream
      await video.play()
    },
    dispose() {
      stream.getTracks().forEach(track => track.stop())
    },
  }
}

interface Options {
  video: MaybeRefOrGetter<HTMLVideoElement | undefined>
  fps: MaybeRefOrGetter<number>

  setupMedia?: MaybeRefOrGetter<typeof setupUserMedia>

  onDecode?: (data: QRCode | null) => void
  onDecoded?: (data: QRCode) => void

  onDecodeError?: (error: unknown) => void
}

export function useQRScanner(options: Options) {
  const qrDecoderWorker = createQRDecodeWorker()
  onUnmounted(() => qrDecoderWorker.dispose())

  let draw: ReturnType<typeof createCanvasDrawer> | undefined

  const video = computed(() => toValue(options.video))
  const setupMedia = computed<typeof setupUserMedia>(() => toValue(options.setupMedia) || setupUserMedia)
  const interval = computed(() => 1000 / toValue(options.fps))

  watch([video, setupMedia], async ([video, setupMedia]) => {
    if (video) {
      let cleaned = false
      onWatcherCleanup(() => {
        cleaned = true
        // eslint-disable-next-line ts/no-use-before-define
        res?.dispose()
      })
      const res = await setupMedia()
      if (cleaned)
        return
      await res.play(video)
      if (cleaned)
        return
      draw = createCanvasDrawer(video)
    }
    else {
      draw = undefined
    }
  })

  useIntervalFn(async () => {
    if (!draw || !video.value)
      return

    const image = draw()
    let hasError = false
    const res = await qrDecoderWorker.decode(image, {
      width: video.value.videoWidth,
      height: video.value.videoHeight,
    }).catch((error) => {
      hasError = true
      options.onDecodeError && options.onDecodeError(error)
    })

    if (!hasError) {
      options.onDecode && options.onDecode(res!)
      if (res) {
        options.onDecoded && options.onDecoded(res)
      }
    }
  }, interval)

  return {
    worker: qrDecoderWorker,
  }
}

function createCanvasDrawer(
  video: HTMLVideoElement,
  area = { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight },
) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new Error('Failed to get 2d context')
  return () => {
    ctx.drawImage(video, area.x, area.y, area.width, area.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    return data
  }
}
