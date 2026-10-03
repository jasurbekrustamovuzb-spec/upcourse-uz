import React, { useEffect, useState } from 'react';
import { Award, Loader2, Sparkles } from 'lucide-react';
import { C, CollectibleThumb, fontBody, fontDisplay, fontMono } from './App';
import { supabase } from './supabaseClient';

export default function PublicCollections({ userId }) {
  const [state, setState] = useState('loading');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('public_profile_collectibles', { p_user_id: userId });
        if (error) throw error;
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (state === 'loading') return <div className="flex items-center justify-center py-12"><Loader2 size={19} className="animate-spin" style={{ color: C.gold }} /></div>;
  if (state === 'error') return <p role="status" className="py-8 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kolleksiyani yuklab boʻlmadi. Keyinroq qayta urinib koʻring.</p>;
  if (!items.length) return <div className="mx-auto max-w-sm py-10 text-center"><Award size={28} className="mx-auto mb-2" style={{ color: C.gold }} /><p className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Bu profilda hozircha ochiq nishon yoʻq.</p></div>;

  const featured = items.find((item) => item.equipped);
  return <section aria-label="Foydalanuvchi kolleksiyasi" className="mt-4">
      <div className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: `linear-gradient(120deg, ${C.cover}, ${C.coverDeep})`, color: C.white }}>
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: C.goldSoft, color: C.cover }}><Sparkles size={19} /></span><div className="min-w-0"><div className="text-[10px] uppercase tracking-[.15em]" style={{ ...fontMono, color: C.goldSoft }}>Toʻplangan esdaliklar</div><div className="truncate text-sm" style={{ ...fontDisplay, color: C.white }}>{items.length} ta nishon</div></div></div>
      {featured && <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ ...fontMono, background: 'rgba(255,255,255,.12)', color: C.white }}>Profil nishoni</span>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="relative flex min-h-36 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl px-3 py-4 text-center" style={{ background: C.surface, border: `1px solid ${item.equipped ? C.gold : C.rule}`, boxShadow: item.equipped ? `0 5px 18px ${C.gold}22` : 'none' }}>
          {item.equipped && <span className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px]" style={{ ...fontMono, background: C.goldSoft, color: C.cover }}>TAQILGAN</span>}
          <CollectibleThumb collectibleId={item.collectible_id} size={48} />
          <div className="text-[13px] font-medium leading-tight" style={{ ...fontBody, color: C.ink }}>{item.title || 'Esdalik nishoni'}</div>
          {item.subtitle && <div className="line-clamp-2 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>{item.subtitle}</div>}
        </article>
      ))}
    </div>
  </section>;
}

