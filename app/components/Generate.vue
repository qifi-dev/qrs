<script lang="ts" setup>
import { encode, renderSVG } from 'uqr'

const props = withDefaults(defineProps<{
  data: string[]
  speed: number
}>(), {
  speed: 250,
})

const ecc = 'L' as const
const minVersion = computed(() => encode(props.data[0]! || '', { ecc }).version)
const svgList = computed(() => props.data.map(content => renderSVG(content, {
  border: 1,
  ecc,
  minVersion: minVersion.value,
})))
const activeIndex = ref(0)
watch(() => props.data, () => activeIndex.value = 0)

let intervalId: any
function initInterval() {
  intervalId = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % svgList.value.length
  }, props.speed)
}
watch(() => props.speed, () => {
  intervalId && clearInterval(intervalId)
  initInterval()
}, { immediate: true })
onUnmounted(() => intervalId && clearInterval(intervalId))
</script>

<template>
  <div flex flex-col items-center>
    <p mb-4>
      {{ activeIndex }}/{{ svgList.length }}
    </p>
    <div class="relative h-full w-full">
      <div
        class="arc aspect-square" absolute inset-0
        :style="{ '--deg': `${(activeIndex + 1) * 360 / svgList.length}deg` }"
      />
      <div
        v-for="svg, idx of svgList"
        :key="idx"
        :class="{ hidden: idx !== activeIndex }"
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
