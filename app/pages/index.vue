<script lang="ts" setup>
import { slice } from '~~/utils/slicing'

const count = ref(10)

const speedValue = ref(100)
const speed = computed({
  get: () => {
    return speedValue.value * 100
  },
  set: (val: number) => {
    speedValue.value = val / 100
  },
})

const data = ref(Array.from({ length: count.value }, (_, i) => `hello world ${i}`))

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file)
    return
  const content = await file.arrayBuffer()
  const chunks = await slice(content)
  data.value = chunks.map(i => JSON.stringify(i))
}
</script>

<template>
  <div>
    <div flex flex-row gap-2 px-6 py-2>
      <input type="file" @change="onFileChange">
      <div w-full inline-flex flex-row items-center>
        <span min-w-40>
          <span pr-2 text-zinc-400>Speed</span>
          <span>{{ (speed / 100).toFixed(0) }}ms</span>
        </span>
        <InputSlide
          v-model="speed"
          :step="1"
          :min="3000"
          :max="100000"
          w-full flex-1
        />
      </div>
    </div>
    <Generate :speed="speed / 100" :data="data" />
  </div>
</template>
