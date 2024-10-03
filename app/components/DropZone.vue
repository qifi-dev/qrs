<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  text: string
}>()

const emit = defineEmits<{
  (e: 'file', files: File): void
}>()

// Ported from https://github.com/react-dropzone/react-dropzone/issues/753#issuecomment-774782919
const isDragging = ref(false)
const dragCounter = ref(0)

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  dragCounter.value--
  if (dragCounter.value > 0)
    return
  isDragging.value = false
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

async function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    dragCounter.value = 0
    const firstFile = event.dataTransfer.files[0]
    if (!firstFile) {
      return
    }
    emit('file', firstFile)
    event.dataTransfer.clearData()
  }
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('drop', onDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <div
    v-if="isDragging"
    fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4
  >
    <div h-full w-full flex items-center justify-center border-4 border-white rounded-lg border-dashed p-8>
      <span text-2xl text-white>{{ text }}</span>
    </div>
  </div>
</template>
