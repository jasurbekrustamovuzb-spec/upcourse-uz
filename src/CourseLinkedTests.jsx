import React, { useEffect, useState } from 'react';
import { BookOpen, Link2, Loader2, Search, Trash2, X } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App';
import { supabase } from './supabaseClient';

const safeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

export default function CourseLinkedTests({ courseId, courseAuthorId, userId, isAdmin, onOpenTest }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const canManage = Boolean(isAdmin || (userId && courseAuthorId === userId));
  const linkedIds = new Set(tests.map((test) => test.id));

  async function loadLinks() {
    setLoading(true);
    setListError('');
    const { data, error: requestError } = await supabase
      .from('course_test_links')
      .select('test_id, tests!course_test_links_test_id_fkey(id,title,description,question_count,status,author_id)')
      .eq('course_id', courseId);
    if (requestError) {
      console.error('Mavzuga bogʻlangan testlarni yuklab boʻlmadi:', requestError);
      setListError('Bogʻlangan testlarni yuklab boʻlmadi.');
    } else {
      setTests((data || []).map((link) => link.tests).filter((test) => test && test.status === 'approved'));
    }
    setLoading(false);
  }

  useEffect(() => { loadLinks(); }, [courseId]);

  useEffect(() => {
    if (!modalOpen || query.trim().length < 2) {
      setCandidates([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const { data, error: requestError } = await supabase
        .from('tests')
        .select('id,title,description,question_count')
        .eq('status', 'approved')
        .ilike('title', \`%\${safeLike(query.trim().slice(0, 80))}%\`)
        .order('created_at', { ascending: false })
        .limit(8)
        .abortSignal(controller.signal);
      if (cancelled) return;
      setCandidates(requestError ? [] : (data || []));
      setSearching(false);
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [modalOpen, query]);

  async function addLink(test) {
    if (!userId || !canManage || savingId) return;
    setSavingId(test.id);
    setError('');
    const { error: requestError } = await supabase
      .from('course_test_links')
      .insert({ course_id: courseId, test_id: test.id, created_by: userId });
    if (requestError) {
      console.error('Testni mavzuga bogʻlab boʻlmadi:', requestError);
      setError('Testni bogʻlab boʻlmadi. Keyinroq qayta urinib koʻring.');
    } else {
      setCandidates((previous) => previous.filter((item) => item.id !== test.id));
      await loadLinks();
    }
    setSavingId('');
  }

  async function removeLink(testId) {
    if (!userId || !canManage || savingId) return;
    setSavingId(testId);
    setError('');
    const { error: requestError } = await supabase
      .from('course_test_links')
      .delete()
      .eq('course_id', courseId)
      .eq('test_id', testId);
    if (requestError) {
      console.error('Testni mavzudan ajratib boʻlmadi:', requestError);
      setError('Testni ajratib boʻlmadi. Keyinroq qayta urinib koʻring.');
    } else {
      await loadLinks();
    }
    setSavingId('');
  }

  const panelStyle = { background: C.surface, border: \`1px solid \${C.rule}\` };
  return (
    <section className="mt-7" aria-labelledby="course-related-tests">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[.14em]" style={{ ...fontMono, color: C.gold }}>Mavzuni mustahkamlash</div>
          <h4 id="course-related-tests" className="text-lg" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Shu mavzu bo‘yicha testlar</h4>
        </div>
        {canManage && <button type="button" onClick={() => { setModalOpen(true); setError(''); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium" style={{ ...fontBody, color: C.white, background: C.cover }}><Link2 size={14} /> Test bog‘lash</button>}
      </div>
      {loading ? <div role="status" className="flex items-center gap-2 py-3 text-sm" style={{ ...fontBody, color: C.inkSoft }}><Loader2 size={16} className="animate-spin" /> Testlar yuklanmoqda…</div>
        : listError ? <p role="status" className="text-sm py-2" style={{ ...fontBody, color: C.inkSoft }}>{listError}</p>
          : tests.length ? <div className="grid gap-2 sm:grid-cols-2">
            {tests.map((test) => <article key={test.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl p-3" style={panelStyle}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: C.selectedTint, color: C.gold }}><BookOpen size={17} /></span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{test.title}</div>
                  <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{Number(test.question_count || 0)} ta savol</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => onOpenTest(test.id)} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ ...fontBody, color: C.white, background: C.cover }}>Testni ishlash</button>
                {canManage && <button type="button" onClick={() => removeLink(test.id)} disabled={Boolean(savingId)} aria-label={\`"\${test.title}" testini ajratish\`} title="Ajratish" className="rounded-full p-2 disabled:opacity-50" style={{ color: C.red, background: C.dangerTint }}>{savingId === test.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>}
              </div>
            </article>)}
          </div>
          : <p className="rounded-xl p-3 text-sm" style={{ ...panelStyle, ...fontBody, color: C.inkSoft }}>Bu mavzuga hali test biriktirilmagan.</p>}
      {error && <p role="status" className="mt-2 text-xs" style={{ ...fontBody, color: C.red }}>{error}</p>}

      {modalOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Mavzuga test bog‘lash" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }} style={{ background: 'rgba(12,24,17,.58)' }}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl" style={panelStyle}>
          <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: C.rule }}>
            <div><div className="text-[10px] uppercase tracking-[.14em]" style={{ ...fontMono, color: C.gold }}>Mavzuga bog‘lash</div><h3 className="text-lg" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Mos testni tanlang</h3></div>
            <button type="button" onClick={() => setModalOpen(false)} aria-label="Yopish" className="rounded-lg p-2" style={{ color: C.inkSoft }}><X size={18} /></button>
          </header>
          <div className="p-4">
            <label className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ border: \`1px solid \${C.rule}\`, background: C.paper }}>
              <Search size={16} style={{ color: C.inkSoft }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder="Test nomini yozing…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ ...fontBody, color: C.ink }} />
              {searching && <Loader2 size={15} className="animate-spin" style={{ color: C.gold }} />}
            </label>
            {query.trim().length < 2 ? <p className="py-5 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Qidirish uchun kamida 2 ta harf kiriting.</p>
              : !searching && candidates.length === 0 ? <p className="py-5 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>Ochiq test topilmadi.</p>
                : <ul className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto">{candidates.map((test) => <li key={test.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: C.paperSoft }}>
                  <div className="min-w-0"><div className="truncate text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{test.title}</div><div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{Number(test.question_count || 0)} ta savol</div></div>
                  <button type="button" onClick={() => addLink(test)} disabled={Boolean(savingId) || linkedIds.has(test.id)} className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50" style={{ ...fontBody, color: C.cover, background: C.goldSoft }}>{savingId === test.id ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}{linkedIds.has(test.id) ? 'Bog‘langan' : 'Bog‘lash'}</button>
                </li>)}</ul>}
            <button type="button" onClick={() => setModalOpen(false)} className="mt-3 rounded-full px-3 py-2 text-xs" style={{ ...fontBody, color: C.inkSoft, border: \`1px solid \${C.rule}\` }}>Yopish</button>
          </div>
        </div>
      </div>}
    </section>
  );
}
