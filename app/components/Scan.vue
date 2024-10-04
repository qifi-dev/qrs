<script lang="ts" setup>
import { binaryToBlock, createDecoder } from '~~/utils/lt-code'
import { readFileHeaderMetaFromBuffer } from '~~/utils/lt-code/binary-meta'
import { toUint8Array } from 'js-base64'
import QrScanner from 'qr-scanner'
import { useBytesRate } from '~/composables/timeseries'

const props = withDefaults(defineProps<{
  maxScansPerSecond?: number
}>(), {
  maxScansPerSecond: 30,
})

enum CameraSignalStatus {
  NotGranted,
  NotSupported,
  Waiting,
  Ready,
}

const bytesReceived = ref(0)
const totalValidBytesReceived = ref(0)

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

watch(cameras, () => {
  if (selectedCamera.value && cameras.value.filter(i => i.deviceId === selectedCamera.value).length === 0)
    selectedCamera.value = ''
})

// const results = defineModel<Set<string>>('results', { default: new Set() })

let qrScanner: QrScanner | undefined
let timestamp = 0
const fps = ref(0)
function setFps() {
  const now = Date.now()
  fps.value = 1000 / (now - timestamp)
  timestamp = now
}

const error = ref<any>()
const shutterCount = ref(0)
const video = shallowRef<HTMLVideoElement>()
const videoWidth = ref(0)
const videoHeight = ref(0)

