'use strict';

const ALPHABET = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ';
const N = ALPHABET.length;

function letterIndex(ch) {
  return ALPHABET.indexOf(ch.toUpperCase());
}

function letterAt(index, originalChar) {
  const letter = ALPHABET[((index % N) + N) % N];
  return originalChar === originalChar.toUpperCase() ? letter : letter.toLowerCase();
}

// ===== Шифр Цезаря (завдання 1) =====

// y = (x + k) mod n
function caesarEncrypt(text, key) {
  return [...text]
    .map((ch) => {
      const x = letterIndex(ch);
      return x < 0 ? ch : letterAt(x + key, ch);
    })
    .join('');
}

// x = (y + n - (k mod n)) mod n
function caesarDecrypt(text, key) {
  return caesarEncrypt(text, N - (key % N));
}

// ===== Шифр Віженера (завдання 2, 3) =====

// ключ зсувається лише на літерах, інші символи не змінюються
function vigenere(text, key, direction, keyOffset = 0) {
  const keyIdx = [...key].map(letterIndex);
  let j = keyOffset;
  return [...text]
    .map((ch) => {
      const x = letterIndex(ch);
      if (x < 0) return ch;
      const k = keyIdx[j++ % keyIdx.length];
      return letterAt(x + direction * k, ch);
    })
    .join('');
}

const vigenereEncrypt = (text, key, offset = 0) => vigenere(text, key, +1, offset);
const vigenereDecrypt = (text, key, offset = 0) => vigenere(text, key, -1, offset);

const countLetters = (s) => [...s].filter((ch) => letterIndex(ch) >= 0).length;

// k_i = (c_i - p_i) mod n
function keyStream(cipherText, plainText) {
  const c = [...cipherText].filter((ch) => letterIndex(ch) >= 0);
  const p = [...plainText].filter((ch) => letterIndex(ch) >= 0);
  return p.map((ch, i) => ALPHABET[(letterIndex(c[i]) - letterIndex(ch) + N) % N]).join('');
}

// відновлення ключа за відомим початком тексту (найменший період гами)
function recoverVigenereKey(cipherText, knownPlainStart) {
  const stream = keyStream(cipherText, knownPlainStart);
  for (let period = 1; period <= stream.length; period++) {
    const candidate = stream.slice(0, period);
    if ([...stream].every((ch, i) => ch === candidate[i % period])) {
      return { stream, key: candidate };
    }
  }
  return { stream, key: stream };
}

// ===== Одноразовий блокнот (завдання 4, 5, 6) =====

// таблиця стиснення; цифра d кодується як «08d» (код 08 у таблиці вільний)
const CHECKERBOARD_ROWS = [
  { prefix: '', letters: 'АИТЕСНО' },
  { prefix: '8', letters: 'БВГҐДЄЖЗІЇ' },
  { prefix: '9', letters: 'ЙКЛМПРУФХЦ' },
  { prefix: '0', letters: 'ЧШЩЬЮЯ ' },
];
const DIGIT_ESCAPE = '08';

const CHAR_TO_CODE = {};
const CODE_TO_CHAR = {};
for (const row of CHECKERBOARD_ROWS) {
  [...row.letters].forEach((ch, i) => {
    const code = row.prefix + String((i + 1) % 10);
    CHAR_TO_CODE[ch] = code;
    CODE_TO_CHAR[code] = ch;
  });
}

function textToDigits(text) {
  return [...text.toUpperCase()]
    .map((ch) => {
      if (/[0-9]/.test(ch)) return DIGIT_ESCAPE + ch;
      if (CHAR_TO_CODE[ch] === undefined) throw new Error(`Символ «${ch}» відсутній у таблиці стиснення`);
      return CHAR_TO_CODE[ch];
    })
    .join('');
}

function digitsToText(digits) {
  let result = '';
  let i = 0;
  while (i < digits.length) {
    if ('890'.includes(digits[i])) {
      const code = digits.slice(i, i + 2);
      if (code === DIGIT_ESCAPE) {
        result += digits[i + 2];
        i += 3;
        continue;
      }
      result += CODE_TO_CHAR[code] ?? '?';
      i += 2;
    } else {
      result += CODE_TO_CHAR[digits[i]];
      i += 1;
    }
  }
  return result;
}

const addMod10 = (msg, key) => [...msg].map((d, i) => (+d + +key[i % key.length]) % 10).join('');
const subMod10 = (msg, key) => [...msg].map((d, i) => (+d - +key[i % key.length] + 10) % 10).join('');

const keyToDigits = (key) => (/^\d+$/.test(key) ? key : textToDigits(key));

