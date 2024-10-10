<script lang="ts" setup>
const checked = defineModel<boolean>({ default: false })
</script>

<template>
  <div border="~ base gray/25 rounded-lg" flex="~ gap-2 items-center justify-center" relative h-7 w-7 p0.5>
    <input v-model="checked" type="checkbox" absolute inset-0 z-1 op0.1>
    <div i-carbon-checkmark size-5 :class="checked ? 'op100' : 'op0'" />
  </div>
</template>
