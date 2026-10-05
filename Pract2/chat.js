// Спільна логіка обміну повідомленнями для server.js та client.js
// Протокол: один JSON-пакет на рядок { offset, length, cipher }

'use strict';

const readline = require('readline');
const { encryptMessage, decryptMessage } = require('./otp');

function startChat(socket, { me, peer, sendPad, recvPad }) {
  socket.setEncoding('utf8');

  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.trim()) handlePacket(line);
    }
  });

  function handlePacket(line) {
    console.log(`\n[мережа] отримано пакет: ${line}`);
    try {
      const text = decryptMessage(JSON.parse(line), recvPad);
      console.log(`[${peer}] ${text}`);
    } catch (err) {
      console.log(`[помилка] ${err.message}`);
    }
  }

  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (text) => {
    if (!text.trim()) return;
    try {
      const packet = encryptMessage(text, sendPad);
      socket.write(JSON.stringify(packet) + '\n');
      console.log(`[${me}] ${text}`);
      console.log(`[мережа] надіслано: позиція ключа ${packet.offset}, ${packet.length} байт, ` +
        `шифротекст ${Buffer.from(packet.cipher, 'base64').toString('hex')}`);
      console.log(`         залишок блокнота: ${sendPad.remaining()} байт`);
    } catch (err) {
      console.log(`[помилка] ${err.message}`);
    }
  });

  return rl;
}

module.exports = { startChat };
