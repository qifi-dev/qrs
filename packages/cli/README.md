# QiFi CLI

<!-- Some beautiful tags -->
<p align="left">
  <a href="https://www.npmjs.com/package/@qifi/generate">
    <img alt="npm" src="https://badgen.net/npm/v/@qifi/generate">
  </a>
  <a href="#usage">
    <img alt="docs" src="https://img.shields.io/badge/-docs%20%26%20demos-1e8a7a">
  </a>
  <a href="https://github.com/sponsors/LittleSound">
    <img alt="sponsors" src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86">
  </a>
</p>

Stream Generated QR Codes for file transmission in your terminal

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

Get document

```bash
npx qifi --help
```

Stream file

```bash
npx qifi ./file.txt
```

Stream file with custom chunk size

```bash
npx qifi -ICS=1000 ./file.txt
```

You can use any scanner to scan the dynamic QR code. This will redirect to [a scanner website in the browser](https://qrss.netlify.app) to actually obtain the file data from the QR code.

## Demo

![Demo](../../public/qifi-cli-demo.jpg)