onMounted(async () => {
  watch(() => props.maxScansPerSecond, async (maxScansPerSecond) => {
    if (qrScanner) {
      qrScanner.destroy()
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    qrScanner = new QrScanner(video.value!, async (result) => {
      try {
        await scanFrame(result)
      }
      catch (e) {
        error.value = e
        console.error(e)
      }
    }, {
      maxScansPerSecond,
      highlightCodeOutline: false,
      highlightScanRegion: true,
      calculateScanRegion: ({ videoHeight, videoWidth }) => {
        const size = Math.min(videoWidth, videoHeight)
        return {
          x: size === videoWidth ? 0 : (videoWidth - size) / 2,
          y: size === videoHeight ? 0 : (videoHeight - size) / 2,
          width: size,
          height: size,
        }
      },
      preferredCamera: selectedCamera.value,
      onDecodeError(e) {
        if (e.toString() !== 'No QR code found')
          error.value = e
      },
    })
    selectedCamera.value && qrScanner.setCamera(selectedCamera.value)
    qrScanner.setInversionMode('both')
    qrScanner.start()
    updateCameraStatus()
  }, { immediate: true })
  watch(selectedCamera, () => {
    if (qrScanner && selectedCamera.value) {
      qrScanner.setCamera(selectedCamera.value)
      qrScanner.start()
    }
  })
  useIntervalFn(() => {
    updateCameraStatus()
  }, 1000)
})
onUnmounted(() => qrScanner && qrScanner.destroy())

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

const decoder = ref(createDecoder())

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
const receivedBytes = computed(() => decoder.value.encodedCount * (decoder.value.meta?.data.length ?? 0))

const filename = ref<string | undefined>()
const contentType = ref<string | undefined>()
const textContent = ref<string | undefined>()

function getStatus() {
  const array = Array.from({ length: k.value }, () => 0)
  for (let i = 0; i < k.value; i++) {
    if (decoder.value.decodedData[i] != null)
      array[i] = 1
  }
  for (const block of decoder.value.encodedBlocks.values()) {
    for (const i of block.indices) {
      if (array[i] === 0 || array[i]! > block.indices.length) {
        array[i] = block.indices.length
      }
      else {
        console.warn(`Unexpected block #${i} status: ${array[i]}`)
      }
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

/**
 * Proposed ideal method to convert data to a data URL
 *
 * @param data - The data to convert
 * @param type - The content type of the data
 */
function toDataURL(data: Uint8Array | string | any, type: string): string {
  if (type.startsWith('text/')) {
    return URL.createObjectURL(new Blob([new TextEncoder().encode(data)], { type: 'text/plain' }))
  }
  else if (type === 'application/json') {
    const json = JSON.stringify(data)
    return URL.createObjectURL(new Blob([new TextEncoder().encode(json)], { type: 'application/json' }))
  }
  else {
    return URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }))
  }
}

async function scanFrame(result: QrScanner.ScanResult) {
  shutterCount.value += 1

  cameraSignalStatus.value = CameraSignalStatus.Ready

  if (!result.data)
    return

  bytesReceived.value += result.data.length
  totalValidBytesReceived.value = decoder.value.encodedCount * (decoder.value.meta?.data.length ?? 0)

  // Do not process the same QR code twice
  if (cached.has(result.data))
    return
  setFps()

  error.value = undefined
  const binary = toUint8Array(result.data)
  const data = binaryToBlock(binary)
  // Data set changed, reset decoder
  if (checksum.value !== data.checksum) {
    decoder.value = createDecoder()
    checksum.value = data.checksum
    bytes.value = data.bytes
    k.value = data.k
    startTime.value = performance.now()
    endTime.value = 0
    cached.clear()
  }
  // The previous data set is already decoded, skip for any new blocks
  else if (endTime.value) {
    return
  }

  cached.add(result.data)
  k.value = data.k

  data.indices.map(i => pluse(i))
  const success = decoder.value.addBlock(data)
  status.value = getStatus()
  if (success) {
    endTime.value = performance.now()

    const merged = decoder.value.getDecoded()!
    const [mergedData, meta] = readFileHeaderMetaFromBuffer(merged)
    dataUrl.value = toDataURL(mergedData, meta.contentType)

    filename.value = meta.filename
    contentType.value = meta.contentType

    if (contentType.value.startsWith('text/')) {
      textContent.value = new TextDecoder().decode(mergedData)
    }
  }
  // console.log({ data })
  // if (Array.isArray(data)) {
  //   if (data[0] !== id.value) {
  //     chunks.length = 0
  //     dataUrl.value = undefined
  //   }

  //

  //   chunks[data[2]] = data
  //   pluse(data[2])

  //   if (!length.value)
  //     return
  //   if (picked.value.every(i => !!i)) {
  //     try {
  //       const merged = merge(picked.value as SliceData[])
  //       dataUrl.value = URL.createObjectURL(new Blob([merged], { type: 'application/octet-stream' }))
  //     }
  //     catch (e) {
  //       error.value = e
  //     }
  //   }
  // }
}

function now() {
  return performance.now()
}
</script>

<template>
  <div items-left flex flex-col gap6>
    <div max-w-150 w-full flex flex-wrap gap-2>
      <button
        v-for="item of cameras" :key="item.deviceId" :class="{
          'text-blue': selectedCamera === item.deviceId,
        }"
        px2 py1 text-sm shadow-sm
        border="~ gray/25 rounded-lg"
        @click="selectedCamera = item.deviceId"
      >
        {{ item.label }}
      </button>
    </div>

    <pre v-if="error" overflow-x-auto text-red v-text="error" />

    <Collapsable>
      <p w-full of-x-auto ws-nowrap px2 py1 font-mono :class="endTime ? 'text-green' : ''">
        <span>Filename: {{ filename }}</span><br>
        <span>Content-Type: {{ contentType }}</span><br>
        <span>Checksum: {{ checksum }}</span><br>
        <span>Indices: {{ k }}</span><br>
        <span>Decoded: {{ decodedBlocks }}</span><br>
        <span>Received blocks: {{ decoder.encodedCount }}</span><br>
        <span>Expected bytes: {{ (bytes / 1024).toFixed(2) }} KB</span><br>
        <span>Received bytes: {{ (receivedBytes / 1024).toFixed(2) }} KB ({{ bytes === 0 ? 0 : (receivedBytes / bytes * 100).toFixed(2) }}%)</span><br>
        <span>Time elapsed: {{ (((endTime || now()) - startTime) / 1000).toFixed(2) }} s</span><br>
        <span>Average bitrate: {{ (receivedBytes / 1024 / ((endTime || now()) - startTime) * 1000).toFixed(2) }} Kbps</span><br>
      </p>
    </Collapsable>

    <Collapsable v-if="k" label="Packets" :default="true">
      <div flex="~ col gap-2" max-w-150 p2>
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

    <Collapsable v-if="dataUrl" label="Download" :default="true">
      <div flex="~ col gap-2" max-w-150 p2>
        <img v-if="contentType?.startsWith('image/')" :src="dataUrl">
        <p v-if="contentType?.startsWith('text/')" :src="dataUrl">
          {{ textContent }}
        </p>
        <a
          :href="dataUrl"
          :download="filename"
          class="w-max border border-gray:50 rounded-md px2 py1 text-sm hover:bg-gray:10"
        >
          Download
        </a>
      </div>
    </Collapsable>

    <!-- This is a progress bar that is not accurate but feels comfortable. -->
    <div v-if="k" relative h-4 max-w-150 rounded bg-black:75 text-white font-mono shadow>
      <div
        bg="green-400" border="~ green4 rounded" transition="all ease" absolute inset-y-0 h-full w-full duration-1000
        :style="{ maxWidth: `${decodedBlocks === k ? 100 : (Math.min(1, receivedBytes / bytes * 0.66) * 100).toFixed(2)}%` }"
      />
    </div>

    <div relative max-w-150 w-full text="10px md:sm">
      <video
        ref="video"
        :controls="false"
        autoplay muted playsinline h-full w-full rounded-lg
      />

      <div absolute left-1 top-1 border="~ gray:50 rounded-md" bg-black:75 px2 py1 text-white font-mono shadow>
        <template v-if="k">
          <span>{{ (receivedBytes / 1024).toFixed(2) }} / {{ (bytes / 1024).toFixed(2) }} KB <span text-neutral-400>({{ (receivedBytes / bytes * 100).toFixed(2) }}%)</span></span>
        </template>
        <template v-else>
          No Data
        </template>
      </div>
      <div
        v-if="cameraSignalStatus === CameraSignalStatus.Waiting"
        top="50%" left="50%" translate-x="[-50%]" text="neutral-500" absolute flex flex-col items-center gap-2 font-mono
      >
        <div i-carbon:circle-dash animate-spin animate-duration-5000 text-3xl />
        <p>No Signal</p>
      </div>
      <div
        v-else-if="cameraSignalStatus === CameraSignalStatus.NotGranted"
        top="50%" left="50%" translate-x="[-50%]" text="neutral-500" absolute flex flex-col items-center gap-2 font-mono
      >
        <div i-carbon:error-outline text-3xl />
        <p>Not Granted</p>
      </div>
      <div
        v-else-if="cameraSignalStatus === CameraSignalStatus.NotSupported"
        top="50%" left="50%" translate-x="[-50%]" text="neutral-500" absolute flex flex-col items-center gap-2 font-mono
      >
        <div i-carbon:circle-dash text-3xl />
        <p>Not Supported</p>
      </div>
      <p absolute right-1 top-1 border="~ gray:50 rounded-md" bg-black:75 px2 py1 text-white font-mono shadow>
        {{ fps.toFixed(0) }} hz | {{ currentValidBytesSpeedFormatted }} <span text-neutral-400>({{ currentBytesFormatted }})</span>
      </p>
    </div>

    <Collapsable label="Blocks">
      <div flex="~ gap-1 wrap" max-w-150 text-xs>
        <div v-for="i, idx of decoder.encodedBlocks.values()" :key="idx" border="~ gray/10 rounded" p1>
          <template v-for="x, idy of i.indices" :key="x">
            <span v-if="idy !== 0" op25>, </span>
            <span :style="{ color: `hsl(${x * 40}, 40%, 60%)` }">{{ x }}</span>
          </template>
        </div>
      </div>
    </Collapsable>
  </div>
</template>
