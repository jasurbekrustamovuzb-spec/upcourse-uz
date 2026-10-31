import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookmarkCheck, BookmarkPlus, BookOpen, Check, Clock3, Inbox, ListChecks, Loader2, Search, Send, Users, X } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono, SectionLoading } from './App.jsx';
import { supabase } from './supabaseClient.js';

function displayName(person) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim();
  return name || (person?.username ? `@${person.username}` : 'Foydalanuvchi');
}

export function FollowerShareDialog({ resource, session, onClose }) {
  const [followers, setFollowers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentSummary, setSentSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) { setLoading(false); setError('Kuzatuvchilarga yuborish uchun akkauntga kiring.'); return undefined; }
    supabase.rpc('profile_follow_list', { p_profile_id: session.user.id, p_list_type: 'followers', p_limit: 50 })
      .then(({ data, error: requestError }) => {
        if (cancelled) return;
        if (requestError) throw requestError;
        setFollowers(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setError('Kuzatuvchilarni yuklab bo‘lmadi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return followers;
    return followers.filter((item) => `${displayName(item)} ${item.username || ''}`.toLowerCase().includes(term));
  }, [followers, query]);

  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function send() {
    if (!selected.length || sending) return;
    setSending(true);
    setError('');
    try {
      const resources = Array.isArray(resource?.resources) ? resource.resources : [resource];
      if (!resources.length) throw new Error('Bu sohada yuboriladigan maxfiy yoki kutilayotgan material topilmadi.');

      // The existing permission-checked RPC sends one resource at a time.
      // Send a small batch concurrently only after the user confirms; this
      // keeps page load untouched and avoids a burst for large categories.
      let sentResources = 0;
      let recipientDeliveries = 0;
      let firstFailure = null;
      for (let offset = 0; offset < resources.length; offset += 4) {
        const batch = resources.slice(offset, offset + 4);
        const results = await Promise.allSettled(batch.map(async (item) => {
          const { data, error: requestError } = await supabase.rpc('profile_shared_resource_send', {
            p_resource_type: item.type,
            p_resource_id: String(item.id),
            p_recipient_ids: selected,
          });
          if (requestError) throw requestError;
          return Number(data?.sent_count ?? selected.length);
        }));
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            sentResources += 1;
            recipientDeliveries += result.value;
          } else if (!firstFailure) firstFailure = result.reason;
        });
      }

      if (sentResources > 0) {
        setSentSummary({ isBundle: Array.isArray(resource?.resources), sentResources, totalResources: resources.length, recipientDeliveries, followers: selected.length });
      }
      if (firstFailure) {
        if (sentResources > 0) {
          setError(`${sentResources} ta material yuborildi, ${resources.length - sentResources} tasini yuborib bo‘lmadi.`);
          return;
        }
        throw firstFailure;
      }
    } catch (requestError) {
      const message = String(requestError?.message || '');
      const normalized = message.toLowerCase();
      if (normalized.includes('auth_required')) setError('Akkauntga qayta kiring, so‘ng yuborishni takrorlang.');
      else if (normalized.includes('resource_not_owned')) setError('Bu material akkauntingizga bog‘lanmagan. Muallif ma’lumotini yangilang yoki boshqa materialni tanlang.');
      else if (normalized.includes('recipient_not_follower')) setError('Tanlangan foydalanuvchi endi kuzatuvchilaringiz ro‘yxatida yo‘q. Ro‘yxatni yangilang.');
      else if (normalized.includes('invalid_recipient_count')) setError('Kamida bitta kuzatuvchini tanlang; bir martada 50 tagacha yuborish mumkin.');
      else if (normalized.includes('schema cache') || normalized.includes('could not find the function')) setError('Ulashish xizmati yangilanmagan. Supabase SQL’ni qayta ishga tushirib, birozdan keyin urinib ko‘ring.');
      else setError(message ? `Yuborilmadi: ${message.slice(0, 180)}` : 'Ulashib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.');
    } finally {
      setSending(false);
    }
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id));
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="follower-share-title" className="flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border sm:rounded-2xl" style={{ background: C.paper, color: C.ink, borderColor: C.rule, boxShadow: '0 24px 70px rgba(0,0,0,.28)' }}>
        <header className="flex items-start justify-between gap-4 border-b p-4" style={{ borderColor: C.rule }}>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs" style={{ ...fontMono, color: C.gold }}><Users size={14} /> KUZATUVCHILARGA</div>
            <h2 id="follower-share-title" className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>{sentSummary === null ? 'Materialni yuborish' : sentSummary.sentResources === sentSummary.totalResources ? 'Yuborildi' : 'Qisman yuborildi'}</h2>
            <p className="mt-1 truncate text-sm" style={{ ...fontBody, color: C.inkSoft }}>{resource.title}</p>
            {Array.isArray(resource?.resources) && sentSummary === null && <p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{resource.resources.length} ta maxfiy yoki tasdiq kutayotgan material tanlangan kuzatuvchilarga yuboriladi.</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: C.surface, color: C.inkSoft }}><X size={18} /></button>
        </header>
        {sentSummary !== null ? (
          <div className="p-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ color: C.accent, background: C.successTint }}><Check size={24} /></span>
            <p className="font-medium" style={{ ...fontBody, color: C.ink }}>{sentSummary.isBundle ? `${sentSummary.sentResources}/${sentSummary.totalResources} ta material yuborildi.` : `${sentSummary.followers} ta kuzatuvchiga yuborildi.`}</p>
            {sentSummary.isBundle && <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>{sentSummary.followers} ta kuzatuvchiga · {sentSummary.recipientDeliveries} ta yuborish</p>}
            {error && <p role="alert" className="mt-2 text-sm" style={{ ...fontBody, color: C.red }}>{error}</p>}
            <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Ular buni profilidagi “Do‘stlar ulashganlari” bo‘limida saqlashi mumkin.</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ ...fontBody, background: C.cover, color: C.white }}>Tayyor</button>
          </div>
        ) : loading ? <div className="p-6"><SectionLoading label="Kuzatuvchilar yuklanmoqda…" compact /></div> : followers.length === 0 ? (
          <div className="p-6 text-center">
            <Users size={28} className="mx-auto mb-2" style={{ color: C.gold }} />
            <p className="font-medium" style={{ ...fontBody, color: C.ink }}>Hozircha kuzatuvchingiz yo‘q.</p>
            <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kuzatuvchi qo‘shilgach, materialni shu yerdan yuborasiz.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 pb-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border px-3" style={{ background: C.surface, borderColor: C.rule, color: C.inkSoft }}>
                <Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kuzatuvchini qidirish" className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ ...fontBody, color: C.ink }} />
              </label>
              <button type="button" onClick={() => setSelected(allVisibleSelected ? selected.filter((id) => !filtered.some((item) => item.id === id)) : [...new Set([...selected, ...filtered.map((item) => item.id)])])} className="text-sm font-medium" style={{ ...fontBody, color: C.cover }}>{allVisibleSelected ? 'Tanlovni bekor qilish' : 'Ko‘rinib turganlarni tanlash'}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              {filtered.map((person) => {
                const checked = selected.includes(person.id);
                return <button type="button" key={person.id} aria-pressed={checked} onClick={() => toggle(person.id)} className="mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left" style={{ background: checked ? C.goldSoft : C.surface, borderColor: checked ? C.gold : C.rule, color: C.ink }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: C.cover, color: C.goldSoft }}><Users size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" style={fontBody}>{displayName(person)}</span>{person.username && <span className="block truncate text-xs" style={{ ...fontBody, color: C.inkSoft }}>@{person.username}</span>}</span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: checked ? C.cover : C.rule, background: checked ? C.cover : 'transparent', color: C.white }}>{checked && <Check size={13} />}</span>
                </button>;
              })}
              {filtered.length === 0 && <p className="py-6 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kuzatuvchi topilmadi.</p>}
            </div>
            {error && <p role="alert" className="px-4 pb-2 text-sm" style={{ ...fontBody, color: C.red }}>{error}</p>}
            <footer className="flex items-center justify-between gap-3 border-t p-4" style={{ borderColor: C.rule }}>
              <span className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{selected.length} ta tanlandi</span>
              <button type="button" disabled={!selected.length || sending} onClick={send} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}><Send size={15} />{sending ? 'Yuborilmoqda…' : 'Yuborish'}</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

