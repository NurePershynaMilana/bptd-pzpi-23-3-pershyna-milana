// Функції шифрування клієнта (JavaScript + вбудований у браузер Web Crypto API)

'use strict';

const RsaClient = (() => {
  const HASH_LEN = { 'SHA-256': 32, 'SHA-1': 20 };
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  function derToPem(der) {
    const lines = toBase64(der).match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
  }

  function pemToDer(pem) {
    return fromBase64(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  }

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // (1) формування ключів: власна пара ключів клієнта + відкритий ключ сервера
  async function generateClientKeys(bits, hash) {
    const pair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash },
      true,
      ['encrypt', 'decrypt'],
    );
    const der = await crypto.subtle.exportKey('spki', pair.publicKey);
    return { ...pair, bits, hash, pem: derToPem(der), fingerprint: (await sha256Hex(der)).slice(0, 32) };
  }

  async function fetchServerKey(hash) {
    const res = await fetch('/api/public-key');
    if (!res.ok) throw new Error('Сервер не повернув відкритий ключ');
    const info = await res.json();
    const der = pemToDer(info.publicKey);
    const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash }, false, ['encrypt']);
    const fingerprint = (await sha256Hex(der)).slice(0, 32);
    if (fingerprint !== info.fingerprint) throw new Error('Відбиток ключа не збігається');
    return { ...info, key, hash };
  }

  // шифрування блоками: для OAEP максимум k - 2*hLen - 2 байтів на блок
  async function encryptChunks(publicKey, keyBits, hash, bytes) {
    const size = keyBits / 8 - 2 * HASH_LEN[hash] - 2;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += size) {
      const c = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, bytes.slice(i, i + size));
      chunks.push(toBase64(c));
    }
    return chunks;
  }

  async function decryptChunks(privateKey, chunks) {
    const parts = [];
    for (const c of chunks) {
      parts.push(new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromBase64(c))));
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
  }

  // (2) відправлення даних та отримання відповіді
  async function sendLogin(server, client, login, password, onTraffic) {
    const request = {
      login,
      password,
      nonce: toBase64(crypto.getRandomValues(new Uint8Array(16))),
      timestamp: Date.now(),
    };
    const payload = await encryptChunks(server.key, server.keySize, server.hash, enc.encode(JSON.stringify(request)));
    const body = { clientPublicKey: client.pem, payload };
    onTraffic('→ сервер', body);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const answer = await res.json();
    onTraffic('← сервер', answer);
    if (!res.ok) throw new Error(answer.error || 'Помилка сервера');

    const response = JSON.parse(dec.decode(await decryptChunks(client.privateKey, answer.payload)));
    if (response.nonce !== request.nonce) throw new Error('Відповідь не відповідає запиту (nonce не збігається)');
    return { request, payload, response, encryptedResponse: answer.payload };
  }

  return { generateClientKeys, fetchServerKey, sendLogin };
})();
