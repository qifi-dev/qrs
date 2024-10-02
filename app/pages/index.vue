<script lang="ts" setup>
import { slice } from '~~/utils/slicing'

enum ReadPhase {
  Idle,
  Reading,
  Chunking,
  Ready,
}

const count = ref(10)
const demoData = ref(false)
const speed = ref(50)
const readPhase = ref<ReadPhase>(ReadPhase.Idle)
const data = ref<Array<any>>([])

if (demoData.value) {
  data.value = Array.from({ length: count.value }, (_, i) => `hello world ${i}`)
  readPhase.value = ReadPhase.Ready
}

async function onFileChange(file?: File) {
  if (!file) {
    readPhase.value = ReadPhase.Idle
    data.value = []

    return
  }

  readPhase.value = ReadPhase.Reading
  const content = await file.arrayBuffer()
  readPhase.value = ReadPhase.Chunking
  const chunks = slice(content, 900)
  readPhase.value = ReadPhase.Ready
  data.value = chunks.map(i => JSON.stringify(i))
}
</script>

<template>
  <div px="4" flex="~ col" w-full gap-6 py-2>
    <div flex="~ col sm:row" gap="6 sm:2">
      <InputFile @file="onFileChange">
        <div flex px-4 py-2 text="neutral-600 dark:neutral-400">
          <div i-carbon:document-add text-lg />
          <p font-semi-bold pl-2 text-nowrap>
            <span>Change File</span>
          </p>
        </div>
      </InputFile>
      <div w-full inline-flex flex-row items-center>
        <span min-w-30>
          <span pr-2 text-neutral-400>Speed</span>
          <span font-mono>{{ speed.toFixed(0) }}ms</span>
        </span>
        <InputSlide
          v-model="speed"
          :min="30"
          :max="500"
          smooth
          w-full flex-1
        />
      </div>
    </div>
    <div v-if="readPhase === ReadPhase.Ready" h-full w-full flex justify-center>
      <Generate :speed="speed" :data="data" min-h="[calc(100vh-250px)]" max-w="[calc(100vh-250px)]" h-full w-full />
    </div>
    <InputFile
      v-else
      min-h="[calc(100vh-250px)]" h-full w-full
      text="neutral-600 dark:neutral-400"
      @file="onFileChange"
    >
      <div i-carbon:document-add text-2xl />
      <p font-semi-bold pl-4 text-2xl>
        <span>Choose</span>
      </p>
    </InputFile>
  </div>
</template>
