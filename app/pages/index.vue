<script lang="ts" setup>
const count = ref(10)
const speed = ref(250)

const data = Array.from({ length: count.value }, (_, i) => `hello world ${i}`)
</script>

<template>
  <div py-10>
    <Generate :speed="speed" :data="data" />
    <div mt-10>
      <label>
        <input v-model.number="speed" type="range" step="100" min="30" max="1000">
        <span>Speed: {{ speed }}ms</span>
      </label>
    </div>
  </div>
</template>
