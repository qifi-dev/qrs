<script lang="ts" setup>
import type { QRCode } from 'jsqr-es6'
import { toUint8Array } from 'js-base64'

import { binaryToBlock, readFileHeaderMetaFromBuffer } from 'luby-transform'
import { useKiloBytesNumberFormat } from '~/composables/intlNumberFormat'
import { createLTDecodeWorker } from '~/composables/lt-decode'
import { useBytesRate } from '~/composables/timeseries'
import { setupUserMedia, useQRScanner } from '~/composables/useQRScanner'
import { CameraSignalStatus } from '~/types'

const props = withDefaults(defineProps<{
  maxScansPerSecond?: number
}>(), {
  maxScansPerSecond: 30,
})

const bytesReceived = ref(0)
const totalValidBytesReceived = ref(0)
const shutterCount = ref(0)

const { formatted: currentValidBytesSpeedFormatted } = useBytesRate(totalValidBytesReceived, {
  interval: 250,
  timeWindow: 1000,
  type: 'counter',
  sampleRate: 50,
  maxDataPoints: 100,
})

const { formatted: currentBytesFormatted } = useBytesRate(bytesReceived, {
  interval: 250,
  timeWindow: 1000,
  type: 'counter',
  sampleRate: 50,
  maxDataPoints: 100,
})

const { bytesRate: fps } = useBytesRate(shutterCount, {
  interval: 250,
  timeWindow: 1000,
  type: 'counter',
  sampleRate: 50,
  maxDataPoints: 100,
})

const { devices } = useDevicesList({
  requestPermissions: true,
  constraints: {
    audio: false,
    video: true,
  },
})

const cameraSignalStatus = ref(CameraSignalStatus.Waiting)
const cameras = computed(() => devices.value.filter(i => i.kind === 'videoinput'))
const selectedCamera = useLocalStorage('qrs-selected-camera', cameras.value[0]?.deviceId)

watchEffect(() => {
  if (!selectedCamera.value)
    selectedCamera.value = cameras.value[0]?.deviceId
})

// const results = defineModel<Set<string>>('results', { default: new Set() })

watch(cameras, () => {
  if (selectedCamera.value && cameras.value.find(i => i.deviceId === selectedCamera.value)) {
    setTimeout(() => {
      // qrScanner?.setCamera(selectedCamera.value!)
      // qrScanner?.start()
    }, 250)
  }
})

const error = ref<any>()
const video = shallowRef<HTMLVideoElement>()
const videoWidth = ref(0)
const videoHeight = ref(0)

useQRScanner({
  video,
  fps: () => props.maxScansPerSecond,
  setupMedia: () => {
    const deviceId = selectedCamera.value
    return () => setupUserMedia({ deviceId })
  },
  onDecoded(data) {
    try {
      scanFrame(data)
    }
    catch (e) {
      error.value = e
      console.error(e)
    }
  },

  // TODO some options
  // calculateScanRegion: ({ videoHeight, videoWidth }) => {
  //   const size = Math.min(videoWidth, videoHeight)
  //   return {
  //     x: size === videoWidth ? 0 : (videoWidth - size) / 2,
  //     y: size === videoHeight ? 0 : (videoHeight - size) / 2,
  //     width: size,
  //     height: size,
  //   }
  // },
  onDecodeError(e) {
    if (e && e.toString && !e.toString().includes('No QR code found')) {
      console.error(e)
      error.value = e
    }
  },
})

onMounted(async () => {
  // watch([
  //   () => props.maxScansPerSecond,
  //   selectedCamera,
  // ], async ([maxScansPerSecond]) => {
  //   if (qrScanner) {
  //     qrScanner.destroy()
  //     await new Promise(resolve => setTimeout(resolve, 1000))
  //   }
  //   qrScanner = new QrScanner(video.value!, async (result) => {
  //     try {
  //       await scanFrame(result)
  //     }
  //     catch (e) {
  //       error.value = e
  //       console.error(e)
  //     }
  //   }, {
  //     maxScansPerSecond,
  //     highlightCodeOutline: false,
  //     highlightScanRegion: true,
  //     calculateScanRegion: ({ videoHeight, videoWidth }) => {
  //       const size = Math.min(videoWidth, videoHeight)
  //       return {
  //         x: size === videoWidth ? 0 : (videoWidth - size) / 2,
  //         y: size === videoHeight ? 0 : (videoHeight - size) / 2,
  //         width: size,
  //         height: size,
  //       }
  //     },
  //     preferredCamera: selectedCamera.value,
  //     onDecodeError(e) {
  //       if (e && e.toString && !e.toString().includes('No QR code found')) {
  //         console.error(e)
  //         error.value = e
  //       }
  //     },
  //   })
  //   selectedCamera.value && setTimeout(() => {
  //     qrScanner!.setCamera(selectedCamera.value!)
  //   })
  //   qrScanner.setInversionMode('both')
  //   qrScanner.start()
  //   updateCameraStatus()
  // }, { immediate: true })
  // watch(selectedCamera, () => {
  //   if (qrScanner && selectedCamera.value) {
  //     qrScanner.setCamera(selectedCamera.value)
  //     qrScanner.start()
  //   }
  // })
  useIntervalFn(() => {
    updateCameraStatus()
  }, 250)
})