export function SharedResourcesPanel({ session, scope = 'profile', onOpenResource, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const userId = session?.user?.id;

  const load = useCallback(async () => {
    if (!userId) { setRows([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data, error: requestError } = await supabase.rpc('profile_shared_resources_list', { p_scope: scope === 'news' ? 'all' : savedOnly ? 'saved' : 'all', p_limit: scope === 'news' ? 8 : 50 });
      if (requestError) throw requestError;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Ulashilgan materiallarni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
    } finally { setLoading(false); }
  }, [userId, scope, savedOnly]);

  useEffect(() => { load(); }, [load]);

  async function toggleSave(row) {
    if (busyId) return;
    setBusyId(row.share_id);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('profile_shared_resource_save', { p_share_id: row.share_id, p_save: !row.saved });
      if (requestError) throw requestError;
      setRows((current) => savedOnly && row.saved ? current.filter((item) => item.share_id !== row.share_id) : current.map((item) => item.share_id === row.share_id ? { ...item, saved: !row.saved, saved_at: row.saved ? null : new Date().toISOString() } : item));
    } catch {
      setError('Profilga saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally { setBusyId(''); }
  }

  const title = scope === 'news' ? 'Do‘stlardan ulashilgan' : 'Do‘stlar ulashganlari';
  return (
    <section className={scope === 'news' ? 'mt-8' : ''}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {scope !== 'news' && onBack && <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Profil</button>}
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[.14em]" style={{ ...fontMono, color: C.gold }}><Inbox size={14} /> ULASHILGAN RESURSLAR</div>
          <h2 className="text-2xl" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{title}</h2>
          {scope !== 'news' && <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kuzatuvchilaringiz yuborgan mavzu va testlar shu yerda. Profilga saqlanganlari keyin ham qoladi.</p>}
        </div>
        {scope !== 'news' && <button type="button" onClick={load} disabled={loading} aria-label="Yangilash" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: C.rule, color: C.inkSoft, background: C.surface }}><Loader2 size={16} className={loading ? 'animate-spin' : ''} /></button>}
      </div>
      {scope !== 'news' && <div className="mb-3 flex gap-2" role="tablist" aria-label="Ulashilgan materiallar">
        {[{ id: false, label: 'Kelganlar' }, { id: true, label: 'Saqlanganlar' }].map((tab) => <button key={String(tab.id)} type="button" role="tab" aria-selected={savedOnly === tab.id} onClick={() => setSavedOnly(tab.id)} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ ...fontBody, color: savedOnly === tab.id ? C.white : C.inkSoft, background: savedOnly === tab.id ? C.cover : C.surface, borderColor: savedOnly === tab.id ? C.cover : C.rule }}>{tab.label}</button>)}
      </div>}
      {loading ? <SectionLoading label="Ulashilganlar yuklanmoqda…" compact /> : error ? <p role="alert" className="rounded-xl p-3 text-sm" style={{ ...fontBody, color: C.red, background: C.dangerTint }}>{error}</p> : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: C.rule, color: C.inkSoft }}>
          <Inbox size={25} className="mx-auto mb-2" style={{ color: C.gold }} />
          <p className="text-sm" style={fontBody}>{savedOnly ? 'Hozircha saqlangan material yo‘q.' : 'Hozircha do‘stlaringiz sizga material ulashmagan.'}</p>
        </div>
      ) : (
        <div className={scope === 'news' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
          {rows.map((row) => {
            const resource = row.resource;
            const kind = row.resource_type;
            const available = !!resource;
            const ResourceIcon = kind === 'course' ? BookOpen : ListChecks;
            const resourceTitle = resource?.title || 'Material mavjud emas';
            const description = resource?.summary || resource?.description || '';
            const count = Array.isArray(resource?.questions) ? resource.questions.length : 0;
            return <article key={row.share_id} className="rounded-xl border p-4" style={{ background: C.surface, borderColor: C.rule }}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: C.goldSoft, color: C.cover }}><ResourceIcon size={19} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[.12em]" style={{ ...fontMono, color: C.gold }}><span>{kind === 'course' ? 'Mavzu' : 'Test'}</span><span>·</span><span>{displayName(row.sender)}</span></div>
                  <h3 className="mt-1 text-base font-semibold leading-snug" style={{ ...fontBody, color: C.ink }}>{resourceTitle}</h3>
                  {description && <p className="mt-1 line-clamp-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>{description}</p>}
                  {kind === 'test' && <p className="mt-1 text-xs" style={{ ...fontMono, color: C.inkSoft }}>{count} ta savol</p>}
                  <p className="mt-2 flex items-center gap-1 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}><Clock3 size={12} />{row.shared_at ? new Date(row.shared_at).toLocaleDateString('uz-UZ') : ''}{row.saved && <span className="ml-1 inline-flex items-center gap-1" style={{ color: C.accent }}><BookmarkCheck size={13} /> Saqlangan</span>}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={!available} onClick={() => onOpenResource?.(kind, resource)} className="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>{kind === 'course' ? 'Mavzuni ochish' : 'Testni boshlash'}</button>
                    <button type="button" disabled={busyId === row.share_id} onClick={() => toggleSave(row)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium" style={{ ...fontBody, color: row.saved ? C.accent : C.ink, background: row.saved ? C.successTint : C.paper, borderColor: C.rule }}>
                      {row.saved ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}{row.saved ? 'Saqlangan' : 'Profilga saqlash'}
                    </button>
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
      {scope !== 'news' && <p className="mt-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ro‘yxatda {rows.length} ta ulashilgan material{rows.length === 50 ? ' (so‘nggi 50 ta)' : ''}.</p>}
    </section>
  );
}
