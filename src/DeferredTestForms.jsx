import { useState, useRef, Suspense, lazy } from 'react';

import { Calculator, Check, ChevronRight, FileText, Image as ImageIcon, Info, Paperclip, Plus, X } from 'lucide-react';

import { C, GhostButton, InfoHint, SectionLoading, SolidButton, TextField, VisibilityToggle, fontBody, fontMono, parseTxtQuestions, sbUploadImage, uid } from './App.jsx';

const MatchingTestForm = lazy(() => import('./MatchingTestForm.jsx'));

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

export function AddTestForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView, formMode }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [newId, setNewId] = useState(null);

  if (formMode === 'matching') {
    return (
      <Suspense fallback={<SectionLoading label="Matching test muharriri yuklanmoqda…" compact />}>
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

export function EditTestForm({ test, onSave, onDone }) {
  const [title, setTitle] = useState(test.title);
  const [questions, setQuestions] = useState(test.questions);

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onSave({ categoryId: test.categoryId, title: title.trim(), description: test.description || '', questions });
    if (ok) onDone();
  }

  if (test.questions.some((question) => question.type === 'matching')) {
    return (
      <Suspense fallback={<SectionLoading label="Matching test muharriri yuklanmoqda…" compact />}>
        <MatchingTestForm initialTest={test} onSave={onSave} onDone={onDone} />
      </Suspense>
    );
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

