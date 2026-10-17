# Лабораторна робота №2 - RSA, захищений вхід

- Сервер: Python + бібліотека cryptography
- Клієнт: JavaScript у браузері + Web Crypto API

Запуск:
1. cd server
2. pip install -r requirements.txt
3. python server.py            (або python server.py 8000 3072 - порт і розмір ключа)
4. Відкрити в браузері http://localhost:8000

Тестові облікові записи: **milana / Secret123!**   **admin / Adm1n#2026**  
Сторінку потрібно відкривати саме через localhost: Web Crypto API працює лише в захищеному контексті.
