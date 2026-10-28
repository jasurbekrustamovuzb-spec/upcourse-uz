import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { AlertCircle, Check, FileText, Loader2, Trash2, X } from 'lucide-react';
import { C, fontBody, fontMono, sbUploadImage, uid } from './App.jsx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 50;
const MAX_TEXT_LENGTH = 100_000;
const MAX_QUESTIONS = 100;

function getPageRows(items) {
  const rows = [];
  const sorted = items
    .filter((item) => item.str && item.str.trim())
    .map((item) => ({ x: item.transform && item.transform[4] || 0, y: item.transform && item.transform[5] || 0, text: item.str }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of sorted) {
    let row = rows[rows.length - 1];
    if (!row || Math.abs(row.y - item.y) >= 2.7) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }

  return rows
    .map((row) => ({
      y: row.y,
      x: Math.min(...row.items.map((item) => item.x)),
      text: row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim(),
    }))
    .filter((row) => row.text);
}

function questionNumber(row) {
  const match = row.text.match(/^(\d{1,2})\s*[.)]\s*/);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= 45 ? number : null;
}

function optionLetter(row) {
  const match = row.text.match(/^([A-F])\s*[).]\s*/);
  return match ? match[1] : null;
}

function subpartLetter(row) {
  const match = row.text.match(/^([a-z])\s*[).]\s+\S/);
  return match ? match[1] : null;
}

function isBoilerplate(text) {
  return /^(?:MILLIY SERTIFIKAT NAMUNAVIY|@MatematikaMilliy|A\+\s*SARI|Diqqat!\s*Javoblaringiz|Javob:\s*$)/i.test(text.trim());
}

function readableText(rows) {
  return rows.filter((row) => !isBoilerplate(row.text)).map((row) => row.text).join(' ').replace(/\s+/g, ' ').trim();
}

