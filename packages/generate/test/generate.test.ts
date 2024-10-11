import { expect, it } from 'vitest'
import {
  createGeneraterANSI,
  createGeneraterQRCodeArray,
  createGeneraterSVG,
  createGeneraterUnicode,
  createGeneraterUnicodeCompact,
} from '../src/index'

// it.todo('should generate test', () => {
//   expect(1).toBe(1)
// })

it('generate boolean array', () => {
  const generater = createGeneraterQRCodeArray(new Uint8Array(1).fill(23), {
    sliceSize: 40,
  })
  const { data, types } = generater.fountain().next().value

  expect(data.map(i => i.map(j => j ? 1 : ' ').join(' '))).toMatchSnapshot()
  expect(types.map(i => i.map(j => j < 1 ? ' ' : j).join(' '))).toMatchSnapshot()

  // the data is too small. there will only be one QR Code
  const { data: data2, types: types2 } = generater.fountain().next().value
  expect(data2).toEqual(data)
  expect(types2).toEqual(types)
})

it('should generate lots of QR Codes', () => {
  const generater = createGeneraterQRCodeArray(new Uint8Array(10000).fill(Math.round(Math.random() * 23)), {
    sliceSize: 5,
  })

  let oldData: boolean[][] = []

  for (let i = 0, iterator = generater.fountain(); i < 10; i++) {
    const { data } = iterator.next().value
    expect(data).not.toEqual(oldData)
    oldData = data
  }
})

it('should generate unicode QR codes', () => {
  const generater = createGeneraterUnicode(new Uint8Array(1).fill(23), {
    sliceSize: 10,
    whiteChar: '██',
    blackChar: '░░',
  })
  const qrcode = generater.fountain().next().value
  expect(qrcode).toMatchSnapshot()
})

it('should generate QR codes with prefix', () => {
  const generater = createGeneraterUnicode(new Uint8Array(1).fill(23), {
    sliceSize: 10,
    whiteChar: '██',
    blackChar: '░░',
    urlPrefix: 'https://qrss.netlify.app/#',
  })
  const qrcode = generater.fountain().next().value
  // console.log(qrcode)
  expect(qrcode).toMatchSnapshot()
})

it('should generate unicode compact QR codes', () => {
  const generater = createGeneraterUnicodeCompact(new Uint8Array(1).fill(23), {
    sliceSize: 10,
    invert: false,
  })
  const qrcode = generater.fountain().next().value
  // console.log(qrcode)
  expect(qrcode).toMatchSnapshot()
})

it('should generate ANSI QR codes', () => {
  const generater = createGeneraterANSI(new Uint8Array(1).fill(23), {
    sliceSize: 10,
  })
  const qrcode = generater.fountain().next().value
  // console.log(qrcode)
  expect(qrcode).toMatchFileSnapshot('__snapshots__/ansi-qrcode.txt')
})

it('should generate SVG QR codes', () => {
  const generater = createGeneraterSVG(new Uint8Array(1).fill(23), {
    sliceSize: 10,
  })
  const svg = generater.fountain().next().value
  expect(svg).toMatchFileSnapshot('__snapshots__/svg-qrcode.svg')
})
