<script lang="ts" setup>
import type { EncodedBlock } from '~~/utils/lt-code'
import { blockToBinary, createEncoder } from '~~/utils/lt-code'
import { fromUint8Array } from 'js-base64'
import { renderSVG } from 'uqr'
import { useKiloBytesNumberFormat } from '~/composables/intlNumberFormat'

const props = withDefaults(defineProps<{
  data: Uint8Array
  filename?: string
  contentType?: string
  maxScansPerSecond: number
}>(), {
  maxScansPerSecond: 20,
})

const count = ref(0)
const encoder = createEncoder(props.data, 1000)
const svg = ref<string>()
const block = shallowRef<EncodedBlock>()

const renderTime = ref(0)
const framePerSecond = computed(() => 1000 / renderTime.value)
const bytes = useKiloBytesNumberFormat(computed(() => ((block.value?.bytes || 0) / 1024).toFixed(2)))

onMounted(() => {
  let frame = performance.now()

  useIntervalFn(() => {
    count.value++
    const data = encoder.fountain().next().value
    block.value = data
    const binary = blockToBinary(data)
    const str = fromUint8Array(binary)
    svg.value = renderSVG(str, { border: 1 })
    const now = performance.now()
    renderTime.value = now - frame
    frame = now
  }, () => 1000 / props.maxScansPerSecond)
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
      </div>
    </Collapsable>
    <div w-full flex flex-col items-center>
      <div relative w-full>
        <div
          class="aspect-square [&>svg]:h-full [&>svg]:w-full"
          h-full w-full overflow-hidden rounded-lg
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
