<script lang="ts" setup>
const speed = ref(100)

const results = ref(new Set<string>())
</script>

<template>
  <div py-10>
    <h1 text-4xl>
      Scan
    </h1>
    <Scan v-model:results="results" :speed="speed" />
    <div mt-10>
      <label>
        <input v-model.number="speed" type="range" step="100" min="30" max="1000">
        <span>Speed: {{ speed }}ms</span>
      </label>
    </div>
    <h2 text-3xl>
      Results: {{ results.size }}
    </h2>
    <div>
      <div v-for="(item, index) of results" :key="index" font-mono>
        ID:{{ index }}:<br>
        {{ item }}
      </div>
    </div>
  </div>
</template>
