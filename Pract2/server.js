// Додаток 1 - Боб (сервер). Запуск: node server.js [порт]

'use strict';

const net = require('net');
const path = require('path');
const { Pad } = require('./otp');
const { startChat } = require('./chat');

const port = Number(process.argv[2]) || 5000;
const keysDir = path.join(__dirname, 'keys', 'bob');

const server = net.createServer((socket) => {
  console.log(`Підключився співрозмовник ${socket.remoteAddress}:${socket.remotePort}`);
  startChat(socket, {
    me: 'Боб',
    peer: 'Аліса',
    sendPad: new Pad(path.join(keysDir, 'bob-to-alice.bin')),
    recvPad: new Pad(path.join(keysDir, 'alice-to-bob.bin')),
  });
  socket.on('close', () => console.log('Співрозмовник відключився'));
  socket.on('error', (err) => console.log(`[помилка мережі] ${err.message}`));
});

server.listen(port, () => console.log(`Боб очікує підключення на порту ${port}...`));
