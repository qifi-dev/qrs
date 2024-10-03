export function useTransferSpeedMeter(options: MeterOptions) {
  const kiloBytesFormatter = new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: 'kilobyte-per-second',
    unitDisplay: 'short',
  })

  const { meter, total } = useMeter(options)
  const formatted = computed(() => {
    return kiloBytesFormatter.format(Number.parseFloat((meter.value / 1024).toFixed(2)))
  })

  return {
    totalBytes: total,
    formatted,
  }
}

interface MeterOptions {
  per?: number
  mode?: 'sample-total' | 'sample-current'
}

export function useMeter(options?: MeterOptions) {
  if (!options) {
    options = { mode: 'sample-total' }
  }

  return options?.mode === 'sample-total' ? useSampleTotalMeter(options) : useSampleCurrentMeter(options)
}

export function useSampleTotalMeter(options?: Omit<MeterOptions, 'mode'>) {
  const per = options?.per || 1000

  const lastUpdateTime = ref(0)

  const lastKnownTotal = ref(0)
  const total = ref(0)
  const meter = ref(0)

  function updateMeter(_: number) {
    const now = Date.now()
    const elapsedTime = now - lastUpdateTime.value

    if (elapsedTime >= per) {
      const diff = total.value - lastKnownTotal.value
      meter.value = Number.parseFloat((diff).toFixed(2))
      lastKnownTotal.value = total.value
      total.value = 0
      lastUpdateTime.value = now
    }
  }

  useOnAnimationFrame(updateMeter)

  return {
    total,
    meter,
  }
}

export function useSampleCurrentMeter(options?: Omit<MeterOptions, 'mode'>) {
  const per = options?.per || 1000

  const lastUpdateTime = ref(0)

  const total = ref(0)
  const meter = ref(0)

  function updateMeter(_: number) {
    const now = Date.now()
    const elapsedTime = now - lastUpdateTime.value

    if (elapsedTime >= per) {
      meter.value = Number.parseFloat((total.value).toFixed(2))
      total.value = 0
      lastUpdateTime.value = now
    }
  }

  useOnAnimationFrame(updateMeter)

  return {
    total,
    meter,
  }
}

export function useOnAnimationFrame(callback: (timestamp: number) => void) {
  const animationFrameId = ref<number | null>(null)

  function onAnimationFrame(timestamp: number) {
    callback(timestamp)
    requestAnimationFrame(onAnimationFrame)
  }

  onMounted(() => {
    animationFrameId.value = requestAnimationFrame(onAnimationFrame)
  })

  onUnmounted(() => {
    if (animationFrameId.value !== null) {
      cancelAnimationFrame(animationFrameId.value)
    }
  })
}
