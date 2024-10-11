import type { QrCodeGenerateSvgOptions } from 'uqr'
import process from 'node:process'
import cac from 'cac'
import { version } from '../package.json'
import { ExitCode, handleArgsError } from './shared'

export const {
  values: {
    sliceSize,
    fps,
    prefix,
    unicode,
    compact,
    white,
    black,
    invert,
    contentType,
    ecc,
    maskPattern,
    boostEcc,
    minVersion,
    maxVersion,
    border,
  },
  positional,
} = getArgs()

function getArgs() {
  const cli = cac('qifi')
  cli
    .version(version)
    .usage('[file]')
    .option('-S, --slice-size <size>', 'Size of each slice of the file, default is 80')
    .option('-F, --fps <fps>', 'Frames per second, default is 10')
    .option('-P, --prefix <prefix>', 'URL prefix to use for the QR code, default is https://qrss.netlify.app/#')
    .option('-U, --unicode', 'Render QR Code to Unicode string for each pixel. By default it uses █ and ░ to represent black and white pixels, and it can be customizable.', { default: false })
    .option('-C, --compact', 'Render QR Code with two rows into one line with unicode ▀, ▄, █,  . It is useful when you want to display QR Code in terminal with limited height.', { default: false })
    .option('--white <char>', 'Character to represent white pixel in Unicode rendering, need to set unicode to true')
    .option('--black <char>', 'Character to represent black pixel in Unicode rendering, need to set unicode to true')
    .option('-I, --invert', 'Invert black and white', { default: false })
    .option('--content-type <type>', 'Content type of the file, default is auto')
    .option('--ecc <level>', [
      `Error correction level, default is 'L'`,
      '\tL - Allows recovery of up to 7% data loss',
      '\tM - Allows recovery of up to 15% data loss',
      '\tQ - Allows recovery of up to 25% data loss',
      '\tH - Allows recovery of up to 30% data loss',
    ].join('\n'))
    .option('--mask-pattern <pattern>', 'Mask pattern to use, default is -1 (auto)')
    .option('--boost-ecc', 'Boost the error correction level to the maximum allowed by the version and size', { default: false })
    .option('--min-version <version>', 'Minimum version of the QR code (1-40), default is 1')
    .option('--max-version <version>', 'Maximum version of the QR code (1-40), default is 40')
    .option('--border <size>', 'Border around the QR code, default is 1')
    .help()

  const result = cli.parse(process.argv)

  const { options, args } = result

  if (options.help || options.version) {
    process.exit(ExitCode.Success)
  }

  if (args.length !== 1 || !args[0]) {
    handleArgsError(new TypeError('Usage: qifi [options] <file-path>'))
  }
  const positional = args[0]!

  let sliceSize = 80
  if (options.sliceSize) {
    sliceSize = Number.parseInt(options.sliceSize)
    if (Number.isNaN(sliceSize)) {
      handleArgsError(new TypeError('Invalid slice size'))
    }
  }

  let fps = 10
  if (options.fps) {
    fps = Number.parseInt(options.fps)
    if (Number.isNaN(fps)) {
      handleArgsError(new TypeError('Invalid fps'))
    }
  }

  let prefix = 'https://qrss.netlify.app/#'
  if (options.prefix != null) {
    prefix = options.prefix
  }

  let maskPattern = -1
  if (options.maskPattern) {
    maskPattern = Number.parseInt(options.maskPattern)
    if (Number.isNaN(maskPattern)) {
      handleArgsError(new TypeError('Invalid mask pattern'))
    }
  }

  let minVersion = 1
  if (options.minVersion) {
    minVersion = Number.parseInt(options.minVersion)
    if (Number.isNaN(minVersion)) {
      handleArgsError(new TypeError('Invalid min version'))
    }
  }

  let maxVersion = 40
  if (options.maxVersion) {
    maxVersion = Number.parseInt(options.maxVersion)
    if (Number.isNaN(maxVersion)) {
      handleArgsError(new TypeError('Invalid max version'))
    }
  }

  let border = 1
  if (options.border) {
    border = Number.parseInt(options.border)
    if (Number.isNaN(border)) {
      handleArgsError(new TypeError('Invalid border'))
    }
  }

  const ecc = options.ecc as QrCodeGenerateSvgOptions['ecc']

  return {
    positional,
    values: {
      sliceSize,
      fps,
      prefix,
      unicode: options.unicode as boolean,
      compact: options.compact as boolean,
      white: options.white as string,
      black: options.black as string,
      invert: options.invert as boolean,
      contentType: options.contentType as string,
      ecc,
      maskPattern,
      boostEcc: options.boostEcc as boolean,
      minVersion,
      maxVersion,
      border,
    },
  }
}
