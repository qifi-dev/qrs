import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from 'vue'

interface TimeSeriesOptions {
  type: 'counter' | 'gauge'
  interval: number
  maxDataPoints: number
}

interface DataPoint {
  time: number
  value: number
}

function timeSeriesOptions(options?: Partial<TimeSeriesOptions>): TimeSeriesOptions {
  if (!options) {
    return {
      type: 'gauge',
      interval: 250,
      maxDataPoints: 100,
    }
  }

  return {
    type: options?.type ?? 'gauge',
    interval: options?.interval ?? 250,
    maxDataPoints: options?.maxDataPoints ?? 100,
  }
}

export function useTimeSeries(
  input: Ref<number> | ComputedRef<number>,
  opts?: Partial<TimeSeriesOptions>,
) {
  const options = timeSeriesOptions(opts)

  const timeSeries = ref<DataPoint[]>([])
  const lastValue = ref(0)
  const lastSampleTime = ref(0)

  onAnimationFrame((now) => {
    if (now - lastSampleTime.value < options.interval) {
      return
    }

    const currentValue = input.value

    switch (options.type) {
      case 'counter':
        // eslint-disable-next-line no-case-declarations
        const diff = Math.max(0, currentValue - lastValue.value)

        timeSeries.value.push({ time: now, value: diff })
        lastValue.value = currentValue
        break
      case 'gauge':
        timeSeries.value.push({ time: now, value: currentValue })
        break
    }

    // GC
    if (timeSeries.value.length > options.maxDataPoints) {
      const excessPoints = timeSeries.value.length - options.maxDataPoints
      timeSeries.value.splice(0, excessPoints)
    }

    lastSampleTime.value = now
  })

  return timeSeries
}

interface BytesRateOption {
  sampleRate: number
  timeWindow: number
}

function bytesRateOptions(options?: Partial<BytesRateOption>): BytesRateOption {
  if (!options) {
    return {
      sampleRate: 1000,
      timeWindow: 10000,
    }
  }

  return {
    sampleRate: options?.sampleRate ?? 1000,
    timeWindow: options?.timeWindow ?? 10000,
  }
}

export function useBytesRate(
  input: Ref<number> | ComputedRef<number>,
  opts?: Partial<BytesRateOption & TimeSeriesOptions>,
) {
  const options = bytesRateOptions(opts)

  const timeSeriesOpts = timeSeriesOptions(opts)
  const timeSeries = useTimeSeries(input, timeSeriesOpts)

  const bytesRate = ref(0)
  const lastUpdateTime = ref(0)

  onAnimationFrame((now) => {
    if (now - lastUpdateTime.value < options.sampleRate) {
      return
    }

    const cutoffTime = now - options.timeWindow
    const relevantPoints = timeSeries.value.filter(point => point.time > cutoffTime)

    if (relevantPoints.length < 2) {
      bytesRate.value = 0
    }

    else {
      const oldestPoint = relevantPoints[0]!
      const newestPoint = relevantPoints[relevantPoints.length - 1]!
      const timeDiff = newestPoint.time - oldestPoint.time
      const valueDiff = relevantPoints.reduce((sum, point) => sum + point.value, 0)

      // bytes per second
      bytesRate.value = timeDiff > 0 ? (valueDiff / timeDiff) * 1000 : 0
    }

    lastUpdateTime.value = now
  })

  const kiloBytesFormatter = new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: 'kilobyte-per-second',
    unitDisplay: 'short',
  })

  const formatted = computed(() => {
    const kiloBytesPerSecond = bytesRate.value / 1024
    return kiloBytesFormatter.format(Number.parseFloat(kiloBytesPerSecond.toFixed(2)))
  })

  return {
    bytesRate,
    formatted,
  }
}

export function onAnimationFrame(callback: (timestamp: number) => void) {
  const animationFrameId = ref<number | null>(null)

  function onAnimationFrame(timestamp: number) {
    callback(timestamp)
    animationFrameId.value = requestAnimationFrame(onAnimationFrame)
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
