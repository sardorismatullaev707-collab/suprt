# 📊 CRM Template для отслеживания клиентов

Скопируйте эту таблицу в отдельную Google Sheets для управления клиентами.

---

## Лист 1: "Clients" (Основная информация)

| # | Client Name | Industry | Contact Person | Email | Phone | Status | Start Date | Monthly Fee | Notes |
|---|-------------|----------|----------------|-------|-------|--------|------------|-------------|-------|
| 1 | Amity Global Institute | Education | John Smith | john@amity.edu.sg | +65 1234 5678 | ✅ Active | 2026-01-31 | $75 | Test client |
| 2 | Beauty Salon XYZ | Beauty | Maria Ivanova | maria@salon.com | +998 90 123 45 67 | 🔄 Setup | 2026-02-01 | $50 | Setting up |
| 3 | Medical Clinic ABC | Healthcare | Dr. Petrov | info@clinic.uz | +998 71 234 56 78 | ⏳ Pending | 2026-02-05 | $100 | Waiting for decision |

### Статусы:
- 🔄 **Setup** - Настройка в процессе
- ✅ **Active** - Активный (оплачено, работает)
- ⏳ **Pending** - Ожидание (обсуждение, не запущен)
- ⚠️ **Issues** - Есть проблемы (техническая поддержка)
- 💰 **Trial** - Пробный период (бесплатно 7-14 дней)
- ❌ **Churned** - Отказался (churn)
- 🎯 **Lead** - Лид (потенциальный клиент)

---

## Лист 2: "Technical Info" (Технические данные)

| Client ID | Client Name | Telegram Bot Token | Telegram Bot Username | Google Sheet ID | Service Account Email | DeepSeek Key | Last Updated |
|-----------|-------------|-------------------|----------------------|----------------|----------------------|--------------|--------------|
| 1 | Amity Global | 123456:ABC-DEF... | @amity_support_bot | 1ABC...XYZ | amity-bot@project.iam... | sk-9e53... | 2026-01-31 |
| 2 | Beauty Salon XYZ | 789012:GHI-JKL... | @beauty_salon_bot | 2DEF...ABC | beauty-bot@project.iam... | sk-9e53... | 2026-02-01 |

⚠️ **ВАЖНО:** Храните этот лист ПРИВАТНО! Не давайте доступ никому.

---

## Лист 3: "Metrics" (Метрики использования)

| Client ID | Client Name | Messages/Day | Bookings/Week | Last Active | Satisfaction | Churn Risk |
|-----------|-------------|--------------|---------------|-------------|--------------|------------|
| 1 | Amity Global | 45 | 12 | 2026-01-31 | 😊 High | Low |
| 2 | Beauty Salon XYZ | 23 | 8 | 2026-01-30 | 😐 Medium | Medium |
| 3 | Medical Clinic ABC | 67 | 25 | 2026-01-31 | 😊 High | Low |

### Churn Risk indicators:
- **Low:** Активно используют, довольны
- **Medium:** Используют, но есть жалобы
- **High:** Редко используют или много жалоб

---

## Лист 4: "Revenue" (Финансы)

| Month | New Clients | Churned Clients | Total Active | MRR | Growth |
|-------|-------------|-----------------|--------------|-----|--------|
| Jan 2026 | 5 | 0 | 5 | $375 | +100% |
| Feb 2026 | 8 | 1 | 12 | $900 | +140% |
| Mar 2026 | 10 | 2 | 20 | $1,500 | +67% |

**MRR** = Monthly Recurring Revenue (ежемесячный доход)  
**Growth** = (Current MRR - Previous MRR) / Previous MRR × 100%

---

## Лист 5: "Support Tickets" (Поддержка)

| Ticket ID | Client Name | Date | Issue | Status | Priority | Resolved Date | Notes |
|-----------|-------------|------|-------|--------|----------|---------------|-------|
| 001 | Amity Global | 2026-01-31 | Bot not responding | ✅ Resolved | 🔴 High | 2026-01-31 | Restart fixed it |
| 002 | Beauty Salon | 2026-02-01 | Need more slots | 🔄 In Progress | 🟡 Medium | - | Adding 50 slots |
| 003 | Medical Clinic | 2026-02-02 | Change AI prompt | ⏳ Pending | 🟢 Low | - | Scheduled for tomorrow |

### Priority levels:
- 🔴 **High** - Критично (бот не работает)
- 🟡 **Medium** - Важно (нужно исправить сегодня)
- 🟢 **Low** - Можно подождать

---

## Лист 6: "Leads" (Потенциальные клиенты)

| Lead ID | Company Name | Industry | Contact | Email | Phone | Source | Stage | Notes |
|---------|--------------|----------|---------|-------|-------|--------|-------|-------|
| L001 | Fitness Center Pro | Fitness | Alex | alex@gym.com | +998 90 111 22 33 | Referral | 🎯 Demo | Scheduled demo for Feb 5 |
| L002 | Law Firm LLC | Legal | Olga | olga@law.uz | +998 71 333 44 55 | Cold Call | 📞 Contact | Left voicemail |
| L003 | Auto Service Plus | Automotive | Dmitry | info@auto.uz | +998 90 555 66 77 | Website | 💬 Negotiation | Interested, discussing price |

### Lead stages:
- 🎯 **Lead** - Новый лид
- 📞 **Contact** - Первый контакт
- 🎬 **Demo** - Демонстрация
- 💬 **Negotiation** - Переговоры о цене
- 📝 **Contract** - Подписание договора
- ✅ **Won** - Сделка закрыта (стал клиентом)
- ❌ **Lost** - Отказ

---

## 📊 Дашборд (Summary)

Создайте отдельный лист с формулами для быстрого обзора:

```
═══════════════════════════════════════════
           📊 BUSINESS DASHBOARD
═══════════════════════════════════════════

Active Clients:          30
Total MRR:              $2,250
Average Revenue/Client: $75

This Month:
  New Clients:          +8
  Churned Clients:      -2
  Growth Rate:          +25%

Support Tickets:
  Open:                 3
  Resolved Today:       5

Leads Pipeline:
  Total Leads:          15
  In Demo Stage:        5
  Expected Closes:      3 (next 7 days)

═══════════════════════════════════════════
```

---

## 🔔 Автоматические уведомления (опционально)

Настройте Google Apps Script для уведомлений:

1. **Churn warning:** Если клиент не использовал бота 7 дней
2. **Payment reminder:** За 3 дня до оплаты
3. **Support ticket alert:** Новый тикет с High priority

---

## 📱 Мобильный доступ

Установите Google Sheets на телефон для мониторинга:
- iOS: [App Store](https://apps.apple.com/app/google-sheets/id842849113)
- Android: [Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.docs.editors.sheets)