async function updateCameraStatus() {
  try {
    if (!(navigator && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')) {
      cameraSignalStatus.value = CameraSignalStatus.NotSupported
      return
    }

    videoHeight.value = video.value!.videoHeight
    videoWidth.value = video.value!.videoWidth

    if (videoWidth.value === 0 || videoHeight.value === 0) {
      cameraSignalStatus.value = CameraSignalStatus.Waiting
      return
    }

    cameraSignalStatus.value = CameraSignalStatus.Ready
  }
  catch (e) {
    console.error(e)

    if ((e as Error).name === 'NotAllowedError' || (e as Error).name === 'NotFoundError') {
      cameraSignalStatus.value = CameraSignalStatus.NotGranted
      return
    }

    error.value = e
  }
}

const decoderWorker = createLTDecodeWorker()
onUnmounted(() => decoderWorker.dispose())
const decoderStatus = ref<Awaited<ReturnType<typeof decoderWorker.getStatus>>>({
  encodedBlocks: new Set(),
  decodedData: [],
  encodedCount: 0,
  decodedCount: 0,
  meta: null!,
})

const k = ref(0)
const bytes = ref(0)
const checksum = ref(0)

const cached = new Set<string>()
const startTime = ref(0)
const endTime = ref(0)

const dataUrl = ref<string>()
const dots = useTemplateRef<HTMLDivElement[]>('dots')
const status = ref<number[]>([])
const decodedBlocks = computed(() => status.value.filter(i => i === 1).length)
const receivedBytes = computed(() => decoderStatus.value.encodedCount * (decoderStatus.value.meta?.data.length ?? 0))

const filename = ref<string | undefined>()
const contentType = ref<string | undefined>()
const textContent = ref<string | undefined>()
const dataType = ref<'file' | 'link'>('file')

const bytesFormatted = useKiloBytesNumberFormat(computed(() => (bytes.value / 1024).toFixed(2)))
const receivedBytesFormatted = useKiloBytesNumberFormat(computed(() => (receivedBytes.value / 1024).toFixed(2)))

function getStatus() {
  const array = Array.from({ length: k.value }, () => 0)
  for (let i = 0; i < k.value; i++) {
    if (decoderStatus.value.decodedData[i] != null)
      array[i] = 1
  }
  for (const block of decoderStatus.value.encodedBlocks) {
    for (const i of block.indices) {
      if (array[i] === 0 || array[i]! > block.indices.length) {
        array[i] = block.indices.length
      }
      // else {
      //   console.warn(`Unexpected block #${i} status:`, array[i])
      // }
    }
  }
  return array
}

function pluse(index: number) {
  const el = dots.value?.[index]
  if (!el)
    return
  el.style.transition = 'none'
  el.style.transform = 'scale(1.3)'
  el.style.filter = 'hue-rotate(-90deg)'
  // // force reflow
  void el.offsetWidth
  el.style.transition = 'transform 0.3s, filter 0.3s'
  el.style.transform = 'none'
  el.style.filter = 'none'
}

function toDataURL(data: Uint8Array, type: string): string {
  type ||= 'application/octet-stream'
  return URL.createObjectURL(new Blob([data], { type }))
}

let decoderInitPromise: Promise<any> | undefined
async function scanFrame(result: QRCode) {
  cameraSignalStatus.value = CameraSignalStatus.Ready
  let strData = result.data

  if (!strData)
    return

  if (strData.startsWith('http')) {
    strData = strData.slice(strData.indexOf('#') + 1)
  }

  bytesReceived.value += strData.length
  totalValidBytesReceived.value = decoderStatus.value.encodedCount * (decoderStatus.value.meta?.data.length ?? 0)

  // Do not process the same QR code twice
  if (cached.has(strData))
    return
  if (cached.size && strData) {
    shutterCount.value += 1
  }

  error.value = undefined
  const binary = toUint8Array(strData)
  const data = binaryToBlock(binary)
  // Data set changed, reset decoder
  if (checksum.value !== data.checksum) {
    if (k.value && !dataUrl.value) {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Scanned different files. You have unfinished transmission, are you sure to start a new one?')) {
        return
      }
    }
    decoderInitPromise = decoderWorker.createDecoder()
    checksum.value = data.checksum
    bytes.value = data.bytes
    k.value = data.k
    startTime.value = now()
    endTime.value = 0
    cached.clear()
    filename.value = undefined
    contentType.value = undefined
    textContent.value = undefined
    dataUrl.value = undefined
  }
  // The previous data set is already decoded, skip for any new blocks
  else if (endTime.value) {
    return
  }
  await decoderInitPromise

  cached.add(strData)
  k.value = data.k

  data.indices.map(i => pluse(i))
  const success = await decoderWorker.addBlock(data)
  decoderStatus.value = await decoderWorker.getStatus()
  status.value = getStatus()
  if (success) {
    endTime.value = now()

    const merged = (await decoderWorker.getDecoded())!
    const [mergedData, meta] = readFileHeaderMetaFromBuffer(merged)
    dataUrl.value = toDataURL(mergedData, meta.contentType)

    filename.value = meta.filename
    contentType.value = meta.contentType

    if (contentType.value.startsWith('text/')) {
      const text = new TextDecoder().decode(mergedData)

      textContent.value = text
      // auto open if it's a URL
      if (/^https?:\/\//.test(text)) {
        dataType.value = 'link'

        setTimeout(() => {
          try {
            window.open(text, '_blank')
          }
          catch (e) {
            console.error(e)
          }
        }, 250)
      }
    }
  }
}

