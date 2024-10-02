<script lang="ts" setup>
import { binaryToBlock, createDecoder } from '~~/utils/lt-codes'
import { toUint8Array } from 'js-base64'
import { scan } from 'qr-scanner-wechat'

const props = withDefaults(defineProps<{
  speed?: number
  width?: number
  height?: number
}>(), {
  speed: 34,
  width: 512,
  height: 512,
})

const kiloBytesFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'kilobyte-per-second',
  unitDisplay: 'short',
})

// All Bandwidth calculation variables
const bytesReceivedInLastSecond = ref(0)
const currentValidBandwidth = ref(0)
const currentValidBandwidthFormatted = computed(() => {
  return kiloBytesFormatter.format(currentValidBandwidth.value)
})
// Valid Bandwidth calculation variables
const validBytesReceivedInLastSecond = ref(0)
const currentBandwidth = ref(0)
const currentBandwidthFormatted = computed(() => {
  return kiloBytesFormatter.format(currentBandwidth.value)
})

let lastUpdateTime = 0
let animationFrameId: number | null = null

const { devices } = useDevicesList({
  requestPermissions: true,
  constraints: {
    audio: false,
    video: true,
  },
})

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

onMounted(() => {
  animationFrameId = requestAnimationFrame(updateBandwidth)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
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

function updateBandwidth(timestamp: number) {
  const now = timestamp
  const elapsedTime = now - lastUpdateTime

  if (elapsedTime >= 1000) {
    // Calculate bandwidth for the last second
    currentValidBandwidth.value = Number.parseFloat(
      (
        (validBytesReceivedInLastSecond.value / 1024)
        / (elapsedTime / 1000)
      ).toFixed(2),
    )

    currentBandwidth.value = Number.parseFloat(
      (
        (bytesReceivedInLastSecond.value / 1024)
        / (elapsedTime / 1000)
      ).toFixed(2),
    )

    // Reset for the next second
    validBytesReceivedInLastSecond.value = 0
    bytesReceivedInLastSecond.value = 0

    lastUpdateTime = now
  }

  requestAnimationFrame(updateBandwidth)
}

const decoder = ref(createDecoder())
const k = ref(0)
const sum = ref(0)

const dataUrl = ref<string>()
const dots = useTemplateRef<HTMLDivElement[]>('dots')

function pluse(index: number) {
  const el = dots.value?.[index]
  if (!el)
    return
  el.style.transition = 'none'
  el.style.transform = 'scale(1.3)'
  el.style.filter = 'hue-rotate(90deg)'
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
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video.value!, 0, 0, canvas.width, canvas.height)
  const result = await scan(canvas)

  if (result?.text) {
    setFps()
    const binary = toUint8Array(result.text)
    const data = binaryToBlock(binary)
    // Data set changed, reset decoder
    if (sum.value !== data.sum) {
      decoder.value = createDecoder()
      sum.value = data.sum
    }
    k.value = data.k
    data.indices.map(i => pluse(i))
    if (decoder.value.addBlock([data])) {
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
}
</script>

<template>
  <div items-left flex flex-col gap6>
    <div max-w-150 w-full flex flex-wrap gap-2>
      <button
        v-for="item of cameras" :key="item.deviceId" :class="{
          'text-blue': selectedCamera === item.deviceId,
        }"
        class="border rounded-md px2 py1 text-sm shadow-sm"
        @click="selectedCamera = item.deviceId"
      >
        {{ item.label }}
      </button>
    </div>

    <pre v-if="error" text-red v-text="error" />
    <div border="~ gray/25 rounded-lg" flex="~ col gap-2" mb--4 max-w-150 p2>
      <div flex="~ gap-0.4 wrap">
        <div
          v-for="x, idx in k"
          :key="idx"
          ref="dots"
          h-4
          w-4
          border="~ gray rounded"
          :class="decoder.decodedData[idx] != null ? 'bg-green border-green4' : 'bg-gray:50'"
        />
      </div>
      <img :src="dataUrl">
      <a
        v-if="dataUrl"
        class="w-max border border-gray:50 rounded-md px2 py1 text-sm hover:bg-gray:10"
        :href="dataUrl"
        download="foo.png"
      >Download</a>
    </div>

    <div relative h-full max-h-150 max-w-150 w-full>
      <video
        ref="video"
        autoplay muted playsinline :controls="false"
        aspect-square h-full w-full rounded-lg
      />
      <div absolute left-1 top-1 border border-gray:50 rounded-md bg-black:75 px2 py1 text-sm text-white font-mono shadow>
        <template v-if="k">
          {{ Array.from({ length: k }, (_, idx) => decoder.decodedData[idx]).filter(p => !!p).length }} / {{ k }}
        </template>
        <template v-else>
          No Data
        </template>
      </div>
      <p absolute right-1 top-1 border border-gray:50 rounded-md bg-black:75 px2 py1 text-sm text-white font-mono shadow>
        {{ shutterCount }} | {{ fps.toFixed(0) }} hz | {{ currentValidBandwidthFormatted }} (<span text-neutral-400>{{ currentBandwidthFormatted }}</span>)
      </p>
    </div>
  </div>
</template>
