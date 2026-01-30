import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

export async function loadKnowledgeBase(): Promise<Array<{ question: string; answer: string }>> {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      console.error('[✗] GOOGLE_SHEET_ID not set in .env');
      return [];
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      console.error('[✗] Service account credentials not set in .env');
      return [];
    }

    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['knowledge'];
    if (!sheet) {
      console.error('[✗] Sheet "knowledge" not found. Available:', Object.keys(doc.sheetsByTitle));
      return [];
    }

    const rows = await sheet.getRows();
    console.log(`[✓] Loaded ${rows.length} rows from Google Sheets`);

    const knowledgeBase = rows
      .map((row: any) => {
        const question = row.get('Question')?.toString().trim() || '';
        const answer = row.get('Answer')?.toString().trim() || '';
        return { question, answer };
      })
      .filter(qa => qa.question && qa.answer);

    console.log(`[✓] Processed ${knowledgeBase.length} Q&A pairs`);
    return knowledgeBase;
  } catch (err: any) {
    console.error('[✗] Google Sheets error:', err.message);
    return [];
  }
}

export function getBestAnswer(
  userQuestion: string,
  knowledgeBase: Array<{ question: string; answer: string }>
): { question: string; answer: string } | null {
  const q = userQuestion.toLowerCase().trim();
  
  console.log(`[🔍] Searching: "${q}"`);
  
  // Exact match
  const exactMatch = knowledgeBase.find(qa => 
    qa.question.toLowerCase() === q
  );
  
  if (exactMatch) {
    console.log(`[✓] Exact match: "${exactMatch.question}"`);
    return exactMatch;
  }
  
  // Keyword matching with scoring
  const words = q.split(/\s+/).filter(w => w.length > 2);
  console.log(`[🔍] Keywords: [${words.join(', ')}]`);
  
  let matches = knowledgeBase.map(qa => {
    const qLower = qa.question.toLowerCase();
    const matchedWords = words.filter(word => qLower.includes(word));
    const score = matchedWords.length / words.length;
    
    if (matchedWords.length > 0) {
      console.log(`  → "${qa.question}" - ${Math.round(score * 100)}% match (${matchedWords.length}/${words.length} words)`);
    }
    
    return { qa, score, matchedWords: matchedWords.length };
  }).filter(item => item.matchedWords > 0);
  
  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);
  
  // Return best match if score is reasonable
  const best = matches[0];
  if (best && best.score >= 0.4) {
    console.log(`[✓] Best match (${Math.round(best.score * 100)}%): "${best.qa.question}"`);
    return best.qa;
  }
  
  // Try partial match as last resort
  const partialMatch = knowledgeBase.find(qa => {
    const qLower = qa.question.toLowerCase();
    return qLower.includes(q) || q.includes(qLower);
  });
  
  if (partialMatch) {
    console.log(`[✓] Partial match: "${partialMatch.question}"`);
    return partialMatch;
  }
  
  console.log('[!] No match found');
  return null;
}
