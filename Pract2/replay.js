// Повторна відправка перехопленого пакета (перевірка захисту від повторного використання ключа)
// Запуск: node replay.js [порт] - пакет береться з файлу captured.txt

'use strict';

const fs = require('fs');
const net = require('net');

const port = Number(process.argv[2]) || 5000;
const packet = fs.readFileSync('captured.txt', 'utf8').trim();

const socket = net.connect(port, '127.0.0.1', () => {
  socket.write(packet + '\n');
  console.log('Перехоплений пакет повторно надіслано:', packet);
  setTimeout(() => socket.end(), 500);
});
socket.on('error', (err) => console.log(`[помилка мережі] ${err.message}`));