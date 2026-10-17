// Інтерфейс програми DES: обробка подій, вивід результатів, графік ентропії

'use strict';
const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
let last = null;

// ===== Вкладки =====
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === b.dataset.tab));
}));

// ===== Читання полів =====
function readKey() {
  const v = $('key').value;
  if ($('keyFormat').value === 'hex') {
    const bytes = DES.hexToBytes(v);
    if (bytes.length !== 8) throw new Error('HEX-ключ має містити 16 шістнадцяткових цифр');
    return bytes;
  }
  const bytes = enc.encode(v);
  if (bytes.length !== 8 || /[^\x00-\x7f]/.test(v)) throw new Error('Текстовий ключ має містити рівно 8 символів ASCII');
  return bytes;
}

function readInput(decrypt) {
  const v = $('input').value;
  if (decrypt || $('inFormat').value === 'hex') return DES.hexToBytes(v);
  return enc.encode(v);
}

const readIv = () => DES.hexToBytes($('iv').value);
const randomHex = () => DES.bytesToHex(crypto.getRandomValues(new Uint8Array(8)));

function showMessage(text, kind) {
  $('message').innerHTML = text ? `<span class="badge ${kind}">${text}</span>` : '';
}

// ===== Статус ключа =====
function updateKeyStatus() {
  try {
    const r = DES.checkKey(readKey());
    const kind = r.level === 'ok' ? 'ok' : r.level === 'possibly-weak' ? 'warn' : 'bad';
    $('keyStatus').innerHTML = `<span class="badge ${kind}">${r.message}</span>` +
      (r.parityOk ? '' : ' <span class="badge warn">Біти парності не відповідають стандарту (вони не впливають на шифрування)</span>');
    return r;
  } catch (e) {
    $('keyStatus').innerHTML = `<span class="badge bad">${e.message}</span>`;
    return null;
  }
}

// ===== Шифрування / розшифрування =====
function process(decrypt) {
  try {
    const key = readKey();
    const status = DES.checkKey(key);
    if (status.level === 'weak' || status.level === 'semi-weak') {
      throw new Error(`${status.message}. Оберіть інший ключ`);
    }
    const mode = $('mode').value;
    const data = readInput(decrypt);
    const result = DES.run(data, key, { decrypt, mode, iv: mode === 'CBC' ? readIv() : null });
    last = { decrypt, result, key };

    $('outHex').textContent = DES.bytesToHex(result.bytes).replace(/(.{16})/g, '$1 ').trim();
    let asText;
    try { asText = dec.decode(result.bytes); } catch { asText = '(не є коректним текстом UTF-8)'; }
    $('outText').textContent = asText;
    const st = result.stages;
    $('stBlocks').textContent = result.traces.length;
    $('stInH').textContent = st[0].h.toFixed(4);
    $('stOutH').textContent = st[st.length - 1].h.toFixed(4);
    showMessage(decrypt ? 'Розшифровано успішно' : `Зашифровано: ${data.length} байт → ${result.bytes.length} байт`, 'ok');
    renderEntropy();
    renderRounds();
  } catch (e) {
    ['outHex', 'outText', 'stBlocks', 'stInH', 'stOutH'].forEach((id) => { $(id).textContent = '-'; });
    showMessage(e.message, 'bad');
  }
}

$('encrypt').onclick = () => process(false);
$('decrypt').onclick = () => process(true);
$('swap').onclick = () => {
  if (!last) return;
  $('input').value = DES.bytesToHex(last.result.bytes);
  $('inFormat').value = 'hex';
};
$('genKey').onclick = () => { $('keyFormat').value = 'hex'; $('key').value = DES.bytesToHex(DES.fixParity(DES.hexToBytes(randomHex()))); updateKeyStatus(); };
$('genIv').onclick = () => { $('iv').value = randomHex(); };
$('key').oninput = updateKeyStatus;
$('keyFormat').onchange = updateKeyStatus;
$('testVector').onclick = () => {
  $('inFormat').value = 'hex'; $('input').value = '0123456789ABCDEF';
  $('keyFormat').value = 'hex'; $('key').value = '133457799BBCDFF1';
  $('mode').value = 'ECB';
  updateKeyStatus();
  process(false);
  const first = DES.bytesToHex(last.result.bytes).slice(0, 16);
  showMessage(`Перший блок: ${first}, еталон 85E813540F0AB405 - ${first === '85E813540F0AB405' ? 'збігається' : 'НЕ збігається'}`,
    first === '85E813540F0AB405' ? 'ok' : 'bad');
};

