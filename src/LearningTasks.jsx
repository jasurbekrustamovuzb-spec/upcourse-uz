import React, { useEffect, useState } from 'react';
import { Award, BookOpen, Check, CheckCircle2, Gift, ListChecks, Lock, X } from 'lucide-react';

function LearningBadgePreview() {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: '#E7E0FA', border: '1px solid #9A86D4' }}>
      <svg width="40" height="40" viewBox="0 0 64 64" role="img" aria-label="Bilimga qadam nishoni" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#F8F6FF" stroke="#9A86D4" strokeWidth="2" />
        <circle cx="32" cy="32" r="23" fill="none" stroke="#C7BCE7" strokeWidth="1.2" />
        <path d="M32 26c-5-3-10-4-15-2v16c5-2 10-1 15 2m0-16c5-3 10-4 15-2v16c-5-2-10-1-15 2m0-16v16" fill="none" stroke="#65539A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m32 8 2.1 4.1 4.5.6-3.3 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.3-3.2 4.5-.6z" fill="#B8863B" />
      </svg>
    </span>
  );
}

export default function LearningTasksModal({ session, eligible, onClose, onStartTest, onOpenGift, onKnownComplete, onCheckOwned, C, fontBody, fontDisplay, fontMono }) {
  const [state, setState] = useState(session ? 'loading' : 'ready');
  const [owned, setOwned] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) { setState('ready'); return undefined; }
    let cancelled = false;
    onCheckOwned(session.user.id)
      .then((isOwned) => {
        if (cancelled) return;
        setOwned(isOwned);
        if (isOwned && onKnownComplete) onKnownComplete(session.user.id);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('ready'); });
    return () => { cancelled = true; };
  }, [session, onCheckOwned, onKnownComplete]);

  const completed = eligible || owned;
  const progress = completed ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ background: 'rgba(15,27,18,0.58)' }} onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="learning-tasks-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-t-2xl sm:rounded-xl overflow-hidden" style={{ background: C.paperSoft, border: `1px solid ${C.rule}`, boxShadow: '0 18px 46px rgba(0,0,0,.28)' }}>
        <div className="px-5 pt-3 pb-4" style={{ background: C.surface }}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" style={{ background: C.rule }} />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: C.goldSoft, color: C.cover }}><ListChecks size={23} strokeWidth={2.1} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="learning-tasks-title" className="text-lg font-bold" style={{ ...fontDisplay, color: C.ink }}>Topshiriqlar</h2>
              <p className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Vazifani bajaring va sovg‘ani qo‘lga kiriting</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-full p-2" style={{ color: C.inkSoft, background: C.paper }}><X size={18} /></button>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="rounded-xl p-4" style={{ background: `linear-gradient(120deg, ${C.cover}, ${C.coverDeep})`, color: C.white }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em]" style={{ ...fontMono, color: C.goldSoft }}>Sizning natijangiz</div>
                <div className="mt-1 text-xl font-bold" style={fontBody}>{state === 'loading' ? 'Tekshirilmoqda…' : `${progress} / 1 bajarildi`}</div>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,.1)', color: C.goldSoft }}><Award size={25} /></span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.18)' }}><div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: C.goldSoft }} /></div>
          </div>
          <div className="rounded-xl p-3.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: completed ? C.successTint : C.selectedTint, color: completed ? C.accent : C.gold }}>{completed ? <Check size={19} /> : <span className="text-sm font-bold" style={fontMono}>1</span>}</span>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Istalgan testni yakunlang</div><div className="mt-0.5 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kamida 70% natija oling</div></div>
              <span className="text-[10px] font-semibold" style={{ ...fontBody, color: completed ? C.accent : C.inkSoft }}>{completed ? 'Bajarildi' : '0 / 1'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: C.goldSoft, border: `1px solid ${C.gold}` }}>
            <LearningBadgePreview />
            <div className="min-w-0 flex-1"><div className="text-[10px] uppercase tracking-[0.12em]" style={{ ...fontMono, color: C.cover }}>Sovg‘a</div><div className="text-sm font-bold" style={{ ...fontBody, color: C.cover }}>Bilimga qadam nishoni</div></div>
            {owned ? <span className="text-[11px] font-semibold" style={{ ...fontBody, color: C.cover }}>Olingan ✓</span> : completed ? <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ ...fontBody, color: C.cover, background: C.surface }}>Tayyor</span> : <Lock size={16} style={{ color: C.cover }} />}
          </div>
          {owned ? <button type="button" onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 font-semibold" style={{ ...fontBody, background: C.successTint, color: C.accent, border: `1px solid ${C.rule}` }}><CheckCircle2 size={17} />Sovg‘a kolleksiyangizda</button> : completed ? <button type="button" onClick={onOpenGift} className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 font-semibold" style={{ ...fontBody, background: C.cover, color: C.white, border: `1px solid ${C.cover}` }}><Gift size={17} />Sovg‘ani qabul qilish</button> : <button type="button" onClick={onStartTest} disabled={state === 'loading'} className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 font-semibold disabled:opacity-60" style={{ ...fontBody, background: C.cover, color: C.white, border: `1px solid ${C.cover}` }}><BookOpen size={17} />{state === 'loading' ? 'Holat tekshirilmoqda…' : 'Testni boshlash'}</button>}
        </div>
      </section>
    </div>
  );
}

