<script lang="ts" setup>
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

const shutterCount = ref(0)

const error = ref<any>('')
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
    <p>Error: {{ error }}</p>
  </div>
</template>
