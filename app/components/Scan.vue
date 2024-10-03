<script lang="ts" setup>
import { binaryToBlock, createDecoder } from '~~/utils/lt-code'
import { toUint8Array } from 'js-base64'
import { scan } from 'qr-scanner-wechat'
import { useBytesRate } from '~/composables/timeseries'

const props = withDefaults(defineProps<{
  speed?: number
  width?: number
  height?: number
}>(), {
  speed: 34,
  width: 1080,
  height: 1080,
})

enum CameraSignalStatus {
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
const selectedCamera = ref(cameras.value[0]?.deviceId)

watchEffect(() => {
  if (!selectedCamera.value)
    selectedCamera.value = cameras.value[0]?.deviceId
})

// const results = defineModel<Set<string>>('results', { default: new Set() })

let stream: MediaStream | undefined

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

onMounted(async () => {
  watch([() => props.width, () => props.height, selectedCamera], () => {
    disconnectCamera()
    connectCamera()
  }, { immediate: true })

  useIntervalFn(
    async () => {
      try {
        await scanFrame()
      }
      catch (e) {
        error.value = e
      }
    },
    () => props.speed,
  )
})

function disconnectCamera() {
  stream?.getTracks().forEach(track => track.stop())
  stream = undefined
}

async function connectCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: props.width,
        height: props.height,
        deviceId: selectedCamera.value,
      },
    })

    video.value!.srcObject = stream
    video.value!.play()
  }
  catch (e) {
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

function getStatus() {
  const array = Array.from({ length: k.value }, () => 0)
  for (let i = 0; i < k.value; i++) {
    if (decoder.value.decodedData[i] != null)
      array[i] = 1
  }
  for (const block of decoder.value.encodedBlocks) {
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

async function scanFrame() {
  shutterCount.value += 1
  const canvas = document.createElement('canvas')
  canvas.width = video.value!.videoWidth
  canvas.height = video.value!.videoHeight
  if (video.value!.videoWidth === 0 || video.value!.videoHeight === 0) {
    cameraSignalStatus.value = CameraSignalStatus.Waiting
    return
  }

  cameraSignalStatus.value = CameraSignalStatus.Ready
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video.value!, 0, 0, canvas.width, canvas.height)

  const result = await scan(canvas)
  if (!result.text)
    return

  setFps()
  bytesReceived.value += result.text.length
  totalValidBytesReceived.value = decoder.value.encodedCount * (decoder.value.meta?.data.length ?? 0)

  // Do not process the same QR code twice
  if (cached.has(result.text))
    return

  error.value = undefined
  const binary = toUint8Array(result.text)
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

  cached.add(result.text)
  k.value = data.k
  data.indices.map(i => pluse(i))
  const success = decoder.value.addBlock(data)
  status.value = getStatus()
  if (success) {
    endTime.value = performance.now()
    const merged = decoder.value.getDecoded()!
    dataUrl.value = URL.createObjectURL(new Blob([merged], { type: 'application/octet-stream' }))
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
        <img :src="dataUrl">
        <a
          class="w-max border border-gray:50 rounded-md px2 py1 text-sm hover:bg-gray:10"
          :href="dataUrl"
          download="foo.png"
        >Download</a>
      </div>
    </Collapsable>

    <!-- This is a progress bar that is not accurate but feels comfortable. -->
    <div v-if="k" relative h-2 max-w-150 rounded-lg bg-black:75 text-white font-mono shadow>
      <div
        absolute inset-y-0 h-full bg-green border="~ green4 rounded-lg"
        :style="{ width: `${decodedBlocks === k ? 100 : (Math.min(1, receivedBytes / bytes * 0.66) * 100).toFixed(2)}%` }"
      />
    </div>

    <div relative h-full max-h-150 max-w-150 w-full text="10px md:sm">
      <video
        ref="video"
        autoplay muted playsinline :controls="false"
        aspect-square h-full w-full rounded-lg
      />

      <div absolute left-1 top-1 border="~ gray:50 rounded-md" bg-black:75 px2 py1 text-white font-mono shadow>
        <template v-if="k">
          {{ (receivedBytes / 1024).toFixed(2) }} / {{ (bytes / 1024).toFixed(2) }} KB <span text-neutral-400>({{ (receivedBytes / bytes * 100).toFixed(2) }}%)</span>
        </template>
        <template v-else>
          No Data
        </template>
      </div>
      <div
        v-if="cameraSignalStatus === CameraSignalStatus.Waiting"
        top="50%" left="[calc(50%-4.5ch)]" text="neutral-500" absolute flex flex-col items-center gap-2 font-mono
      >
        <div i-carbon:circle-dash animate-spin animate-duration-5000 text-3xl />
        <p>No Signal</p>
      </div>
      <p absolute right-1 top-1 border="~ gray:50 rounded-md" bg-black:75 px2 py1 text-white font-mono shadow>
        {{ fps.toFixed(0) }} hz | {{ currentValidBytesSpeedFormatted }} <span text-neutral-400>({{ currentBytesFormatted }})</span>
      </p>
    </div>

    <div flex="~ gap-1 wrap" max-w-150 text-xs>
      <div v-for="i, idx of decoder.encodedBlocks" :key="idx" border="~ gray/10 rounded" p1>
        <template v-for="x, idy of i.indices" :key="x">
          <span v-if="idy !== 0" op25>, </span>
          <span :style="{ color: `hsl(${x * 40}, 40%, 60%)` }">{{ x }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
