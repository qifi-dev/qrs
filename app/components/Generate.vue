<script lang="ts" setup>
import type { EncodedBlock } from '~~/utils/lt-codes'
import { blockToBinary, encodeFountain } from '~~/utils/lt-codes'
import { fromUint8Array } from 'js-base64'
import { renderSVG } from 'uqr'

const props = withDefaults(defineProps<{
  data: Uint8Array
  speed: number
}>(), {
  speed: 250,
})

const count = ref(0)
const encoder = encodeFountain(props.data, 400)
const svg = ref<string>()
const block = shallowRef<EncodedBlock>()

onMounted(() => {
  useIntervalFn(() => {
    count.value++
    const data = encoder.next().value
    block.value = data
    const binary = blockToBinary(data)
    const str = fromUint8Array(binary)
    svg.value = renderSVG(str, { border: 1  })
  }, () => props.speed)
})
</script>

<template>
  <div flex flex-col items-center>
    <p mb-4>
      Indices: {{ block?.indices }}<br>
      Total: {{ block?.k }}<br>
      Bytes: {{ ((block?.length || 0) / 1024).toFixed(2) }} KB<br>
      Frame: {{ count }}<br>
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
