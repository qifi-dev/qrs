<script lang="ts" setup>
import { fromUint8Array } from 'js-base64'
import { blockToBinary, createEncoder, type EncodedBlock, type LtEncoder } from 'luby-transform'
import { encode, renderSVG } from 'uqr'
import { GIF_PALETTE, gifFilename, qrMatrixToIndexedPixels } from '~~/utils/gif'
import { useKiloBytesNumberFormat } from '~/composables/intlNumberFormat'

const props = withDefaults(defineProps<{
  data: Uint8Array
  filename?: string
  contentType?: string
  maxScansPerSecond: number
  sliceSize: number
  prefix?: string
}>(), {
  maxScansPerSecond: 20,
  sliceSize: 1000,
  prefix: '',
})

const count = ref(0)
let encoder: LtEncoder
watch(() => [props.data, props.sliceSize], () => {
  encoder = createEncoder(props.data, props.sliceSize)
}, { immediate: true })
const svg = ref<string>()
const block = shallowRef<EncodedBlock>()

const renderTime = ref(0)
const framePerSecond = computed(() => 1000 / renderTime.value)
const bytes = useKiloBytesNumberFormat(computed(() => ((block.value?.bytes || 0) / 1024).toFixed(2)))

const GIF_SIZE_OPTIONS = [256, 384, 512, 768, 1024]
const DEFAULT_GIF_SIZE = 512
const gifFrameCount = ref(60)
const gifFps = ref(10)
const gifSize = ref(DEFAULT_GIF_SIZE)
const isExporting = ref(false)
const exportProgress = ref(0)
const exportError = ref('')
const exportSize = ref(0)
const cancelExportRequested = ref(false)
const recommendedFrameCount = computed(() => Math.min(500, Math.max(30, Math.ceil((block.value?.k || 20) * 1.5))))
const exportDuration = computed(() => gifFrameCount.value / gifFps.value)

let pauseLive = () => {}
let resumeLive = () => {}

function nextEncodedText(targetEncoder: LtEncoder) {
  const nextBlock = targetEncoder.fountain().next().value
  return props.prefix + fromUint8Array(blockToBinary(nextBlock))
}

function renderNextFrame() {
  const frameStart = performance.now()
  const data = encoder.fountain().next().value
  block.value = data
  const binary = blockToBinary(data)
  const str = fromUint8Array(binary)
  svg.value = renderSVG(props.prefix + str, { border: 5 })
  renderTime.value = performance.now() - frameStart
  count.value++
}

function useRecommendedFrameCount() {
  gifFrameCount.value = recommendedFrameCount.value
}

function cancelExport() {
  cancelExportRequested.value = true
}

