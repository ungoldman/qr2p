#!/usr/bin/env node

/*

prompt:

1. Basic QR Code Server implementation

Write a basic server for transferring a file between peers. The peer that runs the server should be able to display a QR code that a peer that wants the file can scan to download the file from the server peer. This is an approach we are using to transfer files between devices without using the internet.

first pass approach:

- get file from process.argv
- generate random key
- produce qr code from key
- add file to hyperdrive for replication
- register with hyperswarm DHT?
- serve qr code at address (localhost:3000 for now)

time limit: 1hr

*/

// 1

const fs = require('fs')
const Hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const argv = require('minimist')(process.argv.slice(2))
const path = require('path')
// const b4a = require('b4a')
const b32 = require('hi-base32')
const crypto = require('crypto')
const Hyperswarm = require('hyperswarm')
const QRCode = require('qrcode')
const http = require('http')

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

  // create drive and add file
  const drive = new Hyperdrive(ram, null) // create

  // trying to follow newer conventions from hypercore protocol walkthroughs
  await drive.promises.ready()

  const stream = fs.createReadStream(filePath).pipe(drive.createWriteStream(`/${fileName}`))
  // wait for stream to finish? my stream brain no longer works
  await new Promise(resolve => stream.on('finish', resolve))

  // pass file info to swarm server when we figure out streaming/replicating
  await startSwarmServer(key)
  await startQRCodeServer(key)

  // figuring out peer connection & streaming...
  testClient(key)
}

// connect to hyperswarm DHT
async function startSwarmServer (key) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (conn, info) => {
    // https://github.com/hyperswarm/hyperswarm#swarmonconnection-socket-peerinfo--
    // theoretically could just stream the file through conn? I think?
    // methods not documented
    // TODO: TODO: figure out how to:
    // (a) replicate hyperdrive in this context? (not 100% clear on how to achieve this in this context)
    // (b) stream directly via "an end-to-end (Noise) encrypted Duplex stream" (would need to find some docs for this, not familiar with methods)
    console.log(Object.keys(conn))
    conn.write('this is a server connection')
    conn.end()
  })

  const discovery = swarm.join(key.buf, { server: true, client: false })
  await discovery.flushed()

  console.log(`listening for peer connections at ${key.str}`)
}

// Serve QR Code (default: http:localhost:3000)
async function startQRCodeServer (key) {
  // generate QR Code
  const qr = await QRCode.toDataURL(key.str)

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<img src="${qr}">`)
  })

  server.listen(PORT)
  console.log(`serving qr code at ${PORT}`)
}

// testing...
async function testClient (key) {
  const swarm2 = new Hyperswarm()
  swarm2.on('connection', (conn, info) => {
    conn.on('data', data => console.log('client got message:', data.toString()))
  })
  swarm2.join(key.buf, { server: false, client: true })
  await swarm2.flush() // Waits for the swarm to connect to pending peers.
}

// copied some methods from hyperbeam D:

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