useUnsavedChange(() => {
  if (k.value && !dataUrl.value) {
    return 'You have unfinished transmission, are you sure to leave?'
  }
})

function now() {
  return performance.now()
}
</script>

<template>
  <div items-left flex flex-col gap-4>
    <pre v-if="error" overflow-x-auto text-red v-text="error" />

    <Collapsable label="Cameras" :default="true">
      <div w-full flex flex-wrap gap-2 p2>
        <button
          v-for="(item, index) of cameras" :key="item.deviceId" :class="{
            'text-blue bg-blue/20': selectedCamera === item.deviceId,
          }"
          px2 py1 text-sm shadow-sm
          border="~ gray/25 rounded-lg"
          @click="selectedCamera = item.deviceId"
        >
          <span i-carbon-camera mr-1 inline-block align-text-top />
          {{ item.label || `Camera ${index + 1}` }}
        </button>
      </div>
    </Collapsable>

    <Collapsable v-if="dataUrl" label="Result" :default="true">
      <div flex="~ col gap-2" relative>
        <div flex="~ col gap-2" p2>
          <div v-if="dataType === 'link'" :src="dataUrl" break-words text-wrap text-blue underline op80 hover:op100>
            <a :href="textContent" target="_blank" rel="noopener noreferrer">{{ textContent }}</a>
          </div>
          <img v-else-if="contentType?.startsWith('image/')" :src="dataUrl">
          <video v-else-if="contentType?.startsWith('video/')" controls autoplay muted>
            <source :src="dataUrl" :type="contentType">
          </video>
          <div v-else-if="contentType?.startsWith('text/')" :src="dataUrl" break-words text-wrap>
            {{ textContent }}
          </div>
        </div>
        <div sticky bottom-0 p4 shadow backdrop-blur-xl>
          <a
            v-if="dataType === 'file'"
            :href="dataUrl"
            :download="filename"
            class="block w-full rounded-md bg-white px2 py1 text-center text-sm dark:bg-neutral-8"
            border="~ gray/25 hover:gray:10" shadow="~ gray/25"
          >
            Download as file
          </a>
          <a
            v-else-if="dataType === 'link'"
            :href="textContent"
            target="_blank"
            rel="noopener noreferrer"
            class="block w-full rounded-md bg-white px2 py1 text-center text-sm dark:bg-neutral-8"
            border="~ gray/25 hover:gray:10" shadow="~ gray/25"
          >
            Open as link
          </a>
        </div>
      </div>
    </Collapsable>

    <!-- This is a progress bar that is not accurate but feels comfortable. -->
    <div v-if="k" relative h-4 rounded bg-black:75 text-white font-mono shadow>
      <div
        bg="green-400" border="~ green4 rounded" transition="all ease" absolute inset-y-0 h-full w-full duration-1000
        :style="{ maxWidth: `${decodedBlocks === k ? 100 : (Math.min(1, receivedBytes / bytes * 0.66) * 100).toFixed(2)}%` }"
      />
    </div>

    <Camera
      :k="k"
      :fps="fps"
      :bytes="bytes"
      :received-bytes="receivedBytes"
      :current-bytes="currentBytesFormatted"
      :current-valid-bytes-speed="currentValidBytesSpeedFormatted"
      :camera-signal-status="cameraSignalStatus"
    >
      <video
        ref="video"
        :controls="false"
        autoplay muted playsinline h-full w-full rounded-lg
      />
    </Camera>

    <Collapsable label="Inspect">
      <div grid-cols="[150px_1fr]" font="mono!" :class="endTime ? 'text-green-500' : ''" grid gap-x-4 gap-y-2 overflow-x-auto whitespace-nowrap p2 text-sm>
        <span text-neutral-500>Filename</span>
        <span text-right md:text-left>{{ filename || '<unknown>' }}</span>
        <span text-neutral-500>Content-Type</span>
        <span text-right md:text-left>{{ contentType || '<unknown>' }}</span>
        <span text-neutral-500>Checksum</span>
        <span text-right md:text-left>{{ checksum }}</span>
        <span text-neutral-500>Indices</span>
        <span text-right md:text-left>{{ k }}</span>
        <span text-neutral-500>Decoded</span>
        <span text-right md:text-left>{{ decodedBlocks }}</span>
        <span text-neutral-500>Received blocks</span>
        <span text-right md:text-left>{{ decoderStatus.encodedCount }}</span>
        <span text-neutral-500>Expected bytes</span>
        <span text-right md:text-left>{{ bytesFormatted }}</span>
        <span text-neutral-500>Received bytes</span>
        <span text-right md:text-left>{{ receivedBytesFormatted }} ({{ bytes === 0 ? 0 : (receivedBytes / bytes * 100).toFixed(2) }}%)</span>
        <span text-neutral-500>Time elapsed</span>
        <span text-right md:text-left>{{ k === 0 ? 0 : (((endTime || now()) - startTime) / 1000).toFixed(2) }} s</span>
        <span text-neutral-500>Average bitrate</span>
        <span text-right md:text-left>{{ (receivedBytes / 1024 / ((endTime || now()) - startTime) * 1000).toFixed(2) }} Kbps</span>
      </div>
    </Collapsable>

    <Collapsable v-if="k">
      <template #label>
        <span>Packets</span>
        <span ml-2 text-neutral-400>({{ k }})</span>
      </template>
      <div flex="~ col gap-2" p2>
        <div flex="~ gap-0.4 wrap">
          <div
            v-for="x, idx of status"
            :key="idx"
            ref="dots"

            flex="~ items-center justify-center"
            h-4 w-4 overflow-hidden text-8px
            border="~ rounded"
            :class="x === 1 ? 'bg-green:100 border-green4!' : x > 1 ? 'bg-amber border-amber4 text-amber-900 dark:text-amber-200' : 'bg-gray:50 border-gray'"
            :style="{ '--un-bg-opacity': Math.max(0.5, (11 - x) / 10) }"
          >
            {{ ([0, 1, 2].includes(x)) ? '' : x }}
          </div>
        </div>
      </div>
    </Collapsable>

    <Collapsable v-if="k" label="Blocks">
      <div flex="~ gap-1 wrap" max-w-150 p2 text-xs>
        <div v-for="i, idx of decoderStatus.encodedBlocks" :key="idx" border="~ gray/10 rounded" p1>
          <template v-for="x, idy of i.indices" :key="x">
            <span v-if="idy !== 0" op25>, </span>
            <span :style="{ color: `hsl(${x * 40}, 40%, 60%)` }">{{ x }}</span>
          </template>
        </div>
      </div>
    </Collapsable>
  </div>
</template>
