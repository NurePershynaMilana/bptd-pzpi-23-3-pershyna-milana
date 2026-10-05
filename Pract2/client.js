// Додаток 2 - Аліса (клієнт). Запуск: node client.js [хост] [порт]

'use strict';

const net = require('net');
const path = require('path');
const { Pad } = require('./otp');
const { startChat } = require('./chat');

const host = process.argv[2] || '127.0.0.1';
const port = Number(process.argv[3]) || 5000;
const keysDir = path.join(__dirname, 'keys', 'alice');

const socket = net.connect(port, host, () => {
  console.log(`Аліса підключилась до ${host}:${port}`);
  const rl = startChat(socket, {
    me: 'Аліса',
    peer: 'Боб',
    sendPad: new Pad(path.join(keysDir, 'alice-to-bob.bin')),
    recvPad: new Pad(path.join(keysDir, 'bob-to-alice.bin')),
  });
  rl.on('close', () => setTimeout(() => socket.end(), 1500));
});

socket.on('close', () => console.log('З\'єднання закрито'));
socket.on('error', (err) => console.log(`[помилка мережі] ${err.message}`));