// ===== Ентропія =====
function stagesForScope() {
  const v = $('entropyScope').value;
  return v === 'all' ? last.result.stages : last.result.traces[Number(v)].stages;
}

function renderEntropy() {
  const sel = $('entropyScope');
  const prev = sel.value;
  sel.innerHTML = `<option value="all">Усе повідомлення (${last.result.traces.length} блоків)</option>` +
    last.result.traces.map((_, i) => `<option value="${i}">Блок ${i + 1}</option>`).join('');
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  drawEntropy();
}

function drawEntropy() {
  const stages = stagesForScope();
  $('entropyTable').innerHTML = '<tr><th>Етап</th><th>Одиниць / біт</th><th>p(1)</th><th>Ентропія H, біт</th><th></th></tr>' +
    stages.map((s) => `<tr><td>${s.name}</td><td class="mono">${s.ones} / ${s.total}</td><td class="mono">${s.p.toFixed(4)}</td>` +
      `<td class="mono">${s.h.toFixed(4)}</td><td><div class="bar"><i style="width:${(s.h * 100).toFixed(1)}%"></i></div></td></tr>`).join('');

  const W = 1080, H = 230, pl = 40, pr = 12, pt = 12, pb = 40;
  const x = (i) => pl + (i * (W - pl - pr)) / (stages.length - 1);
  const minY = Math.min(0.8, ...stages.map((s) => s.h));
  const y = (h) => pt + (1 - (h - minY) / (1 - minY)) * (H - pt - pb);
  const pts = stages.map((s, i) => `${x(i).toFixed(1)},${y(s.h).toFixed(1)}`).join(' ');
  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = minY + (k * (1 - minY)) / 4;
    grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e7ef"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`;
  }
  const labels = stages.map((s, i) => {
    const t = s.name.replace('Раунд ', 'R').replace('Вхідний блок', 'Вхід').replace('Після ', '');
    return `<text x="${x(i)}" y="${H - pb + 16}" text-anchor="middle">${t}</text>`;
  }).join('');
  const dots = stages.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.h)}" r="3.5" fill="#2f5bea"><title>${s.name}: ${s.h.toFixed(4)}</title></circle>`).join('');
  $('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Графік ентропії">` +
    `${grid}<polyline points="${pts}" fill="none" stroke="#2f5bea" stroke-width="2"/>${dots}${labels}` +
    `<text x="${pl}" y="${H - 4}">етапи шифрування</text></svg>`;
}
$('entropyScope').onchange = drawEntropy;

// ===== Раунди =====
function renderRounds() {
  const sel = $('roundBlock');
  sel.innerHTML = last.result.traces.map((_, i) => `<option value="${i}">Блок ${i + 1}</option>`).join('');
  drawRounds();

  const sk = DES.generateSubkeys(last.key);
  $('subkeyHead').innerHTML = `C₀ = <span class="mono">${DES.bitsToHex(sk.C0.concat([0, 0, 0, 0])).slice(0, 7)}</span>, ` +
    `D₀ = <span class="mono">${DES.bitsToHex(sk.D0.concat([0, 0, 0, 0])).slice(0, 7)}</span> (28 біт кожен, після перестановки PC-1)`;
  $('subkeyTable').innerHTML = '<tr><th>i</th><th>Зсув</th><th>Cᵢ</th><th>Dᵢ</th><th>kᵢ (48 біт, HEX)</th></tr>' +
    sk.rounds.map((r, i) => `<tr><td>${i + 1}</td><td>${[1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1][i]}</td>` +
      `<td class="mono">${r.C.join('')}</td><td class="mono">${r.D.join('')}</td><td class="mono">${DES.bitsToHex(r.K)}</td></tr>`).join('');
}

