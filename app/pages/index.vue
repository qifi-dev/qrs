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

const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (route.hash.length > 1) {
    router.replace('/scan')
  }
})

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

const config = useRuntimeConfig()

const isPrefixed = ref(true)
const prefix = computed(() => {
  if (!isPrefixed.value) {
    return ''
  }
  if (config.public.qrcodePrefix) {
    return `${config.public.qrcodePrefix}#`
  }
  return `${location.href}${location.pathname}#`
})
</script>

<template>
  <div px="4" flex="~ col-reverse sm:col" h-full w-full gap-4 pb-8 pt-2>
    <div grid="~ cols-1 sm:cols-3 wrap" gap="6 sm:(x-5 y-3)">
      <InputFile border="~ gray/25" shadow="~ gray/25" @file="onFileChange">
        <div text="neutral-600 dark:neutral-400" min-w-46 flex justify-center px-4 py-2>
          <div i-carbon:document-add text-lg />
          <p font-semi-bold pl-2 text-nowrap>
            <span>Change File</span>
          </p>
        </div>
      </InputFile>
      <div w-full inline-flex flex-1 flex-row items-center sm:col-span-2>
        <span min-w-32>
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
      <div>
        <label inline-flex flex-row select-none items-center>
          <span min-w-32>
            <span text-neutral-400>Scanner URL</span>
          </span>
          <InputCheckbox v-model="isPrefixed" />
        </label>
      </div>
      <div w-full inline-flex flex-1 flex-row items-center sm:col-span-2>
        <span min-w-32>
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
        :prefix="prefix"
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
