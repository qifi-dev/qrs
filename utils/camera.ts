export interface CameraInfo {
  deviceId: string
  label: string
}

export interface ActiveCameraSettings {
  deviceId?: string
  facingMode?: string
}

const REAR_LABEL = /back|rear|environment|后|背/i
const FRONT_LABEL = /front|user|前/i
const REAR_LENS_RANKS = [/triple/i, /dual wide/i, /^(?!.*(?:ultra|wide|tele|macro|depth|dual))/i]

function isRearLabel(label: string) {
  return REAR_LABEL.test(label) && !FRONT_LABEL.test(label)
}

/**
 * Decide what to ask the scanner for. Unless the user explicitly picked a camera,
 * request the `environment` facing mode instead of a device id: browsers resolve it
 * to the main rear camera on phones and fall back to any camera on desktops, whereas
 * `enumerateDevices()` order is arbitrary (often front-first) and labels are empty
 * before permission is granted.
 *
 * A chosen id is kept while devices are not enumerated yet, and dropped once the
 * enumerated list proves it no longer exists.
 */
export function resolvePreferredCamera(selectedId: string | undefined, cameras: CameraInfo[]): string {
  if (!selectedId)
    return 'environment'
  const known = cameras.filter(i => i.deviceId)
  if (!known.length || known.some(i => i.deviceId === selectedId))
    return selectedId
  return 'environment'
}

function rearLensRank(label: string) {
  const rank = REAR_LENS_RANKS.findIndex(i => i.test(label))
  return rank === -1 ? REAR_LENS_RANKS.length : rank
}

/**
 * Find a rear camera by its label. Labels are only available after camera permission
 * is granted.
 *
 * iPhone "Back Triple Camera", then "Back Dual Wide Camera" virtual devices rank first:
 * they switch to the ultra wide lens for macro shots, while the plain "Back Camera"
 * cannot focus on a QR code held close on Pro models. Next comes the main lens, then
 * single special lenses (ultra wide, telephoto, ...) and "Back Dual Camera" (wide +
 * telephoto, no macro).
 */
export function findRearCamera(cameras: CameraInfo[]): string | undefined {
  const rear = cameras.filter(i => i.deviceId && isRearLabel(i.label))
  return rear.sort((a, b) => rearLensRank(a.label) - rearLensRank(b.label))[0]?.deviceId
}

/**
 * Fallback for browsers that ignore the `facingMode` constraint: given the settings
 * of the stream that was actually opened, return the rear camera to switch to, or
 * `undefined` when the active camera is already a rear one or no rear camera can be
 * recognized (e.g. laptops).
 */
export function resolveRearCameraFallback(active: ActiveCameraSettings, cameras: CameraInfo[]): string | undefined {
  if (active.facingMode === 'environment')
    return undefined
  const current = cameras.find(i => i.deviceId && i.deviceId === active.deviceId)
  if (current && isRearLabel(current.label))
    return undefined
  const rear = findRearCamera(cameras)
  return rear !== active.deviceId ? rear : undefined
}

export interface CameraQueueOptions {
  /** The resolved preference; `'environment'` means there is no usable explicit user choice. */
  getPreferredCamera: () => string
  /** Refresh and return the camera list, called after each stream change. */
  listCameras: () => Promise<CameraInfo[]>
  getActiveSettings: () => ActiveCameraSettings
  switchCamera: (deviceId: string) => Promise<void>
  /** Called with the device id of the active camera after each task finishes. */
  onSettled: (deviceId: string | undefined) => void
  onError: (error: unknown) => void
}

/**
 * Serialize camera stream operations. qr-scanner's `start()` and `setCamera()` are not
 * re-entrant: overlapping calls can leak a stream (the camera light stays on) or let a
 * slow `getUserMedia` override a newer choice.
 *
 * After each task the label based rear fallback is applied, unless a newer task is
 * already queued or the user has explicitly chosen a camera in the meantime. After
 * `dispose()` pending tasks are skipped; a running task should check `isDisposed()`
 * after its own awaits before opening a stream.
 */
export function createCameraQueue(options: CameraQueueOptions) {
  let tail = Promise.resolve()
  let generation = 0
  let disposed = false

  async function applyRearFallback(gen: number) {
    const cameras = await options.listCameras()
    if (disposed || gen !== generation || options.getPreferredCamera() !== 'environment')
      return
    const rear = resolveRearCameraFallback(options.getActiveSettings(), cameras)
    if (rear)
      await options.switchCamera(rear)
  }

  const isDisposed = () => disposed

  function run(task: (isDisposed: () => boolean) => Promise<void>): Promise<void> {
    const gen = ++generation
    tail = tail.then(async () => {
      if (disposed)
        return
      try {
        await task(isDisposed)
        await applyRearFallback(gen)
        if (!disposed)
          options.onSettled(options.getActiveSettings().deviceId)
      }
      catch (e) {
        options.onError(e)
      }
    })
    return tail
  }

  function dispose() {
    disposed = true
  }

  return { run, dispose }
}