function download(bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = gifFilename(props.filename)
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportGif() {
  if (isExporting.value)
    return

  gifFrameCount.value = Math.min(500, Math.max(10, Math.round(Number(gifFrameCount.value) || recommendedFrameCount.value)))
  gifFps.value = Math.min(30, Math.max(1, Math.round(Number(gifFps.value) || 10)))
  if (!GIF_SIZE_OPTIONS.includes(gifSize.value))
    gifSize.value = DEFAULT_GIF_SIZE

  isExporting.value = true
  cancelExportRequested.value = false
  exportProgress.value = 0
  exportError.value = ''
  exportSize.value = 0
  pauseLive()

  try {
    const { GIFEncoder } = await import('gifenc')
    const gif = GIFEncoder()
    const exportEncoder = createEncoder(props.data, props.sliceSize)
    const delay = Math.round(1000 / gifFps.value)

    for (let frame = 0; frame < gifFrameCount.value; frame++) {
      if (cancelExportRequested.value)
        return

      const qr = encode(nextEncodedText(exportEncoder))
      const pixels = qrMatrixToIndexedPixels(qr.data, gifSize.value, 5)
      gif.writeFrame(pixels, gifSize.value, gifSize.value, {
        palette: frame === 0 ? GIF_PALETTE : undefined,
        delay,
        repeat: 0,
      })

      exportProgress.value = frame + 1
      if (frame % 4 === 3)
        await new Promise(resolve => setTimeout(resolve, 0))
    }

    gif.finish()
    const output = gif.bytes()
    exportSize.value = output.byteLength
    download(output)
  }
  catch (error) {
    exportError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    isExporting.value = false
    resumeLive()
  }
}

onMounted(() => {
  const controls = useIntervalFn(renderNextFrame, () => 1000 / props.maxScansPerSecond)
  pauseLive = controls.pause
  resumeLive = controls.resume
})

onBeforeUnmount(() => {
  cancelExportRequested.value = true
  pauseLive()
})

watch(recommendedFrameCount, (recommended, previous) => {
  if (!previous || gifFrameCount.value === previous)
    gifFrameCount.value = recommended
}, {
  immediate: true,
})
</script>

<template>
  <div w-full flex flex-col items-center gap-4>
    <Collapsable w-full>
      <div grid-cols="[150px_1fr]" font="mono!" grid w-full gap-x-4 gap-y-2 overflow-x-auto whitespace-nowrap p2 text-sm>
        <span text-neutral-500>Indices</span>
        <span text-right md:text-left>{{ block?.indices }}</span>
        <span text-neutral-500>Total</span>
        <span text-right md:text-left>{{ block?.k }}</span>
        <span text-neutral-500>Bytes</span>
        <span text-right md:text-left>{{ bytes }}</span>
        <span text-neutral-500>Bitrate</span>
        <span text-right md:text-left>{{ ((block?.bytes || 0) / 1024 * framePerSecond).toFixed(2) }} Kbps</span>
        <span text-neutral-500>Frame Count</span>
        <span text-right md:text-left>{{ count }}</span>
        <span text-neutral-500>FPS</span>
        <span text-right md:text-left>{{ framePerSecond.toFixed(2) }}</span>
        <span text-neutral-500>Filename</span>
        <span text-right md:text-left>{{ props.filename }}</span>
        <span text-neutral-500>Content Type</span>
        <span text-right md:text-left>{{ props.contentType }}</span>
      </div>
    </Collapsable>
    <Collapsable w-full>
      <template #label>
        <span flex items-center gap-2>
          <span i-carbon:gif inline-block />
          Save QR sequence as GIF
        </span>
      </template>
      <div flex flex-col gap-4 p-4>
        <div grid="~ cols-1 sm:cols-3" gap-4>
          <label flex flex-col gap-1 text-sm>
            <span text-neutral-500>Frames</span>
            <input
              v-model.number="gifFrameCount"
              type="number"
              min="10"
              max="500"
              :disabled="isExporting"
              border="~ gray/25 rounded-lg"
              bg-transparent px-2 py-1
            >
          </label>
          <label flex flex-col gap-1 text-sm>
            <span text-neutral-500>Playback FPS</span>
            <input
              v-model.number="gifFps"
              type="number"
              min="1"
              max="30"
              :disabled="isExporting"
              border="~ gray/25 rounded-lg"
              bg-transparent px-2 py-1
            >
          </label>
          <label flex flex-col gap-1 text-sm>
            <span text-neutral-500>Image size</span>
            <select
              v-model.number="gifSize"
              :disabled="isExporting"
              border="~ gray/25 rounded-lg"
              bg="transparent dark:neutral-900" px-2 py-1
            >
              <option v-for="size in GIF_SIZE_OPTIONS" :key="size" :value="size">
                {{ size }} × {{ size }}
              </option>
            </select>
          </label>
        </div>
        <div flex="~ col sm:row" items-start justify-between gap-2 text-sm>
          <p text-neutral-500>
            Recommended: {{ recommendedFrameCount }} frames · Duration: {{ exportDuration.toFixed(1) }}s
          </p>
          <button
            type="button"
            :disabled="isExporting || gifFrameCount === recommendedFrameCount"
            text-blue hover="text-blue-400"
            disabled:cursor-not-allowed disabled:op-40
            @click="useRecommendedFrameCount"
          >
            Use recommended
          </button>
        </div>
        <div v-if="isExporting" flex flex-col gap-2>
          <div h-2 overflow-hidden rounded-full bg-gray:20>
            <div
              h-full bg-blue transition="width 150ms"
              :style="{ width: `${exportProgress / gifFrameCount * 100}%` }"
            />
          </div>
          <div flex items-center justify-between text-sm>
            <span text-neutral-500>Encoding {{ exportProgress }} / {{ gifFrameCount }}</span>
            <button type="button" text-red hover="text-red-400" @click="cancelExport">
              Cancel
            </button>
          </div>
        </div>
        <p v-if="exportError" role="alert" text-sm text-red>
          {{ exportError }}
        </p>
        <p v-else-if="exportSize" text-sm text-green>
          Exported {{ (exportSize / 1024 / 1024).toFixed(2) }} MB
        </p>
        <button
          v-if="!isExporting"
          type="button"
          bg="neutral-800 dark:neutral-100"
          text="white dark:neutral-900"
          flex items-center justify-center gap-2 rounded-lg px-4 py-2
          hover:op-85
          @click="exportGif"
        >
          <span i-carbon:download inline-block />
          Export GIF
        </button>
      </div>
    </Collapsable>
    <div
      w-full flex flex-col items-center
      max-h="[calc(100vh-250px)]"
      max-w="[calc(100vh-250px)]"
    >
      <div relative w-full>
        <div
          class="aspect-square [&>svg]:h-full [&>svg]:w-full"

          h-full w-full overflow-hidden rounded="~ sm:lg"
          v-html="svg"
        />
      </div>
    </div>
  </div>
</template>

<style>
.arc {
  box-sizing: border-box;
  border-radius: 50%;
  background: #285655;
  mix-blend-mode: lighten;
  mask:
    linear-gradient(#000 0 0) content-box intersect,
    conic-gradient(#000 var(--deg), #0000 0);
}
</style>
