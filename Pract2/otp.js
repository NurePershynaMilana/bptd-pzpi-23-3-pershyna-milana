// Бібліотека шифру «одноразовий блокнот» (XOR над байтами UTF-8)

'use strict';

const fs = require('fs');
const crypto = require('crypto');

// c_i = p_i XOR k_i, p_i = c_i XOR k_i
function xorBytes(data, key) {
  if (key.length < data.length) {
    throw new Error('Ключ коротший за повідомлення');
  }
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i];
  }
  return out;
}

function generatePad(size) {
  return crypto.randomBytes(size);
}

// Блокнот: файл випадкових байтів + позиція першого невикористаного байта.
// Використані байти затираються нулями у файлі, тому повторно взяти той самий ключ неможливо.
class Pad {
  constructor(path) {
    this.path = path;
    this.statePath = `${path}.state.json`;
    this.bytes = fs.readFileSync(path);
    this.offset = fs.existsSync(this.statePath)
      ? JSON.parse(fs.readFileSync(this.statePath, 'utf8')).offset
      : 0;
  }

  remaining() {
    return this.bytes.length - this.offset;
  }

  // для відправника: взяти наступні length байтів ключа
  take(length) {
    if (length > this.remaining()) {
      throw new Error(`Блокнот вичерпано: потрібно ${length} байт, залишилось ${this.remaining()}`);
    }
    const offset = this.offset;
    const key = Buffer.from(this.bytes.subarray(offset, offset + length));
    this.destroy(offset, length);
    return { offset, key };
  }

  // для одержувача: ключ за позицією з повідомлення
  read(offset, length) {
    if (offset < this.offset) {
      throw new Error(`Ключ з позиції ${offset} уже використано - повтор повідомлення відхилено`);
    }
    if (offset + length > this.bytes.length) {
      throw new Error('Позиція ключа виходить за межі блокнота');
    }
    const key = Buffer.from(this.bytes.subarray(offset, offset + length));
    this.destroy(offset, length);
    return key;
  }

  // «знищення аркуша»: затерти використані байти та зберегти нову позицію
  destroy(offset, length) {
    this.bytes.fill(0, offset, offset + length);
    const fd = fs.openSync(this.path, 'r+');
    fs.writeSync(fd, Buffer.alloc(length), 0, length, offset);
    fs.closeSync(fd);
    this.offset = offset + length;
    fs.writeFileSync(this.statePath, JSON.stringify({ offset: this.offset }));
  }
}

function encryptMessage(text, pad) {
  const data = Buffer.from(text, 'utf8');
  const { offset, key } = pad.take(data.length);
  const cipher = xorBytes(data, key);
  return { offset, length: data.length, cipher: cipher.toString('base64') };
}

function decryptMessage(packet, pad) {
  const cipher = Buffer.from(packet.cipher, 'base64');
  if (cipher.length !== packet.length) {
    throw new Error('Довжина шифротексту не збігається з заявленою');
  }
  const key = pad.read(packet.offset, packet.length);
  return xorBytes(cipher, key).toString('utf8');
}

module.exports = { xorBytes, generatePad, Pad, encryptMessage, decryptMessage };
