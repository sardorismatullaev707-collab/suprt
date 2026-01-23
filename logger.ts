import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve(typeof __dirname !== 'undefined' ? __dirname : process.cwd(), 'logs.jsonl');

export function logInteraction(entry: {
  type: 'inbound' | 'outbound';
  user: string;
  text: string;
  timestamp: number;
}) {
  const line = JSON.stringify(entry);
  fs.appendFile(LOG_PATH, line + '\n', (err: NodeJS.ErrnoException | null) => {
    if (err) console.error('Log error:', err);
  });
}

export function logStatus(status: {
  connected: boolean;
  lastMessageTime: number;
}) {
  const line = JSON.stringify({
    type: 'status',
    ...status,
    timestamp: Date.now()
  });
  fs.appendFile(LOG_PATH, line + '\n', (err) => {
    if (err) console.error('Log error:', err);
  });
}