function padEncrypt(text, key) {
  return addMod10(textToDigits(text), keyToDigits(key));
}

function padDecrypt(cipherDigits, key) {
  return digitsToText(subMod10(cipherDigits, keyToDigits(key)));
}

const groupBy5 = (s) => s.match(/.{1,5}/g).join(' ');

const normalize = (s) => s.replace(/\s+/g, ' ').trim();

function printHeader(title) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

// ===== Завдання 1 =====

function task1() {
  printHeader('Завдання 1. Шифр Цезаря (варіант 9, ключ k = 16)');
  const cipher =
    'Оцячгцюц нмщсмь, халюц х щбпб дгбжц омпц, вгцгбнцюц сбофтаат ґдтгаб. ' +
    'Пбдбот ґесаб о ґдгміае сбгбпе! Ьмгвб вбнюмпбґюбоцоґл о бдмямам ч ' +
    'оцютдчо бгюбя ам нмщсмь.';
  const key = 16;
  const expected =
    'Вимірили байдак, зняли з його трохи ваги, приробили довженне стерно. ' +
    'Готове судно в страшну дорогу! Карпо поблагословився в отамана і вилетів орлом на байдак.';

  const decrypted = caesarDecrypt(cipher, key);
  console.log('Шифротекст:      ', cipher);
  console.log('Розшифровано:    ', decrypted);
  console.log('Збіг з еталоном: ', normalize(decrypted) === normalize(expected) ? 'ТАК' : 'НІ');

  const reEncrypted = caesarEncrypt(decrypted, key);
  console.log('Перевірка (повторне шифрування дає вихідний шифротекст):', reEncrypted === cipher ? 'ТАК' : 'НІ');
}

// ===== Завдання 2 =====

function task2() {
  printHeader('Завдання 2. Шифр Віженера (варіант 9 -> рядок 3 таблиці 1.2, ключ «шамір»)');
  const cipher =
    "Кегеьі пгщ жкрбєцїнл ґювї ґгціи хіхоммйжч Аст Лшмчю 1984 єйке. Йюї пгсеосдст, фо лхсд " +
    "з'лйьиаґи гйжюстесдж тдкбюьмтбйиьадс пз вчмблидса злкд юі'я мїд коіадьу ммєбсе Івесц, " +
    'ад се вщщщаосвй б ґхвшдаб елознхоре ітнеааьпіьійеї нбхх-яьщуй стшжо. Аоокьж чмя юаел ' +
    'Еріігі щшлцериаґи вдшт хєшсцйдц кгсенопюрпіишдц гбцдьоющгзок, івб в 2000 гщйе, змйхчкц ' +
    'щхїіщ йюаоята ьрмрвдвбязе в тцюктцдґей ьюьктбкєшфчу, юаек йхшлбяп ьтчцьни о пьнтл.';
  const key = 'шамір';
  const expected =
    "Першим про спрощення цієї схеми задумався Аді Шамір 1984 року. Він припустив, що якби " +
    "з'явилася можливість використовувати як відкритий ключ ім'я або поштову адресу Аліси, " +
    'то це позбавило б складну процедуру автентифікації будь-якого сенсу. Довгий час ідея ' +
    'Шаміра залишалася лише красивою криптографічною головоломкою, але в 2000 році, завдяки ' +
    'одній відомій вразливості в еліптичній криптографії, ідею вдалося втілити в життя.';

  const naive = vigenereDecrypt(cipher, key);
  console.log('Пряме розшифрування:', naive);
  console.log('Збіг з еталоном:', normalize(naive) === normalize(expected) ? 'ТАК' : 'НІ');

  // після «сенсу.» у шифротексті ключ зсунуто на 1 позицію
  const splitAt = cipher.indexOf('Аоокьж');
  const part1 = cipher.slice(0, splitAt);
  const part2 = cipher.slice(splitAt);
  const expectedPart2 = expected.slice(expected.indexOf('Довгий'));
  console.log('\nГама на ділянці «сенсу. Довгий час...»:',
    keyStream(cipher.slice(splitAt - 7), expected.slice(expected.indexOf('сенсу.'))).slice(0, 20));
  console.log('Висновок: після «сенсу.» у шифротексті ключ зсунуто на 1 позицію назад');

  const offset = countLetters(part1) - 1;
  const decrypted = vigenereDecrypt(part1, key) + vigenereDecrypt(part2, key, offset);
  console.log('\nРозшифровано з корекцією:', decrypted);
  console.log('Збіг з еталоном:', normalize(decrypted) === normalize(expected) ? 'ТАК' : 'НІ');
  console.log('Перевірка шифрування (encrypt(еталон) == шифротекст):',
    vigenereEncrypt(expected.slice(0, expected.indexOf('Довгий')), key) +
      vigenereEncrypt(expectedPart2, key, offset) === cipher ? 'ТАК' : 'НІ');
}

