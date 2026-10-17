// Інтерфейс клієнта: обробка дій користувача та виведення результатів

'use strict';

const $ = (id) => document.getElementById(id);
let server = null;
let client = null;

function badge(el, text, kind) {
  el.innerHTML = text ? `<span class="badge ${kind}">${text}</span>` : '';
}

function fill(el, rows) {
  el.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function showTraffic(direction, obj) {
  const shown = JSON.parse(JSON.stringify(obj));
  if (shown.clientPublicKey) shown.clientPublicKey = shown.clientPublicKey.slice(0, 90) + '...';
  const box = $('traffic');
  if (direction.startsWith('→')) box.innerHTML = '';
  box.insertAdjacentHTML('beforeend',
    `<div class="packet"><h4>${direction}</h4><pre>${escapeHtml(JSON.stringify(shown, null, 2))}</pre></div>`);
}

// крок 1: ключі
$('prepareKeys').onclick = async () => {
  const hash = $('oaepHash').value;
  const bits = Number($('keySize').value);
  $('send').disabled = true;
  badge($('keyStatus'), `Генерація ключа ${bits} біт...`, 'info');
  try {
    server = await RsaClient.fetchServerKey(hash);
    fill($('serverKey'), [
      ['Розмір', `${server.keySize} біт`],
      ['Доповнення', server.padding],
      ['Відбиток', server.fingerprint],
    ]);
    client = await RsaClient.generateClientKeys(bits, hash);
    fill($('clientKey'), [
      ['Розмір', `${client.bits} біт`],
      ['Доповнення', `RSA-OAEP, ${hash}`],
      ['Відбиток', client.fingerprint],
    ]);
    badge($('keyStatus'), 'Ключі готові. Закритий ключ клієнта не залишає браузер', 'ok');
    $('send').disabled = false;
  } catch (e) {
    badge($('keyStatus'), e.message, 'bad');
  }
};

// крок 2: вхід
$('send').onclick = async () => {
  badge($('result'), 'Надсилання...', 'info');
  $('response').innerHTML = '';
  try {
    const r = await RsaClient.sendLogin(server, client, $('login').value, $('password').value, showTraffic);
    badge($('result'), r.response.message, r.response.ok ? 'ok' : 'bad');
    fill($('response'), [
      ['Розшифрована відповідь', ''],
      ['ok', String(r.response.ok)],
      ['message', r.response.message],
      ['serverTime', r.response.serverTime],
      ['sessionToken', r.response.sessionToken || '-'],
      ['nonce', `${r.response.nonce} (збігається з запитом)`],
    ]);
  } catch (e) {
    badge($('result'), e.message, 'bad');
  }
};

$('showPassword').onclick = () => {
  const p = $('password');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('showPassword').textContent = p.type === 'password' ? 'Показати пароль' : 'Сховати пароль';
};
