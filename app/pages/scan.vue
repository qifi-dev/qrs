<script lang="ts" setup>
const speed = ref(16)

const results = ref(new Set<string>())
</script>

<template>
  <div px-4 pt-4 space-y-10>
    <Scan v-model:results="results" :speed="speed" />
    <div max-w-150 w-full inline-flex flex-row items-center>
      <span min-w-40>
        <span pr-2 text-zinc-400>Speed</span>
        <span font-mono>{{ speed.toFixed(0) }}ms</span>
      </span>
      <InputSlide
        v-model="speed"
        :min="1"
        :max="100"
        smooth
        w-full flex-1
      />
    </div>
    <h2 flex items-center gap-4 text-3xl>
      Results: {{ results.size }}
      <button class="flex items-center gap2 border rounded-md px2 py1 text-base shadow" @click="results = new Set()">
        <span i-carbon:clean inline-block />
        Clear
      </button>
    </h2>
    <div>
      <div v-for="(item, index) of results" :key="index" font-mono>
        ID:{{ index }}:<br>
        {{ item }}
      </div>
    </div>
  </div>
</template>
