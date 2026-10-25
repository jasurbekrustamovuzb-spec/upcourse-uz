import React, { useState } from 'react';
import { Check, Lock, Plus, Trash2, Users, X } from 'lucide-react';
import { C, fontBody, fontMono, GhostButton, SolidButton } from './App';

export default function MatchingTestForm({ initialCategoryName = '', initialTest, onSubmit, onSave, onDone, onView }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName);
  const [title, setTitle] = useState(initialTest?.title || '');
  const [visibility, setVisibility] = useState('public');
  const [pairs, setPairs] = useState(() => {
    const rows = (initialTest?.questions || []).filter(q => q.type === 'matching').flatMap(q =>
      (q.pairs || [{ id: q.id, text: q.text, correct: q.correct }]).map(p => ({ id: p.id, left: p.text || '', right: q.options?.[p.correct] || '' }))
    );
    return rows.length ? rows : [{ left: '', right: '' }, { left: '', right: '' }];
  });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [newId, setNewId] = useState(null);
  function change(index, key, value) { setPairs(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function addPair() { if (pairs.length < 26) setPairs(rows => [...rows, { left: '', right: '' }]); }
  function removePair(index) { if (pairs.length > 2) setPairs(rows => rows.filter((_, i) => i !== index)); }
  const valid = (initialTest || categoryName.trim()) && title.trim() && pairs.length >= 2 && pairs.every(p => p.left.trim() && p.right.trim());
  async function submit() {
    if (!valid || busy) return;
    setBusy(true); setError('');
    const options = pairs.map(p => p.right.trim());
    const questions = [{ id: 'match-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), type: 'matching', text: '', options, pairs: pairs.map((p, i) => ({ id: p.id || 'pair-' + Date.now() + '-' + i, text: p.left.trim(), correct: i })) }];
    try {
      if (initialTest) {
        const saved = await onSave({ categoryId: initialTest.categoryId, title: title.trim(), description: initialTest.description || '', questions });
        if (saved) onDone(); else setError('Testni yangilashda xatolik yuz berdi. Qayta urinib koʻring.');
      } else {
        const id = await onSubmit({ categoryName: categoryName.trim(), title: title.trim(), description: '', questions, visibility });
        if (id) setNewId(id); else setError('Testni saqlashda xatolik yuz berdi. Qayta urinib koʻring.');
      }
    } catch { setError('Saqlashda xatolik yuz berdi. Qayta urinib koʻring.'); }
    finally { setBusy(false); }
  }
  if (newId) return <div className="mt-6 rounded-xl p-6 text-center" style={{ background: C.surface, border: '1px solid ' + C.accent }}>
    <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" /><div className="mb-1 text-base" style={{ ...fontBody, color: C.ink }}>Matching testingiz saqlandi!</div>
    <div className="mb-4 text-sm" style={{ ...fontBody, color: C.inkSoft }}>{visibility === 'private' ? 'Xususiy test sifatida saqlandi.' : 'Administrator tasdiqlagach hammaga koʻrinadi.'}</div>
    <div className="flex justify-center gap-3"><SolidButton onClick={() => onView(newId)} icon={Check}>Koʻrish</SolidButton><GhostButton onClick={onDone} icon={X}>Yopish</GhostButton></div>
  </div>;
  const field = { ...fontBody, color: C.ink, background: C.paper, border: '1px solid ' + C.rule };
  return <div className="mt-5 rounded-2xl p-3 sm:p-5" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
    <div className="mb-4 rounded-xl p-3 sm:p-4" style={{ background: C.mathTint, border: '1px solid ' + C.mathSoft }}>
      <div className="text-sm font-semibold" style={{ ...fontBody, color: C.mathDeep }}>Moslik testini tuzing</div>
      <div className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Har qatorda chapdagi soʻzni unga mos javob bilan juftlang. Oʻyin paytida javoblar aralashtiriladi.</div>
    </div>
    {!initialTest && <><label className="mb-1 block text-xs" style={{ ...fontMono, color: C.inkSoft }}>Soha nomi</label><input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Masalan: Ingliz tili" className="mb-4 w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={field} /></>}
    <label className="mb-1 block text-xs" style={{ ...fontMono, color: C.inkSoft }}>Test nomi</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masalan: Soʻzlarni maʼnosi bilan moslang" className="mb-4 w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={field} />
    <div className="mb-2 flex items-center justify-between"><span className="text-xs uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Juftliklar</span><span className="text-xs" style={{ ...fontMono, color: C.gold }}>{pairs.length}/26</span></div>
    <div className="space-y-2">{pairs.map((pair, i) => <div key={pair.id || i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_32px] items-center gap-1.5 rounded-xl p-2 sm:grid-cols-[32px_minmax(0,1fr)_28px_minmax(0,1fr)_36px] sm:gap-2 sm:p-3" style={{ background: C.paper, border: '1px solid ' + C.rule }}>
      <span className="hidden h-7 w-7 items-center justify-center rounded-full text-xs sm:flex" style={{ ...fontMono, color: C.white, background: C.cover }}>{i + 1}</span>
      <input value={pair.left} onChange={e => change(i, 'left', e.target.value)} aria-label={(i + 1) + '-chapdagi juft'} placeholder="Chapdagi element" className="min-w-0 w-full rounded-lg px-2 py-2 text-xs outline-none sm:px-3 sm:text-sm" style={field} />
      <span className="text-center text-sm font-semibold" style={{ color: C.gold }}>↔</span>
      <input value={pair.right} onChange={e => change(i, 'right', e.target.value)} aria-label={(i + 1) + '-oʻngdagi javob'} placeholder="Mos javob" className="min-w-0 w-full rounded-lg px-2 py-2 text-xs outline-none sm:px-3 sm:text-sm" style={field} />
      <button type="button" onClick={() => removePair(i)} disabled={pairs.length <= 2} aria-label={(i + 1) + '-juftlikni oʻchirish'} className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-25" style={{ color: C.red, background: C.dangerTint }}><Trash2 size={15} /></button>
    </div>)}</div>
    <button type="button" onClick={addPair} disabled={pairs.length >= 26} className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs disabled:opacity-40" style={{ ...fontBody, color: C.cover, border: '1px solid ' + C.rule }}><Plus size={14} /> Juftlik qoʻshish</button>
    <div className="mt-4 rounded-xl p-3" style={{ background: C.paperSoft, border: '1px solid ' + C.rule }}>
      <div className="mb-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>Oʻyin ko‘rinishi · javoblar aralashtiriladi</div>
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1.5">{pairs.map((p, i) => <div key={i} className="truncate rounded-lg px-2.5 py-2 text-xs" style={{ ...fontBody, background: C.surface, color: C.ink }}>{p.left || 'Chapdagi element'}</div>)}</div><div className="space-y-1.5">{[...pairs].reverse().map((p, i) => <div key={i} className="truncate rounded-lg px-2.5 py-2 text-xs" style={{ ...fontBody, background: C.surface, color: C.ink }}>{p.right || 'Mos javob'}</div>)}</div></div>
    </div>
    {!initialTest && <div className="mt-4"><div className="mb-1.5 text-xs uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Koʻrinishi</div><div className="flex gap-2">{[['public', Users, 'Ommaviy'], ['private', Lock, 'Xususiy']].map(([value, Icon, label]) => <button key={value} type="button" onClick={() => setVisibility(value)} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ ...fontBody, color: visibility === value ? C.white : C.ink, background: visibility === value ? C.cover : C.surface, border: '1px solid ' + (visibility === value ? C.cover : C.rule) }}><Icon size={15} />{label}</button>)}</div></div>}
    {error && <div role="alert" className="mb-3 mt-3 text-sm" style={{ ...fontBody, color: C.red }}>{error}</div>}
    <div className="mt-4 flex flex-wrap gap-3"><SolidButton onClick={submit} icon={Check} disabled={!valid || busy}>{busy ? 'Saqlanmoqda…' : initialTest ? 'Matching testni yangilash' : 'Matching testni saqlash'}</SolidButton><GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton></div>
  </div>;
}