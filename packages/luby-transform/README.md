# ⛲️ Luby Transform

<!-- Some beautiful tags -->
<p align="left">
  <a href="https://www.npmjs.com/package/luby-transform">
    <img alt="npm" src="https://badgen.net/npm/v/luby-transform">
  </a>
  <a href="#usage">
    <img alt="docs" src="https://img.shields.io/badge/-docs%20%26%20demos-1e8a7a">
  </a>
  <a href="https://github.com/sponsors/LittleSound">
    <img alt="sponsors" src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86">
  </a>
</p>

> While exploring streaming QR code data transmission in the [Qrs](https://github.com/qifi-dev/qrs) project, I developed this npm package to solve the packet loss issue.

📡 [Luby Transform](https://en.wikipedia.org/wiki/Luby_transform_code) is used for data transmission in a "[Binary Erasure Channel (BEC).](https://en.wikipedia.org/wiki/Binary_erasure_channel)" BEC is a communication model where the sender transmits binary data (0 or 1), and the receiver has a certain probability of not receiving some data bits, which are marked as "erased" or "lost." In other words, the receiver knows which bits are lost but not their specific values. BEC is used to study and design coding techniques that can effectively transmit information even in the presence of data loss.

🧪 Scientists have conducted in-depth research on how to efficiently transmit data in BEC, and one method is using 🛁 "[Fountain Codes](https://en.wikipedia.org/wiki/Fountain_code)". Fountain Codes are a type of error-correcting code that can effectively transmit information in the presence of data loss. Luby Transform coding is a type of Fountain Code. Its basic principle is to divide the original data into multiple small blocks and then generate an unlimited number of encoded blocks through encoding. 🚰 The receiver only needs to receive enough encoded blocks (usually slightly more than the original blocks) without needing to receive specific lost blocks to reconstruct the original data.

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

### Encoder side

```javascript
import fs from 'node:fs/promises'
import { fromUint8Array } from 'js-base64'
import {
  blockToBinary, createEncoder,
} from 'luby-transform'

const file = await fs.readFile(join('test', 'foo.png'), null))

let encoder
// String
encoder = createEncoder(new TextEncoder().encode('Hello, World!'), 2 /* block size */)
// or File
encoder = createEncoder(new Uint8Array(file.buffer), 1400 /* block size */)

// You can generate an unlimited number of blocks in a loop
// and continuously send them.
for (const block of encoder.fountain()) {
  const binary = blockToBinary(block)
  // Send binary block to the receiver

  // or Use the string to transfer
  const string = fromUint8Array(block)
}
```

### Decoder side

```javascript
import { toUint8Array } from 'js-base64'
import {
  binaryToBlock, createDecoder,
} from 'luby-transform'

const decoder = createDecoder()

// Receive data blocks in the way you want, and then add them to the decoder.
// If enough data blocks are received, the decoder will rebuild the original data.
for (const string of receivedStringBlocks) {
  const binary = toUint8Array(string)
  const block = binaryToBlock(binary)
  const isOkay = decoder.addBlock(block)
  if (isOkay) {
    // The original data has been successfully reconstructed
    break
  }
}

const result = decoder.getDecoded()
// to string
const text = new TextDecoder().decode(result)
// or to file
await fs.writeFile(join('test', 'foo.png'), result)
```

### With meta data

If you want to transfer the metadata of the file:

```javascript
import {
  appendFileHeaderMetaToBuffer,
  readFileHeaderMetaFromBuffer,
} from 'luby-transform'

const data = new Uint8Array(file.buffer)
const meta = {
  filename: file.name,
  contentType: file.type,
}
const merged = appendFileHeaderMetaToBuffer(data, meta)
const encoder = createEncoder(merged, 1400)

// Send blocks to the receiver

const decoder = createDecoder()
// Receive data blocks in the way you want, and then add them to the decoder.
const result = decoder.getDecoded()
const [data, meta] = readFileHeaderMetaFromBuffer(result)

// to save file
await fs.writeFile(meta.filename, data)
// or to create data url
const blob = new Blob([data], { type: meta.contentType })
const url = URL.createObjectURL(blob)
```

and you can use `appendMetaToBuffer` and `readMetaFromBuffer` to add and read custom metadata.

## API

### `createEncoder`

Creates a new `LtEncoder` instance for encoding data.

#### Parameters

- `data` (`Uint8Array`): The raw data to be encoded.
- `sliceSize` (`number`): The size of each block.
- `compress` (`boolean`, optional): Whether to compress the data. Defaults to `true`.

#### Returns

- `LtEncoder`: Returns a new `LtEncoder` instance.

#### Example

```typescript
import { createEncoder } from 'luby-transform'

// Encode a string
const encoder = createEncoder(new TextEncoder().encode('Hello, World!'), 2)

// Encode a file
const file = await fs.readFile('path/to/file')
const encoder = createEncoder(new Uint8Array(file.buffer), 1400)
```

#### Detailed Description

The `createEncoder` function is used to create a new `LtEncoder` instance. The `LtEncoder` class is used to split data into multiple blocks and optionally compress the data. The created `LtEncoder` instance can generate an unlimited number of encoded blocks, which can be used for data transmission.

The `LtEncoder` class constructor processes the data based on the provided parameters and generates the corresponding encoded blocks. Using the `fountain` method, an unlimited number of encoded blocks can be generated, which can be transmitted over the network or stored in other ways.

### `encoder.fountain`

Generates an infinite sequence of random encoded blocks using the Ideal Soliton Distribution.

#### Returns

- `Generator<EncodedBlock>`: A generator that yields `EncodedBlock` objects.

#### Example

```typescript
const encoder = createEncoder(new TextEncoder().encode('Hello, World!'), 2)
for (const block of encoder.fountain()) {
  console.log(block)
  // Process the block
  break // Remove this break to generate blocks indefinitely
}
```

The `EncodedBlock` object contains the following properties:

- `k`: The total number of blocks.
- `bytes`: The total number of bytes in the compressed data.
- `checksum`: The checksum of the original data.
- `indices`: The indices of the original data blocks used to create this block.
- `data`: The encoded data for this block.

### `encoder.createBlock`

Manually creates an encoded block from the original data.

```typescript
const encoder = createEncoder(new TextEncoder().encode('Hello, World!'), 2)
const indices = [0, 1] // Example indices
const block = encoder.createBlock(indices)
console.log(block)
```

#### Detailed Description

The `createBlock` method allows users to manually create an encoded block by specifying the indices of the original data blocks. This is useful for scenarios where users need fine-grained control over the encoding process.

### `createDecoder`

Creates a new `LtDecoder` instance for decoding data blocks.

#### Parameters

- `blocks` (`EncodedBlock[]`, optional): An optional array of encoded blocks to initialize the decoder with.

#### Returns

- `LtDecoder`: Returns a new `LtDecoder` instance.

#### Example

```typescript
import { createEncoder, type EncodedBlock } from 'luby-transform'

const blocks: EncodedBlock[] = [
  // Example encoded blocks
]

const decoder = createDecoder(blocks)
```

#### Detailed Description

The `createDecoder` function is used to create a new `LtDecoder` instance. The `LtDecoder` class is responsible for decoding data blocks and reconstructing the original data. If an array of encoded blocks is provided, the decoder will attempt to decode them on the fly. This function is useful for initializing the decoder with pre-existing blocks or starting with an empty decoder.

### `decoder.addBlock`

Adds an encoded block to the decoder.

#### Parameters

- `block` (`EncodedBlock`): The encoded block to be added.

#### Returns

- `boolean`: Returns `true` if the block was successfully added and the original data can be reconstructed, otherwise `false`.

#### Example

```typescript
const decoder = createDecoder()

const isOkay = decoder.addBlock(block /* Example encoded block */)
if (isOkay) {
  console.log('Original data has been successfully reconstructed')
}
```

### `decoder.getDecoded`

Retrieves the decoded original data from the decoder.

#### Returns

- `Uint8Array`: The reconstructed original data.

#### Example

```typescript
const decoder = createDecoder()
// Add blocks to the decoder
const result = decoder.getDecoded()
console.log(new TextDecoder().decode(result)) // Convert to string if needed
```

#### Detailed Description

The `getDecoded` method is used to retrieve the original data after it has been successfully reconstructed by the decoder. It returns a `Uint8Array` containing the reconstructed data. This method should be called after enough encoded blocks have been added to the decoder to fully reconstruct the original data.

### `blockToBinary`

Converts an `EncodedBlock` object into a binary `Uint8Array`. This binary format can be used for efficient storage or transmission of the encoded block.

### `binaryToBlock`

Converts a binary `Uint8Array` back into an `EncodedBlock` object.

### `appendFileHeaderMetaToBuffer`

Appends file header meta to the beginning of a data buffer.

### `readFileHeaderMetaFromBuffer`

Reads file header meta from the beginning of a data buffer.

### `appendMetaToBuffer`

Appends custom meta to the beginning of a data buffer.

### `readMetaFromBuffer`

Reads custom meta from the beginning of a data buffer.

## Reference

- [Fountain codes and animated QR](https://divan.dev/posts/fountaincodes/)
- [LT codes -- a design and analysis epiphany](https://youtu.be/C4qi_oJoUrE)
- [gofountain](https://github.com/google/gofountain)

## License

[MIT](https://github.com/qifi-dev/qrs/blob/main/LICENSE) License
