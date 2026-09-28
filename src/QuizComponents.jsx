import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Check, ChevronRight, ArrowLeft, Award, Loader2, Paperclip, RotateCcw,
  Clock3, Image as ImageIcon, Calculator, FileText, Pause, Play as Play2
} from 'lucide-react';
import {
  C, fontBody, fontDisplay, fontMono, TextField, GhostButton, SolidButton, uid,
  sbUploadImage, VisibilityToggle, DEFAULT_TEST_PREFS, isQuestionCorrect,
} from './App';

function parseTxtQuestions(rawText) {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const questions = [];
  let cur = null;

  function pushCurrent() {
    if (cur && cur.text && cur.options.length >= 2 && cur.correct !== null) {
      questions.push({ id: uid(), type: 'mcq', text: cur.text, options: cur.options, correct: cur.correct });
    }
    cur = null;
  }

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const optMatch = line.match(/^([A-DА-Г])[).]\s*(.+)$/i);
    const ansMatch = line.match(/^ANSWER[:\s]+([A-DА-Г])/i);

    if (ansMatch && cur) {
      const letter = ansMatch[1].toUpperCase();
      const idx = 'ABCD'.indexOf(letter);
      if (idx !== -1) cur.correct = idx;
      // Savol "ANSWER:" bilan tugadi — uni saqlab, keyingi qatorni
      // (raqamli yoki raqamsiz) yangi savol boshlanishi deb qabul qilamiz.
      pushCurrent();
      continue;
    }
    if (optMatch && cur && cur.correct === null) {
      cur.options.push(optMatch[2].trim());
      continue;
    }
    // Variant yoki ANSWER qatori emas — demak bu savol matni.
    // Boshida "1." yoki "12)" kabi raqam bo'lsa, shunchaki matn deb
    // qabul qilib, raqamni olib tashlaymiz (bor-yo'qligi farq qilmaydi).
    const stripped = line.replace(/^\d+[.)]\s*/, '');
    if (!cur) {
      cur = { text: stripped, options: [], correct: null };
    } else if (cur.options.length === 0) {
      // Savol matni bir necha qatorga bo'lingan bo'lishi mumkin.
      cur.text += ' ' + stripped;
    } else {
      // Variantlar allaqachon boshlangan, lekin ANSWER qatori kelmasdan
      // yangi savol matni chiqdi — demak oldingi savol "ANSWER:"siz
      // qolib ketgan. Uni tashlab, yangi savolni shu yerdan boshlaymiz.
      pushCurrent();
      cur = { text: stripped, options: [], correct: null };
    }
  }
  pushCurrent();
  return questions;
}

