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

const results = defineModel<Set<string>>('results', { default: new Set() })

const shutterCount = ref(0)

const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    width: props.width,
    height: props.height,
  },
})

const video = shallowRef<HTMLVideoElement>()
onMounted(() => {
  video.value!.srcObject = stream
  video.value!.play()
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

let intervalId: any
watch(() => props.speed, () => {
  intervalId && clearInterval(intervalId)
  intervalId = setInterval(scanFrame, props.speed)
}, { immediate: true })
</script>

<template>
  <p>shutterCount: {{ shutterCount }}</p>
  <video ref="video" />
</template>
