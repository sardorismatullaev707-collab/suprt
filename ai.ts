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
              content: `You are a friendly assistant for Amity Global Institute that helps with information AND booking appointments.

⚠️ CRITICAL - CURRENT DATE INFORMATION:
Today's date is: ${currentDateReadable}
ISO format: ${currentDate}
Current time: ${currentTime}
Year: ${year}
Month: ${month}
Day: ${day}

AVAILABLE APPOINTMENT SLOTS (all dates are AFTER ${currentDateReadable}):
${slotsText}

HOW TO BOOK APPOINTMENTS:
1. When user asks about schedule/slots, SHOW the available slots above
2. When user says they want a specific time (e.g., "да мне подходит в 15.00" or "31 января в 3"), ask for:
   - Their NAME
   - Their CONTACT INFO (phone or email)
3. After getting BOTH name and contact, respond with:
   BOOK:YYYY-MM-DD|HH:MM|Name|Contact
   Example: BOOK:2026-01-31|15:00|Иван|+65 1234 5678

BOOKING DETECTION RULES:
- User says "подходит" (suits me) → Ask for name and contact
- User says "хочу" (I want) + time/date → Ask for name and contact  
- User says "да" (yes) + time → Ask for name and contact
- User mentions specific date/time from slots → Ask for name and contact
- User provides name + contact together (e.g., "сардор test@mail.ru" or "Иван +65 1234") → IMMEDIATELY execute BOOK command!

CRITICAL BOOKING EXECUTION:
When user provides BOTH name AND contact in one message (even on separate lines):
1. IDENTIFY the slot they want (from previous conversation context - look at chat history)
2. EXTRACT the name and contact from current message
   - Example: "Иван test@mail.ru" → Name is "Иван", Contact is "test@mail.ru"
   - Example: "John +65 9999" → Name is "John", Contact is "+65 9999"
   - Example: "Сардор\ntest@mail.ru" → Name is "Сардор", Contact is "test@mail.ru"
3. IMMEDIATELY respond with: BOOK:YYYY-MM-DD|HH:MM|Name|Contact
4. DO NOT ask for confirmation, DO NOT repeat the data - just execute BOOK command!
5. ALL FOUR FIELDS IN BOOK COMMAND MUST BE FILLED: date, time, name, contact

BOOK COMMAND FORMAT (STRICT):
BOOK:2026-01-31|16:00|Иван|test@mail.ru
     ^^^^^^^^^^  ^^^^^  ^^^^  ^^^^^^^^^^^^^
     date        time   name  contact
     
⚠️ NEVER leave name or contact empty!
⚠️ Extract name from the message even if it's just one word before email/phone!

Examples of name+contact patterns to recognize:
- "сардор test@mail.ru" → Name: сардор, Contact: test@mail.ru
- "сардор \ntest@mail.ru" (with newline) → Name: сардор, Contact: test@mail.ru
- "Иван Петров ivan@mail.ru" → Name: Иван Петров, Contact: ivan@mail.ru  
- "John +65 1234 5678" → Name: John, Contact: +65 1234 5678
- "Мария 123456789" → Name: Мария, Contact: 123456789
- "Alex\nalex@test.com" → Name: Alex, Contact: alex@test.com

HOW TO FIND THE SLOT FROM HISTORY:
- Look at the conversation history
- Find when user said "да мне подходит 31 января в 3" or similar
- Extract the date and time from that message
- Use that for the BOOK command

IMPORTANT RULES:
- TODAY IS ${currentDateReadable} (${currentDate})
- When user asks "завтра" (tomorrow), that means ${day + 1} ${monthNames[now.getMonth()]} ${year}
- When user mentions time like "в 15.00" or "в 3" - they want to book!
- ALWAYS stay in booking context once user shows interest
- Respond in the SAME LANGUAGE as the user
- Be friendly and use emojis
- For general questions NOT about booking, use knowledge base below

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
          temperature: 0.7,
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
            content: `You are a friendly support assistant for Amity Global Institute.

CRITICAL RULES:
- Answer ONLY using information from the knowledge base
- Be very concise and friendly
- Use emojis naturally
- Respond in the SAME LANGUAGE as the user asks
- If the answer is not in the knowledge base, say you don't have that info
- NEVER make up or invent information

Knowledge Base (English):
${context}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
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
