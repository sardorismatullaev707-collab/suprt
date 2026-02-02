import dotenv from 'dotenv';
dotenv.config();
import { getAvailableSlots, bookAppointment, formatAvailableSlots } from './schedule.js';
import { format } from 'date-fns';

const apiKey = process.env.DEEPSEEK_API_KEY;
if (apiKey) {
  console.log('[✓] DeepSeek AI initialized');
} else {
  console.log('[!] DEEPSEEK_API_KEY not found - AI will be disabled');
}

export async function askAI(
  question: string,
  knowledgeBase: { question: string; answer: string }[],
  bestMatch: { question: string; answer: string } | null,
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
) {
  try {
    if (bestMatch) {
      console.log(`[✓] Using answer from database: "${bestMatch.question}"`);
      return bestMatch.answer;
    }

    if (!apiKey) {
      console.log('[!] AI unavailable');
      const isRussian = /[а-яА-Я]/.test(question);
      return isRussian
        ? "Нужен API ключ для ответа на этот вопрос ��"
        : "Need API key to answer this question 🤔";
    }

    console.log('[AI] Using DeepSeek...');
    
    // Check if user wants to see available slots or book
    const questionLower = question.toLowerCase();
    
    // Check if message contains email or phone (likely booking completion)
    const hasEmail = /@/.test(question);
    const hasPhone = /\+?\d[\d\s-]{7,}/.test(question);
    const hasContactInfo = hasEmail || hasPhone;
    
    // Check if it's related to scheduling
    const wantsSchedule = 
      hasContactInfo || // If user provides contact info, keep in booking context
      /\b(schedule|available|slot|time|appointment|book|meeting)\b/i.test(question) ||
      /(встреч|расписан|свободн|запис|брон|слот|время|подходит|хочу|можно)/i.test(question) ||
      questionLower.includes('завтра') ||
      questionLower.includes('сегодня') ||
      questionLower.includes('когда') ||
      questionLower.includes('tomorrow') ||
      questionLower.includes('today') ||
      questionLower.includes('when') ||
      questionLower.includes('да') ||
      questionLower.includes('yes') ||
      /\d{1,2}[:.\s]\d{2}/.test(questionLower) || // matches time patterns like "15:00", "15.00"
      /в\s*\d{1,2}/.test(questionLower) || // matches "в 15", "в 3"
      /\d{1,2}\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i.test(questionLower) || // matches dates with months
      /\d{4}-\d{2}-\d{2}/.test(questionLower); // matches ISO dates
    
    console.log(`[🔍] wantsSchedule: ${wantsSchedule}, hasContact: ${hasContactInfo}, question: "${question}"`);
    
    if (wantsSchedule) {
      console.log('[📅] Checking schedule...');
      const slots = await getAvailableSlots();
      
      if (slots.length === 0) {
        const isRussian = /[а-яА-Я]/.test(question);
        return isRussian
          ? "К сожалению, сейчас нет доступных слотов в расписании 😔"
          : "Sorry, no available slots in the schedule right now 😔";
      }
      
      const slotsText = formatAvailableSlots(slots, 15);
      console.log(`[✓] Found ${slots.length} available slots`);
      
      // Get current date and time - VERY EXPLICIT FOR AI
      const now = new Date();
      const currentDate = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');
      
      // Create a simple, clear date string
      const day = now.getDate();
      const month = now.getMonth() + 1; // 0-indexed
      const year = now.getFullYear();
      const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      const currentDateReadable = `${day} ${monthNames[now.getMonth()]} ${year}`;
      
      console.log(`[📅] Current date being sent to AI: ${currentDateReadable} (${currentDate})`);
      
      const context = knowledgeBase
        .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join('\n\n');

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
          role: 'system',
            content: `You are an AI Administrative Assistant for Suprt.org. Act as the virtual administrator for this support service: manage conversation flow, keep context, ask concise clarifying questions when needed, proactively summarize next steps, and perform bookings when appropriate. Prioritize user safety and accuracy.

  ⚠️ LANGUAGE RULE - HIGHEST PRIORITY:
  - ALWAYS respond in the SAME LANGUAGE as the user's message.
  - If user writes in Russian (Cyrillic) → respond ONLY in Russian.
  - If user writes in English → respond in English.
  - If user writes in other languages → respond in that language.
  - NEVER mix languages in one response.

  ⚠️ CRITICAL - CURRENT DATE INFORMATION:
  Today's date is: ${currentDateReadable}
  ISO format: ${currentDate}
  Current time: ${currentTime}
  Year: ${year}
  Month: ${month}
  Day: ${day}

  AVAILABLE APPOINTMENT SLOTS (all dates are AFTER ${currentDateReadable}):
  ${slotsText}

  BOOKING RESPONSIBILITIES:
  1. When the user asks about schedule/slots, SHOW the available slots above.
  2. If the user indicates they want a specific time (e.g., "да мне подходит в 15.00" or "31 января в 3"), ask only for the missing information: NAME and CONTACT (phone or email).
  3. If the user provides BOTH name and contact in one message, immediately execute booking by responding with exactly:
    BOOK:YYYY-MM-DD|HH:MM|Name|Contact
    Example: BOOK:2026-01-31|15:00|Иван|+65 1234 5678

  BOOKING DETECTION RULES (summary):
  - If user says "подходит", "хочу", "да" referring to a shown slot → prompt for name and contact unless both provided.
  - If user provides name + contact together (e.g., "сардор test@mail.ru") → immediately produce the BOOK command.

  CRITICAL BOOKING EXECUTION:
  1. Identify the intended slot from conversation history.
  2. Extract name and contact from the latest message.
  3. Respond ONLY with the BOOK:... line (no extra confirmations) so the system can process it.
  4. If any field is missing, ask a single clear question for the missing field.

  ANSWERING STRATEGY:
  1. First, check if the knowledge base has a RELEVANT answer to the user's question.
     - Read the user's question carefully and understand the INTENT.
     - Match by MEANING, not just keywords.
     - Example: "можно онлайн" (can I do online) should match "Where are you located?" → "We work online..."
     - Example: "где вы находитесь" (where are you located) → "We work online..."
  
  2. If knowledge base has relevant answer:
     - Use it directly, adapt it to the user's language if needed.
     - Keep it natural and conversational.
  
  3. If knowledge base does NOT have relevant answer:
     - Provide a short, helpful best-effort reply.
     - MUST label it clearly: "Лучший ответ (нет в базе знаний):" or "Best-effort — not in knowledge base:"
     - Do NOT invent facts (prices, legal, medical).
     - Suggest contacting ceo@suprt.org or @sardor_ismatillaev for details.
  
  4. When in doubt, ask ONE clarifying question in the user's language.

  SAFETY RULES:
  - Never reveal secrets or personal data.
  - Keep replies concise and friendly (emojis allowed).
  - ALWAYS match user's language.

  Knowledge Base:
  ${context}`
            },
            // Add chat history for context (last 4 messages, excluding current)
            ...chatHistory.slice(-8, -1).map(msg => ({
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.content
            })),
            {
              role: 'user',
              content: question
            }
          ],
          // Booking path should be deterministic to avoid malformed BOOK: outputs
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[✗] DeepSeek API error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content || 'No response';
      
      // Check if AI wants to book
      if (text.includes('BOOK:')) {
        const bookMatch = text.match(/BOOK:([^|]+)\|([^|]+)\|([^|]+)\|([^|\n]+)/);
        if (bookMatch) {
          const [, date, time, name, contact] = bookMatch;
          console.log(`[📅] BOOK command parsed: date="${date.trim()}", time="${time.trim()}", name="${name.trim()}", contact="${contact.trim()}"`);
          
          // Validate all fields are present
          if (!date.trim() || !time.trim() || !name.trim() || !contact.trim()) {
            console.error('[✗] BOOK command missing required fields!');
            text = text.replace(/BOOK:[^\n]+/, 
              `❌ Booking error: Missing required information (name or contact)`
            );
          } else {
            console.log(`[📅] Attempting to book: ${date.trim()} ${time.trim()} for ${name.trim()}`);
            
            const result = await bookAppointment(
              date.trim(),
              time.trim(),
              name.trim(),
              contact.trim()
            );
            
            // Replace BOOK command with result
            text = text.replace(/BOOK:[^\n]+/, 
              result.success 
                ? `✅ ${result.message}` 
                : `❌ ${result.message}`
            );
            
            if (result.success) {
              console.log(`[✓] Booking successful!`);
            } else {
              console.log(`[✗] Booking failed: ${result.message}`);
            }
          }
        } else {
          console.error('[✗] BOOK command format invalid:', text);
        }
      }
      
      console.log(`[✓] DeepSeek: ${text.substring(0, 80)}...`);
      return text;
    }
    
    // Regular Q&A (no booking)
    const context = knowledgeBase
      .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a friendly support assistant for Suprt.org.

