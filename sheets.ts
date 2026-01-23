import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

export async function loadKnowledgeBase() {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      console.error('[Sheets] GOOGLE_SHEET_ID not set');
      return [];
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      console.error('[Sheets] Service account credentials not set');
      return [];
    }

    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
    await doc.loadInfo();

    // Ищем лист с названием "knowledge"
    const sheet = doc.sheetsByTitle['knowledge'];
    if (!sheet) {
      console.error('[Sheets] Sheet "knowledge" not found. Available sheets:', Object.keys(doc.sheetsByTitle));
      return [];
    }

    const rows = await sheet.getRows();
    console.log(`[Sheets] Found ${rows.length} rows in "knowledge" sheet`);

    // DEBUG: Выведем первую строку, чтобы увидеть названия колонок
    if (rows.length > 0) {
      console.log('[DEBUG] First row:', rows[0]);
    }

    return rows.map((row: any) => {
      // Используем метод get() для получения значений по названию колонки
      const question = row.get('Question')?.toString().trim() || '';
      const answer = row.get('Answer')?.toString().trim() || '';
      return { question, answer };
    }).filter(qa => qa.question && qa.answer);
  } catch (err) {
    console.error('[Sheets Error]', err.message);
    return [];
  }
}

export function getBestAnswer(question: string, knowledgeBase: any[]) {
  const q = question.toLowerCase().trim();
  
  // Точный поиск - слова из вопроса в ответе
  const exactMatch = knowledgeBase.find(qa => {
    const qLower = qa.question.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 2);
    return words.some(word => qLower.includes(word));
  });
  
  if (exactMatch) {
    console.log(`[SHEETS] Found exact match: "${exactMatch.question}"`);
    return exactMatch;
  }
  
  // Нечёткий поиск - если нет точного совпадения
  const fuzzyMatch = knowledgeBase.find(qa => 
    qa.question.toLowerCase().includes(q) || 
    q.includes(qa.question.toLowerCase())
  );
  
  if (fuzzyMatch) {
    console.log(`[SHEETS] Found fuzzy match: "${fuzzyMatch.question}"`);
    return fuzzyMatch;
  }
  
  console.log(`[SHEETS] No match found for: "${question}"`);
  return null;
}
