import { useMemo, useRef, useState, lazy, Suspense } from 'react';
import { AlertCircle, Check, FileText, Loader2, Plus, Trash2, X } from 'lucide-react';
import { C, fontBody, fontMono, uid } from './App.jsx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MathInput = lazy(() => import('./MathInput.jsx'));
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 50;
const MAX_TEXT_LENGTH = 100_000;

function getPageText(items) {
  const rows = [];
  const sortedItems = items
    .filter((item) => item.str?.trim())
    .map((item) => ({ x: item.transform?.[4] ?? 0, y: item.transform?.[5] ?? 0, text: item.str }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  for (const item of sortedItems) {
    let row = rows[rows.length - 1];
    if (!row || Math.abs(row.y - item.y) >= 2.5) { row = { y: item.y, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ')).join('\n');
}

function parseAnswerKey(text) {
  const match = text.match(/(?:javoblar?\s*(?:kaliti)?|answer\s*key)\s*[:\-]\s*([\s\S]*)$/i);
  if (!match) return { questionsText: text, keys: new Map() };
  const keys = new Map();
  const entries = match[1].matchAll(/(?:^|[\s,;([{])(?:№\s*)?(\d{1,3})\s*[).:\-]?\s*([A-D])/gi);
  for (const entry of entries) keys.set(Number(entry[1]), entry[2].toUpperCase().charCodeAt(0) - 65);
  const start = match.index ?? text.length;
  return { questionsText: text.slice(0, start).trim(), keys };
}

function parseQuestionBlocks(text, keys) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const start = line.match(/^(?:Savol\s*)?(\d{1,3})\s*[.)]\s*(.+)$/i);
    if (start) {
      if (current) blocks.push(current);
      current = { number: Number(start[1]), lines: [start[2]] };
    } else if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);

  return blocks.map((block) => {
    // PDF text extraction often collapses an entire visual row, so options
    // must be found both at line starts and inline (e.g. "A) ... B) ...").
    const flattened = block.lines.join(' ').replace(/\s+/g, ' ').trim();
    const optionRegex = /(?:^|\s)([A-D])\s*[).]\s*/gi;
    const optionStarts = [...flattened.matchAll(optionRegex)].map((match) => ({
      letter: match[1].toUpperCase(),
      start: match.index + match[0].length,
      markerStart: match.index,
    }));
    // A stray A) in a problem statement is not enough to classify a question
    // as multiple choice; require at least two distinct option labels.
    const labels = new Set(optionStarts.map((option) => option.letter));
    const isMcq = optionStarts.length >= 2 && labels.size >= 2;
    const text = isMcq ? flattened.slice(0, optionStarts[0].markerStart).trim() : flattened;
    const options = isMcq ? optionStarts.map((option, index) => ({
      letter: option.letter,
      text: flattened.slice(option.start, optionStarts[index + 1]?.markerStart ?? flattened.length).trim(),
    })) : [];
    const correctLetterIndex = keys.get(block.number);
    const correctLetter = Number.isInteger(correctLetterIndex) ? String.fromCharCode(65 + correctLetterIndex) : null;
    const correctOptionIndex = isMcq ? options.findIndex((option) => option.letter === correctLetter) : -1;
    return {
      id: uid(), type: isMcq ? 'mcq' : 'open', text,
      options: isMcq ? options.map((option) => option.text) : undefined,
      optionsAreMath: isMcq || undefined,
      correct: isMcq ? (correctOptionIndex >= 0 ? correctOptionIndex : 0) : undefined,
      answerMode: isMcq ? undefined : 'math', answers: isMcq ? undefined : [],
      // The extracted key is only a suggestion. Ask the author to verify it
      // before importing, especially because PDF layouts can shift text.
      needsAnswerReview: true,
      hasAnswerKey: correctOptionIndex >= 0,
      sourceNumber: block.number,
    };
  });
}

export default function MathPdfImport({ onImport, onClose }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const incomplete = useMemo(() => drafts.some((question) => !question.text.trim() || (question.type === 'mcq'
    ? question.options.some((option) => !option.trim()) || question.correct < 0 || question.needsAnswerReview
    : !question.answerText?.trim())), [drafts]);

  async function readPdf(file) {
    setError(''); setMessage(''); setLoading(true); setProgress(''); setDrafts([]); setRawText(''); setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setError('PDF 20 MB dan katta. Telefon sekinlashmasligi uchun kichikroq fayl tanlang.');
      setLoading(false); return;
    }
    let pdf;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const bytes = new Uint8Array(await file.arrayBuffer());
      pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
      if (pdf.numPages > MAX_PAGES) {
        throw new Error(`PDF ${MAX_PAGES} sahifadan uzun. Qismlarga bo‘lib yuklang.`);
      }
      let text = '';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setProgress(`${pageNumber}/${pdf.numPages} sahifa`);
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        text += `${getPageText(content.items)}\n`;
        page.cleanup();
        if (text.length > MAX_TEXT_LENGTH) break;
        // Let the browser paint progress and respond to touch/scroll while
        // extracting longer documents on mid-range phones.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      text = text.slice(0, MAX_TEXT_LENGTH).trim();
      setRawText(text);
      const { questionsText, keys } = parseAnswerKey(text);
      const parsed = parseQuestionBlocks(questionsText, keys);
      if (!parsed.length) {
        setError('PDF ichidan raqamlangan savollarni avtomatik ajratib bo‘lmadi. Bu skan rasmli fayl bo‘lishi mumkin. Matnni pastdan ko‘rib, savollarni qo‘lda qo‘shing.');
        return;
      }
      setDrafts(parsed.map((question) => ({ ...question, answerText: '' })));
      const needsReview = parsed.filter((question) => question.needsAnswerReview).length;
      setMessage(`${parsed.length} ta savol topildi${needsReview ? ` · ${needsReview} tasining javobini tekshirib tasdiqlang` : ''}. Saqlashdan oldin matnni ko‘rib chiqing.`);
    } catch (cause) {
      setError(cause?.message || 'PDFni o‘qib bo‘lmadi. Fayl buzilgan yoki himoyalangan bo‘lishi mumkin.');
    } finally {
      await pdf?.destroy().catch(() => {});
      setLoading(false);
      setProgress('');
    }
  }

  function updateDraft(id, changes) {
    setDrafts((current) => current.map((question) => question.id === id ? { ...question, ...changes } : question));
  }

  function confirmImport() {
    if (!drafts.length || incomplete) return;
    onImport(drafts.map(({ answerText, needsAnswerReview, sourceNumber, ...question }) => question));
  }

  return (
    <section className="mt-3 rounded-xl p-3 sm:p-4" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }} aria-label="PDFdan matematik savollarni olish">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: C.mathTint, color: C.mathDeep }}><FileText size={17} /></span>
          <div>
            <h3 className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>PDF savollarni ajratish</h3>
            <p className="mt-0.5 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Matni tanlanadigan PDF, 20 MB gacha va 50 sahifagacha. Savollar raqamlangan, A)–D) variantlari alohida qatorda bo‘lsin; javob kaliti bo‘lmasa, o‘zingiz belgilang. Skan PDF OCR qilinmaydi.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-md p-1" style={{ color: C.inkSoft }}><X size={17} /></button>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readPdf(file); event.target.value = ''; }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm disabled:opacity-60" style={{ ...fontBody, color: C.white, background: C.mathDeep }}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}{loading ? `O‘qilmoqda${progress ? ` · ${progress}` : ''}` : fileName ? 'Boshqa PDF tanlash' : 'PDF faylni tanlash'}
      </button>
      {fileName && <span className="ml-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>{fileName}</span>}
      {error && <div role="alert" className="mt-3 flex gap-2 rounded-lg p-2.5 text-xs" style={{ ...fontBody, color: C.red, background: C.dangerTint }}><AlertCircle size={15} className="shrink-0" />{error}</div>}
      {message && <div role="status" className="mt-3 rounded-lg p-2.5 text-xs" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>{message}</div>}

      {drafts.length > 0 && <>
        <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {drafts.map((question, index) => (
            <article key={question.id} className="rounded-lg p-3" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ ...fontBody, color: C.ink }}>Savol {question.sourceNumber || index + 1}</span>
                <button type="button" onClick={() => setDrafts((current) => current.filter((item) => item.id !== question.id))} aria-label={`Savol ${index + 1} ni olib tashlash`} className="rounded-md p-1" style={{ color: C.red }}><Trash2 size={15} /></button>
              </div>
              <textarea value={question.text} onChange={(event) => updateDraft(question.id, { text: event.target.value })} rows={2} placeholder="Savol matni" className="w-full rounded-lg p-2 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paperSoft, border: `1px solid ${C.rule}` }} />
              {question.type === 'mcq' ? question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="mt-1.5 flex items-center gap-2">
                  <input type="radio" name={`pdf-correct-${question.id}`} checked={question.correct === optionIndex} onChange={() => updateDraft(question.id, { correct: optionIndex, needsAnswerReview: false })} aria-label={`${String.fromCharCode(65 + optionIndex)} to‘g‘ri javob`} />
                  <input value={option} onChange={(event) => updateDraft(question.id, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item) })} className="w-full rounded-lg px-2 py-1.5 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paperSoft, border: `1px solid ${C.rule}` }} />
                  <span className="text-[10px]" style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + optionIndex)}</span>
                </div>
              )) : <Suspense fallback={<div className="mt-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Javob maydoni…</div>}>
                <MathInput label="To‘g‘ri javob" value={question.answerText} onChange={(answerText) => updateDraft(question.id, { answerText, answers: answerText ? [answerText] : [] })} placeholder="Javobni formulada yozing" />
              </Suspense>}
              {question.needsAnswerReview && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5" style={{ background: C.mathTint }}>
                <span className="text-[11px]" style={{ ...fontBody, color: C.mathDeep }}>{question.hasAnswerKey ? 'PDF javob kalitini tekshiring.' : 'To‘g‘ri javobni belgilang.'}</span>
                <button type="button" onClick={() => updateDraft(question.id, { needsAnswerReview: false })} className="min-h-8 rounded-md px-2 text-xs font-semibold" style={{ ...fontBody, color: C.white, background: C.mathDeep }}>Javobni tasdiqlash</button>
              </div>}
            </article>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs" style={{ ...fontBody, color: incomplete ? C.red : C.inkSoft }}>{drafts.length} savol · {incomplete ? 'javoblarni tasdiqlang va to‘ldiring' : 'qo‘shishga tayyor'}</span>
          <button type="button" disabled={incomplete} onClick={confirmImport} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-45" style={{ ...fontBody, color: C.white, background: C.cover }}><Check size={16} /> Savollarni qo‘shish</button>
        </div>
      </>}
      {!drafts.length && rawText && <details className="mt-3">
        <summary className="cursor-pointer text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ajratilgan matnni ko‘rish</summary>
        <textarea readOnly value={rawText} rows={7} className="mt-2 w-full rounded-lg p-2 text-xs" style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }} />
      </details>}
    </section>
  );
}

