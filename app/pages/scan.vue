<script lang="ts" setup>
import { scan } from 'qr-scanner-wechat'

const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    width: 512,
    height: 512,
  },
})

const video = shallowRef<HTMLVideoElement>()
onMounted(() => {
  video.value!.srcObject = stream
  video.value!.play()
})

async function scanFrame() {
  const canvas = document.createElement('canvas')
  canvas.width = video.value!.videoWidth
  canvas.height = video.value!.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video.value!, 0, 0, canvas.width, canvas.height)
  const result = await scan(canvas)

  if (result?.text)
    alert(result?.text)
}

setInterval(scanFrame, 100) // scan one frame every 100ms
</script>

<template>
  <video ref="video" />
</template>
