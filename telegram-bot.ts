import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();
import { askAI } from './ai.js';
import { loadKnowledgeBase, getBestAnswer } from './sheets.js';

async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[✗] TELEGRAM_BOT_TOKEN not set in .env');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });
  
  // Simple conversation memory: store last 5 messages per chat
  const chatHistory = new Map<number, Array<{ role: 'user' | 'assistant', content: string }>>();
  
  let knowledgeBase: Array<{ question: string; answer: string }> = [];
  try {
    knowledgeBase = await loadKnowledgeBase();
    console.log(`[✓] Loaded ${knowledgeBase.length} knowledge base entries`);
    
    if (knowledgeBase.length > 0) {
      console.log('\n[📚] Sample questions:');
      knowledgeBase.slice(0, 5).forEach((qa, i) => {
        console.log(`  ${i + 1}. ${qa.question}`);
      });
      if (knowledgeBase.length > 5) {
        console.log(`  ... and ${knowledgeBase.length - 5} more\n`);
      }
    }
  } catch (err) {
    console.error('[✗] Google Sheets error:', err);
  }

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userMessage = msg.text;
    
    if (!userMessage) return;
    
    console.log(`\n[📨] Received: ${userMessage}`);
    
    // Get or create chat history
    if (!chatHistory.has(chatId)) {
      chatHistory.set(chatId, []);
    }
    const history = chatHistory.get(chatId)!;
    
    // Add user message to history
    history.push({ role: 'user', content: userMessage });
    
    // Keep only last 10 messages (5 exchanges)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    // Handle commands
    if (userMessage.startsWith('/')) {
      const reply = await askAI(
        userMessage === '/start' ? 'Hello! What can you help with?' : userMessage,
        knowledgeBase,
        null,
        history
      );
      history.push({ role: 'assistant', content: reply });
      await bot.sendMessage(chatId, reply);
      console.log(`[✅] Sent command response\n`);
      return;
    }
    
    const bestMatch = getBestAnswer(userMessage, knowledgeBase);
    
    if (bestMatch) {
      console.log(`[✓] Found match: "${bestMatch.question}"`);
    } else {
      console.log(`[ℹ] No match, using AI`);
    }
    
    const reply = await askAI(userMessage, knowledgeBase, bestMatch, history);
    
    // Add assistant reply to history
    history.push({ role: 'assistant', content: reply });
    
    await bot.sendMessage(chatId, reply);
    console.log(`[✅] Sent: ${reply.substring(0, 100)}...\n`);
  });

  bot.on('polling_error', (error) => {
    console.error('[✗] Telegram polling error:', error);
  });

  console.log('\n' + '='.repeat(50));
  console.log('[✓] Telegram Bot started!');
  console.log('[→] Send a message to test');
  console.log('='.repeat(50) + '\n');
}

startTelegramBot().catch(console.error);
