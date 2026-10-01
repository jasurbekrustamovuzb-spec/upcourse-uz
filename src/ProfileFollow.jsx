import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { C, fontBody, fontMono } from './App';
import { signInWithGoogle, supabase } from './supabaseClient';

export default function ProfileFollow({ userId, session, onOpenProfile }) {
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listType, setListType] = useState('');
  const [listRows, setListRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const isSelf = session?.user?.id === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error: requestError } = await supabase.rpc('profile_follow_summary', { p_profile_id: userId });
      if (requestError) throw requestError;
      setSummary(data || { followers: 0, following: 0, is_following: false });
      setError('');
    } catch {
      setError('Kuzatuv ma’lumotini yuklab bo‘lmadi.');
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!session?.user?.id) {
      const { error: loginError } = await signInWithGoogle();
      if (loginError) setError('Kirishda xatolik yuz berdi.');
      return;
    }
    if (isSelf || saving) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: requestError } = await supabase.rpc('profile_follow_toggle', {
        p_profile_id: userId,
        p_follow: !summary?.is_following,
      });
      if (requestError) throw requestError;
      if (data) setSummary(data);
      else await load();
    } catch {
      setError('Kuzatuvni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function openList(type) {
    setListType(type);
    setListRows([]);
    setListLoading(true);
    setError('');
    try {
      const { data, error: requestError } = await supabase.rpc('profile_follow_list', {
        p_profile_id: userId,
        p_list_type: type,
        p_limit: 50,
      });
      if (requestError) throw requestError;
      setListRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Roʻyxatni yuklab boʻlmadi. Qayta urinib koʻring.');
    } finally {
      setListLoading(false);
    }
  }

  const followers = Number(summary?.followers || 0).toLocaleString('uz-UZ');
  const following = Number(summary?.following || 0).toLocaleString('uz-UZ');
  return <>
    <button type="button" onClick={() => openList('followers')} title="Kuzatuvchilar roʻyxatini ochish" aria-label={`${followers} kuzatuvchi`} className="text-left rounded-md focus-visible:outline focus-visible:outline-2" style={{ outlineColor: C.gold }}>
      <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{summary ? followers : '—'}</div>
      <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kuzatuvchi</div>
    </button>
    <button type="button" onClick={() => openList('following')} title="Kuzatayotganlar roʻyxatini ochish" aria-label={`${following} kuzatilmoqda`} className="text-left rounded-md focus-visible:outline focus-visible:outline-2" style={{ outlineColor: C.gold }}>
      <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{summary ? following : '—'}</div>
      <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kuzatmoqda</div>
    </button>
    {!isSelf && <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={toggleFollow} disabled={saving || !summary} title={summary?.is_following ? 'Kuzatuvni bekor qilish' : undefined} aria-label={summary?.is_following ? 'Kuzatuvni bekor qilish' : session?.user?.id ? 'Profilni kuzatish' : 'Kirish va profilni kuzatish'} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60" style={{ ...fontBody, color: summary?.is_following ? C.ink : C.white, background: summary?.is_following ? C.paper : C.cover, border: `1px solid ${summary?.is_following ? C.rule : C.cover}` }} aria-pressed={Boolean(summary?.is_following)}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : summary?.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
        {saving ? 'Saqlanmoqda…' : summary?.is_following ? 'Kuzatyapsiz' : session?.user?.id ? 'Kuzatish' : 'Kirish va kuzatish'}
      </button>
      {error && <span role="status" className="max-w-36 text-[10px]" style={{ ...fontBody, color: C.red }}>{error}</span>}
    </div>}
    {listType && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={listType === 'followers' ? 'Kuzatuvchilar' : 'Kuzatayotganlari'} onMouseDown={(event) => { if (event.target === event.currentTarget) setListType(''); }} style={{ background: 'rgba(12,24,17,.58)' }}>
      <section className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: C.rule }}>
          <h2 className="flex items-center gap-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}><Users size={16} style={{ color: C.gold }} />{listType === 'followers' ? 'Kuzatuvchilar' : 'Kuzatayotganlari'}</h2>
          <button type="button" onClick={() => setListType('')} aria-label="Roʻyxatni yopish" className="rounded-lg p-1.5" style={{ color: C.inkSoft }}><X size={17} /></button>
        </header>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {listLoading ? <div className="flex justify-center p-7"><Loader2 size={20} className="animate-spin" style={{ color: C.gold }} /></div>
            : listRows.length ? listRows.map((person) => <button key={person.id} type="button" onClick={() => { setListType(''); if (person.username) onOpenProfile?.(person.username); }} disabled={!person.username} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-black/5 disabled:opacity-50" style={{ ...fontBody, color: C.ink }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs" style={{ color: C.white, background: C.cover }}>{(person.first_name || person.username || '?').slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{`${person.first_name || ''} ${person.last_name || ''}`.trim() || `@${person.username}`}</span><span className="block truncate text-xs" style={{ color: C.inkSoft }}>@{person.username || 'foydalanuvchi'}</span></span>
            </button>)
            : <p className="p-7 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>{error || 'Hozircha roʻyxat boʻsh.'}</p>}
        </div>
      </section>
    </div>}
  </>;
}

