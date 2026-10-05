// Демонстрація властивостей шифру без мережі. Запуск: node demo.js

'use strict';

const { xorBytes, generatePad } = require('./otp');

const hex = (b) => b.toString('hex');

console.log('1) Шифрування та розшифрування XOR');
const text = 'Зустріч о 18:00, під\'їзд №2';
const data = Buffer.from(text, 'utf8');
const key = generatePad(data.length);
const cipher = xorBytes(data, key);
console.log('   Текст:        ', text);
console.log('   Байти UTF-8:  ', hex(data));
console.log('   Ключ:         ', hex(key));
console.log('   Шифротекст:   ', hex(cipher));
console.log('   Розшифровано: ', xorBytes(cipher, key).toString('utf8'));

console.log('\n2) Чому ключ не можна повторювати (помилка з ПЗ №1: короткий ключ повторюється циклічно)');
const p1 = Buffer.from('НАПАД НА СВІТАНКУ', 'utf8');
const p2 = Buffer.from('ВІДСТУП О ПІВНОЧІ', 'utf8');
const shared = generatePad(Math.max(p1.length, p2.length));
const c1 = xorBytes(p1, shared);
const c2 = xorBytes(p2, shared);
const leak = xorBytes(c1, c2);
console.log('   c1 XOR c2 == p1 XOR p2:', hex(leak) === hex(xorBytes(p1, p2)) ? 'ТАК (ключ зник)' : 'НІ');
console.log('   Зловмисник знає p1 => p2 =', xorBytes(leak, p1).toString('utf8'));

console.log('\n3) Ключ коротший за повідомлення');
try {
  xorBytes(Buffer.from('довге повідомлення'), generatePad(4));
} catch (err) {
  console.log('   Помилка:', err.message);
}

console.log('\n4) Перебір ключів не допомагає: для будь-якого тексту такої ж довжини існує ключ');
const fake = Buffer.alloc(cipher.length, ' ');
fake.write('Зустрічі не буде', 'utf8');
const fakeKey = xorBytes(cipher, fake);
console.log('   Підібраний ключ:', hex(fakeKey));
console.log('   «Розшифровано»: ', xorBytes(cipher, fakeKey).toString('utf8').trim());
console.log('   Обидва тексти однаково ймовірні, тому визначити справжній неможливо');
