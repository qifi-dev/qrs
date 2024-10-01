<script lang="ts" setup>
import { merge, slice } from '~~/utils/slicing'

const count = ref(10)
const speed = ref(100)
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
    <div flex="~ col sm:row" gap-2 px="4 sm:6" py-2>
      <input type="file" @change="onFileChange">
      <div w-full inline-flex flex-row items-center>
        <span min-w-40>
          <span pr-2 text-zinc-400>Speed</span>
          <span>{{ speed.toFixed(0) }}ms</span>
        </span>
        <InputSlide
          v-model="speed"
          :min="30"
          :max="1000"
          smooth
          w-full flex-1
        />
      </div>
    </div>
    <Generate :speed="speed" :data="data" />
  </div>
</template>
