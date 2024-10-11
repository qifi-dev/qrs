import { fromUint8Array } from 'js-base64'
import { blockToBinary, type EncodedBlock } from 'luby-transform'

export type CreateBlockRenderFn<Result, RenderOptions> = (renderOptions: GeneraterBaseOptions<RenderOptions>) => (block: EncodedBlock) => Result

export type GeneraterBaseOptions<RenderOptions> = {
  sliceSize?: number
  compress?: boolean
  urlPrefix?: string
} & RenderOptions

export const GeneraterDefaultOptions = {
  sliceSize: 500,
  urlPrefix: '',
}

export function blockToBase64(block: EncodedBlock) {
  return fromUint8Array(blockToBinary(block))
}

export function addUrlPrefix(urlPrefix: string | undefined, base64str: string) {
  return urlPrefix ? urlPrefix + base64str : base64str
}
