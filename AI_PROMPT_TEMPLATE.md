# 📝 Шаблон для AI промпта (ai.ts)

Для каждого нового клиента нужно настроить AI промпт под его бизнес.

## Что нужно изменить в файле `ai.ts`:

### Строка ~93-95:
```typescript
content: `You are a friendly assistant for [НАЗВАНИЕ КОМПАНИИ] that helps with information AND booking appointments.
```

### Примеры для разных типов бизнеса:

#### 1. Образовательный институт:
```typescript
content: `You are a friendly assistant for Amity Global Institute that helps with information AND booking appointments.
```

#### 2. Медицинская клиника:
```typescript
content: `You are a friendly medical receptionist for [CLINIC NAME] that helps patients with information AND booking appointments.
```

#### 3. Салон красоты:
```typescript
content: `You are a friendly assistant for [SALON NAME] beauty salon that helps clients with information AND booking appointments.
```

#### 4. Консультационное агентство:
```typescript
content: `You are a friendly assistant for [AGENCY NAME] consulting agency that helps with information AND booking consultations.
```

#### 5. Автосервис:
```typescript
content: `You are a friendly assistant for [SERVICE NAME] auto service that helps customers with information AND booking service appointments.
```

#### 6. Фитнес-центр:
```typescript
content: `You are a friendly assistant for [GYM NAME] fitness center that helps members with information AND booking training sessions.
```

---

## Дополнительные настройки (опционально):

### Изменить стиль общения:

#### Формальный стиль:
```typescript
content: `You are a professional assistant for [COMPANY NAME]...
- Use formal language
- Address clients respectfully
- Maintain professional tone`
```

#### Дружелюбный стиль (по умолчанию):
```typescript
content: `You are a friendly assistant for [COMPANY NAME]...
- Be warm and welcoming
- Use emojis naturally
- Keep conversation casual but professional`
```

---

## Какие файлы редактировать:

1. **ai.ts** (строка ~93) - основной промпт
2. **ai.ts** (строка ~250) - промпт для обычных вопросов (если нет бронирования)

---

## Быстрая замена для нового клиента:

```bash
# Найти все упоминания "Amity Global Institute"
grep -r "Amity Global Institute" ai.ts

# Заменить на название клиента
# Вручную отредактируйте ai.ts в VS Code
```

