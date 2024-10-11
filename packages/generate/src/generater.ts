import type { EncodedBlock } from 'luby-transform'
import { type QrCodeGenerateOptions, type QrCodeGenerateSvgOptions, type QrCodeGenerateUnicodeOptions, encode as qrEncode, renderANSI, renderSVG, renderUnicode, renderUnicodeCompact } from 'uqr'
import { createGeneraterWithRender } from './base-generater'
import { addUrlPrefix, blockToBase64, type GeneraterBaseOptions } from './shared'

/**
 * Render QR Code to ANSI colored string.
 */
export const createGeneraterANSI = /* @__PURE__ */ createGeneraterWithRender(withRenderANSI)
function withRenderANSI(options: GeneraterBaseOptions<QrCodeGenerateOptions>) {
  return (data: EncodedBlock) => {
    let base64str = blockToBase64(data)
    base64str = addUrlPrefix(options.urlPrefix, base64str)
    return renderANSI(base64str, options)
  }
}

/**
 * Render QR Code to Unicode string for each pixel. By default it uses █ and ░ to represent black and white pixels, and it can be customizable.
 */
export const createGeneraterUnicode = /* @__PURE__ */ createGeneraterWithRender(withRenderUnicode)
function withRenderUnicode(options: GeneraterBaseOptions<QrCodeGenerateUnicodeOptions>) {
  return (data: EncodedBlock) => {
    let base64str = blockToBase64(data)
    base64str = addUrlPrefix(options.urlPrefix, base64str)
    return renderUnicode(base64str, options)
  }
}

/**
 * Render QR Code with two rows into one line with unicode ▀, ▄, █,  . It is useful when you want to display QR Code in terminal with limited height.
 */
export const createGeneraterUnicodeCompact = /* @__PURE__ */ createGeneraterWithRender(withRenderUnicodeCompact)
function withRenderUnicodeCompact(options: GeneraterBaseOptions<QrCodeGenerateOptions>) {
  return (data: EncodedBlock) => {
    let base64str = blockToBase64(data)
    base64str = addUrlPrefix(options.urlPrefix, base64str)
    return renderUnicodeCompact(base64str, options)
  }
}

/**
 * Render QR Code to SVG string.
 */
export const createGeneraterSVG = /* @__PURE__ */ createGeneraterWithRender(withRenderSVG)
function withRenderSVG(options: GeneraterBaseOptions<QrCodeGenerateSvgOptions>) {
  return (data: EncodedBlock) => {
    let base64str = blockToBase64(data)
    base64str = addUrlPrefix(options.urlPrefix, base64str)
    return renderSVG(base64str, options)
  }
}

/**
 * Encode data into QR Code represented by a 2D array.
 */
export const createGeneraterQRCodeArray = /* @__PURE__ */ createGeneraterWithRender(withRenderQRCodeArray)
function withRenderQRCodeArray(options: GeneraterBaseOptions<QrCodeGenerateOptions>) {
  return (data: EncodedBlock) => {
    let base64str = blockToBase64(data)
    base64str = addUrlPrefix(options.urlPrefix, base64str)
    return qrEncode(base64str, options)
  }
}
