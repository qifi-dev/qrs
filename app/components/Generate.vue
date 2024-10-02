<script lang="ts" setup>
import { blockToBinary, encodeFountain } from '~~/utils/lt-codes'
import { renderSVG } from 'uqr'

const props = withDefaults(defineProps<{
  data: Uint32Array
  speed: number
}>(), {
  speed: 250,
})

const count = ref(0)
const encoder = encodeFountain(props.data, 50)
const svg = ref<string>()

onMounted(() => {
  useIntervalFn(() => {
    count.value++
    const data = encoder.next().value
    // TODO: convert to binary
    svg.value = renderSVG(JSON.stringify(data), { border: 1, ecc: 'L' })
  }, () => props.speed)
})
</script>

<template>
  <div flex flex-col items-center>
    <p mb-4>
      {{ count }}
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
