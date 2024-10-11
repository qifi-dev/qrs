import { createEncoder } from 'luby-transform'
import { type CreateBlockRenderFn, type GeneraterBaseOptions, GeneraterDefaultOptions } from './shared'

export function createGeneraterWithRender<Result, RenderOptions>(createRender: CreateBlockRenderFn<Result, RenderOptions>) {
  return (data: Uint8Array, options?: GeneraterBaseOptions<RenderOptions>) => {
    const _options = Object.assign({}, GeneraterDefaultOptions, options)

    const encoder = createEncoder(data, _options.sliceSize, _options.compress)

    let _fountain: ReturnType<typeof encoder.fountain>

    const render = createRender(_options)

    return {
      encoder,

      /**
       * Generate random encoded blocks that **never** ends
       */
      *fountain(): Generator<Result, never> {
        while (true) {
          _fountain ||= encoder.fountain()
          const block = _fountain.next().value
          yield render(block)
        }
      },

      /**
       * Manually creates an encoded block from the original data.
       */
      createBlock(indices: number[]): Result {
        return render(encoder.createBlock(indices))
      },
    }
  }
}
