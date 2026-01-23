import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import dotenv from 'dotenv';
dotenv.config();
import { askAI } from './ai';
import { loadKnowledgeBase, getBestAnswer } from './sheets';
import qrcode from 'qrcode-terminal';
import { updateQR, logMessage } from './web-dashboard';
import fs from 'fs';
import path from 'path';

async function start() {
  const authDir = 'baileys_auth';
  
  // Очистить кэш при первом запуске если есть ошибки подключения
  if (fs.existsSync(authDir)) {
    const creds = path.join(authDir, 'creds.json');
    if (fs.existsSync(creds)) {
      try {
        const data = JSON.parse(fs.readFileSync(creds, 'utf-8'));
        if (!data.me || !data.me.id) {
          console.log('[→] Clearing invalid credentials...');
          fs.rmSync(authDir, { recursive: true });
        }
      } catch (e) {
        console.log('[→] Clearing corrupted credentials...');
        fs.rmSync(authDir, { recursive: true });
      }
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const sock = makeWASocket({ 
    auth: state,
    browser: ['Chrome', 'Chrome', '120.0.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  sock.ev.on('creds.update', saveCreds);

  // Загружаем базу знаний из Google Sheets
  let knowledgeBase: { question: string; answer: string }[] = [];
  try {
    knowledgeBase = await loadKnowledgeBase();
    console.log(`[✓] Google Sheets: Загружено ${knowledgeBase.length} записей.`);
  } catch (err) {
    console.error('[✗] Google Sheets Error:', err);
  }

  let qrGenerated = false;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('[→] QR code received');
      qrGenerated = true;
      try {
        qrcode.generate(qr, { small: true });
        console.log('[→] Scan with WhatsApp on your phone');
        updateQR(qr);
      } catch (e) {
        console.error('[✗] QR generation error:', e);
      }
    }
    
    if (connection === 'open') {
      console.log('[✓] WhatsApp connected successfully!');
      updateQR(null);
    }
    
    if (connection === 'close') {
      const error = lastDisconnect?.error as any;
      const statusCode = error?.output?.statusCode;
      
      // 515 = Stream Errored (restart required) - это норма при первом подключении
      // 401 = Unauthorized
      // DisconnectReason.loggedOut = сознательный выход
      
      console.log(`[✗] Disconnected with code: ${statusCode}`);
      
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log('[→] Logged out. Please scan QR again.');
        fs.rmSync(authDir, { recursive: true, force: true });
        qrGenerated = false;
        setTimeout(start, 2000);
      } else if (statusCode === 515) {
        // Stream error - переподключаемся автоматически
        console.log('[⏳] Stream error, reconnecting in 2 seconds...');
        setTimeout(start, 2000);
      } else {
        // Все остальные ошибки
        console.log('[⏳] Reconnecting in 3 seconds...');
        setTimeout(start, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg) return;
    if (!msg.key?.fromMe && msg.message?.conversation) {
      const userMessage = msg.message.conversation;
      console.log(`[MSG] ${msg.key.remoteJid}: ${userMessage}`);
      logMessage(userMessage);
      
      const bestQA = knowledgeBase.length ? getBestAnswer(userMessage, knowledgeBase) : null;
      if (bestQA) {
        console.log(`[✓] Using FAQ: Q="${bestQA.question}" → A="${bestQA.answer}"`);
      } else {
        console.log(`[ℹ] No FAQ found, using AI to generate response`);
      }
      
      // Создаём контекст из всех Q&A из Google Sheets
      const faqContext = knowledgeBase
        .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join('\n\n');
      
      const systemPrompt = `You are a helpful support assistant. First, check the knowledge base below to understand what business/service we provide, then answer all user questions based on this information.

Knowledge Base:
${faqContext}

Rules:
- Always answer based on the knowledge base provided above
- Keep responses short and friendly
- If information is not in the knowledge base, suggest contacting support directly
- Stay professional and helpful`;

      const aiReply = await askAI(userMessage, bestQA, systemPrompt);
      
      if (aiReply && msg.key?.remoteJid) {
        await sock.sendMessage(msg.key.remoteJid, { text: aiReply });
        console.log(`[REPLY] → ${aiReply}\n`);
      }
    }
  });

  setInterval(() => {
    console.log('[♥] bot alive');
  }, 120000);
}

start().catch(err => {
  console.error('[FATAL ERROR]', err);
  setTimeout(start, 5000);
});
