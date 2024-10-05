<script lang="ts" setup>
const fps = ref(30)

const throttledFps = useDebounce(fps, 500)
</script>

<template>
  <div px-4 pt-4 space-y-10>
    <Scan :max-scans-per-second="throttledFps" />
    <div w-full inline-flex flex-row items-center>
      <span min-w-40>
        <span pr-2 text-zinc-400>Ideal scans</span>
        <span font-mono>{{ fps.toFixed(0) }}hz</span>
      </span>
      <InputSlide
        v-model="fps"
        :min="1"
        :max="120"
        smooth
        w-full flex-1
      />
    </div>
    <!-- <h2 flex items-center gap-4 text-3xl>
      Results: {{ results.size }}
      <button class="flex items-center gap2 border rounded-md px2 py1 text-base shadow" @click="results = new Set()">
        <span i-carbon:clean inline-block />
        Clear
      </button>
    </h2> -->
    <!-- <div>
      <div v-for="(item, index) of results" :key="index" font-mono>
        ID:{{ index }}:<br>
        {{ item }}
      </div>
    </div> -->
  </div>
</template>
