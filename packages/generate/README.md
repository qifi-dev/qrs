# @qifi/generate

Stream Generated QR Codes for data transmission

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/LittleSound">
    <img src="https://cdn.jsdelivr.net/gh/littlesound/sponsors/sponsors.svg"/>
  </a>
</p>

<p align="center">
  This project is made possible by all the sponsors supporting my work <br>
  You can join them at my sponsors profile:
</p>
<p align="center"><a href="https://github.com/sponsors/LittleSound"><img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86&style=for-the-badge" /></a></p>

## Usage

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
for (const blockQRCode of generaterANSI()) {
  console.log(blockQRCode)
}

```
