<script lang="ts" setup>
import { renderSVG } from 'uqr'

const props = withDefaults(defineProps<{
  data: string[]
  speed: number
}>(), {
  speed: 250,
})

const svgList = computed(() => props.data.map((content, i) => ({
  id: i,
  svg: renderSVG(content),
})))
const activeIndex = ref(0)
watch(() => props.data, () => activeIndex.value = 0)
const activeSvg = computed(() => svgList.value[activeIndex.value])

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
    <p>{{ activeIndex }}/{{ svgList.length }}</p>
    <div class="h-full max-h-50vh max-w-50vh w-full" v-html="activeSvg?.svg" />
  </div>
</template>
