<script lang="ts" setup>
import { slice } from '~~/utils/slicing'

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
  <div py-10>
    <input type="file" @change="onFileChange">
    <Generate :speed="speed" :data="data" />
    <div mt-10>
      <label>
        <input v-model.number="speed" type="range" step="100" min="30" max="1000">
        <span>Speed: {{ speed }}ms</span>
      </label>
    </div>
  </div>
</template>
