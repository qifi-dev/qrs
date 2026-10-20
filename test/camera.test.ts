import { describe, expect, it } from 'vitest'
import { findRearCamera, resolvePreferredCamera, resolveRearCameraFallback } from '../utils/camera'

const front = { deviceId: 'front', label: 'Front Camera' }
const back = { deviceId: 'back', label: 'Back Camera' }
const backUltraWide = { deviceId: 'back-uw', label: 'Back Ultra Wide Camera' }
const androidFront = { deviceId: 'a0', label: 'camera2 1, facing front' }
const androidBack = { deviceId: 'a1', label: 'camera2 0, facing back' }
const laptop = { deviceId: 'laptop', label: 'FaceTime HD Camera' }
const unlabelled = { deviceId: '', label: '' }

describe('resolvePreferredCamera', () => {
  it('requests the environment-facing camera when nothing was chosen', () => {
    expect(resolvePreferredCamera(undefined, [front, back])).toBe('environment')
    expect(resolvePreferredCamera(undefined, [])).toBe('environment')
  })

  it('uses the explicitly chosen camera when it is available', () => {
    expect(resolvePreferredCamera('front', [front, back])).toBe('front')
  })

  it('trusts the chosen camera while devices are not enumerated yet', () => {
    expect(resolvePreferredCamera('front', [])).toBe('front')
    expect(resolvePreferredCamera('front', [unlabelled])).toBe('front')
  })

  it('falls back to the environment-facing camera when the chosen one is gone', () => {
    expect(resolvePreferredCamera('missing', [front, back])).toBe('environment')
  })
})

describe('findRearCamera', () => {
  it('finds rear cameras by label', () => {
    expect(findRearCamera([front, back])).toBe('back')
    expect(findRearCamera([androidFront, androidBack])).toBe('a1')
    expect(findRearCamera([{ deviceId: 'zh-front', label: '前置相机' }, { deviceId: 'zh-back', label: '后置相机' }])).toBe('zh-back')
    expect(findRearCamera([{ deviceId: 'env', label: 'Environment camera' }])).toBe('env')
  })

  it('prefers the main rear lens over special lenses', () => {
    expect(findRearCamera([front, backUltraWide, back])).toBe('back')
    expect(findRearCamera([front, backUltraWide])).toBe('back-uw')
    expect(findRearCamera([{ deviceId: 'tele', label: 'Back Telephoto Camera' }, back])).toBe('back')
    expect(findRearCamera([{ deviceId: 'dual', label: 'Back Dual Camera' }, back])).toBe('back')
  })

  it('prefers iPhone virtual cameras that auto-switch to macro for close QR codes', () => {
    const dualWide = { deviceId: 'dual-wide', label: 'Back Dual Wide Camera' }
    const triple = { deviceId: 'triple', label: 'Back Triple Camera' }
    expect(findRearCamera([front, back, backUltraWide, dualWide])).toBe('dual-wide')
    expect(findRearCamera([front, back, dualWide, triple])).toBe('triple')
  })

  it('returns undefined when there is no recognizable rear camera', () => {
    expect(findRearCamera([laptop])).toBeUndefined()
    expect(findRearCamera([unlabelled])).toBeUndefined()
    expect(findRearCamera([])).toBeUndefined()
  })
})

describe('resolveRearCameraFallback', () => {
  it('does nothing when the browser already reports a rear camera', () => {
    expect(resolveRearCameraFallback({ facingMode: 'environment', deviceId: 'front' }, [front, back])).toBeUndefined()
  })

  it('does nothing when the active camera is already a rear one', () => {
    expect(resolveRearCameraFallback({ deviceId: 'back-uw' }, [front, back, backUltraWide])).toBeUndefined()
  })

  it('switches to a labelled rear camera when a front camera was opened', () => {
    expect(resolveRearCameraFallback({ facingMode: 'user', deviceId: 'front' }, [front, back])).toBe('back')
    expect(resolveRearCameraFallback({ deviceId: 'a0' }, [androidFront, androidBack])).toBe('a1')
  })

  it('keeps desktop cameras untouched', () => {
    expect(resolveRearCameraFallback({ deviceId: 'laptop' }, [laptop])).toBeUndefined()
    expect(resolveRearCameraFallback({}, [unlabelled])).toBeUndefined()
  })
})
