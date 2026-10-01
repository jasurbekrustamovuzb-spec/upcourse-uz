import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { C, fontBody, fontMono } from './App';
import { signInWithGoogle, supabase } from './supabaseClient';

export default function ProfileFollow({ userId, session }) {
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  const followers = Number(summary?.followers || 0).toLocaleString('uz-UZ');
  const following = Number(summary?.following || 0).toLocaleString('uz-UZ');
  return <>
    <div title="Kuzatuvchilar">
      <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{summary ? followers : '—'}</div>
      <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kuzatuvchi</div>
    </div>
    <div title="Kuzatayotganlari">
      <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{summary ? following : '—'}</div>
      <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kuzatmoqda</div>
    </div>
    {!isSelf && <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={toggleFollow} disabled={saving || !summary} title={summary?.is_following ? 'Kuzatuvni bekor qilish' : undefined} aria-label={summary?.is_following ? 'Kuzatuvni bekor qilish' : session?.user?.id ? 'Profilni kuzatish' : 'Kirish va profilni kuzatish'} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60" style={{ ...fontBody, color: summary?.is_following ? C.ink : C.white, background: summary?.is_following ? C.paper : C.cover, border: `1px solid ${summary?.is_following ? C.rule : C.cover}` }} aria-pressed={Boolean(summary?.is_following)}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : summary?.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
        {saving ? 'Saqlanmoqda…' : summary?.is_following ? 'Kuzatyapsiz' : session?.user?.id ? 'Kuzatish' : 'Kirish va kuzatish'}
      </button>
      {error && <span role="status" className="max-w-36 text-[10px]" style={{ ...fontBody, color: C.red }}>{error}</span>}
    </div>}
  </>;
}
