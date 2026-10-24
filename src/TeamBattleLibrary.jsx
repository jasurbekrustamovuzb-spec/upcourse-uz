import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Share2, Trash2, Users } from 'lucide-react';
import { C, EmptyState, SectionHeading, fontBody, fontMono, buildShareUrl, shareItem } from './App';
import { deleteTeamBattleSet, listTeamBattleSets, setTeamBattleSetShared } from './teamBattleData';

export default function TeamBattleLibrary({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listTeamBattleSets()
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch(() => { if (!cancelled) setError('Savol toʻplamlarini yuklab boʻlmadi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function share(item) {
    setBusyId(item.id); setError('');
    try {
      let current = item;
      if (!item.is_shared) {
        current = { ...item, ...await setTeamBattleSetShared(item.id, true), is_shared: true };
        setItems((rows) => rows.map((row) => row.id === item.id ? current : row));
      }
      await shareItem(buildShareUrl({ battle: current.share_token }), current.title);
    } catch (e) { setError('Ulashish havolasini tayyorlab boʻlmadi.'); }
    finally { setBusyId(null); }
  }

  async function remove(item) {
    if (!window.confirm(`“${item.title}” savollar toʻplami oʻchirilsinmi?`)) return;
    setBusyId(item.id); setError('');
    try {
      await deleteTeamBattleSet(item.id);
      setItems((rows) => rows.filter((row) => row.id !== item.id));
    } catch (e) { setError('Toʻplamni oʻchirib boʻlmadi.'); }
    finally { setBusyId(null); }
  }

  return <div>
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 mb-5 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Profil</button>
    <SectionHeading eyebrow="Jamoaviy jang" title="Savol-javob toʻplamlarim" />
    {error && <p role="alert" className="mb-3 text-sm" style={{ ...fontBody, color: C.red }}>{error}</p>}
    {loading ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm" style={{ ...fontBody, color: C.inkSoft }}><Loader2 size={17} className="animate-spin" /> Yuklanmoqda</div> : items.length ? <div className="grid sm:grid-cols-2 gap-3">{items.map((item, index) => <article key={item.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ color: C.cover, background: C.goldSoft }}><Users size={19} /></div><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{item.title}</h2><p className="mt-1 text-xs" style={{ ...fontMono, color: C.inkSoft }}>{item.questions?.length || 0} ta savol{item.is_shared ? ' · Ulashilgan' : ''}</p></div><button type="button" disabled={busyId === item.id} onClick={() => share(item)} aria-label={`${item.title} toʻplamini ulashish`} title="Ulashish" className="rounded-lg p-2 disabled:opacity-50" style={{ color: C.cover, background: C.goldSoft }}>{busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}</button><button type="button" disabled={busyId === item.id} onClick={() => remove(item)} aria-label={`${item.title} toʻplamini oʻchirish`} title="Oʻchirish" className="rounded-lg p-2 disabled:opacity-50" style={{ color: C.red, background: C.dangerBannerTint }}><Trash2 size={15} /></button></article>)}</div> : <EmptyState text="Hozircha jamoaviy jang savollari yoʻq." cta="Yangi toʻplamni Jamoaviy jang bo‘limidan yarating." />}
  </div>;
}
