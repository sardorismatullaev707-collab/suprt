import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

// Храним статистику
let stats = {
  totalMessages: 0,
  questions: {} as Record<string, number>
};

// Для хранения QR-кода (текст)
let currentQR: string | null = null;

// API для обновления QR-кода из бота
export function updateQR(qr: string | null) {
  currentQR = qr;
  io.emit('qr', qr);
}

// API для обновления статистики из бота
export function logMessage(question: string) {
  stats.totalMessages++;
  if (question) {
    stats.questions[question] = (stats.questions[question] || 0) + 1;
  }
  io.emit('stats', stats);
}

app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/api/stats', (req, res) => {
  res.json(stats);
});

app.get('/api/qr', (req, res) => {
  res.json({ qr: currentQR });
});

app.get('/api/sheet', (req, res) => {
  res.json({ url: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}` });
});

io.on('connection', (socket) => {
  if (currentQR) socket.emit('qr', currentQR);
  socket.emit('stats', stats);
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Web dashboard running: http://localhost:${PORT}`);
});

export { server };
