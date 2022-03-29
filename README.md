# qr2p

prompt:

1. Basic QR Code Server implementation

> Write a basic server for transferring a file between peers. The peer that runs the server should be able to display a QR code that a peer that wants the file can scan to download the file from the server peer. This is an approach we are using to transfer files between devices without using the internet.

First pass:

- [x] get file from process.argv
- [x] generate random key
- [x] produce qr code from key
- [x] add file to hyperdrive for replication
- [x] register with hyperswarm DHT?
- [x] serve qr code at address (localhost:3000 for now)
- [ ] figure out how to actually transfer the file X_X

Time limit: 1hr

## Install

```
npm i
```

## Start

```
npm start
```

Defaults to starting a server and waiting to share `test.txt` (`$ ./index.js test.txt`).

## Test

(just `standard` for now)

```
npm test
```
