<script lang="ts" setup>
import { watchEffect } from 'vue'

const props = defineProps<{
  default?: boolean
  label?: string
}>()
const isVisible = defineModel<boolean>({ default: false })
watchEffect(() => {
  if (props.default != null) {
    isVisible.value = !!props.default
  }
})
</script>

<template>
  <div flex="~ col" border="~ gray/25 rounded-lg" divide="y dashed gray/25" of-hidden shadow-sm>
    <button
      flex items-center justify-between px2 py1 text-sm
      @click="isVisible = !isVisible"
    >
      <span>
        <slot name="label">
          {{ props.label ?? 'Inspect' }}
        </slot>
      </span> <span op50>{{ isVisible ? '▲' : '▼' }}</span>
    </button>
    <div v-if="isVisible">
      <slot />
    </div>
  </div>
</template>
