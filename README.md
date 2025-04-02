<br>

<p align="center">
  <img height="150px" src="public/logo.svg">
</p>

<h1 align="center">Qrs</h1>

<p align="center">
Stream data through multiple QRCodes
</p>

<blockquote align="center">
<p>a bit like this meme:</p>
<img alt="Install Windows using QR Codes" src="public/install-windows-using-a-qr-code.jpeg" width="250px">
</blockquote>

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

## Try it

[Live demo](https://qrss.netlify.app/)

## Sub-packages

- [QiFi CLI](./packages/cli) - CLI for streaming QR code file transmission
- [luby-transform](./packages/luby-transform) - Luby Transform encoding and decoding
- [@qifi/generate](./packages/generate) - Stream Generated QR Codes for data transmission

## Knowledge

<!-- 这种流式播放二维码传输数据的情况。类似“二进制抹去通道（Binary Erasure Channel, BEC）”，这是一种通信模型。在这个模型中，发送方发送二进制数据（0或1），接收方有一定概率无法接收到某些数据位，这些位会被标记为“抹去”或“丢失”。换句话说，接收方知道哪些位丢失了，但不知道它们的具体值。这个模型用于研究和设计能够在数据丢失情况下仍能有效传输信息的编码技术。

科学家对于如何在 BEC 中高效传输数据已经有了非常成熟的研究成果，其中一种方法是使用“喷泉码（Fountain Codes）”。喷泉码是一种纠错码，它可以在数据丢失的情况下仍然有效地传输信息。本项目使用了 Luby Transform 编码。它是喷泉码（Fountain Codes）的一种。基本原理是将原始数据分成多个小块，然后通过编码生成无限数量的编码块。接收方只需收到足够多的编码块（通常比原始块稍多）就可以重建原始数据。 -->

This situation of streaming QR code data transmission is similar to the "Binary Erasure Channel (BEC)," which is a communication model. In this model, the sender transmits binary data (0 or 1), and the receiver has a certain probability of not receiving some data bits, which are marked as "erased" or "lost." In other words, the receiver knows which bits are lost but does not know their specific values. This model is used to study and design coding techniques that can effectively transmit information even in cases of data loss.

Scientists have already achieved very mature research results on how to efficiently transmit data in BEC, one of which is using "Fountain Codes." Fountain Codes are a type of error-correcting code that can effectively transmit information even in the case of data loss. This project uses Luby Transform coding, which is a type of Fountain Code. The basic principle is to divide the original data into multiple small blocks and then generate an unlimited number of encoded blocks through encoding. The receiver only needs to receive enough encoded blocks (usually slightly more than the original blocks) to reconstruct the original data.

## Using Offline
There are two main ways to install and use it in offline mode, on both, computer and phone devices 

**Running on computer**

First, and easiest one
- Download [index.html](https://github.com/iuvi7/qrs/blob/main/public/index.html) as Raw file from repository
- Open it in your browser and run in offline mode (For Firefox press Alt -> Select "File" and then "Work in autonomous mode")
- NOTE: If you want to Send file, before choosing it, firstly push "Receive" and then once again on "Send", and you are ready to go

Second, but harder way using [Node.js](https://nodejs.org/en) and pnpm

- Install Node.js
- Do next commands

sudo npm install -g pnpm  
git clone [https://github.com/qifi-dev/qrs.git](https://github.com/qifi-dev/qrs.git)  
cd qrs  
pnpm install  
pnpm build  
node .output/server/index.mjs

- Visit 127.0.0.1:3000 in your browser to use it

**Running on phone**

First, and easiest one (tested on Brave for Android)

- Visit https://qrss.netlify.app/
- Go to Menu and choose "Add to Main Screen"
- Install it and use without internet

Second, running small local server
- Download [index.html](https://github.com/iuvi7/qrs/blob/main/public/index.html) file from repository
- Install and run [ServeIt](https://f-droid.org/ru/packages/com.example.flutter_http_server/) from F-Droid
- Choose directory with index.html and push "Start Server"
- Open 127.0.0.1:8888 in your browser
- Go to settings, choose "Version for Desktop"
- NOTE: If you want to Send file, before choosing it, firstly Push "Receive" and then once again on "Send", and you are ready to go

## Demo

<video src="https://github.com/user-attachments/assets/b4f8a122-02c7-4754-9ec0-121e42f8b22d"></video>

## Reference

### Fountain Codes

- [Fountain codes and animated QR](https://divan.dev/posts/fountaincodes/)
- [LT codes -- a design and analysis epiphany](https://youtu.be/C4qi_oJoUrE)
- [gofountain](https://github.com/google/gofountain)

### QR Codes

- [Anthony's QR Toolkit](https://github.com/antfu/qrcode-toolkit)
