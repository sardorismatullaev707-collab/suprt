import dotenv from 'dotenv';
dotenv.config();

export async function askAI(
  question: string,
  knowledgeBase: { question: string; answer: string } | null,
  systemPrompt: string
) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not set');
    }

    // Если найдена информация в базе знаний - использовать её напрямую
    if (knowledgeBase) {
      console.log(`[AI] Using FAQ answer: "${knowledgeBase.answer}"`);
      return knowledgeBase.answer;
    }

    // Только если нет в базе - запросить AI
    console.log(`[AI] No FAQ found, asking DeepSeek...`);
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Не удалось получить ответ';
  } catch (err) {
    console.error('[AI Error]', err);
    return 'Произошла ошибка при генерации ответа';
  }
}
