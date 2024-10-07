<script lang="ts" setup>
import { appendFileHeaderMetaToBuffer } from 'luby-transform'

enum ReadPhase {
  Idle,
  Reading,
  Chunking,
  Ready,
}

const error = ref<any>()
const fps = ref(20)
const sliceSize = ref(1000)
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
  <div px="4" flex="~ col" h-full w-full gap-4 pb-8 pt-2>
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
          :max="60"
          smooth
          w-full flex-1
        />
      </div>
      <div w-full inline-flex flex-row items-center>
        <span min-w-30>
          <span pr-2 text-neutral-400>Slice Size</span>
        </span>
        <input
          v-model.lazy="sliceSize"
          type="number"
          :min="1"
          :max="2000"
          border="~ gray/25 rounded-lg"
          w-full flex-1 bg-transparent px2 py1 text-sm shadow-sm
        >
      </div>
    </div>
    <div
      v-if="readPhase === ReadPhase.Ready && data"
      h-full w-full flex justify-center
    >
      <Generate
        :max-scans-per-second="throttledFps"
        :slice-size="sliceSize"
        :data="data"
        :filename="filename"
        :content-type="contentType"
        w-full
      />
    </div>
    <InputFile
      v-else
      text="neutral-600 dark:neutral-400"
      aspect-1 h-full w-full rounded-lg
      @file="onFileChange"
    />
    <DropZone text="Drop File Here" @file="onFileChange" />
  </div>
</template>
