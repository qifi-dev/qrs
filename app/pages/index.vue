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
  <div px="4" flex="~ col" w-full gap-6 py-2>
    <div flex="~ col sm:row" gap="6 sm:2">
      <InputFile @file="onFileChange">
        <div text="neutral-600 dark:neutral-400" min-w-46 flex justify-center px-4 py-2>
          <div i-carbon:document-add text-lg />
          <p font-semi-bold pl-2 text-nowrap>
            <span>Change File</span>
          </p>
        </div>
      </InputFile>
      <div w-full inline-flex flex-row items-center>
        <span min-w-30>
          <span pr-2 text-neutral-400>Ideal FPS</span>
          <span font-mono>{{ throttledFps.toFixed(0) }}hz</span>
        </span>
        <InputSlide
          v-model="throttledFps"
          :min="1"
          :max="120"
          smooth
          w-full flex-1
        />
      </div>
    </div>
    <div v-if="readPhase === ReadPhase.Ready && data" h-full w-full flex justify-center>
      <Generate
        :max-scans-per-second="throttledFps"
        :data="data"
        :filename="filename"
        :content-type="contentType"
        h-full w-full
      />
    </div>
    <InputFile
      v-else
      min-h="[calc(100vh-250px)]" h-full w-full
      text="neutral-600 dark:neutral-400"
      @file="onFileChange"
    />
    <DropZone text="Drop File Here" @file="onFileChange" />
  </div>
</template>
