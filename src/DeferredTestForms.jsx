import { useState, useRef, Suspense, lazy } from 'react';

import { Calculator, Check, ChevronRight, FileText, Image as ImageIcon, Info, Loader2, Paperclip, Plus, X, ListChecks, Sparkles } from 'lucide-react';

import { C, GhostButton, InfoHint, SectionLoading, SolidButton, TextField, VisibilityToggle, fontBody, fontMono, parseTxtQuestions, sbUploadImage, uid } from './App.jsx';

const MatchingTestForm = lazy(() => import('./MatchingTestForm.jsx'));
const MathInput = lazy(() => import('./MathInput.jsx'));
const MathPdfImport = lazy(() => import('./MathPdfImport.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));

function QuestionBuilder({ questions, setQuestions, mode = 'manual' }) {
  const [qType, setQType] = useState(mode === 'math' ? 'open' : 'mcq');
  const [qText, setQText] = useState('');
  const [qFormula, setQFormula] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [answersText, setAnswersText] = useState('');
  const [importError, setImportError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [replaceImageError, setReplaceImageError] = useState('');
  const [replaceImageQuestionId, setReplaceImageQuestionId] = useState(null);
  const [replacingImage, setReplacingImage] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const replaceImageInputRef = useRef(null);

  function addQuestion() {
    if (!qText.trim() && !qFormula.trim()) return;
    if (qType === 'mcq') {
      if (opts.some((o) => !o.trim())) return;
      setQuestions([...questions, { id: uid(), type: 'mcq', text: qText.trim(), mathFormula: qFormula.trim() || undefined, options: opts.map((o) => o.trim()), optionsAreMath: mode === 'math' || undefined, correct, imageUrl: imageUrl || undefined }]);
      setOpts(['', '', '', '']);
      setCorrect(0);
    } else {
      const answers = (mode === 'math' ? [answersText] : answersText.split(/[,\n]/)).map((a) => a.trim()).filter(Boolean);
      if (answers.length === 0) return;
      setQuestions([...questions, { id: uid(), type: 'open', answerMode: mode === 'math' ? 'math' : undefined, text: qText.trim(), mathFormula: qFormula.trim() || undefined, answers, imageUrl: imageUrl || undefined }]);
      setAnswersText('');
    }
    setQText('');
    setQFormula('');
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

  async function handleReplaceQuestionImage(e) {
    const file = e.target.files && e.target.files[0];
    const questionId = replaceImageQuestionId;
    if (!file || !questionId) return;
    setReplaceImageError('');
    setReplacingImage(true);
    try {
      const url = await sbUploadImage(file);
      setQuestions((current) => current.map((question) => question.id === questionId ? { ...question, imageUrl: url } : question));
    } catch {
      setReplaceImageError('Savol rasmini almashtirib bo‘lmadi. Faylni tekshirib, qayta urinib ko‘ring.');
    } finally {
      setReplacingImage(false);
      setReplaceImageQuestionId(null);
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
          <input ref={replaceImageInputRef} type="file" accept="image/*" onChange={handleReplaceQuestionImage} className="hidden" />
          {questions.map((q, i) => (
            <div key={q.id} className="flex min-w-0 items-start justify-between gap-3 p-3 rounded-2xl" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
              <div className={q.pdfSourceImageOnly ? "flex min-w-0 flex-1" : "flex items-start gap-2 min-w-0"}>
                {q.imageUrl && (
                  q.pdfSourceImageOnly
                    ? <Suspense fallback={<div className="mb-2 h-20 animate-pulse rounded-lg bg-[#e8e2d2]" />}><PdfQuestionImage src={q.imageUrl} alt={q.text || 'PDFdagi savol'} /></Suspense>
                    : <img src={q.imageUrl} alt="" loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" style={{ border: `1px solid ${C.rule}` }} />
                )}
                {!q.pdfSourceImageOnly && <div className="text-[15px] min-w-0" style={{ ...fontBody, color: C.ink }}>
                  <span style={{ ...fontMono, color: C.gold }}>{i + 1}.</span> {q.text}
                  {q.mathFormula && <Suspense fallback={null}><MathInput value={q.mathFormula} readOnly compact /></Suspense>}
                  {q.type === 'open' && (
                    <span className="ml-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>(yozma javob)</span>
                  )}
                </div>}
              </div>
              <button type="button" disabled={replacingImage} onClick={() => { setReplaceImageQuestionId(q.id); replaceImageInputRef.current?.click(); }} className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full border text-[11px] font-medium disabled:opacity-60 sm:w-auto sm:gap-1 sm:px-3" style={{ ...fontBody, color: '#5E68C8', background: '#F1F1FF', borderColor: '#DADAFE' }} title={q.imageUrl ? 'Savol rasmini almashtirish' : 'Savolga rasm qo‘shish'} aria-label={q.imageUrl ? 'Savol rasmini almashtirish' : 'Savolga rasm qo‘shish'}>
                {replacingImage && replaceImageQuestionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={13} />}
                <span className="hidden sm:inline">{replacingImage && replaceImageQuestionId === q.id ? 'Yuklanmoqda' : q.imageUrl ? 'Rasmni almashtirish' : 'Rasm qo‘shish'}</span>
              </button>
              <button onClick={() => removeQuestion(q.id)} className="flex-shrink-0 ml-3" style={{ color: C.inkSoft }}><X size={15} /></button>
            </div>
          ))}
          {replaceImageError && <div role="alert" className="text-xs" style={{ ...fontBody, color: C.red }}>{replaceImageError}</div>}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".txt" onChange={handleTxtFile} className="hidden" />

      {isTxtMode ? (
        <div className="mb-4 rounded-3xl border border-dashed p-6 text-center" style={{ background: 'linear-gradient(135deg,#F3F2FF,#FFF0F7)', borderColor: '#CFC9FF' }}>
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl" style={{ color: '#7552C9', background: '#E8E3FF' }}><FileText size={23} /></span>
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div className="text-[15px]" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>TXT fayldan savollarni yuklang</div>
            <InfoHint text={'Har bir savol alohida qatorda (raqami bo\u2018lsa ham, bo\u2018lmasa ham farqi yo\u2018q), keyin "A)", "B)", "C)", "D)" variantlari, oxirida "ANSWER: A" (yoki B, C, D) yozilgan bo\u2018lishi kerak.'} />
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="mx-auto inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, background: 'linear-gradient(110deg,#7357CF,#C14DA6)', outlineColor: '#B9A8FF' }}><Paperclip size={16} /> TXT faylni tanlash</button>
          {questions.length > 0 && <p className="mt-3 text-xs font-medium" style={{ ...fontBody, color: '#6257A7' }}>{questions.length} ta savol fayldan olindi</p>}
          {importError && <div role="alert" className="mt-3 text-xs" style={{ ...fontBody, color: C.red }}>{importError}</div>}
        </div>
      ) : (
        <div className={isMathMode ? "mb-4 w-full min-w-0 space-y-2" : "mb-4 rounded-3xl border border-dashed p-4"} style={isMathMode ? undefined : { background: 'linear-gradient(135deg,#F1F7FF,#F8F3FF)', borderColor: '#C8D8F3' }}>
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
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{ ...fontBody, background: qType === 'mcq' ? 'linear-gradient(110deg,#5778E8,#7763D6)' : C.surface, color: qType === 'mcq' ? C.white : C.inkSoft, border: `1px solid ${qType === 'mcq' ? '#6574D8' : C.rule}`, boxShadow: qType === 'mcq' ? '0 4px 12px #6675d833' : 'none' }}
            >
              Variantli
            </button>
            <button
              onClick={() => setQType('open')}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{ ...fontBody, background: qType === 'open' ? 'linear-gradient(110deg,#5778E8,#7763D6)' : C.surface, color: qType === 'open' ? C.white : C.inkSoft, border: `1px solid ${qType === 'open' ? '#6574D8' : C.rule}`, boxShadow: qType === 'open' ? '0 4px 12px #6675d833' : 'none' }}
            >
              Yozma javob
            </button>
            {isMathMode && qType === 'open' && (
              <InfoHint text={'Bir nechta toʻgʻri koʻrinishni kiritishingiz mumkin — masalan "1/2" va "0,5" ikkalasi ham toʻgʻri hisoblanadi, chunki javob son sifatida solishtiriladi.'} />
            )}
          </div>

          <TextField label={isMathMode ? 'Masala sharti' : 'Savol matni'} value={qText} onChange={setQText} placeholder={isMathMode ? 'Masalani oddiy matnda yozing' : 'Savolni yozing'} textarea={isMathMode} rows={isMathMode ? 3 : undefined} />
          {isMathMode && <Suspense fallback={<div className="mb-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Formula muharriri…</div>}>
            <MathInput label="Formula yoki ifoda (ixtiyoriy)" value={qFormula} onChange={setQFormula} placeholder="Kasr, daraja yoki ildiz" />
          </Suspense>}

          <div className="mb-3 flex items-start gap-2">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
            {imageUrl ? (
              <div className="flex items-center gap-2">
                <img src={imageUrl} alt="Savol rasmi" className="h-11 w-11 rounded-xl object-cover" style={{ border: `1px solid ${C.rule}` }} />
                <button onClick={() => setImageUrl('')} className="text-xs inline-flex items-center gap-1" style={{ ...fontBody, color: C.red }}>
                  <X size={13} /> Rasmni olib tashlash
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
                style={{ color: '#536FE0', background: '#EEF1FF', outlineColor: '#CBD3FF' }}
                aria-label={imageUploading ? 'Rasm yuklanmoqda' : 'Savolga rasm qo‘shish'}
                title={imageUploading ? 'Yuklanmoqda...' : 'Rasm qo‘shish'}
              >
                <ImageIcon size={16} />
              </button>
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
                  {isMathMode ? <Suspense fallback={<div className="w-full py-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Formula maydoni…</div>}><MathInput compact value={o} onChange={(value) => { const next = [...opts]; next[i] = value; setOpts(next); }} placeholder={`Variant ${String.fromCharCode(65 + i)}`} /></Suspense> : <input
                    type="text"
                    value={o}
                    onChange={(e) => { const next = [...opts]; next[i] = e.target.value; setOpts(next); }}
                    placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                    className="w-full bg-transparent outline-none py-1.5 text-[15px]"
                    style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
                  />}
                </div>
              ))}
              <div className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javobni radio tugma bilan belgilang.</div>
            </>
          ) : (
            <>
              {isMathMode ? (
                <Suspense fallback={<div className="mb-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Maydon ochilmoqda…</div>}>
                  <MathInput label="Toʻgʻri javob" value={answersText} onChange={setAnswersText} placeholder="Kasr, ildiz yoki ifodani kiriting" />
                </Suspense>
              ) : (
                <TextField label="Toʻgʻri javob(lar)" value={answersText} onChange={setAnswersText} placeholder="Masalan: javob yoki boshqa qabul qilinadigan javob" textarea rows={2} />
              )}
            </>
          )}

          <button type="button" onClick={addQuestion} disabled={imageUploading || (!qText.trim() && !qFormula.trim())} className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" style={{ ...fontBody, background: 'linear-gradient(110deg,#5778E8,#7763D6)' }}><Plus size={16} /> Savolni testga qoʻshish</button>
        </div>
      )}
    </>
  );
}

export function AddTestForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView, formMode }) {
  const [mode, setMode] = useState(formMode || 'manual');
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [visibility, setVisibility] = useState('private');
  const [newId, setNewId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [showPdfImport, setShowPdfImport] = useState(false);

  if (formMode === 'matching') {
    return (
      <Suspense fallback={<SectionLoading label="Moslik testi yuklanmoqda…" compact />}>
        <MatchingTestForm initialCategoryName={initialCategoryName} onSubmit={onSubmit} onDone={onDone} onView={onView} />
      </Suspense>
    );
  }

  if (newId) {
    return (
      <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
        <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
        <div className="text-base mb-1" style={{ ...fontBody, color: C.ink }}>Testingiz yuborildi!</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.inkSoft }}>
          {visibility === 'private'
            ? 'Maxfiy saqlandi. Siz va havola orqali taklif qilgan doʻstlaringiz koʻra oladi.'
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
    if (!canSubmit || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    let created = false;
    try {
      const payload = lockedCategoryId
        ? { categoryId: lockedCategoryId, title: title.trim(), description: '', questions, visibility }
        : { categoryName: categoryName.trim(), title: title.trim(), description: '', questions, visibility };
      const id = await onSubmit(payload);
      if (id) { created = true; setNewId(id); }
    } catch (error) {
      console.error('Test yaratishda xatolik:', error);
    } finally {
      if (!created) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  }
  const modes = [
    { id: 'manual', label: 'Test', description: 'Savollarni qo‘lda kiriting', Icon: ListChecks, color: '#536FE0', tint: '#EEF1FF', border: '#CBD3FF' },
    { id: 'txt', label: 'TXT fayldan', description: 'Tayyor savollarni yuklang', Icon: FileText, color: '#9A53C5', tint: '#F6ECFF', border: '#E2C8F5' },
    { id: 'math', label: 'Matematik test', description: 'Formula va PDF savollar', Icon: Calculator, color: '#D17A2F', tint: '#FFF3E5', border: '#F3D5B3' },
  ];
  const activeMode = modes.find((item) => item.id === mode) || modes[0];

  return (
    <div className="mt-4 w-full min-w-0 overflow-hidden rounded-[28px] border p-4 shadow-sm sm:p-6" style={{ background: 'linear-gradient(145deg,#FFFFFF,#F7F8FF)', borderColor: '#E1E4F2', boxShadow: '0 12px 34px rgba(69,79,132,.08)' }}>
      <div role="tablist" aria-label="Test yaratish usuli" className="mb-4 flex w-full items-center gap-1.5 rounded-full border p-1" style={{ background: '#F5F6FC', borderColor: '#E5E7F1' }}>
        {modes.map(({ id, label, description, Icon, color, tint, border }) => {
          const selected = mode === id;
          return <button key={id} type="button" role="tab" aria-selected={selected} onClick={() => setMode(id)} className="flex min-w-0 min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-center transition focus-visible:outline focus-visible:outline-2 sm:gap-2 sm:px-3" style={{ ...fontBody, color: selected ? color : C.inkSoft, background: selected ? tint : 'transparent', boxShadow: selected ? `0 2px 8px ${color}1c` : 'none', outlineColor: color }} title={description}><Icon size={15} className="shrink-0" /><span className="truncate text-[11px] font-bold sm:text-xs">{label}</span></button>;
        })}
      </div>
      <section className="rounded-3xl border p-4 sm:p-5" style={{ background: '#FFFFFF', borderColor: activeMode.border }}>
      {mode === 'txt' && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px]" style={{ ...fontBody, color: activeMode.color, background: activeMode.tint }}>
          <FileText size={16} className="shrink-0" /> TXT fayldan savollarni yuklang yoki kerak bo‘lsa qo‘lda savol qo‘shing.
        </div>
      )}
      {mode === 'math' && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[13px]" style={{ ...fontBody, color: activeMode.color, background: activeMode.tint }}>
          <Calculator size={16} className="mt-0.5 shrink-0" /> Matematik savollarni formula klaviaturasida yozing yoki PDF’dan olib kiring.
        </div>
      )}
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Sohaga nom bering" />
      )}
      <TextField label="Test nomi" value={title} onChange={setTitle} placeholder="Masalan: Inflyatsiya boʻyicha test" />
      {mode === 'math' && <div className="mb-4">
        <button type="button" onClick={() => setShowPdfImport((shown) => !shown)} className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition hover:-translate-y-0.5" style={{ ...fontBody, color: activeMode.color, background: activeMode.tint, borderColor: activeMode.border }}>
          <FileText size={16} /> PDFdan savol olish
        </button>
        {showPdfImport && <Suspense fallback={<div className="mt-3 text-sm" style={{ ...fontBody, color: C.inkSoft }}>PDF o‘quvchi yuklanmoqda…</div>}>
          <MathPdfImport onImport={(items) => { setQuestions((current) => [...current, ...items]); setShowPdfImport(false); }} onClose={() => setShowPdfImport(false)} />
        </Suspense>}
      </div>}
      <QuestionBuilder questions={questions} setQuestions={setQuestions} mode={mode} />
      <VisibilityToggle value={visibility} onChange={setVisibility} accent="#5D70D6" accentSoft="#E8ECFF" />
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onDone} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition hover:bg-slate-50" style={{ ...fontBody, color: C.inkSoft, borderColor: C.rule }}><X size={15} /> Bekor qilish</button>
        <button type="button" onClick={submit} disabled={!canSubmit || submitting} className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45" style={{ ...fontBody, background: `linear-gradient(110deg,${activeMode.color},#7463D8)` }}><Check size={16} />{submitting ? 'Saqlanmoqda…' : 'Testni saqlash'}</button>
      </div>
      </section>
    </div>
  );
}

export function EditTestForm({ test, onSave, onDone }) {
  const [title, setTitle] = useState(test.title);
  const [questions, setQuestions] = useState(() => test.questions.map((question) => question.id ? question : { ...question, id: uid() }));
  const isMathTest = questions.some((question) => question.answerMode === 'math' || question.pdfSourceImageOnly || question.optionsAreMath);

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onSave({ categoryId: test.categoryId, title: title.trim(), description: test.description || '', questions });
    if (ok) onDone();
  }

  if (test.questions.some((question) => question.type === 'matching')) {
    return (
      <Suspense fallback={<SectionLoading label="Moslik testi yuklanmoqda…" compact />}>
        <MatchingTestForm initialTest={test} onSave={onSave} onDone={onDone} />
      </Suspense>
    );
  }

  return (
    <div className="mt-4 w-full min-w-0 rounded-[28px] border p-4 shadow-sm sm:p-6" style={{ background: 'linear-gradient(145deg,#FFFFFF,#F7F8FF)', borderColor: '#E1E4F2' }}>
      <TextField label="Test nomi" value={title} onChange={setTitle} />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} mode={isMathTest ? 'math' : 'manual'} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={questions.length === 0 || !title.trim()}>Saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

