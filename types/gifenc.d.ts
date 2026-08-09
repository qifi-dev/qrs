declare module 'gifenc' {
  type Palette = [number, number, number][]

  interface EncoderOptions {
    auto?: boolean
    initialCapacity?: number
  }

  interface FrameOptions {
    palette?: Palette
    delay?: number
    repeat?: number
    transparent?: boolean
    transparentIndex?: number
    dispose?: number
  }

  interface Encoder {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options?: FrameOptions,
    ) => void
    finish: () => void
    bytes: () => Uint8Array
  }

  export function GIFEncoder(options?: EncoderOptions): Encoder
}
