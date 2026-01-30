# Telegram Support Bot с Google Sheets и Gemini AI

Простой и эффективный бот поддержки для Telegram, который отвечает на вопросы пользователей на основе базы знаний из Google Sheets с помощью Gemini AI.

## 🚀 Возможности

- ✅ Загрузка базы знаний из Google Sheets (лист "knowledge")
- ✅ Интеграция с Gemini AI для интеллектуальных ответов
- ✅ Автоматический поиск ответов по ключевым словам
- ✅ Строгие ответы только из базы знаний (без выдумывания)
- ✅ Простая настройка и запуск

## 📋 Требования

- Node.js 18+
- Telegram Bot Token (от @BotFather)
- Google Sheets с базой знаний
- Google Service Account для доступа к Sheets

## 🛠 Установка

```bash
npm install
```

## ⚙️ Настройка

Создайте файл `.env`:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Key\n-----END PRIVATE KEY-----\n"
```

### Настройка Google Sheets

1. Создайте Google таблицу
2. Назовите лист **"knowledge"**
3. Создайте колонки: **Question** и **Answer**
4. Заполните базу знаний

## 🚀 Запуск

```bash
npm start
```

## 📂 Структура

```
├── telegram-bot.ts  # Главный файл
├── ai.ts           # Gemini AI
├── sheets.ts       # Google Sheets
└── .env           # Конфигурация
```

## 🔧 Технологии

- Node.js + TypeScript
- Telegram Bot API
- Gemini AI
- Google Sheets API

## 📄 Лицензия

MIT
