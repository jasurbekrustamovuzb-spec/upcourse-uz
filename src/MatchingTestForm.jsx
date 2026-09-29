import React, { useState } from 'react';
import { Check, Lock, Plus, Trash2, Users, X } from 'lucide-react';
import { C, fontBody, fontMono, GhostButton, SolidButton } from './App';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function MatchingTestForm({ initialCategoryName = '', initialTest, onSubmit, onSave, onDone, onView }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [title, setTitle] = useState(initialTest?.title || '');
  const [visibility, setVisibility] = useState('public');
  const [left, setLeft] = useState(() => {
    const questions = (initialTest?.questions || []).filter((question) => question.type === 'matching');
    const groupedPairs = questions.flatMap((question) => question.pairs || []);
    if (groupedPairs.length) return groupedPairs.map((pair) => ({ id: pair.id, text: pair.text, answer: pair.correct }));
    if (questions.length) return questions.map((question) => ({ id: question.id, text: question.text, answer: question.correct }));
    return [{ text: '', answer: null }, { text: '', answer: null }];
  });
  const [right, setRight] = useState(() => initialTest?.questions?.find((question) => question.type === 'matching')?.options || ['', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newId, setNewId] = useState(null);

  function changeLeft(index, field, value) {
    setLeft((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function changeRight(index, value) {
    setRight((items) => items.map((item, i) => i === index ? value : item));
  }

  function addPair() {
    setLeft((items) => [...items, { text: '', answer: null }]);
    if (left.length >= right.length) setRight((items) => [...items, '']);
  }

  function removePair(index) {
    if (left.length <= 2) return;
    setLeft((items) => items.filter((_, i) => i !== index));
  }

  function addOption() {
    if (right.length < 26) setRight((items) => [...items, '']);
  }

  function removeOption(index) {
    if (right.length <= 2 || left.some((item) => item.answer === index)) return;
    setRight((items) => items.filter((_, i) => i !== index));
    setLeft((items) => items.map((item) => ({ ...item, answer: item.answer > index ? item.answer - 1 : item.answer })));
  }

  const valid = (initialTest || categoryName.trim()) && title.trim() && left.length >= 2 && right.length >= 2
    && left.every((item) => item.text.trim() && right[item.answer]?.trim())
    && right.every((item) => item.trim());

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    const options = right.map((text) => text.trim());
    const questions = [{
      id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'matching',
      text: '',
      options,
      pairs: left.map((item, index) => ({ id: item.id || `pair-${Date.now()}-${index}`, text: item.text.trim(), correct: item.answer })),
    }];
    if (initialTest) {
      const saved = await onSave({ categoryId: initialTest.categoryId, title: title.trim(), description: initialTest.description || '', questions });
      if (saved) onDone();
      else setError('Testni yangilashda xatolik yuz berdi. Qayta urinib ko‘ring.');
    } else {
      const id = await onSubmit({ categoryName: categoryName.trim(), title: title.trim(), description: '', questions, visibility });
      if (id) setNewId(id);
      else setError('Testni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.');
    }
    setBusy(false);
  }

  if (newId) {
    return (
      <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
        <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
        <div className="text-base mb-1" style={{ ...fontBody, color: C.ink }}>Matching testingiz saqlandi!</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.inkSoft }}>
          {visibility === 'private' ? 'Xususiy test sifatida saqlandi.' : 'Administrator tasdiqlagach hammaga ko‘rinadi.'}
        </div>
        <div className="flex gap-3 justify-center">
          <SolidButton onClick={() => onView(newId)} icon={Check}>Ko‘rish</SolidButton>
          <GhostButton onClick={onDone} icon={X}>Yopish</GhostButton>
        </div>
      </div>
    );
  }

  const inputStyle = { ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` };

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <div className="mb-5 px-4 py-3 rounded-sm" style={{ background: C.mathTint, border: `1px solid ${C.mathSoft}` }}>
        <div className="font-medium text-sm" style={{ ...fontBody, color: C.mathDeep }}>Matching test tuzing</div>
        <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Chap tomondagi har bir bandga o‘ng tomondan mos javobni tanlang. Kerak bo‘lsa, bitta javob bir necha marta ishlatilishi mumkin.</div>
      </div>

      {!initialTest && <>
        <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Soha nomi</label>
        <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Masalan: Ingliz tili" className="w-full px-3 py-2.5 rounded-sm text-sm outline-none mb-4" style={inputStyle} />
      </>}
      <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Test nomi</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: So‘zlarni ma’nosi bilan moslang" className="w-full px-3 py-2.5 rounded-sm text-sm outline-none mb-5" style={inputStyle} />

      <div className="grid md:grid-cols-2 gap-5 min-w-0">
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>1-qism - Moslashtiriladigan matnlar</div>
            <span className="text-xs" style={{ ...fontMono, color: C.gold }}>{left.length}</span>
          </div>
          <div className="space-y-2">
            {left.map((item, index) => (
              <div key={index} className="p-2 rounded-sm min-w-0" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs flex-shrink-0" style={{ ...fontMono, color: C.white, background: C.cover }}>{index + 1}</span>
                  <input value={item.text} onChange={(e) => changeLeft(index, 'text', e.target.value)} aria-label={`${index + 1}-matn`} placeholder={`${index + 1}. Matn`} className="min-w-0 flex-1 px-2 py-2 rounded-sm text-sm outline-none" style={inputStyle} />
                  <button type="button" onClick={() => removePair(index)} aria-label="Matnni o‘chirish" disabled={left.length <= 2} className="p-1 flex-shrink-0 disabled:opacity-30" style={{ color: C.red }}><Trash2 size={15} /></button>
                </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Mos javob:</span>
                {right.map((_, ri) => {
                  const selected = item.answer === ri;
                  return <button
                    key={ri}
                    type="button"
                    onClick={() => changeLeft(index, 'answer', ri)}
                    aria-label={`${index + 1}-matn uchun ${LETTERS[ri]} javobni tanlash`}
                    aria-pressed={selected}
                    className="min-w-9 h-9 px-2 rounded-full text-sm font-medium transition-colors"
                    style={{ ...fontMono, color: selected ? C.white : C.mathDeep, background: selected ? C.math : C.surface, border: `1px solid ${selected ? C.math : C.rule}` }}
                  >{LETTERS[ri]}</button>;
                })}
                <span className="ml-1 text-xs" style={{ ...fontBody, color: item.answer === null ? C.inkSoft : C.mathDeep }}>
                  {item.answer === null ? 'Tanlanmagan' : `Tanlandi: ${LETTERS[item.answer]}`}
                </span>
              </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPair} className="mt-2 inline-flex items-center gap-1 text-xs px-3 py-2 rounded-sm" style={{ ...fontBody, color: C.cover, border: `1px solid ${C.rule}` }}><Plus size={14} /> Yana matn qo‘shish</button>
        </section>

        <section className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>2-qism - Javob variantlari</div>
            <span className="text-xs" style={{ ...fontMono, color: C.gold }}>{right.length}</span>
          </div>
          <div className="space-y-2 min-w-0">
            {right.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-sm" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
                <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs flex-shrink-0" style={{ ...fontMono, color: C.white, background: C.math }}>{LETTERS[index]}</span>
                <input value={item} onChange={(e) => changeRight(index, e.target.value)} aria-label={`${LETTERS[index]} javob`} placeholder={`${LETTERS[index]}. Javob`} className="min-w-0 flex-1 px-2 py-2 rounded-sm text-sm outline-none" style={inputStyle} />
                <button type="button" onClick={() => removeOption(index)} aria-label="Variantni o'chirish" disabled={right.length <= 2 || left.some((row) => row.answer === index)} title={left.some((row) => row.answer === index) ? "Avval bu variantga biriktirilgan matn javobini o'zgartiring" : ''} className="p-1 disabled:opacity-30" style={{ color: C.red }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} disabled={right.length >= 26} className="mt-2 inline-flex items-center gap-1 text-xs px-3 py-2 rounded-sm disabled:opacity-40" style={{ ...fontBody, color: C.mathDeep, border: `1px solid ${C.rule}` }}><Plus size={14} /> Yana variant qo‘shish</button>
        </section>
      </div>

      <div className="mt-5 p-3 rounded-sm" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
        <div className="text-xs mb-2" style={{ ...fontMono, color: C.inkSoft }}>Mosliklar ko‘rinishi</div>
        <div className="flex flex-wrap gap-2">
          {left.map((item, index) => <span key={index} className="px-2.5 py-1.5 rounded-full text-xs" style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}>{index + 1}{item.answer === null ? '—' : LETTERS[item.answer]} <span style={{ color: C.inkSoft }}>{item.text || 'Matn'}</span></span>)}
        </div>
      </div>

      {!initialTest && <div className="mt-5 mb-3">
        <div className="text-xs mb-1.5 uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Ko‘rinishi</div>
        <div className="flex gap-2">
          {[['public', Users, 'Ommaviy'], ['private', Lock, 'Xususiy']].map(([value, Icon, label]) => (
            <button key={value} type="button" onClick={() => setVisibility(value)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm text-sm" style={{ ...fontBody, color: visibility === value ? C.white : C.ink, background: visibility === value ? C.cover : C.surface, border: `1px solid ${visibility === value ? C.cover : C.rule}` }}><Icon size={15} />{label}</button>
          ))}
        </div>
      </div>}
      {error && <div role="alert" className="text-sm mb-3" style={{ ...fontBody, color: C.red }}>{error}</div>}
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={!valid || busy}>{busy ? 'Saqlanmoqda…' : initialTest ? 'Matching testni yangilash' : 'Matching testni saqlash'}</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}
