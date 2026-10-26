import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Swords } from 'lucide-react';
import { C, EmptyState, SectionHeading, fontBody, fontMono } from './App';
import { listTeamBattleSetsAdmin } from './teamBattleData';

export default function TeamBattleAdminView({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      setItems(await listTeamBattleSetsAdmin());
    } catch (cause) {
      setError(cause?.message?.includes('ADMIN_REQUIRED')
        ? 'Bu bo‘lim faqat administrator uchun.'
        : 'Jamoaviy savollar yuklanmadi. Supabase’da yangi admin ro‘yxatlash migratsiyasi qo‘llanganini tekshiring.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  return <div>
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 mb-5 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Admin panel</button>
    <SectionHeading eyebrow="Saqlangan jamoaviy materiallar" title="Jamoaviy jang savollari" />
    {error && <p role="alert" className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ ...fontBody, color: C.red, background: C.dangerBannerTint }}>{error}</p>}
    {loading ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm" style={{ ...fontBody, color: C.inkSoft }}><Loader2 size={17} className="animate-spin" /> Yuklanmoqda</div>
      : items.length ? <div className="space-y-3">{items.map((item) => <details key={item.id} className="overflow-hidden rounded-xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.cover, background: C.goldSoft }}><Swords size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{item.title}</span>
            <span className="mt-1 block text-xs" style={{ ...fontMono, color: C.inkSoft }}>{item.owner_name || item.owner_id} · {item.question_count} ta savol · {item.is_shared ? 'Ulashilgan' : 'Shaxsiy'} · {item.created_at ? new Date(item.created_at).toLocaleDateString('uz-UZ') : ''}</span>
          </span>
        </summary>
        <div className="space-y-2 border-t px-4 py-3" style={{ borderColor: C.rule }}>
          {(item.questions || []).map((question, index) => <div key={question.id || index} className="rounded-lg p-3" style={{ background: C.paper }}>
            <p className="text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{index + 1}. {question.text}</p>
            <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Javob: {question.answer}</p>
          </div>)}
        </div>
      </details>)}</div>
      : <EmptyState text="Hozircha jamoaviy jang savollari saqlanmagan." />}
  </div>;
}
