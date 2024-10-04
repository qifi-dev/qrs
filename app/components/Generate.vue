<script lang="ts" setup>
import type { EncodedBlock } from '~~/utils/lt-code'
import { blockToBinary, createEncoder } from '~~/utils/lt-code'
import { fromUint8Array } from 'js-base64'
import { renderSVG } from 'uqr'

const props = withDefaults(defineProps<{
  data: Uint8Array
  filename?: string
  contentType?: string
  speed: number
}>(), {
  speed: 250,
})

const count = ref(0)
const encoder = createEncoder(props.data, 1000)
const svg = ref<string>()
const block = shallowRef<EncodedBlock>()

const renderTime = ref(0)
const framePerSecond = computed(() => 1000 / renderTime.value)

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
  }, () => props.speed)
})
</script>

<template>
  <div flex flex-col items-center pb-20>
    <p mb-4 w-full of-x-auto ws-nowrap font-mono>
      Indices: {{ block?.indices }}<br>
      Total: {{ block?.k }}<br>
      Bytes: {{ ((block?.bytes || 0) / 1024).toFixed(2) }} KB<br>
      Bitrate: {{ ((block?.bytes || 0) / 1024 * framePerSecond).toFixed(2) }} Kbps<br>
      Frame Count: {{ count }}<br>
      FPS: {{ framePerSecond.toFixed(2) }}
    </p>
    <div class="relative h-full w-full">
      <div
        class="aspect-square [&>svg]:h-full [&>svg]:w-full"
        h-full w-full
        v-html="svg"
      />
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
