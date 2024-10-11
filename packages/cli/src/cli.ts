import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { appendFileHeaderMetaToBuffer, createGeneraterANSI, createGeneraterUnicode, createGeneraterUnicodeCompact } from '@qifi/generate'
import mime from 'mime'
import {
  black,
  boostEcc,
  border,
  compact,
  contentType,
  ecc,
  fps,
  invert,
  maskPattern,
  maxVersion,
  minVersion,
  positional,
  prefix,
  sliceSize,
  unicode,
  white,
} from './parse-args'
import { handleArgsError } from './shared'

function chooseGenerater() {
  if (compact) {
    return createGeneraterUnicodeCompact
  }
  if (unicode) {
    return createGeneraterUnicode
  }
  return createGeneraterANSI
}

// Function to read file and generate QR codes
export async function main() {
  const fullPath = path.resolve(positional)

  console.log('fullPath:', fullPath)
  await new Promise(resolve => setTimeout(resolve, 1000))
  if (!fs.existsSync(fullPath)) {
    handleArgsError(new TypeError(`File not found: ${fullPath}`))
  }

  const fileBuffer = fs.readFileSync(fullPath)
  const data = new Uint8Array(fileBuffer)
  const meta = {
    filename: path.basename(fullPath),
    contentType: contentType || mime.getType(fullPath) || 'application/octet-stream',
  }

  const merged = appendFileHeaderMetaToBuffer(data, meta)

  const generator = chooseGenerater()(merged, {
    sliceSize,
    urlPrefix: prefix,
    ...{
      whiteChar: white,
      blackChar: black,
    } as any,
    invert,
    ecc,
    maskPattern,
    boostEcc,
    minVersion,
    maxVersion,
    border,
  })

  // Clear console function
  const clearConsole = () => {
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
  }

  // Display QR codes
  for (const blockQRCode of generator.fountain()) {
    clearConsole()
    process.stdout.write(`${blockQRCode}\n`)
    process.stdout.write(`${meta.filename} (${meta.contentType}) | size: ${data.length} bytes`)
    await new Promise(resolve => setTimeout(resolve, 1000 / fps))
  }
}
