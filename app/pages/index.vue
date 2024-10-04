<script lang="ts" setup>
import { appendFileHeaderMetaToBuffer } from '~~/utils/lt-code/binary-meta'

enum ReadPhase {
  Idle,
  Reading,
  Chunking,
  Ready,
}

const error = ref<any>()
const fps = ref(20)
const throttledFps = useDebounce(fps, 500)
const readPhase = ref<ReadPhase>(ReadPhase.Idle)

const filename = ref<string | undefined>()
const contentType = ref<string | undefined>()
const data = ref<Uint8Array | null>(null)

async function onFileChange(file?: File) {
  if (!file) {
    readPhase.value = ReadPhase.Idle
    data.value = null
    return
  }

  try {
    readPhase.value = ReadPhase.Reading

    filename.value = file.name
    contentType.value = file.type

    const buffer = await file.arrayBuffer()
    data.value = appendFileHeaderMetaToBuffer(new Uint8Array(buffer), {
      filename: filename.value,
      contentType: contentType.value,
    })

    readPhase.value = ReadPhase.Ready
  }
  catch (e) {
    error.value = e
    readPhase.value = ReadPhase.Idle
    data.value = null
  }
}
</script>

<template>
  <div class="mx-auto flex flex-col gap-8 px-4 py-8 container">
    <div class="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <div class="flex flex-col gap-6 sm:flex-row sm:gap-4">
        <InputFile class="w-full sm:w-auto" @file="onFileChange">
          <div class="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300">
            <div i-carbon:document-add class="mr-2 text-lg" />
            <p class="whitespace-nowrap font-semibold">
              {{ $t('index.changeFile') }}
            </p>
          </div>
        </InputFile>
        <div class="w-full flex flex-row items-center">
          <span class="mr-4 min-w-[120px]">
            <span class="text-gray-600 dark:text-gray-400">{{ $t('index.idealFPS') }}</span>
            <span class="ml-2 text-gray-800 font-mono dark:text-gray-200">{{ throttledFps.toFixed(0) }}hz</span>
          </span>
          <InputSlide
            v-model="throttledFps"
            :min="1"
            :max="120"
            smooth
            class="flex-1"
          />
        </div>
      </div>
    </div>
    <div v-if="readPhase === ReadPhase.Ready && data" class="w-full flex justify-center rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <Generate
        :max-scans-per-second="throttledFps"
        :data="data"
        :filename="filename"
        :content-type="contentType"
        class="h-[calc(100vh-350px)] max-w-[calc(100vh-350px)] w-full"
      />
    </div>
    <InputFile
      v-else
      class="h-[calc(100vh-350px)] w-full flex items-center justify-center rounded-lg bg-white text-gray-600 shadow-md dark:bg-gray-800 dark:text-gray-400"
      @file="onFileChange"
    >
      <div class="text-center">
        <div i-carbon:cloud-upload class="mb-4 text-6xl" />
        <p class="text-lg font-semibold">
          {{ $t('index.dropFile') }}
        </p>
      </div>
    </InputFile>
    <DropZone text="Drop File Here" @file="onFileChange" />
  </div>
</template>