⚠️ LANGUAGE RULE - HIGHEST PRIORITY:
- ALWAYS respond in the SAME LANGUAGE as the user's message.
- If user writes in Russian (Cyrillic) → respond ONLY in Russian.
- If user writes in English → respond in English.
- NEVER mix languages in one response.

PRINCIPLES:
- Use the knowledge base as the primary, authoritative source for answers.
- Be concise, friendly, and respond in the user's language. Emojis are allowed.

ANSWERING STRATEGY:
1. Read the user's question and understand the INTENT (not just keywords).
   - Example: "можно онлайн" (can I do online) should match "Where are you located?" → "We work online..."
   - Example: "где находитесь" → "We work online..."

2. If knowledge base contains relevant answer:
   - Use it directly, adapt language if needed.
   - Keep it natural and conversational.

3. If knowledge base does NOT have relevant answer:
   - Provide a short, helpful best-effort reply.
   - Label it clearly: "Лучший ответ (нет в базе):" or "Best-effort — not in KB:"
   - Do NOT invent facts (prices, legal, medical).
   - Suggest contacting ceo@suprt.org or @sardor_ismatillaev for details.

SAFETY:
- Never expose secrets or personal data.
- When uncertain, ask one clear clarifying question in user's language.

Knowledge Base:
${context}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        // For regular Q&A: allow more creative, helpful phrasing when KB lacks exact answers.
        // Temperature is higher so AI can propose reasonable, labeled suggestions.
        temperature: 0.85,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[✗] DeepSeek API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response';
    
    console.log(`[✓] DeepSeek: ${text.substring(0, 80)}...`);
    return text;
  } catch (err: any) {
    console.error('[✗] AI Error:', err.message);
    
    const questionLower = question.toLowerCase();
    const partialMatch = knowledgeBase.find(qa => 
      qa.question.toLowerCase().includes(questionLower) || 
      questionLower.includes(qa.question.toLowerCase())
    );
    
    if (partialMatch) {
      console.log(`[✓] Found partial: "${partialMatch.question}"`);
      return partialMatch.answer;
    }
    
    const isRussian = /[а-яА-Я]/.test(question);
    return isRussian
      ? "Что-то пошло не так. Попробуй еще раз?"
      : "Something went wrong. Try again?";
  }
}