// ===== Завдання 3 =====

function task3() {
  printHeader('Завдання 3. Шифр Віженера (варіант 9 -> рядок 2 таблиці 1.3, ключ «лишити»)');
  const cipher =
    "Бмлдяц бьй южьаебчез жсвт ивсцд птлдцшїиз Лле Дтцць 1984 лшга. Нсї щзрбамяяї, іш чфур " +
    "ф'зьрґигз ішьххїеюіє нрзшзргяйїїїляд зг їцлзьяяху зхрґ цц'ч иуш бшуяєїд иаьшюд Иисир, " +
    'ґш см жшфішїяха і мфґирчо щзшжмааза лїнмеяхбефтгцт щачє-кфййє юсчма. Чшнйду миг самс ' +
    'Длцеьт плхддтхлюч хядс флиирншц фзрбяййзиестчєж ошишфшьшіфєж, лхб ї 2000 зшжс, ґифлкфд ' +
    'шччцу ьсчшюсж їзифхдїєюґс ь мґсбядґесш флржяайлийсч, самр їриишиз няехяях ї гріяк.';
  const key = 'лишити';
  const hint = 'Першим про спрощення';

  const decrypted = vigenereDecrypt(cipher, key);
  console.log('Розшифровано:    ', decrypted);
  console.log(`Початок збігається з підказкою «${hint}...»:`, decrypted.startsWith(hint) ? 'ТАК' : 'НІ');

  const { stream, key: recovered } = recoverVigenereKey(cipher, hint);
  console.log('Гама за відомим початком:', stream);
  console.log('Відновлений ключ (найменший період гами):', recovered.toLowerCase());
}

// ===== Завдання 4 =====

function task4() {
  printHeader('Завдання 4. Одноразовий блокнот (варіант 9, ключ «лис»)');
  const message = '87935393740778315385627989273';
  const key = 'лис';

  const keyDigits = keyToDigits(key);
  const plainDigits = subMod10(message, keyDigits);
  console.log('Повідомлення:          ', groupBy5(message));
  console.log(`Ключ «${key}» у цифрах:  `, keyDigits);
  console.log('Повторений ключ:       ', groupBy5(keyDigits.repeat(Math.ceil(message.length / keyDigits.length)).slice(0, message.length)));
  console.log('Різниця за mod 10:     ', groupBy5(plainDigits));
  console.log('Розшифроване повідомлення:', padDecrypt(message, key));
}

// ===== Завдання 5 =====

const TASK5_TEXT = 'Першина Мілана Антонівна 03 12 2006';
const TASK5_KEY = '233'; // номер групи ПЗПІ-23-3

function task5() {
  printHeader('Завдання 5. Варіант 1: зашифрувати ПІБ та дату народження номером групи');
  const digits = textToDigits(TASK5_TEXT);
  const cipher = padEncrypt(TASK5_TEXT, TASK5_KEY);
  console.log('Відкритий текст:       ', TASK5_TEXT.toUpperCase());
  console.log('Ключ (номер групи):    ', `${TASK5_KEY} (ПЗПІ-23-3)`);
  console.log('Текст у цифрах:        ', groupBy5(digits));
  console.log('Повторений ключ:       ', groupBy5(TASK5_KEY.repeat(Math.ceil(digits.length / 3)).slice(0, digits.length)));
  console.log('Шифротекст (сума mod 10):', groupBy5(cipher));
  return cipher;
}

// ===== Завдання 6 =====

// декодування власного повідомлення із завдання 5
function task6(receivedCipher, receivedKey) {
  printHeader('Завдання 6. Декодування повідомлення із завдання 5');
  const plain = padDecrypt(receivedCipher, receivedKey);
  console.log('Шифротекст:            ', groupBy5(receivedCipher));
  console.log('Ключ:                  ', receivedKey);
  console.log('Різниця за mod 10:     ', groupBy5(subMod10(receivedCipher, receivedKey)));
  console.log('Розшифровано:          ', plain);
  console.log('Збіг з вихідним текстом:', plain === TASK5_TEXT.toUpperCase() ? 'ТАК' : 'НІ');
}

function main() {
  task1();
  task2();
  task3();
  task4();
  const cipher5 = task5();
  task6(cipher5, TASK5_KEY);
}

main();