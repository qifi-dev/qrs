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
const SPECIAL_LENS_LABEL = /ultra|wide|tele|macro|depth|dual|triple/i

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

/**
 * Find a rear camera by its label, preferring the main lens over ultra wide,
 * telephoto and other special lenses. Labels are only available after camera
 * permission is granted.
 */
export function findRearCamera(cameras: CameraInfo[]): string | undefined {
  const rear = cameras.filter(i => i.deviceId && isRearLabel(i.label))
  return (rear.find(i => !SPECIAL_LENS_LABEL.test(i.label)) ?? rear[0])?.deviceId
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
