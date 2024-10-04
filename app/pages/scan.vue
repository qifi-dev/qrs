<script lang="ts" setup>
const fps = ref(30)

const throttledFps = useDebounce(fps, 500)
</script>

<template>
  <div class="mx-auto px-4 py-8 container space-y-8">
    <div class="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <Scan :max-scans-per-second="throttledFps" />
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <div class="max-w-xl w-full inline-flex flex-row items-center">
        <span class="mr-4 min-w-[160px]">
          <span class="text-gray-600 dark:text-gray-400">Ideal scans</span>
          <span class="ml-2 text-gray-800 font-mono dark:text-gray-200">{{ fps.toFixed(0) }}hz</span>
        </span>
        <InputSlide
          v-model="fps"
          :min="1"
          :max="120"
          smooth
          class="w-full flex-1"
        />
      </div>
    </div>
  </div>
</template>
