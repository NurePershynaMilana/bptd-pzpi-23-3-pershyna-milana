# Сервер авторизації з шифруванням RSA (Python + бібліотека cryptography)
# Запуск: python server.py [порт] [розмір_ключа]

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sys
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
KEY_SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 2048
CLIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client')

# RSA-OAEP: хеш SHA-256 і MGF1 з SHA-256 - ці параметри мають збігатися з клієнтом
OAEP = padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
HASH_LEN = 32
MAX_CLOCK_SKEW = 300  # секунд

# ===== Ключі сервера =====

private_key = rsa.generate_private_key(public_exponent=65537, key_size=KEY_SIZE)
public_der = private_key.public_key().public_bytes(
    serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
public_pem = private_key.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
fingerprint = hashlib.sha256(public_der).hexdigest()[:32]

# ===== Користувачі: зберігаються лише сіль і хеш пароля (PBKDF2) =====

def hash_password(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 200_000)

USERS = {}
for login, password in [('milana', 'Secret123!'), ('admin', 'Adm1n#2026')]:
    salt = secrets.token_bytes(16)
    USERS[login] = (salt, hash_password(password, salt))

used_nonces = set()

# ===== Шифрування блоками =====

def max_chunk(key_bits):
    # максимальна довжина відкритого тексту для OAEP: k - 2*hLen - 2
    return key_bits // 8 - 2 * HASH_LEN - 2

def encrypt_chunks(public_key, data):
    size = max_chunk(public_key.key_size)
    return [base64.b64encode(public_key.encrypt(data[i:i + size], OAEP)).decode()
            for i in range(0, len(data), size)]

def decrypt_chunks(chunks):
    return b''.join(private_key.decrypt(base64.b64decode(c), OAEP) for c in chunks)

def log(text):
    print(f'[{datetime.now():%H:%M:%S}] {text}', flush=True)

def short(s, n=48):
    return s if len(s) <= n else s[:n] + '...'

# ===== Перевірка входу =====

def check_login(request):
    nonce = request.get('nonce', '')
    if abs(time.time() - request.get('timestamp', 0) / 1000) > MAX_CLOCK_SKEW:
        return False, 'Запит застарів - перевірте час на комп\'ютері'
    if not nonce or nonce in used_nonces:
        return False, 'Повторний запит відхилено (nonce уже використано)'
    used_nonces.add(nonce)

    user = USERS.get(request.get('login', ''))
    if user is None:
        return False, 'Невірний логін або пароль'
    salt, expected = user
    if not hmac.compare_digest(hash_password(request.get('password', ''), salt), expected):
        return False, 'Невірний логін або пароль'
    return True, f'Вітаємо, {request["login"]}! Вхід виконано успішно.'

# ===== HTTP-обробник =====

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/public-key':
            log(f'Клієнт {self.client_address[0]} запросив відкритий ключ сервера')
            return self.send_json(200, {
                'publicKey': public_pem,
                'keySize': KEY_SIZE,
                'fingerprint': fingerprint,
                'padding': 'RSA-OAEP, SHA-256, MGF1-SHA-256',
            })
        self.serve_static()

    def do_POST(self):
        if self.path != '/api/login':
            return self.send_json(404, {'error': 'Не знайдено'})
        raw = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        try:
            body = json.loads(raw)
            client_key = serialization.load_pem_public_key(body['clientPublicKey'].encode())
            if client_key.key_size <= 1024:
                return self.send_json(400, {'error': 'Ключ клієнта має бути більшим за 1024 біти'})
            log(f'Отримано зашифрований запит: {len(body["payload"])} блок(и), '
                f'ключ клієнта {client_key.key_size} біт')
            log(f'  шифротекст: {short(body["payload"][0])}')
        except Exception as e:
            log(f'Некоректний запит: {e}')
            return self.send_json(400, {'error': 'Некоректний формат запиту або відкритого ключа клієнта'})

        try:
            request = json.loads(decrypt_chunks(body['payload']))
        except Exception:
            log('  ПОМИЛКА розшифрування: параметри доповнення OAEP або ключ не збігаються')
            return self.send_json(400, {'error': 'Сервер не зміг розшифрувати дані: параметри OAEP '
                                                 '(хеш-функція) або ключ не збігаються з серверними'})

        log(f'  розшифровано: логін «{request.get("login")}», пароль {"*" * len(request.get("password", ""))}, '
            f'nonce {request.get("nonce", "")[:8]}...')
        ok, message = check_login(request)
        response = {'ok': ok, 'message': message, 'nonce': request.get('nonce'),
                    'serverTime': datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
        if ok:
            response['sessionToken'] = secrets.token_hex(16)
        payload = encrypt_chunks(client_key, json.dumps(response, ensure_ascii=False).encode())
        log(f'  результат: {"УСПІХ" if ok else "ВІДМОВА"} - {message}')
        log(f'  відповідь зашифровано ключем клієнта: {len(payload)} блок(и), {short(payload[0])}')
        self.send_json(200, {'payload': payload})

    def serve_static(self):
        name = 'index.html' if self.path in ('/', '') else self.path.lstrip('/').split('?')[0]
        path = os.path.normpath(os.path.join(CLIENT_DIR, name))
        if not path.startswith(os.path.normpath(CLIENT_DIR)) or not os.path.isfile(path):
            return self.send_json(404, {'error': 'Не знайдено'})
        with open(path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', (mimetypes.guess_type(path)[0] or 'text/plain') + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    log(f'Згенеровано ключ RSA {KEY_SIZE} біт, e = 65537')
    log(f'Відбиток відкритого ключа (SHA-256): {fingerprint}')
    log(f'Сервер запущено: http://localhost:{PORT}')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
