#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { appendFileHeaderMetaToBuffer, createGeneraterANSI } from '@qifi/generate'
import mime from 'mime'

// Function to read file and generate QR codes
async function generateQRCodes(filePath: string, sliceSize: number = 80, fps: number = 20) {
  const fullPath = path.resolve(filePath)

  console.log('fullPath:', fullPath)
  await new Promise(resolve => setTimeout(resolve, 1000))
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(fullPath)
  const data = new Uint8Array(fileBuffer)
  const meta = {
    filename: path.basename(fullPath),
    contentType: mime.getType(fullPath) || 'application/octet-stream',
  }

  const merged = appendFileHeaderMetaToBuffer(data, meta)

  const generator = createGeneraterANSI(merged, {
    urlPrefix: 'https://qrss.netlify.app/#',
    sliceSize,
    border: 2,
  })

  // Clear console function
  const clearConsole = () => process.stdout.write('\x1Bc')

  // Display QR codes
  for (const blockQRCode of generator.fountain()) {
    clearConsole()
    console.log(blockQRCode)
    console.log(`${meta.filename} (${meta.contentType})`, '|', 'size:', data.length, 'bytes')
    await new Promise(resolve => setTimeout(resolve, 1000 / fps)) // Display each QR code for 1 second
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: qr-file-transfer <file-path> [slice-size]')
  process.exit(1)
}

const [filePath, sliceSizeStr, fpsStr] = args
const sliceSize = sliceSizeStr ? Number.parseInt(sliceSizeStr, 10) : undefined
const fps = fpsStr ? Number.parseInt(fpsStr, 10) : undefined

if (!filePath) {
  console.error('File path is required')
  process.exit(1)
}

generateQRCodes(filePath, sliceSize, fps)
