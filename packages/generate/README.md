# @qifi/generate

Stream Generated QR Codes for data transmission

# Usage

```javascript
import {
  createGeneraterANSI,
  createGeneraterUnicode,
  createGeneraterUnicodeCompact,
  createGeneraterSVG,
  createGeneraterQRCodeArray,
} from '@qifi/generate'

const generaterSvg = createGeneraterSVG(new Uint8Array(file.buffer))

const generaterANSI = createGeneraterANSI(new Uint8Array(file.buffer), {
  // Size of each data slice
  indicesSize: 250,
  // Error correction level
  ecc: 'L',
  // Border width
  border: 2,
})

// display QR Code in terminal
for (const blockQRCode of generaterANSI) {
  console.log(blockQRCode)
}

```
