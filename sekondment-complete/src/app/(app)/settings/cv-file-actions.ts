'use server';

import { extractExpertiseFromText } from './cv-ai-actions';
import mammoth from 'mammoth';
import pdf from 'pdf-parse/lib/pdf-parse.js';

/* CV file → text → AI-powered structured extraction.
   Accepts plain text / .txt / .md directly. For PDF/DOCX we attempt extraction if
   a parser is available at runtime; otherwise we ask the user to paste the text.
   Uses AI extraction to get headline, bio, skills, achievements, and suggested rate. */
export async function extractFromCvFile(formData: FormData) {
  const file = formData.get('cv') as File | null;
  if (!file) return { ok: false as const, error: 'No file received.' };
  if (file.size > 8 * 1024 * 1024) return { ok: false as const, error: 'File too large (max 8MB).' };

  const name = (file.name || '').toLowerCase();
  let text = '';

  try {
    if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) {
      text = await file.text();
    } else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const parsed = await pdf(buf);
        text = parsed?.text ?? '';
      } catch { /* fall through */ }
      if (!text) {
        return { ok: false as const, error: 'Could not read this PDF automatically. Please paste the CV text instead — extraction works the same way.' };
      }
    } else if (name.endsWith('.docx')) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const r = await mammoth.extractRawText({ buffer: buf });
        text = r?.value ?? '';
      } catch { /* fall through */ }
      if (!text) {
        return { ok: false as const, error: 'Could not read this Word file automatically. Please paste the CV text instead.' };
      }
    } else {
      return { ok: false as const, error: 'Unsupported file type. Upload a PDF, Word doc, or text file — or paste the text.' };
    }
  } catch (e) {
    return { ok: false as const, error: 'Could not read the file. Try pasting the text instead.' };
  }

  if (text.trim().length < 20) {
    return { ok: false as const, error: 'Not enough readable text found. Try pasting the CV text instead.' };
  }

  // Delegate to AI extraction - returns { ok: true; extracted: Extraction; charCount } | { ok: false; error }
  return await extractExpertiseFromText(text);
}
