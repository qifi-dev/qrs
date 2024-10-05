<script setup lang="ts">
import { CameraSignalStatus } from '~/types'

defineProps<{
  cameraSignalStatus: CameraSignalStatus
  k: number
  fps: number
  bytes: number
  receivedBytes: number
  currentBytes: string
  currentValidBytesSpeed: string
}>()
</script>

<template>
  <div relative w-full text="10px md:sm">
    <slot />

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
      {{ fps.toFixed(0) }} hz | {{ currentValidBytesSpeed }} <span text-neutral-400>({{ currentBytes }})</span>
    </p>
  </div>
</template>