function QuestionBuilder({ questions, setQuestions, mode = 'manual' }) {
  const [qType, setQType] = useState(mode === 'math' ? 'open' : 'mcq');
  const [qText, setQText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [answersText, setAnswersText] = useState('');
  const [importError, setImportError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  function addQuestion() {
    if (!qText.trim()) return;
    if (qType === 'mcq') {
      if (opts.some((o) => !o.trim())) return;
      setQuestions([...questions, { id: uid(), type: 'mcq', text: qText.trim(), options: opts.map((o) => o.trim()), correct, imageUrl: imageUrl || undefined }]);
      setOpts(['', '', '', '']);
      setCorrect(0);
    } else {
      const answers = answersText.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      if (answers.length === 0) return;
      setQuestions([...questions, { id: uid(), type: 'open', text: qText.trim(), answers, imageUrl: imageUrl || undefined }]);
      setAnswersText('');
    }
    setQText('');
    setImageUrl('');
  }

  function removeQuestion(id) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  async function handleImageFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const url = await sbUploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setImageError('Rasm yuklashda xatolik yuz berdi. Qaytadan urinib koʻring.');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  }

  function handleTxtFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseTxtQuestions(String(reader.result));
        if (parsed.length === 0) {
          setImportError('Faylda savol topilmadi. Format toʻgʻriligini tekshiring: savol matni, keyin "A) variant" qatorlari, oxirida "ANSWER: A".');
          return;
        }
        setQuestions([...questions, ...parsed]);
      } catch (err) {
        setImportError('Faylni oʻqishda xatolik yuz berdi.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  const isTxtMode = mode === 'txt';
  const isMathMode = mode === 'math';

  return (
    <>
      {questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between p-3 rounded-sm" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start gap-2 min-w-0">
                {q.imageUrl && (
                  <img src={q.imageUrl} alt="" className="w-10 h-10 object-cover rounded-sm flex-shrink-0" style={{ border: `1px solid ${C.rule}` }} />
                )}
                <div className="text-[15px] min-w-0" style={{ ...fontBody, color: C.ink }}>
                  <span style={{ ...fontMono, color: C.gold }}>{i + 1}.</span> {q.text}
                  {q.type === 'open' && (
                    <span className="ml-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>(yozma javob)</span>
                  )}
                </div>
              </div>
              <button onClick={() => removeQuestion(q.id)} className="flex-shrink-0 ml-3" style={{ color: C.inkSoft }}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".txt" onChange={handleTxtFile} className="hidden" />

      {isTxtMode ? (
        <div className="p-6 rounded-2xl mb-4 text-center" style={{ background: C.mathTint, border: `1px solid ${C.math}` }}>
          <FileText size={22} style={{ color: C.math }} className="mx-auto mb-2" />
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div className="text-[15px]" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>TXT fayldan savollarni yuklang</div>
            <InfoHint text={'Har bir savol alohida qatorda (raqami bo\u2018lsa ham, bo\u2018lmasa ham farqi yo\u2018q), keyin "A)", "B)", "C)", "D)" variantlari, oxirida "ANSWER: A" (yoki B, C, D) yozilgan bo\u2018lishi kerak.'} />
          </div>
          <SolidButton onClick={() => fileInputRef.current && fileInputRef.current.click()} icon={Paperclip}>TXT faylni tanlash</SolidButton>
          {importError && <div className="text-xs mt-3" style={{ ...fontBody, color: C.red }}>{importError}</div>}
        </div>
      ) : (
        <div className="p-4 rounded-sm mb-4" style={{ background: C.paperSoft, border: `1px dashed ${C.rule}` }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs tracking-wide uppercase" style={{ ...fontMono, color: C.inkSoft }}>Savol qoʻshish</div>
            {!isMathMode && (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 focus-visible:outline focus-visible:outline-2"
                style={{ background: C.mathTint, color: C.mathDeep, outlineColor: C.mathSoft }}
                aria-label="TXT fayldan yuklash"
                title="TXT fayldan yuklash"
              >
                <FileText size={13} />
              </button>
            )}
          </div>
          {importError && <div className="text-xs mb-3" style={{ ...fontBody, color: C.red }}>{importError}</div>}

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setQType('mcq')}
              className="px-3 py-1.5 rounded-sm text-sm"
              style={{ ...fontBody, background: qType === 'mcq' ? C.cover : 'transparent', color: qType === 'mcq' ? C.white : C.inkSoft, border: `1px solid ${qType === 'mcq' ? C.cover : C.rule}` }}
            >
              Variantli
            </button>
            <button
              onClick={() => setQType('open')}
              className="px-3 py-1.5 rounded-sm text-sm"
              style={{ ...fontBody, background: qType === 'open' ? C.cover : 'transparent', color: qType === 'open' ? C.white : C.inkSoft, border: `1px solid ${qType === 'open' ? C.cover : C.rule}` }}
            >
              Yozma javob
            </button>
            {isMathMode && qType === 'open' && (
              <InfoHint text={'Bir nechta toʻgʻri koʻrinishni kiritishingiz mumkin — masalan "1/2" va "0,5" ikkalasi ham toʻgʻri hisoblanadi, chunki javob son sifatida solishtiriladi.'} />
            )}
          </div>

          <TextField label="Savol matni" value={qText} onChange={setQText} placeholder="Savolni yozing" />

          <div className="mb-3">
            <div className="text-xs mb-1.5 uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Rasm / chizma (ixtiyoriy)</div>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded-sm" style={{ border: `1px solid ${C.rule}` }} />
                <button onClick={() => setImageUrl('')} className="text-xs inline-flex items-center gap-1" style={{ ...fontBody, color: C.red }}>
                  <X size={13} /> Rasmni olib tashlash
                </button>
              </div>
            ) : (
              <>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                <button
                  onClick={() => imageInputRef.current && imageInputRef.current.click()}
                  disabled={imageUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs focus-visible:outline focus-visible:outline-2"
                  style={{ ...fontBody, color: C.ink, background: 'transparent', border: `1px solid ${C.rule}`, outlineColor: C.gold }}
                >
                  <ImageIcon size={13} /> {imageUploading ? 'Yuklanmoqda...' : 'Rasm qoʻshish'}
                </button>
              </>
            )}
            {imageError && <div className="text-xs mt-2" style={{ ...fontBody, color: C.red }}>{imageError}</div>}
          </div>

          {qType === 'mcq' ? (
            <>
              {opts.map((o, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="correct-opt"
                    checked={correct === i}
                    onChange={() => setCorrect(i)}
                    className="flex-shrink-0"
                    title="Toʻgʻri javob"
                  />
                  <input
                    type="text"
                    value={o}
                    onChange={(e) => { const next = [...opts]; next[i] = e.target.value; setOpts(next); }}
                    placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                    className="w-full bg-transparent outline-none py-1.5 text-[15px]"
                    style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
                  />
                </div>
              ))}
              <div className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javobni radio tugma bilan belgilang.</div>
            </>
          ) : (
            <>
              <TextField
                label="Toʻgʻri javob(lar)"
                value={answersText}
                onChange={setAnswersText}
                placeholder="Masalan: 1/2, 0.5, 0,5 (vergul yoki yangi qator bilan ajrating)"
                textarea
                rows={2}
              />
            </>
          )}

          <GhostButton onClick={addQuestion} icon={Plus} disabled={imageUploading}>Savolni testga qoʻshish</GhostButton>
        </div>
      )}
    </>
  );
}

function AddTestForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView, formMode }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [newId, setNewId] = useState(null);

  if (newId) {
    return (
      <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
        <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
        <div className="text-base mb-1" style={{ ...fontBody, color: C.ink }}>Testingiz yuborildi!</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.inkSoft }}>
          {visibility === 'private'
            ? 'Xususiy sifatida saqlandi — tasdiqlash shart emas. Faqat siz va havola orqali ulashganlaringiz koʻra oladi.'
            : 'Hozircha faqat sizga koʻrinadi. Administrator tekshirib tasdiqlagach, u hammaga ochiq boʻladi.'}
        </div>
        <div className="flex gap-3 justify-center">
          <SolidButton onClick={() => onView(newId)} icon={ChevronRight}>Koʻrish</SolidButton>
          <GhostButton onClick={onDone} icon={X}>Yopish</GhostButton>
        </div>
      </div>
    );
  }

  const canSubmit = title.trim() && questions.length > 0 && (lockedCategoryId || categoryName.trim());

  async function submit() {
    if (!canSubmit) return;
    const payload = lockedCategoryId
      ? { categoryId: lockedCategoryId, title: title.trim(), description: '', questions, visibility }
      : { categoryName: categoryName.trim(), title: title.trim(), description: '', questions, visibility };
    const id = await onSubmit(payload);
    if (id) setNewId(id);
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      {formMode === 'txt' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[13px]" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>
          <FileText size={14} style={{ flexShrink: 0 }} /> TXT fayldan test yaratish — savollarni qoʻlda yozish shart emas.
        </div>
      )}
      {formMode === 'math' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[13px]" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>
          <Calculator size={14} style={{ flexShrink: 0 }} /> Matematik test — savollarga rasm/chizma qoʻshishingiz va yozma javob (kasr, ildiz, daraja) qabul qilishingiz mumkin.
        </div>
      )}
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Sohaga nom bering" />
      )}
      <TextField label="Test nomi" value={title} onChange={setTitle} placeholder="Masalan: Inflyatsiya boʻyicha test" />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} mode={formMode || 'manual'} />
      <VisibilityToggle value={visibility} onChange={setVisibility} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={!canSubmit}>Yuborish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function EditTestForm({ test, onSave, onDone }) {
  const [title, setTitle] = useState(test.title);
  const [questions, setQuestions] = useState(test.questions);

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onSave({ categoryId: test.categoryId, title: title.trim(), description: test.description || '', questions });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <TextField label="Test nomi" value={title} onChange={setTitle} />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={questions.length === 0 || !title.trim()}>Saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Testni boshlashdan oldingi ixcham sozlamalar paneli                */
/* ------------------------------------------------------------------ */

function SettingChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-colors flex-shrink-0"
      style={{
        ...fontBody,
        color: active ? C.white : C.ink,
        background: active ? C.accent : C.surface,
        border: `1px solid ${active ? C.accent : C.rule}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: 7, height: 7, background: active ? C.white : C.rule }}
      />
      {children}
    </button>
  );
}

/* Sozlamalar (mode/count/partsTotal/partIndex/shuffle) asosida savollar
   ro'yxatini hisoblaydi. QuizSetupPanel ichida ham, sozlamalar ekranini
   ko'rsatmasdan to'g'ridan-to'g'ri boshlashda ham ishlatiladi. */
function computeQuizQuestions(test, cfg) {
  const total = test.questions.length;
  const mode = cfg.mode || 'all';
  const count = cfg.count ?? Math.min(5, total);
  let base = test.questions;
  if (mode === 'random') {
    base = shuffleArray(test.questions).slice(0, Math.max(1, Math.min(count, total)));
  } else if (mode === 'first') {
    base = test.questions.slice(0, Math.max(1, Math.min(count, total)));
  } else if (mode === 'split') {
    const partsTotal = cfg.partsTotal ?? 2;
    const partIndex = cfg.partIndex ?? 1;
    const parts = Math.max(2, Math.min(partsTotal, total));
    const size = Math.ceil(total / parts);
    const start = (Math.max(1, Math.min(partIndex, parts)) - 1) * size;
    base = test.questions.slice(start, start + size);
    if (base.length === 0) base = test.questions.slice(0, size);
  }
  if (cfg.shuffle) base = shuffleArray(base);
  return base;
}

function QuizSetupPanel({ test, onExit, onStart, initialConfig }) {
  const total = test.questions.length;
  const init = initialConfig || DEFAULT_TEST_PREFS;
  const [immediate, setImmediate] = useState(!!init.immediate);
  const [autoScroll, setAutoScroll] = useState(!!init.autoScroll);
  const [shuffle, setShuffle] = useState(!!init.shuffle);
  const [mode, setMode] = useState(init.mode || 'all'); // all | random | first | split
  const [count, setCount] = useState(Math.min(init.count || 5, total));
  const [partsTotal, setPartsTotal] = useState(init.partsTotal || 2);
  const [partIndex, setPartIndex] = useState(init.partIndex || 1);

  function start() {
    const cfg = { immediate, autoScroll, shuffle, mode, count, partsTotal, partIndex };
    const questions = computeQuizQuestions(test, cfg);
    if (questions.length === 0) return;
    onStart({ ...cfg, questions });
  }

  const parts = Math.max(2, Math.min(partsTotal, total));

  return (
    <div>
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha testlar
      </button>

      <h3 className="text-2xl sm:text-3xl mb-1" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}
      <div className="text-xs mb-6" style={{ ...fontMono, color: C.gold }}>{total} ta savol mavjud</div>

      <div className="flex flex-wrap gap-2 mb-5">
        <SettingChip active={immediate} onClick={() => setImmediate((v) => !v)}>Darhol javob koʻrsatish</SettingChip>
        <SettingChip active={autoScroll} onClick={() => setAutoScroll((v) => !v)}>Keyingi savolga avtomatik oʻtish</SettingChip>
        <SettingChip active={shuffle} onClick={() => setShuffle((v) => !v)}>Savollarni aralashtirish</SettingChip>
      </div>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Savollar toʻplami</div>
        <div className="flex flex-wrap gap-2 items-center">
          <SettingChip active={mode === 'all'} onClick={() => setMode('all')}>Hammasi ({total})</SettingChip>
          <SettingChip active={mode === 'random'} onClick={() => setMode('random')}>Tasodifiy N ta</SettingChip>
          <SettingChip active={mode === 'first'} onClick={() => setMode('first')}>Dastlabki N ta</SettingChip>
          {total > 1 && <SettingChip active={mode === 'split'} onClick={() => setMode('split')}>Qismlarga boʻlib</SettingChip>}

          {(mode === 'random' || mode === 'first') && (
            <input
              type="number"
              min={1}
              max={total}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(total, Number(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 rounded-sm text-[13px] outline-none"
              style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
            />
          )}

          {mode === 'split' && (
            <>
              <span className="text-[13px]" style={{ ...fontBody, color: C.inkSoft }}>Necha qism:</span>
              <input
                type="number"
                min={2}
                max={total}
                value={partsTotal}
                onChange={(e) => { setPartsTotal(Math.max(2, Math.min(total, Number(e.target.value) || 2))); setPartIndex(1); }}
                className="w-14 px-2 py-1.5 rounded-sm text-[13px] outline-none"
                style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              />
              <span className="text-[13px]" style={{ ...fontBody, color: C.inkSoft }}>Qaysi qism:</span>
              <select
                value={partIndex}
                onChange={(e) => setPartIndex(Number(e.target.value))}
                className="px-2 py-1.5 rounded-sm text-[13px] outline-none"
                style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              >
                {Array.from({ length: parts }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>{p}-qism</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <SolidButton onClick={start} icon={Award}>Testni boshlash</SolidButton>
    </div>
  );
}

function QuizPlayer({ test, config, onExit, onRestart }) {
  const questions = config.questions;
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const questionRefs = useRef({});

  useEffect(() => {
    if (finished || paused) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished, paused]);

  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    return q.type === 'open' ? (typeof a === 'string' && a.trim().length > 0) : a !== undefined;
  });

  /* "Keyingi savolga avtomatik oʻtish" yoqilgan boʻlsa — foydalanuvchi
     javob belgilagach, qoʻlda pastga qorishtirmasdan, ekranni keyingi
     javob berilmagan savol markazga kelguncha silliq skroll qilamiz. */
  function scrollToNextUnanswered(fromQid, latestAnswers) {
    if (!config.autoScroll) return;
    const fromIndex = questions.findIndex((q) => q.id === fromQid);
    const next = questions.slice(fromIndex + 1).find((q) => {
      const a = latestAnswers[q.id];
      return q.type === 'open' ? !(typeof a === 'string' && a.trim().length > 0) : a === undefined;
    });
    if (next) {
      const el = questionRefs.current[next.id];
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
    }
  }

  function select(qid, idx) {
    if (finished || paused) return;
    setAnswers((a) => {
      const next = { ...a, [qid]: idx };
      scrollToNextUnanswered(qid, next);
      return next;
    });
    if (config.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
  }

  function setOpenAnswer(qid, text) {
    if (finished || paused) return;
    setAnswers((a) => ({ ...a, [qid]: text }));
  }

  function confirmOpenAnswer(qid) {
    if (finished || paused) return;
    setAnswers((a) => { scrollToNextUnanswered(qid, a); return a; });
    if (config.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
  }

  function submit() {
    setRevealed(Object.fromEntries(questions.map((q) => [q.id, true])));
    setFinished(true);
  }

  if (finished) {
    const correctCount = questions.reduce((s, qq) => s + (isQuestionCorrect(qq, answers[qq.id]) ? 1 : 0), 0);
    const incorrectCount = questions.length - correctCount;
    const percent = Math.round((correctCount / questions.length) * 100);
    return (
      <div>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>
        <h3 className="text-2xl sm:text-3xl mb-5" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title} — yakunlandi</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mb-8">
          <div className="p-4 rounded-sm text-center" style={{ background: C.cover }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.gold, fontWeight: 700 }}>{percent}%</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.goldSoft }}>Natija</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.successTint, border: `1px solid ${C.accent}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.accent, fontWeight: 700 }}>{correctCount}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.dangerTint, border: `1px solid ${C.red}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.red, fontWeight: 700 }}>{incorrectCount}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Notoʻgʻri</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.ink, fontWeight: 700 }}>{formatDuration(seconds)}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Sarflangan vaqt</div>
          </div>
        </div>
        <div className="flex gap-3">
          <GhostButton onClick={onRestart} icon={RotateCcw}>Sozlamalarni oʻzgartirish</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[15px] focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[13px]" style={{ ...fontMono, color: C.gold, background: C.cover }}>
            <Clock3 size={13} /> {formatDuration(seconds)}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[13px]"
            style={{ ...fontBody, color: C.ink, border: `1px solid ${C.rule}` }}
          >
            {paused ? <><Play2 size={13} /> Davom</> : <><Pause size={13} /> Pauza</>}
          </button>
        </div>
      </div>

      <h3 className="text-2xl sm:text-3xl mb-1 mt-3" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-[15px] mb-6" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}

      {paused ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Pause size={26} style={{ color: C.gold }} className="mb-3" />
          <div className="text-base mb-4" style={{ ...fontBody, color: C.ink }}>Test pauzada — vaqt hisoblagich toʻxtatildi.</div>
          <SolidButton onClick={() => setPaused(false)} icon={Play2}>Davom ettirish</SolidButton>
        </div>
      ) : (
        <>
          <div className="space-y-6 max-w-2xl">
            {questions.map((q, qi) => {
              const showResult = config.immediate ? !!revealed[q.id] : finished;
              return (
                <div key={q.id} ref={(el) => { questionRefs.current[q.id] = el; }}>
                  <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
                    <span style={{ ...fontMono, color: C.gold }}>{qi + 1}.</span> {q.text}
                  </div>
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-sm mb-3" style={{ border: `1px solid ${C.rule}` }} />
                  )}
                  {q.type === 'open' ? (
                    <div>
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setOpenAnswer(q.id, e.target.value)}
                        onBlur={() => confirmOpenAnswer(q.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                        disabled={showResult}
                        placeholder="Javobingizni yozing (masalan: 1/2 yoki 0,5)"
                        className="w-full px-4 py-2.5 rounded-sm text-[15px] outline-none"
                        style={{
                          ...fontBody, color: C.ink,
                          background: showResult ? (isQuestionCorrect(q, answers[q.id]) ? C.successTint : C.dangerTint) : C.surface,
                          border: `1px solid ${showResult ? (isQuestionCorrect(q, answers[q.id]) ? C.accent : C.red) : C.rule}`,
                        }}
                      />
                      {showResult && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm" style={{ ...fontBody, color: isQuestionCorrect(q, answers[q.id]) ? C.accent : C.red }}>
                          {isQuestionCorrect(q, answers[q.id]) ? <Check size={14} /> : <X size={14} />}
                          Toʻgʻri javob: {(q.answers || []).join(' yoki ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = answers[q.id] === oi;
                        let bg = C.surface, border = C.rule;
                        if (showResult) {
                          if (oi === q.correct) { bg = C.successTint; border = C.accent; }
                          else if (isSelected && oi !== q.correct) { bg = C.dangerTint; border = C.red; }
                        } else if (isSelected) {
                          border = C.gold; bg = C.selectedTint;
                        }
                        return (
                          <button
                            key={oi}
                            onClick={() => select(q.id, oi)}
                            disabled={showResult}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                            style={{ ...fontBody, background: bg, border: `1px solid ${border}`, color: C.ink, outlineColor: C.gold }}
                          >
                            <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                            <span>{opt}</span>
                            {showResult && oi === q.correct && <Check size={15} className="ml-auto flex-shrink-0" style={{ color: C.accent }} />}
                            {showResult && isSelected && oi !== q.correct && <X size={15} className="ml-auto flex-shrink-0" style={{ color: C.red }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <SolidButton onClick={submit} icon={Check} disabled={!allAnswered}>Javoblarni tekshirish</SolidButton>
          </div>
        </>
      )}
    </div>
  );
}

/* effectivePrefs — joriy (saqlangan yoki andoza) sozlamalar. forceSetup
   true bo'lsa (⋮ menyudagi "Sozlamalar" orqali ochilganda), avval
   sozlamalar ekrani ko'rsatiladi; aks holda (oddiy "Boshlash" tugmasi)
   test darhol shu sozlamalar bilan boshlanadi — sozlamalar ekrani
   umuman ko'rsatilmaydi. onSavePrefs berilgan bo'lsa (foydalanuvchi
   tizimga kirgan bo'lsa) — sozlamalar o'zgartirilganda akkauntga
   saqlanadi; berilmasa (akkaunti yo'q), hech qayerga saqlanmaydi. */
export function QuizView({ test, onExit, effectivePrefs, forceSetup, onSavePrefs }) {
  const prefs = effectivePrefs || DEFAULT_TEST_PREFS;
  const [config, setConfig] = useState(() => (forceSetup ? null : { ...prefs, questions: computeQuizQuestions(test, prefs) }));
  const [lastConfig, setLastConfig] = useState(prefs);

  function handleStart(cfg) {
    const { questions, ...rest } = cfg;
    setLastConfig(rest);
    setConfig(cfg);
    if (onSavePrefs) onSavePrefs(rest);
  }

  if (!config) {
    return <QuizSetupPanel test={test} onExit={onExit} onStart={handleStart} initialConfig={lastConfig} />;
  }
  return <QuizPlayer test={test} config={config} onExit={onExit} onRestart={() => setConfig(null)} />;
}

/* ------------------------------------------------------------------ */
/*  Jonli test rejimi — endi ./LiveQuiz.jsx faylida (lazy-load)        */
/* ------------------------------------------------------------------ */


export { AddTestForm, EditTestForm };
