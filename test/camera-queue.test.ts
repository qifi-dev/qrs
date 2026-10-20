import type { ActiveCameraSettings, CameraInfo } from '../utils/camera'
import { describe, expect, it, vi } from 'vitest'
import { createCameraQueue } from '../utils/camera'

const front = { deviceId: 'front', label: 'Front Camera' }
const back = { deviceId: 'back', label: 'Back Camera' }

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(r => resolve = r)
  return { promise, resolve }
}

/** A fake qr-scanner that records how many stream operations overlap. */
function createFakeScanner(initial = 'front') {
  let running = 0
  const pending: (() => void)[] = []
  const scanner = {
    active: initial,
    maxConcurrent: 0,
    calls: [] as string[],
    async op(name: string, camera?: string) {
      scanner.calls.push(name)
      running++
      scanner.maxConcurrent = Math.max(scanner.maxConcurrent, running)
      const d = deferred()
      pending.push(d.resolve)
      await d.promise
      if (camera)
        scanner.active = camera
      running--
    },
    start: () => scanner.op('start'),
    setCamera: (id: string) => scanner.op(`setCamera:${id}`, id),
    settings: (): ActiveCameraSettings => ({ deviceId: scanner.active }),
    async flush() {
      for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r))
        pending.shift()?.()
      }
    },
  }
  return scanner
}

function setup(preferred: () => string, cameras: CameraInfo[] = [front, back]) {
  const scanner = createFakeScanner()
  const onSettled = vi.fn()
  const onError = vi.fn()
  const queue = createCameraQueue({
    getPreferredCamera: preferred,
    listCameras: async () => cameras,
    getActiveSettings: scanner.settings,
    switchCamera: id => scanner.setCamera(id),
    onSettled,
    onError,
  })
  return { scanner, queue, onSettled, onError }
}

describe('createCameraQueue', () => {
  it('switches to a labelled rear camera when the browser opened the front one', async () => {
    const { scanner, queue, onSettled } = setup(() => 'environment')
    queue.run(() => scanner.start())
    await scanner.flush()
    expect(scanner.calls).toEqual(['start', 'setCamera:back'])
    expect(onSettled).toHaveBeenLastCalledWith('back')
  })

  it('never runs scanner operations concurrently', async () => {
    let preferred = 'environment'
    const { scanner, queue } = setup(() => preferred)
    queue.run(() => scanner.start())
    preferred = 'front'
    queue.run(() => scanner.setCamera('front'))
    await scanner.flush()
    expect(scanner.maxConcurrent).toBe(1)
  })

  it('does not override a camera the user picked while a start was in flight', async () => {
    let preferred = 'environment'
    const { scanner, queue, onSettled } = setup(() => preferred)
    queue.run(() => scanner.start())
    preferred = 'front'
    queue.run(() => scanner.setCamera('front'))
    await scanner.flush()
    expect(scanner.calls).not.toContain('setCamera:back')
    expect(scanner.active).toBe('front')
    expect(onSettled).toHaveBeenLastCalledWith('front')
  })

  it('uses the resolved preference, so a stale stored choice still gets the rear fallback', async () => {
    const { scanner, queue } = setup(() => 'environment')
    queue.run(() => scanner.setCamera('front'))
    await scanner.flush()
    expect(scanner.active).toBe('back')
  })

  it('reports errors and keeps processing later tasks', async () => {
    const { scanner, queue, onError } = setup(() => 'front')
    queue.run(async () => {
      throw new Error('boom')
    })
    queue.run(() => scanner.start())
    await scanner.flush()
    expect(onError).toHaveBeenCalledWith(new Error('boom'))
    expect(scanner.calls).toEqual(['start'])
  })

  it('lets a running task notice dispose after an await', async () => {
    const { scanner, queue, onError } = setup(() => 'front')
    const pause = deferred()
    queue.run(async (isDisposed) => {
      await pause.promise
      if (!isDisposed())
        await scanner.start()
    })
    await new Promise(r => setTimeout(r))
    queue.dispose()
    pause.resolve()
    await scanner.flush()
    expect(scanner.calls).toEqual([])
    expect(onError).not.toHaveBeenCalled()
  })

  it('skips pending tasks after dispose', async () => {
    const { scanner, queue, onSettled } = setup(() => 'environment')
    queue.run(() => scanner.start())
    queue.run(() => scanner.setCamera('front'))
    await new Promise(r => setTimeout(r))
    queue.dispose()
    await scanner.flush()
    expect(scanner.calls).toEqual(['start'])
    expect(onSettled).not.toHaveBeenCalled()
  })
})
