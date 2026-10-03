import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Command, Loader2, Search, UserRound, X } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App';
import { supabase } from './supabaseClient';

const escapeLike = (value) => value.replace(/[\\%_,()"]/g, '\\$&');

function ResultGroup({ title, icon: Icon, rows, onChoose, getLabel, getMeta }) {
  if (!rows.length) return null;
  return <section className="mt-3">
    <h2 className="px-3 pb-1 text-[10px] uppercase tracking-[.14em]" style={{ ...fontMono, color: C.inkSoft }}>{title}</h2>
    <ul className="space-y-1">{rows.map((row) => <li key={row.id}>
      <button type="button" onClick={() => onChoose(row)} className="flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.ink, outlineColor: C.gold }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: C.selectedTint, color: C.gold }}><Icon size={16} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{getLabel(row)}</span><span className="block truncate text-xs" style={{ color: C.inkSoft }}>{getMeta(row)}</span></span>
        <ArrowUpRight size={15} className="shrink-0" style={{ color: C.inkSoft }} />
      </button>
    </li>)}</ul>
  </section>;
}

export default function GlobalSearch({ onClose, onOpenItem, onOpenProfile, categories = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ courses: [], tests: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const term = query.trim().slice(0, 80);
  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    if (term.length < 2) {
      setResults({ courses: [], tests: [], people: [] });
      setError('');
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const pattern = `%${escapeLike(term)}%`;
      const usernameTerm = term.replace(/^@+/, '');
      const profilePattern = `%${escapeLike(usernameTerm || term)}%`;
      const queries = [
        supabase.from('courses').select('id,title,category_id,summary').eq('status', 'approved').ilike('title', pattern).order('created_at', { ascending: false }).limit(6).abortSignal(controller.signal),
        supabase.from('tests').select('id,title,category_id,description').eq('status', 'approved').ilike('title', pattern).order('created_at', { ascending: false }).limit(6).abortSignal(controller.signal),
        supabase.from('profiles').select('id,username,first_name,last_name').not('username', 'is', null)
          .or(`username.ilike.${profilePattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
          .limit(8).abortSignal(controller.signal),
      ];
      const settled = await Promise.allSettled(queries);
      if (cancelled) return;
      const values = settled.map((item) => item.status === 'fulfilled' && !item.value.error ? item.value.data || [] : []);
      setResults({ courses: values[0], tests: values[1], people: values[2] });
      if (settled.some((item) => item.status === 'rejected' || item.value?.error)) setError('Ayrim natijalar yuklanmadi. Qidiruvni davom ettirishingiz mumkin.');
      setLoading(false);
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [term]);

  const hasResults = results.courses.length + results.tests.length + results.people.length > 0;
  return <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-[10vh] sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Sayt bo‘yicha qidiruv" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ background: 'rgba(12,24,17,.58)', backdropFilter: 'blur(5px)' }}>
    <div className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: C.rule }}>
        <Search size={19} style={{ color: C.gold }} />
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') event.preventDefault(); }} placeholder="Kurs, test yoki profilni qidiring…" maxLength={80} className="min-w-0 flex-1 bg-transparent py-1 text-[15px] outline-none" style={{ ...fontBody, color: C.ink }} aria-label="Qidiruv so‘zi" />
        {loading ? <Loader2 size={17} className="animate-spin" style={{ color: C.inkSoft }} /> : <kbd className="hidden rounded-md border px-1.5 py-1 text-[10px] sm:block" style={{ ...fontMono, color: C.inkSoft, borderColor: C.rule }}>ESC</kbd>}
        <button type="button" onClick={onClose} aria-label="Qidiruvni yopish" className="rounded-lg p-1.5" style={{ color: C.inkSoft }}><X size={17} /></button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto p-3">
        {!term && <div className="px-3 py-6 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: C.gold, background: C.selectedTint }}><Command size={19} /></div><p className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kurs, test yoki foydalanuvchini toping</p><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kamida 2 ta harf yozing</p></div>}
        {term.length === 1 && <p className="px-3 py-5 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Qidirish uchun yana bir harf kiriting</p>}
        {error && <p role="status" className="px-3 py-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{error}</p>}
        <ResultGroup title="Kurslar va mavzular" icon={BookOpen} rows={results.courses} onChoose={(row) => onOpenItem('course', row.id)} getLabel={(row) => row.title} getMeta={(row) => categoryNames.get(row.category_id) || row.summary || 'Kurs'} />
        <ResultGroup title="Testlar" icon={BookOpen} rows={results.tests} onChoose={(row) => onOpenItem('test', row.id)} getLabel={(row) => row.title} getMeta={(row) => categoryNames.get(row.category_id) || row.description || 'Test'} />
        <ResultGroup title="Foydalanuvchilar" icon={UserRound} rows={results.people} onChoose={(row) => { onOpenProfile(row.username); onClose(); }} getLabel={(row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || `@${row.username}`} getMeta={(row) => row.username ? `@${row.username}` : 'Profil'} />
        {term.length >= 2 && !loading && !hasResults && <div className="px-3 py-7 text-center"><p className="text-sm font-medium" style={{ ...fontDisplay, color: C.ink }}>Natija topilmadi</p><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Boshqa soʻz yoki qisqaroq soʻrovni sinab koʻring</p></div>}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-2 text-[10px]" style={{ ...fontMono, color: C.inkSoft, borderColor: C.rule }}><span>UpCourse · qidiruv</span><span>Esc · yopish</span></div>
    </div>
  </div>;
}