function parseAnswerKey(text) {
  const match = text.match(/(?:javoblar?\s*(?:kaliti)?|answer\s*key)\s*[:\-]\s*([\s\S]*)$/i);
  if (!match) return new Map();
  const keys = new Map();
  const entries = match[1].matchAll(/(?:^|[\s,;([{])(?:№\s*)?(\d{1,3})\s*[).:\-]?\s*([A-F])/gi);
  for (const entry of entries) keys.set(Number(entry[1]), entry[2].toUpperCase());
  return keys;
}

function pageQuestionBlocks(rows, seenNumbers) {
  const starts = [];
  for (let index = 0; index < rows.length; index += 1) {
    const number = questionNumber(rows[index]);
    if (number === null || seenNumbers.has(number)) continue;
    seenNumbers.add(number);
    starts.push({ number, index });
  }
  return starts.map((start, index) => ({
    number: start.number,
    start: start.index,
    end: (starts[index + 1] ? starts[index + 1].index : rows.length) - 1,
  }));
}

function sharedGroups(rows, blocks) {
  if (!blocks.length) return [];
  const firstQuestion = blocks[0].start;
  const groups = [];
  for (let index = 0; index < firstQuestion; index += 1) {
    const match = rows[index].text.match(/(\d{1,2})\s*[–—-]\s*(\d{1,2})\s*-?\s*topshiriqlar?/i);
    if (!match || !/A\s*[–—-]\s*F/i.test(rows[index].text)) continue;
    const from = Number(match[1]);
    const to = Number(match[2]);
    // PDF.js can place the option letter and its fraction on separate baselines.
    // Search each extracted row for labels instead of requiring the label at column 0.
    const letters = rows.slice(index + 1, firstQuestion).flatMap((row) => (
      [...row.text.matchAll(/(?:^|\s)([A-F])\s*[).](?=\s|$)/g)].map((match) => match[1])
    ));
    const letterSet = new Set(letters);
    if (from <= to && ['A', 'B', 'C', 'D', 'E', 'F'].every((letter) => letterSet.has(letter))) {
      groups.push({ from, to, start: index, end: firstQuestion - 1 });
    }
  }
  return groups;
}

function visibleRange(rows, start, end) {
  return rows.slice(Math.max(0, start), Math.min(rows.length, end + 1)).filter((row) => !isBoilerplate(row.text));
}

function getSubparts(rows, block) {
  const found = [];
  for (let index = block.start; index <= block.end; index += 1) {
    const letter = subpartLetter(rows[index]);
    // Some PDFs expose the same visual line twice (e.g. OCR text plus the real glyph).
    // Keep the first occurrence of each a)/b) part so it is not imported twice.
    if (letter && !found.some((part) => part.letter === letter)) found.push({ letter, index });
  }
  if (found.length < 2 || found[0].letter !== 'a' || found[1].letter !== 'b') return [];
  return found;
}

function cropRect(rows, scale, viewport) {
  if (!rows.length) return null;
  const ys = rows.map((row) => row.y);
  const upper = Math.max(...ys) + 13;
  const lower = Math.min(...ys) - 9;
  const top = Math.max(0, Math.floor(viewport.height - upper * scale));
  const bottom = Math.min(viewport.height, Math.ceil(viewport.height - lower * scale));
  return bottom > top ? { top, height: bottom - top } : null;
}

async function renderQuestionCrop(pageCanvas, viewport, scale, sections) {
  const rects = sections.map((rows) => cropRect(rows, scale, viewport)).filter(Boolean);
  if (!rects.length) throw new Error('Savol rasmini PDFdan ajratib bo‘lmadi.');

  const marginX = Math.round(pageCanvas.width * 0.045);
  const width = Math.max(1, pageCanvas.width - marginX * 2);
  const gap = Math.round(scale * 9);
  const height = rects.reduce((total, rect) => total + rect.height, 0) + gap * Math.max(0, rects.length - 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('PDF rasmini tayyorlash uchun canvas ochilmadi.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  let targetY = 0;
  for (const rect of rects) {
    context.drawImage(pageCanvas, marginX, rect.top, width, rect.height, 0, targetY, width, rect.height);
    targetY += rect.height + gap;
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error('Savol rasmi saqlanmadi. Boshqa PDFni sinab ko‘ring.');
  return blob;
}

function makeQuestionDraft(block, rows, pageNumber, pageCanvas, viewport, scale, group, keys) {
  const blockRows = visibleRange(rows, block.start, block.end);
  const groupRows = group ? visibleRange(rows, group.start, group.end) : [];
  const letters = group ? ['A', 'B', 'C', 'D', 'E', 'F'] : blockRows.map(optionLetter).filter(Boolean);
  const isMcq = group || (letters.length === 4 && letters.join('') === 'ABCD');
  const keyLetter = keys.get(block.number);
  const keyIndex = isMcq && keyLetter ? letters.indexOf(keyLetter) : -1;

  if (isMcq) {
    const stemRows = group ? [...groupRows, ...blockRows] : blockRows;
    const imageSections = group ? [groupRows, blockRows] : [blockRows];
    return [{
      id: uid(),
      type: 'mcq',
      text: readableText(stemRows),
      options: letters,
      correct: keyIndex,
      imageBlob: null,
      imageSections,
      sourcePage: pageNumber,
      sourceNumber: block.number,
      pdfSourceImageOnly: true,
      needsAnswerReview: true,
      hasAnswerKey: keyIndex >= 0,
    }];
  }

  const parts = getSubparts(rows, block);
  if (parts.length) {
    const commonRows = visibleRange(rows, block.start, parts[0].index - 1);
    return parts.map((part, partIndex) => {
      const nextPart = parts[partIndex + 1];
      const partRows = visibleRange(rows, part.index, (nextPart ? nextPart.index : block.end) - 1)
        .filter((row) => !/^Javob:\s*$/i.test(row.text));
      const questionText = [readableText(commonRows), readableText(partRows)].filter(Boolean).join(' ');
      return {
        id: uid(),
        type: 'open',
        answerMode: 'math',
        text: questionText,
        options: undefined,
        answers: [],
        answerText: '',
        imageBlob: null,
        imageSections: [commonRows, partRows].filter((section) => section.length),
        sourcePage: pageNumber,
        sourceNumber: block.number + part.letter,
        pdfSourceImageOnly: true,
        needsAnswerReview: false,
      };
    });
  }

  return [{
    id: uid(),
    type: 'open',
    answerMode: 'math',
    text: readableText(blockRows),
    options: undefined,
    answers: [],
    answerText: '',
    imageBlob: null,
    imageSections: [blockRows],
    sourcePage: pageNumber,
    sourceNumber: block.number,
    pdfSourceImageOnly: true,
    needsAnswerReview: false,
  }];
}

export default function MathPdfImport({ onImport, onClose }) {
  const inputRef = useRef(null);
  const previewUrls = useRef(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState(null);

  const incomplete = useMemo(() => drafts.some((question) => (
    (!question.text.trim() && !question.sourcePreviewUrl)
    || (question.type === 'mcq'
      ? question.options.length < 2 || question.correct < 0 || question.needsAnswerReview
      : !question.answerText.trim())
  )), [drafts]);

  function revokePreviews() {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current.clear();
  }

  useEffect(() => () => revokePreviews(), []);

  async function readPdf(file) {
    revokePreviews();
    setError('');
    setMessage('');
    setLoading(true);
    setProgress('');
    setDrafts([]);
    setRawText('');
    setFileName(file.name);
    setEditingAnswerId(null);

    if (file.size > MAX_FILE_BYTES) {
      setError('PDF 20 MB dan katta. Telefon sekinlashmasligi uchun kichikroq fayl tanlang.');
      setLoading(false);
      return;
    }

    let loadingTask;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const bytes = new Uint8Array(await file.arrayBuffer());
      loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
      const pdf = await loadingTask.promise;
      if (pdf.numPages > MAX_PAGES) throw new Error('PDF ' + MAX_PAGES + ' sahifadan uzun. Qismlarga bo‘lib yuklang.');

      let totalTextLength = 0;
      const allRows = [];
      const parsed = [];
      const seenNumbers = new Set();

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setProgress(pageNumber + '/' + pdf.numPages + ' · matn');
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const rows = getPageRows(content.items);
        allRows.push(...rows);
        totalTextLength += rows.reduce((total, row) => total + row.text.length, 0);
        const blocks = pageQuestionBlocks(rows, seenNumbers);
        const groups = sharedGroups(rows, blocks);
        const groupForQuestion = (number) => groups.find((group) => number >= group.from && number <= group.to);

        if (blocks.length) {
          const pageWidth = page.view[2] - page.view[0];
          const scale = Math.min(1.5, 1000 / pageWidth);
          const viewport = page.getViewport({ scale });
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = Math.ceil(viewport.width);
          pageCanvas.height = Math.ceil(viewport.height);
          const pageContext = pageCanvas.getContext('2d', { alpha: false });
          if (!pageContext) throw new Error('PDF sahifasini rasmga aylantirib bo‘lmadi.');
          pageContext.fillStyle = '#ffffff';
          pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          setProgress(pageNumber + '/' + pdf.numPages + ' · rasmlar');
          await page.render({ canvasContext: pageContext, viewport }).promise;

          for (const block of blocks) {
            const group = groupForQuestion(block.number);
            const questions = makeQuestionDraft(block, rows, pageNumber, pageCanvas, viewport, scale, group, new Map());
            for (const question of questions) {
              question.imageBlob = await renderQuestionCrop(pageCanvas, viewport, scale, question.imageSections);
              question.sourcePreviewUrl = URL.createObjectURL(question.imageBlob);
              previewUrls.current.add(question.sourcePreviewUrl);
              delete question.imageSections;
              parsed.push(question);
              if (parsed.length >= MAX_QUESTIONS) break;
            }
            if (parsed.length >= MAX_QUESTIONS) break;
          }
          pageCanvas.width = 0;
          pageCanvas.height = 0;
          page.cleanup();
        } else {
          page.cleanup();
        }
        if (totalTextLength > MAX_TEXT_LENGTH || parsed.length >= MAX_QUESTIONS) break;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const allText = allRows.map((row) => row.text).join('\n').slice(0, MAX_TEXT_LENGTH);
      setRawText(allText);
      if (!parsed.length) {
        setError('PDF ichidan raqamlangan savollarni topib bo‘lmadi. Matni tanlanadigan PDF faylini tanlang; skan nusxada savollarni avtomatik ajratish ishlamaydi.');
        return;
      }

      const keys = parseAnswerKey(allText);
      const withKeys = parsed.map((question) => {
        if (question.type !== 'mcq') return question;
        const optionLetters = question.options;
        const keyLetter = keys.get(Number(String(question.sourceNumber).match(/^\d+/)?.[0]));
        const keyIndex = keyLetter ? optionLetters.indexOf(keyLetter) : -1;
        return {
          ...question,
          correct: keyIndex,
          hasAnswerKey: keyIndex >= 0,
          needsAnswerReview: true,
        };
      });
      setDrafts(withKeys);
      const pending = withKeys.filter((question) => question.type === 'mcq').length;
      setMessage(withKeys.length + ' ta savol topildi va asl PDF ko‘rinishi saqlandi. ' + pending + ' ta variantli savolda to‘g‘ri javobni tasdiqlang; yozma savollarga javob kiriting.');
    } catch (cause) {
      setError(cause && cause.message || 'PDFni o‘qib bo‘lmadi. Fayl buzilgan yoki himoyalangan bo‘lishi mumkin.');
    } finally {
      await loadingTask?.destroy().catch(() => {});
      setLoading(false);
      setProgress('');
    }
  }

  function updateDraft(id, changes) {
    setDrafts((current) => current.map((question) => question.id === id ? { ...question, ...changes } : question));
  }

  async function confirmImport() {
    if (!drafts.length || incomplete || saving) return;
    setSaving(true);
    setError('');
    const uploaded = drafts.map((question) => ({ ...question }));
    const total = uploaded.length;
    let completed = 0;
    let nextIndex = 0;

    async function uploadWorker() {
      while (nextIndex < uploaded.length) {
        const index = nextIndex;
        nextIndex += 1;
        const question = uploaded[index];
        if (question.imageUrl || !question.imageBlob) continue;
        const file = new File([question.imageBlob], 'upcourse-question-' + String(question.sourceNumber || index + 1) + '.jpg', { type: 'image/jpeg' });
        question.imageUrl = await sbUploadImage(file);
        completed += 1;
        setProgress(completed + '/' + total + ' rasm');
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    try {
      const uploadResults = await Promise.allSettled(Array.from({ length: Math.min(3, uploaded.length) }, () => uploadWorker()));
      const failedUpload = uploadResults.find((result) => result.status === 'rejected');
      if (failedUpload) throw failedUpload.reason;
      const cleanQuestions = uploaded.map((question) => {
        const { imageBlob, sourcePreviewUrl, sourcePage, sourceNumber, needsAnswerReview, hasAnswerKey, ...saved } = question;
        if (saved.type === 'open') {
          saved.answers = question.answerText.trim() ? [question.answerText.trim()] : [];
          delete saved.answerText;
        }
        return saved;
      });
      onImport(cleanQuestions);
      revokePreviews();
    } catch (cause) {
      setDrafts(uploaded.map((question) => ({ ...question })));
      setError(cause && cause.message || 'Savol rasmlarini saqlab bo‘lmadi. Internetni tekshirib qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
      setProgress('');
    }
  }

  return (
    <section className="mt-4 w-full min-w-0 border-t pt-4" style={{ borderColor: C.rule }} aria-label="PDFdan matematik savollarni olish">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold" style={{ ...fontBody, color: C.ink }}>
            <FileText size={17} style={{ color: C.mathDeep }} /> PDF savollarini ajratish
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5" style={{ ...fontBody, color: C.inkSoft }}>
            Asl PDFdagi kasr, daraja, ildiz va chizmalar savol rasmi sifatida saqlanadi. Javob variantlari matndan taxmin qilinmaydi; to‘g‘ri javobni o‘zingiz belgilang.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-md p-1" style={{ color: C.inkSoft }}><X size={18} /></button>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) readPdf(file); event.target.value = ''; }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading || saving} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm disabled:opacity-60" style={{ ...fontBody, color: C.white, background: C.mathDeep }}>
        {loading || saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        {loading ? 'PDF tahlil qilinmoqda' + (progress ? ' · ' + progress : '') : saving ? 'Rasmlar saqlanmoqda' + (progress ? ' · ' + progress : '') : fileName ? 'Boshqa PDF tanlash' : 'PDF faylni tanlash'}
      </button>
      {fileName && <span className="ml-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>{fileName}</span>}
      {error && <div role="alert" className="mt-3 flex gap-2 rounded-lg p-2.5 text-xs" style={{ ...fontBody, color: C.red, background: C.dangerTint }}><AlertCircle size={15} className="shrink-0" />{error}</div>}
      {message && <div role="status" className="mt-3 border-l-2 pl-3 py-1 text-sm" style={{ ...fontBody, color: C.mathDeep, borderColor: C.mathSoft }}>{message}</div>}

      {drafts.length > 0 && <>
        <div className="mt-4 space-y-3">
          <fieldset disabled={saving} className="space-y-3">
            {drafts.map((question, index) => (
              <article key={question.id} className="min-w-0 border-b pb-3" style={{ borderColor: C.rule }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Savol {question.sourceNumber || index + 1} <span className="text-xs font-normal" style={{ color: C.inkSoft }}>· {question.sourcePage}-bet</span></span>
                  <button type="button" onClick={() => setDrafts((current) => current.filter((item) => item.id !== question.id))} aria-label={'Savol ' + (question.sourceNumber || index + 1) + ' ni olib tashlash'} className="rounded-md p-1" style={{ color: C.red }}><Trash2 size={15} /></button>
                </div>
                <Suspense fallback={<div className="mb-2 h-28 animate-pulse rounded-lg bg-[#e8e2d2]" />}>
                  <PdfQuestionImage src={question.sourcePreviewUrl} alt={question.text || ('PDFdagi ' + (question.sourceNumber || 'savol') + ' asl ko‘rinishi')} />
                </Suspense>
                <details className="mb-2">
                  <summary className="cursor-pointer text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ajratilgan matnni ko‘rish</summary>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5" style={{ ...fontBody, color: C.ink }}>{question.text || 'Matn ajratilmadi; asl rasm saqlanadi.'}</p>
                </details>
                {question.type === 'mcq' ? (
                  <>
                    <div className="mb-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{question.hasAnswerKey ? 'PDFdan topilgan kalitni tekshiring:' : 'To‘g‘ri variantni tanlang:'}</div>
                    <div className={'grid gap-2 ' + (question.options.length > 4 ? 'grid-cols-3' : 'grid-cols-4')}>
                      {question.options.map((letter, optionIndex) => (
                        <label key={letter} className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 text-sm" style={{ ...fontBody, color: C.ink, background: question.correct === optionIndex ? C.mathTint : 'transparent', borderColor: question.correct === optionIndex ? C.mathSoft : C.rule }}>
                          <input type="radio" name={'pdf-correct-' + question.id} checked={question.correct === optionIndex} onChange={() => updateDraft(question.id, { correct: optionIndex, needsAnswerReview: false })} />
                          <span>{letter}</span>
                        </label>
                      ))}
                    </div>
                    {question.needsAnswerReview && question.hasAnswerKey && <button type="button" onClick={() => updateDraft(question.id, { needsAnswerReview: false })} className="mt-2 min-h-8 rounded-md px-2 text-xs font-semibold" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>Kalit to‘g‘ri — tasdiqlash</button>}
                  </>
                ) : (
                  <div className="mt-2">
                    {editingAnswerId === question.id ? (
                      <>
                        <Suspense fallback={<div className="py-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Matematik klaviatura…</div>}>
                          <MathInput label="To‘g‘ri javob" value={question.answerText} onChange={(answerText) => updateDraft(question.id, { answerText })} placeholder="Javobni formulada kiriting" />
                        </Suspense>
                        <button type="button" onClick={() => setEditingAnswerId(null)} className="mt-1 min-h-8 rounded-md px-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Tayyor</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setEditingAnswerId(question.id)} className="min-h-9 rounded-md px-3 text-xs" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>
                        {question.answerText.trim() ? 'Javob kiritildi · tahrirlash' : 'Javobni formulada kiriting'}
                      </button>
                    )}
                  </div>
                )}
                {question.needsAnswerReview && <div className="mt-2 text-xs" style={{ ...fontBody, color: C.red }}>Javobni tasdiqlamaguncha bu savol testga qo‘shilmaydi.</div>}
              </article>
            ))}
          </fieldset>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs" style={{ ...fontBody, color: incomplete ? C.red : C.inkSoft }}>{drafts.length} savol · {incomplete ? 'javoblarni tekshirib to‘ldiring' : 'saqlashga tayyor'}</span>
          <button type="button" disabled={incomplete || saving} onClick={confirmImport} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-45" style={{ ...fontBody, color: C.white, background: C.cover }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Savollarni qo‘shish
          </button>
        </div>
      </>}
      {!drafts.length && rawText && <details className="mt-3">
        <summary className="cursor-pointer text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ajratilgan matnni ko‘rish</summary>
        <textarea readOnly value={rawText} rows={7} className="mt-2 w-full rounded-lg p-2 text-xs" style={{ ...fontMono, color: C.ink, background: C.surface, border: '1px solid ' + C.rule }} />
      </details>}
    </section>
  );
}

