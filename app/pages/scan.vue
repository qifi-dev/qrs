<script lang="ts" setup>
const speed = ref(100)

const results = ref(new Set<string>())
</script>

<template>
  <div px-4 py-10 space-y-10>
    <h1 text-4xl>
      Scan
    </h1>
    <Scan v-model:results="results" :speed="speed" />
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
