// Програмна реалізація алгоритму DES без сторонніх бібліотек

(function (root) {
  'use strict';

  // ===== Таблиці алгоритму =====

  const IP = [
    58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
  ];

  const IP_INV = [
    40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25,
  ];

  const E = [
    32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
    8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
  ];

  const P = [
    16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
    2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
  ];

  // S1, рядок 0, стовпець 5 = 15 (у методичці помилково 5)
  const S = [
    [
      [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
      [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
      [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
      [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    ],
    [
      [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
      [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
      [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
      [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    ],
    [
      [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
      [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
      [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
      [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    ],
    [
      [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
      [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
      [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
      [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    ],
    [
      [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
      [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
      [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
      [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    ],
    [
      [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
      [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
      [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
      [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    ],
    [
      [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
      [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
      [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
      [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    ],
    [
      [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
      [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
      [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
      [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
    ],
  ];

  const PC1 = [
    57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
    10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
    63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
    14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
  ];

  const PC2 = [
    14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
    23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
    41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
    44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
  ];

  const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

  // ===== Робота з бітами =====

  function bytesToBits(bytes) {
    const bits = [];
    for (const byte of bytes) {
      for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
    }
    return bits;
  }

  function bitsToBytes(bits) {
    const bytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bytes.length; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      bytes[i] = b;
    }
    return bytes;
  }

  const permute = (bits, table) => table.map((pos) => bits[pos - 1]);
  const xor = (a, b) => a.map((bit, i) => bit ^ b[i]);
  const rotateLeft = (bits, n) => bits.slice(n).concat(bits.slice(0, n));

  function bitsToHex(bits) {
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      hex += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16);
    }
    return hex.toUpperCase();
  }

  const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  function hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
      throw new Error('Некоректний шістнадцятковий рядок');
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    return bytes;
  }

  // ===== Ентропія =====

  // H = -p·log2(p) - (1-p)·log2(1-p), p - частка одиничних бітів
  function entropy(bits) {
    const ones = bits.reduce((s, b) => s + b, 0);
    const p = ones / bits.length;
    const h = p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    return { ones, total: bits.length, p, h };
  }

  // ===== Генерація раундових ключів =====

  function generateSubkeys(keyBytes) {
    if (keyBytes.length !== 8) throw new Error('Ключ має містити рівно 8 байтів (64 біти)');
    const keyBits = bytesToBits(keyBytes);
    const cd = permute(keyBits, PC1);
    let C = cd.slice(0, 28);
    let D = cd.slice(28);
    const C0 = C;
    const D0 = D;
    const rounds = [];
    for (let i = 0; i < 16; i++) {
      C = rotateLeft(C, SHIFTS[i]);
      D = rotateLeft(D, SHIFTS[i]);
      rounds.push({ C, D, K: permute(C.concat(D), PC2) });
    }
    return { C0, D0, rounds, subkeys: rounds.map((r) => r.K) };
  }

  // ===== Функція шифрування f =====

  function f(R, K) {
    const expanded = permute(R, E); // 32 -> 48 біт
    const mixed = xor(expanded, K);
    const sOut = [];
    for (let j = 0; j < 8; j++) {
      const B = mixed.slice(j * 6, j * 6 + 6);
      const row = (B[0] << 1) | B[5];
      const col = (B[1] << 3) | (B[2] << 2) | (B[3] << 1) | B[4];
      const v = S[j][row][col];
      sOut.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1); // 6 -> 4 біти
    }
    const out = permute(sOut, P);
    return { expanded, mixed, sOut, out };
  }

  // ===== Обробка одного 64-бітного блоку =====

  function processBlock(blockBytes, subkeys, decrypt) {
    const input = bytesToBits(blockBytes);
    const ip = permute(input, IP);
    let L = ip.slice(0, 32);
    let R = ip.slice(32);
    const rounds = [];
    for (let i = 0; i < 16; i++) {
      const K = decrypt ? subkeys[15 - i] : subkeys[i];
      const fr = f(R, K);
      const newR = xor(L, fr.out);
      L = R;
      R = newR;
      rounds.push({ round: i + 1, K, f: fr, L, R, entropy: entropy(L.concat(R)) });
    }
    const preOutput = R.concat(L); // після 16-го раунду половини міняються місцями
    const output = permute(preOutput, IP_INV);
    return {
      output: bitsToBytes(output),
      trace: {
        input,
        ip,
        rounds,
        preOutput,
        output,
        stages: [
          { name: 'Вхідний блок', ...entropy(input) },
          { name: 'Після IP', ...entropy(ip) },
          ...rounds.map((r) => ({ name: `Раунд ${r.round}`, ...r.entropy })),
          { name: 'Після IP⁻¹', ...entropy(output) },
        ],
      },
    };
  }

  // ===== Доповнення PKCS#7 =====

  function pad(bytes) {
    const n = 8 - (bytes.length % 8);
    const out = new Uint8Array(bytes.length + n);
    out.set(bytes);
    out.fill(n, bytes.length);
    return out;
  }

  function unpad(bytes) {
    const n = bytes[bytes.length - 1];
    if (!bytes.length || n < 1 || n > 8 || bytes.slice(-n).some((b) => b !== n)) {
      throw new Error('Некоректне доповнення - неправильний ключ, IV або пошкоджений шифротекст');
    }
    return bytes.slice(0, bytes.length - n);
  }

  // ===== Шифрування та розшифрування повідомлення (ECB або CBC) =====

  function run(dataBytes, keyBytes, { decrypt = false, mode = 'ECB', iv = null } = {}) {
    const { subkeys } = generateSubkeys(keyBytes);
    if (mode === 'CBC' && (!iv || iv.length !== 8)) throw new Error('Для режиму CBC потрібен IV довжиною 8 байтів');
    const data = decrypt ? dataBytes : pad(dataBytes);
    if (data.length === 0 || data.length % 8 !== 0) throw new Error('Довжина шифротексту має бути кратною 8 байтам');

    const out = new Uint8Array(data.length);
    const traces = [];
    let prev = iv;
    for (let i = 0; i < data.length; i += 8) {
      let block = data.slice(i, i + 8);
      if (mode === 'CBC' && !decrypt) block = block.map((b, j) => b ^ prev[j]);
      const { output, trace } = processBlock(block, subkeys, decrypt);
      let result = output;
      if (mode === 'CBC' && decrypt) result = output.map((b, j) => b ^ prev[j]);
      if (mode === 'CBC') prev = decrypt ? data.slice(i, i + 8) : output;
      out.set(result, i);
      traces.push(trace);
    }

    // ентропія на кожному етапі для всього повідомлення (усі блоки разом)
    const stages = traces[0].stages.map((s, idx) => {
      const ones = traces.reduce((sum, t) => sum + t.stages[idx].ones, 0);
      const total = traces.length * 64;
      const p = ones / total;
      const h = p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
      return { name: s.name, ones, total, p, h };
    });

    return { bytes: decrypt ? unpad(out) : out, traces, stages };
  }

  // ===== Перевірка слабких ключів =====

  const WEAK_KEYS = ['0101010101010101', 'FEFEFEFEFEFEFEFE', 'E0E0E0E0F1F1F1F1', '1F1F1F1F0E0E0E0E'];
  const SEMI_WEAK_PAIRS = [
    ['01FE01FE01FE01FE', 'FE01FE01FE01FE01'],
    ['1FE01FE00EF10EF1', 'E01FE01FF10EF10E'],
    ['01E001E001F101F1', 'E001E001F101F101'],
    ['1FFE1FFE0EFE0EFE', 'FE1FFE1FFE0EFE0E'],
    ['011F011F010E010E', '1F011F010E010E01'],
    ['E0FEE0FEF1FEF1FE', 'FEE0FEE0FEF1FEF1'],
  ];

  // біти парності (молодший біт кожного байта) в алгоритмі не використовуються
  const stripParity = (bytes) => bytesToHex(bytes.map((b) => b & 0xfe));

  function checkKey(keyBytes) {
    const key = stripParity(keyBytes);
    const sameAs = (hex) => stripParity(hexToBytes(hex)) === key;
    const { subkeys } = generateSubkeys(keyBytes);
    const distinct = new Set(subkeys.map(bitsToHex)).size;
    const parityOk = Array.from(keyBytes).every((b) => b.toString(2).split('1').length % 2 === 0);

    let level = 'ok';
    let message = `Ключ надійний: ${distinct} різних раундових ключів з 16`;
    let partner = null;

    if (WEAK_KEYS.some(sameAs) || distinct === 1) {
      level = 'weak';
      message = 'Слабкий ключ: усі 16 раундових ключів однакові, повторне шифрування повертає відкритий текст';
    } else {
      const pair = SEMI_WEAK_PAIRS.find((p) => p.some(sameAs));
      if (pair || distinct === 2) {
        level = 'semi-weak';
        partner = pair ? pair.find((k) => !sameAs(k)) : null;
        message = 'Напівслабкий ключ: лише 2 різні раундові ключі' +
          (partner ? `, шифрування ключем ${partner} розшифровує текст` : '');
      } else if (distinct === 4) {
        level = 'possibly-weak';
        message = 'Можливо слабкий ключ: лише 4 різні раундові ключі';
      }
    }
    return { level, message, distinct, parityOk, partner };
  }

  // встановлює біти парності так, щоб кожен байт мав непарну кількість одиниць
  function fixParity(keyBytes) {
    return keyBytes.map((b) => {
      const high = b & 0xfe;
      const ones = high.toString(2).split('1').length - 1;
      return ones % 2 === 0 ? high | 1 : high;
    });
  }

  const api = {
    run, processBlock, generateSubkeys, f, entropy, checkKey, fixParity,
    bytesToBits, bitsToBytes, bitsToHex, bytesToHex, hexToBytes, pad, unpad,
    WEAK_KEYS, SEMI_WEAK_PAIRS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DES = api;
})(typeof window !== 'undefined' ? window : globalThis);
