// @ts-nocheck
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, Message, Chat } = pkg;
// @ts-ignore
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { getBestAnswer, loadKnowledgeBase } from './sheets.ts';
import { askAI } from './ai.ts';
import { logInteraction, logStatus } from './logger.ts';
import { updateQR, logMessage } from './web-dashboard.ts';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BOT_ENABLED = process.env.BOT_ENABLED === 'true';
if (!BOT_ENABLED) {
  console.log('Bot is disabled by .env');
  process.exit(0);
}

const RATE_LIMIT_SECONDS = 10;
const MAX_MSG_LENGTH = 500;
const HEALTH_INTERVAL_MS = 5 * 60 * 1000;
const FALLBACK_REPLY = 'Sorry, I didn\'t understand. Please rephrase or call us.';
const NO_ANSWER_REPLY = 'Our manager will contact you soon. For urgent questions, call us.';

const lastReply: Record<string, number> = {};
let lastMessageTime: number = Date.now();

let knowledgeBase: { question: string; answer: string }[] = [];

async function main() {
  knowledgeBase = await loadKnowledgeBase();

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
  });

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    updateQR(qr);
  });

  client.on('ready', () => {
    console.log('WhatsApp bot ready.');
    setInterval(() => {
      logStatus({ connected: true, lastMessageTime });
    }, HEALTH_INTERVAL_MS);
  });

  client.on('disconnected', (reason) => {
    logStatus({ connected: false, lastMessageTime });
    console.error('WhatsApp disconnected:', reason);
    process.exit(1);
  });

  client.on('auth_failure', (msg) => {
    logStatus({ connected: false, lastMessageTime });
    console.error('Auth failure:', msg);
    process.exit(1);
  });

  client.on('message', async (msg: Message) => {
    try {
      if (msg.fromMe || msg.isStatus || msg.author) return;
      const chat: Chat = await msg.getChat();
      if (chat.isGroup) return;
      lastMessageTime = Date.now();
      const user = msg.from;
      const now = Date.now();
      if (lastReply[user] && now - lastReply[user] < RATE_LIMIT_SECONDS * 1000) return;
      lastReply[user] = now;
      const text = msg.body?.trim() || '';
      if (!text || text.length > MAX_MSG_LENGTH || msg.type !== 'chat') {
        await msg.reply(FALLBACK_REPLY);
        logInteraction({ type: 'inbound', user, text, timestamp: now });
        logInteraction({ type: 'outbound', user, text: FALLBACK_REPLY, timestamp: now });
        return;
      }
      logInteraction({ type: 'inbound', user, text, timestamp: now });
      const bestQA = getBestAnswer(text, knowledgeBase);
      logMessage(text);
      
      // Создаём контекст из всех Q&A из Google Sheets
      const faqContext = knowledgeBase
        .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join('\n\n');
      
      const systemPrompt =
        `You are a helpful support assistant. First, check the knowledge base below to understand what business/service we provide, then answer all user questions based on this information.

Knowledge Base:
${faqContext}

Rules:
- Always answer based on the knowledge base provided above
- Keep responses short and friendly
- If information is not in the knowledge base, suggest contacting support directly
- Stay professional and helpful`;
      
      const aiReply = await askAI(text, bestQA, systemPrompt);
      if (typeof aiReply === 'string' && aiReply.trim()) {
        try {
          await msg.reply(aiReply.trim());
          logInteraction({ type: 'outbound', user, text: aiReply.trim(), timestamp: Date.now() });
        } catch (err) {
          console.error('msg.reply failed, trying chat.sendMessage:', err);
          try {
            const chat = await msg.getChat();
            if (chat && chat.sendMessage) {
              await chat.sendMessage(aiReply.trim());
              logInteraction({ type: 'outbound', user, text: aiReply.trim(), timestamp: Date.now() });
            }
          } catch (err2) {
            console.error('chat.sendMessage also failed:', err2);
          }
        }
      }
    } catch (err) {
      console.error('Message handler error:', err);
    }
  });

  client.initialize();
}

main();
