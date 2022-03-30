#!/usr/bin/env node

const fs = require('fs')
const argv = require('minimist')(process.argv.slice(2))
const path = require('path')
const b32 = require('hi-base32')
const crypto = require('crypto')
const Hyperswarm = require('hyperswarm')
const QRCode = require('qrcode')
const http = require('http')
// const b4a = require('b4a')
const { pipeline } = require('stream/promises')

const PORT = process.env.PORT || 3000

async function start () {
  const filePath = argv._[0]

  // verify file is there
  if (!fs.existsSync(filePath)) {
    console.error('no file found')
    process.exit(0)
  }

  const fileName = path.basename(filePath)
  const key = generateRandomKey()

  // pass file info to swarm server when we figure out streaming/replicating
  await startSwarmServer(key, filePath)
  await startQRCodeServer(key, fileName)

  // figuring out peer connection & streaming...
  testClient(key)
}

// connect to hyperswarm DHT
async function startSwarmServer (key, filePath) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
    fs.createReadStream(filePath).pipe(conn)
  })

  const discovery = swarm.join(key.buf, { server: true, client: false })
  await discovery.flushed()

  console.log(`listening for peer connections at ${key.str}`)

  // TODO: remove DHT entry on process exit
  // TODO: discovery.destroy
}

// Serve QR Code (default: http://localhost:3000)
async function startQRCodeServer (key, fileName) {
  // generate QR Code
  const qr = await QRCode.toDataURL(key.str)

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    const tpl = fs.readFileSync('index.html', { encoding: 'utf-8' })
    const index = tpl.replace(/{{fileName}}/g, fileName).replace(/{{qr}}/, qr)
    res.end(index)
  })

  server.listen(PORT)
  console.log(`serving qr code at ${PORT}`)
}

// testing...
async function testClient (key) {
  const swarm2 = new Hyperswarm()
  swarm2.on('connection', async (conn, info) => {
    console.log('swarm2 connected!')
    await pipeline(conn, fs.createWriteStream('./output.txt'))
    console.log('done!')
  })
  swarm2.join(key.buf, { server: false, client: true })
  await swarm2.flush() // Waits for the swarm to connect to pending peers.
  // TODO: discovery.destroy
}

// copied some methods from hyperbeam D:
// https://github.com/mafintosh/hyperbeam/blob/35269d8fe2b486843fd324881e71a4e9f2cc395b/index.js#L180-L186

function toBase32 (buf) {
  return b32.encode(buf).replace(/=/g, '').toLowerCase()
}

// function fromBase32 (str) {
//   return b4a.from(b32.decode.asBytes(str.toUpperCase()))
// }

function generateRandomKey () {
  const buf = crypto.randomBytes(32)
  const str = toBase32(buf) // get string representation
  return { buf, str }
}

start()
