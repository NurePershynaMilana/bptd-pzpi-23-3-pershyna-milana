// Генерація двох однакових комплектів блокнотів для Аліси та Боба
// Запуск: node keygen.js [розмір_у_байтах]

'use strict';

const fs = require('fs');
const path = require('path');
const { generatePad } = require('./otp');

const size = Number(process.argv[2]) || 4096;

// окремий блокнот для кожного напрямку, щоб сторони ніколи не взяли той самий ключ
const pads = {
  'alice-to-bob.bin': generatePad(size),
  'bob-to-alice.bin': generatePad(size),
};

for (const owner of ['alice', 'bob']) {
  const dir = path.join(__dirname, 'keys', owner);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, bytes] of Object.entries(pads)) {
    fs.writeFileSync(path.join(dir, name), bytes);
  }
}

console.log(`Створено блокноти по ${size} байт: keys/alice та keys/bob (однакові копії)`);
console.log('Перші 16 байт alice-to-bob:', pads['alice-to-bob.bin'].subarray(0, 16).toString('hex'));