function drawRounds() {
  const t = last.result.traces[Number($('roundBlock').value) || 0];
  const hx = DES.bitsToHex;
  $('roundHead').innerHTML = `${last.decrypt ? 'Розшифрування' : 'Шифрування'} · вхід <span class="mono">${hx(t.input)}</span> · ` +
    `після IP <span class="mono">${hx(t.ip)}</span> · після IP⁻¹ <span class="mono">${hx(t.output)}</span>`;
  $('roundTable').innerHTML = '<tr><th>Раунд</th><th>kᵢ</th><th>E(R)</th><th>E(R) ⊕ kᵢ</th><th>S-блоки</th><th>f = P(S)</th><th>Lᵢ</th><th>Rᵢ</th><th>H</th></tr>' +
    t.rounds.map((r) => `<tr><td>${r.round}</td><td class="mono">${hx(r.K)}</td><td class="mono">${hx(r.f.expanded)}</td>` +
      `<td class="mono">${hx(r.f.mixed)}</td><td class="mono">${hx(r.f.sOut)}</td><td class="mono">${hx(r.f.out)}</td>` +
      `<td class="mono">${hx(r.L)}</td><td class="mono">${hx(r.R)}</td><td class="mono">${r.entropy.h.toFixed(3)}</td></tr>`).join('');
}
$('roundBlock').onchange = drawRounds;

// ===== Слабкі ключі =====
function checkCustom() {
  try {
    const key = DES.hexToBytes($('checkHex').value);
    if (key.length !== 8) throw new Error('Ключ має містити 16 шістнадцяткових цифр');
    const r = DES.checkKey(key);
    const kind = r.level === 'ok' ? 'ok' : r.level === 'possibly-weak' ? 'warn' : 'bad';
    $('checkResult').innerHTML = `<span class="badge ${kind}">${r.message}</span>`;

    const pt = enc.encode('WEAK KEY');
    const sk1 = DES.generateSubkeys(key).subkeys;
    const sk2 = r.partner ? DES.generateSubkeys(DES.hexToBytes(r.partner)).subkeys : sk1;
    const c1 = DES.processBlock(pt, sk1, false).output;
    const c2 = DES.processBlock(c1, sk2, false).output;
    $('doubleResult').textContent =
      `Відкритий текст:          ${DES.bytesToHex(pt)} («WEAK KEY»)\n` +
      `Шифрування ключем:        ${DES.bytesToHex(c1)}\n` +
      `Ще раз шифрування ${r.partner ? 'парним' : 'тим самим'} ключем: ${DES.bytesToHex(c2)}` +
      (DES.bytesToHex(c2) === DES.bytesToHex(pt) ? '  ← відкритий текст повернувся!' : '');
  } catch (e) {
    $('checkResult').innerHTML = `<span class="badge bad">${e.message}</span>`;
  }
}
$('checkBtn').onclick = checkCustom;

$('weakTable').innerHTML = '<tr><th>Ключ</th><th>Тип</th><th></th></tr>' +
  DES.WEAK_KEYS.map((k) => `<tr><td class="mono">${k}</td><td>слабкий</td><td><button class="btn small" data-k="${k}">Перевірити</button></td></tr>`).join('') +
  DES.SEMI_WEAK_PAIRS.flat().map((k) => `<tr><td class="mono">${k}</td><td>напівслабкий</td><td><button class="btn small" data-k="${k}">Перевірити</button></td></tr>`).join('');
$('weakTable').addEventListener('click', (e) => {
  const k = e.target.dataset.k;
  if (k) { $('checkHex').value = k; checkCustom(); }
});

updateKeyStatus();
process(false);
checkCustom();
