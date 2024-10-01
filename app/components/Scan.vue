<script lang="ts" setup>
import { merge, type SliceData } from '~~/utils/slicing'
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

const results = defineModel<Set<string>>('results', { default: new Set() })

const error = ref<any>()
const shutterCount = ref(0)
const video = shallowRef<HTMLVideoElement>()
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
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
  useIntervalFn(
    () => scanFrame(),
    () => props.speed,
  )
})

const chunks: SliceData[] = reactive([])
const length = computed(() => chunks.find(i => i?.[1])?.[1] || 0)
const id = computed(() => chunks.find(i => i?.[0])?.[0] || 0)
const picked = computed(() => Array.from({ length: length.value }, (_, idx) => chunks[idx]))
const dataUrl = ref<string>()

async function scanFrame() {
  shutterCount.value += 1
  const canvas = document.createElement('canvas')
  canvas.width = video.value!.videoWidth
  canvas.height = video.value!.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video.value!, 0, 0, canvas.width, canvas.height)
  const result = await scan(canvas)

  if (result?.text) {
    results.value.add(result.text)
    const data = JSON.parse(result.text) as SliceData
    if (Array.isArray(data)) {
      chunks[data[2]] = data
      if (!length.value)
        return
      if (picked.value.every(i => !!i)) {
        try {
          const merged = await merge(picked.value as SliceData[])
          dataUrl.value = URL.createObjectURL(new Blob([merged], { type: 'application/octet-stream' }))
        }
        catch (e) {
          error.value = e
        }
      }
    }
  }
}
</script>

<template>
  <div flex flex-col items-center gap10>
    <p>shutterCount: {{ shutterCount }}</p>
    <video ref="video" max-w-600px />
    <div flex-flow flex gap-4>
      cameras
      <button
        v-for="item of cameras" :key="item.deviceId" :class="{
          'text-blue': selectedCamera === item.deviceId,
        }" class="border rounded-xl px2 py1 shadow-sm" @click="selectedCamera = item.deviceId"
      >
        {{ item.label }}
      </button>
    </div>
    <p>shutterCount: {{ shutterCount }}</p>
    <a v-if="dataUrl" :href="dataUrl" download="foo.png">Download</a>
    <pre v-if="error" text-red v-text="error" />
    <video ref="video" />
    <div flex="~ gap-1">
      <div
        v-for="x, idx in picked" :key="idx"
        h-5 w-5
        border="~ gray:10 rounded"
        :class="x ? 'bg-green' : '' "
      />
    </div>
    <div>{{ { length, id } }}</div>
    <div>{{ chunks }}</div>
  </div>
</template>
