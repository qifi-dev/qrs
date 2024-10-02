export function useBandwidth() {
  const kiloBytesFormatter = new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: 'kilobyte-per-second',
    unitDisplay: 'short',
  })

  const bytesReceived = ref(0)
  const current = ref(0)
  const animationFrameId = ref<number | null>(null)
  const lastUpdateTime = ref(0)

  const currentFormatted = computed(() => {
    return kiloBytesFormatter.format(current.value)
  })

  function updateBandwidth(timestamp: number) {
    const now = timestamp
    const elapsedTime = now - lastUpdateTime.value

    if (elapsedTime >= 1000) {
      // Calculate bandwidth for the last second
      current.value = Number.parseFloat(
        (
          (bytesReceived.value / 1024)
          / (elapsedTime / 1000)
        ).toFixed(2),
      )

      // Reset for the next second
      bytesReceived.value = 0

      lastUpdateTime.value = now
    }

    requestAnimationFrame(updateBandwidth)
  }

  onMounted(() => {
    animationFrameId.value = requestAnimationFrame(updateBandwidth)
  })

  onUnmounted(() => {
    if (animationFrameId.value !== null) {
      cancelAnimationFrame(animationFrameId.value)
    }
  })

  return {
    bytesReceived,
    current,
    currentFormatted,
  }
}
