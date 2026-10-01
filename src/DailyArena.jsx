import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Loader2, Medal, RefreshCw, Trophy, UserRound, Users, XCircle, Zap } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App';
import { signInWithGoogle, supabase } from './supabaseClient';

const DIVISIONS = [
  { id: 'bronze', name: 'Bronza', color: '#9A6642', range: '0–999 ball' },
  { id: 'silver', name: 'Kumush', color: '#718096', range: '1 000+ ball' },
  { id: 'gold', name: 'Oltin', color: '#B8863B', range: '2 500+ ball' },
  { id: 'platinum', name: 'Platina', color: '#477C8A', range: '5 000+ ball' },
  { id: 'diamond', name: 'Olmos', color: '#4776B5', range: '9 000+ ball' },
  { id: 'legend', name: 'Afsona', color: '#8D5CBD', range: '15 000+ ball' },
];
const LEVELS = ['Isinish', 'Diqqat', 'Tafakkur', 'Murakkab', 'Usta'];
const MAX_POINTS = [30, 60, 110, 200, 360];
const divisionInfo = (id) => DIVISIONS.find((item) => item.id === id) || DIVISIONS[0];

export function ArenaProfileBadge({ userId, compact = false }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    supabase.rpc('daily_arena_get_profile', { target_user_id: userId }).then(({ data }) => {
      if (!cancelled) setInfo(data || null);
    }).catch(() => { if (!cancelled) setInfo(null); });
    return () => { cancelled = true; };
  }, [userId]);
  if (!userId) return null;
  if (!info) return <span className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Arena ligasi</span>;
  const tier = divisionInfo(info.division);
  return <div className={'flex flex-wrap items-center gap-2 ' + (compact ? '' : 'mt-3')}>
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ ...fontBody, color: tier.color, background: tier.color + '18', border: '1px solid ' + tier.color + '55' }}>
      <Medal size={13} /> {tier.name} liga{info.rank ? ' · #' + info.rank : ''}
    </span>
    {!compact && (info.badges || []).filter((badge) => badge.badge !== 'debut').slice(0, 5).map((badge) => {
      const earned = divisionInfo(badge.badge);
      return <span key={badge.season + badge.badge} title={earned.name + ' esdalik nishoni'} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px]" style={{ ...fontMono, color: earned.color, border: '1px solid ' + earned.color + '55' }}><Trophy size={11} />{earned.name}</span>;
    })}
  </div>;
}

function Notice({ children, error = false }) {
  return <div role={error ? 'alert' : 'status'} className="p-3 rounded-xl text-sm" style={{ ...fontBody, color: error ? C.red : C.inkSoft, background: error ? C.dangerBannerTint : C.paper, border: '1px solid ' + (error ? C.red : C.rule) }}>{children}</div>;
}

function Choice({ value, selected, onClick, visual = false }) {
  return <button type="button" onClick={onClick} className="min-w-0 rounded-xl border transition-colors"
    style={{ ...fontBody, minHeight: visual ? 60 : 52, padding: visual ? 8 : 12, fontSize: visual ? 23 : 14, textAlign: visual ? 'center' : 'left', color: selected ? C.white : C.ink, background: selected ? C.cover : C.paper, borderColor: selected ? C.gold : C.rule, boxShadow: selected ? '0 0 0 2px ' + C.goldSoft : 'none' }}>
    {!visual && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-[10px]" style={{ ...fontMono, color: C.gold, background: C.selectedTint }}>{value.key}</span>}{value.label}
  </button>;
}

export default function DailyArena({ session, onOpenProfile, onExit }) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState(1);
  const [choice, setChoice] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [pairs, setPairs] = useState([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [period, setPeriod] = useState('day');
  const [division, setDivision] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState('');
  const [openingProfileId, setOpeningProfileId] = useState(null);

  const loadChallenge = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('daily_arena_get_challenge');
    if (rpcError) { setError('Kunlik Arena bazasi hali sozlanmagan yoki vaqtincha ulanmayapti.'); setChallenge(null); }
    else { setChallenge(data); setStage(data?.progress?.stage || 1); setFeedback(null); setChoice(''); setTextAnswer(''); setPairs([]); }
    setLoading(false);
  }, []);
  useEffect(() => { loadChallenge(); }, [loadChallenge]);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true); setBoardError('');
    const { data, error: rpcError } = await supabase.rpc('daily_arena_leaderboard', { p_period: period, p_division: division || null, p_limit: 100 });
    if (rpcError) { setBoardError('Reytingni yuklab boʻlmadi. Qayta urinib koʻring.'); setBoard(null); }
    else setBoard(data);
    setBoardLoading(false);
  }, [period, division]);

  async function openPublicProfile(row) {
    if (!row?.user_id || !onOpenProfile) return;
    setOpeningProfileId(row.user_id);
    try {
      await onOpenProfile(row.user_id);
    } finally {
      setOpeningProfileId(null);
    }
  }

  useEffect(() => {
    if (!boardOpen) return undefined;
    const refresh = () => { if (document.visibilityState === 'visible') loadBoard(); };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [boardOpen, loadBoard]);

  const round = challenge?.rounds?.[stage - 1];
  const points = challenge?.progress?.score || 0;
  const answerCount = pairs.filter(Boolean).length;
  const pairCode = useMemo(() => pairs.join(''), [pairs]);
  const done = Boolean(challenge?.progress?.completed || challenge?.progress?.stage > 5 || feedback?.completed);
  const boardRows = board?.rows || [];

  async function submit() {
    if (!session?.user?.id) return;
    const answer = round.kind === 'text' ? textAnswer.trim() : round.kind === 'match' ? pairCode : choice;
    if (!answer || (round.kind === 'match' && answerCount !== round.left.length)) return;
    setSending(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('daily_arena_submit_answer', { p_stage: stage, p_answer: answer });
    setSending(false);
    if (rpcError) { setError('Javobni tekshirib boʻlmadi. Internetni tekshirib qayta yuboring.'); return; }
    setFeedback(data);
    setChoice(''); setTextAnswer(''); setPairs([]);
    setChallenge((old) => old ? { ...old, progress: { ...old.progress, score: data.score, stage: data.next_stage, completed: data.completed } } : old);
  }

  function next() {
    if (feedback?.completed) { setStage(6); setFeedback(null); return; }
    setStage(feedback?.next_stage || stage + 1);
    setFeedback(null); setChoice(''); setTextAnswer(''); setPairs([]);
  }

  async function signIn() {
    const { error: signInError } = await signInWithGoogle();
    if (signInError) setError('Google orqali kirishda xatolik yuz berdi.');
  }

  const resolved = Boolean(feedback?.stage_complete);
  const divisionColor = divisionInfo(board?.rows?.find((row) => row.user_id === session?.user?.id)?.division).color;

  return <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6" style={{ color: C.ink }}>
    <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Bosh sahifaga qaytish</button>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-6 items-start">
      <section>
        <div className="relative overflow-hidden rounded-2xl p-5 sm:p-7 mb-4" style={{ color: C.white, background: 'linear-gradient(135deg, ' + C.coverDeep + ', ' + C.cover + ' 65%, #315D42)', border: '1px solid ' + C.coverLine }}>
          <div aria-hidden="true" className="absolute -right-8 -top-12 w-48 h-48 rounded-full border opacity-20" style={{ borderColor: C.goldSoft, boxShadow: '0 0 0 22px rgba(220,194,143,.05), 0 0 0 44px rgba(220,194,143,.04)' }} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3"><span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ color: C.goldSoft, background: 'rgba(255,255,255,.08)' }}><Zap size={27} /></span><div>
              <div className="text-[10px] uppercase tracking-[.2em]" style={{ ...fontMono, color: C.goldSoft }}>UpCourse · kunlik arena</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-1" style={{ ...fontDisplay, color: C.white }}>{challenge?.title || 'Bugungi aqliy chaqiriq'}</h1>
              <p className="text-sm mt-2 max-w-2xl opacity-85" style={{ ...fontBody }}>{challenge?.subtitle || 'Besh bosqich. Har kuni yangi topshiriq.'}</p>
            </div></div>
            <div className="px-3 py-1.5 rounded-full text-xs" style={{ ...fontMono, color: C.goldSoft, background: 'rgba(255,255,255,.08)' }}>{challenge?.date || 'BUGUN'}</div>
          </div>
          <div className="relative mt-5 flex items-center gap-2" aria-label="Besh bosqich">
            {LEVELS.map((name, index) => {
              const number = index + 1;
              const passed = number < stage || (number === stage && resolved);
              const current = number === stage && !done;
              return <div key={name} className="flex min-w-0 flex-1 items-center gap-1">
                <span className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full flex items-center justify-center text-xs" style={{ ...fontMono, color: passed || current ? C.coverDeep : C.white, background: passed ? C.goldSoft : current ? C.white : 'rgba(255,255,255,.12)' }}>{passed ? <Check size={15} /> : number}</span>
                <span className="hidden sm:block truncate text-[10px]" style={{ ...fontMono, color: current ? C.goldSoft : 'rgba(255,255,255,.55)' }}>{name}</span>
                {index < 4 && <span className="h-px flex-1 min-w-1" style={{ background: 'rgba(255,255,255,.18)' }} />}
              </div>;
            })}
          </div>
          <div className="relative mt-4 flex justify-between text-xs" style={{ ...fontMono, color: 'rgba(255,255,255,.72)' }}>
            <span>Bugungi ball: <b style={{ color: C.goldSoft }}>{points}</b></span><span>Qiyin bosqichda koʻproq ball · 3 urinish</span>
          </div>
        </div>

        {loading ? <Notice><Loader2 size={15} className="inline animate-spin mr-2" />Bugungi oʻyin ochilmoqda...</Notice>
          : error && !challenge ? <Notice error>{error} <button type="button" onClick={loadChallenge} className="underline ml-2">Qayta urinish</button></Notice>
            : done && !round ? <div className="p-8 rounded-2xl text-center" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
              <Trophy size={36} className="mx-auto mb-3" style={{ color: C.gold }} /><div className="text-xs uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Bugungi chaqiriq yakunlandi</div>
              <h2 className="text-2xl mt-2" style={{ ...fontDisplay }}>Siz {points} ball oldingiz</h2><p className="text-sm mt-2" style={{ ...fontBody, color: C.inkSoft }}>Ertaga yangi o‘yin va yangi liga kuni boshlanadi.</p>
            </div>
              : round && <div className="rounded-2xl p-4 sm:p-6" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
                <div className="flex items-start justify-between gap-3 mb-4"><div><div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Bosqich {stage} · {LEVELS[stage - 1]}</div><h2 className="text-lg font-semibold mt-1" style={{ ...fontBody }}>Javobni toping</h2></div><span className="px-2.5 py-1 rounded-full text-xs" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}>+{MAX_POINTS[stage - 1]} ball</span></div>
                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap mb-4" style={{ ...fontBody }}>{round.prompt}</p>
                {round.kind === 'visual' && <div className="flex flex-wrap gap-2 mb-5">{round.visual.map((symbol, i) => <span key={symbol + i} className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ color: C.cover, background: C.paper, border: '1px solid ' + C.rule }}>{symbol}</span>)}<span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ ...fontMono, color: C.gold, background: C.paper, border: '1px dashed ' + C.gold }}>?</span></div>}
                {round.kind === 'match' && <div className="space-y-2 mb-4">{round.left.map((left, i) => <label key={left} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 items-center"><span className="min-w-0 truncate rounded-lg p-3 text-sm" style={{ ...fontBody, background: C.paper }}>{left}</span><select aria-label={left + ' uchun mos javob'} value={pairs[i] || ''} disabled={resolved || !session?.user?.id} onChange={(event) => setPairs((old) => old.map((value, n) => n === i ? event.target.value : value))} className="min-w-0 p-3 rounded-lg text-sm" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }}><option value="">Mosini tanlang</option>{round.right.map((right, j) => <option key={right} value={j + 1} disabled={pairs.some((value, n) => n !== i && value === String(j + 1))}>{right}</option>)}</select></label>)}</div>}
                {round.kind === 'text' ? <input aria-label="Javobingiz" autoComplete="off" value={textAnswer} onChange={(event) => setTextAnswer(event.target.value)} disabled={resolved || !session?.user?.id} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="Javobni yozing..." className="w-full p-3 rounded-xl text-base mb-4" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }} /> : round.kind !== 'match' && <div className={round.kind === 'visual' ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4' : 'grid sm:grid-cols-2 gap-2 mb-4'}>{(round.options || []).map((label, i) => { const key = String.fromCharCode(65 + i); return <Choice key={key} value={{ key, label }} visual={round.kind === 'visual'} selected={choice === key} onClick={() => setChoice(key)} />; })}</div>}
                {!session?.user?.id && <Notice>Mashqni koʻring, natijangiz saqlanishi uchun Google hisobingiz bilan kiring. <button type="button" onClick={async () => signInWithGoogle()} className="underline ml-1">Kirish</button></Notice>}
                {error && challenge && <p role="alert" className="text-sm my-2" style={{ ...fontBody, color: C.red }}>{error}</p>}
                {resolved && <div role="status" className="p-3 rounded-xl mb-4" style={{ background: feedback.correct ? C.successTint : C.dangerTint, border: '1px solid ' + (feedback.correct ? C.accent : C.red) }}>
                  <div className="flex items-start gap-2">{feedback.correct ? <CheckCircle2 size={18} style={{ color: C.accent }} /> : <XCircle size={18} style={{ color: C.red }} />}<div className="text-sm" style={{ ...fontBody }}>
                    <b>{feedback.correct ? 'Toʻgʻri! +' + (feedback.points_awarded || 0) + ' ball.' : feedback.attempts_left ? 'Yana ' + feedback.attempts_left + ' urinish bor.' : 'Urinishlar tugadi.'}</b>
                    {feedback.correct_answer && <div className="mt-1">Javob: <b>{round.kind === 'choice' || round.kind === 'visual' ? round.options[feedback.correct_answer.charCodeAt(0) - 65] : feedback.correct_answer}</b></div>}
                    <div className="mt-1 text-xs" style={{ color: C.inkSoft }}>{round.explanation}</div>
                  </div></div>
                </div>}
                {!resolved ? <button type="button" onClick={submit} disabled={sending || !session?.user?.id || !(round.kind === 'text' ? textAnswer.trim() : round.kind === 'match' ? answerCount === round.left.length : choice)} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ ...fontBody, color: C.white, background: C.cover }}>{sending ? <><Loader2 size={17} className="animate-spin" /> Tekshirilmoqda...</> : <>Javobni tekshirish <ChevronRight size={17} /></>}</button>
                  : <button type="button" onClick={next} className="inline-flex w-full sm:w-auto items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>{feedback.completed ? 'Natijani koʻrish' : 'Keyingi bosqich'} <ChevronRight size={17} /></button>}
              </div>}

        <div className="mt-4 flex justify-between items-center gap-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}><span>AI ishlatmaydi · yengil CSS interfeys</span><button type="button" onClick={loadChallenge} className="inline-flex items-center gap-1"><RefreshCw size={13} /> Holatni yangilash</button></div>
      </section>

      <aside className="rounded-2xl p-4 sm:p-5" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
        <div className="flex items-center justify-between gap-2 mb-3"><div><div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Liga</div><h2 className="text-lg font-semibold" style={{ ...fontDisplay }}>Reyting</h2></div><button type="button" onClick={() => setBoardOpen((old) => !old)} aria-expanded={boardOpen} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: C.cover, background: C.goldSoft }}><Trophy size={17} /></button></div>
        <div className="flex gap-2 mb-3">{['day','month'].map((item) => <button type="button" key={item} onClick={() => { setPeriod(item); setBoardOpen(true); }} className="flex-1 px-3 py-2 rounded-lg text-xs" style={{ ...fontBody, color: period === item ? C.white : C.inkSoft, background: period === item ? C.cover : C.paper }}>{item === 'day' ? 'Bugun' : 'Oy'}</button>)}</div>
        <label htmlFor="arena-division" className="block text-[10px] uppercase mb-1" style={{ ...fontMono, color: C.inkSoft }}>Boʻlinma</label>
        <select id="arena-division" value={division} onChange={(event) => { setDivision(event.target.value); setBoardOpen(true); }} className="w-full p-2 rounded-lg text-sm mb-3" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }}>
          <option value="">Barcha ligalar</option>{DIVISIONS.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.range}</option>)}
        </select>
        {!boardOpen ? <div className="p-3 rounded-xl text-sm" style={{ ...fontBody, color: C.inkSoft, background: C.paper }}><Users size={15} className="inline mr-1" /> Reyting faqat ochilganda yuklanadi.</div>
          : boardLoading && !board ? <Notice><Loader2 size={15} className="inline animate-spin mr-2" />Reyting yangilanmoqda...</Notice>
            : boardError ? <Notice error>{boardError} <button onClick={loadBoard} className="underline ml-1">Qayta urinish</button></Notice>
              : <div><div className="flex justify-between text-[10px] mb-2" style={{ ...fontMono, color: C.inkSoft }}><span>{period === 'day' ? 'Kunlik' : 'Oylik'}</span><span>{board?.participants || 0} kishi</span></div>
                <ol className="space-y-2">{boardRows.slice(0,10).map((row) => {
                  const tier = divisionInfo(row.division);
                  const rankColor = row.rank === 1 ? C.gold : row.rank === 2 ? C.silver : row.rank === 3 ? C.bronze : C.inkSoft;
                  const initials = (row.name || 'U').replace(/^@/, '').split(/[ ._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
                  const isOpening = openingProfileId === row.user_id;
                  return (
                    <li key={row.user_id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: row.user_id === session?.user?.id ? C.successTint : C.paper, border: '1px solid ' + (row.rank <= 3 ? rankColor + '55' : C.rule) }}>
                      <span className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px]" style={{ ...fontMono, color: rankColor, background: rankColor + '18' }}>#{row.rank}</span>
                      <button
                        type="button"
                        onClick={() => openPublicProfile(row)}
                        disabled={!onOpenProfile || isOpening}
                        aria-label={`${row.name} profilini ko‘rish`}
                        title="Profilni koʻrish"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left rounded-lg focus-visible:outline focus-visible:outline-2 disabled:cursor-default"
                        style={{ ...fontBody, color: C.ink, outlineColor: C.gold }}
                      >
                        <span className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ color: tier.color, background: tier.color + '1A', border: '1px solid ' + tier.color + '55' }}>
                          {isOpening ? <Loader2 size={14} className="animate-spin" /> : initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{row.name}</span>
                          <span className="flex items-center gap-1 text-[9px]" style={{ color: C.inkSoft }}><UserRound size={10} /> Profilni koʻrish</span>
                        </span>
                      </button>
                      <span className="flex-shrink-0 text-right">
                        <span className="block text-xs font-semibold" style={{ ...fontMono, color: tier.color }}>{row.points}</span>
                        <span className="block text-[9px]" style={{ ...fontBody, color: C.inkSoft }}>ball</span>
                      </span>
                    </li>
                  );
                })}</ol>
                {!boardRows.length && <p className="text-sm py-4 text-center" style={{ ...fontBody, color: C.inkSoft }}>Hali natijalar yoʻq. Birinchi boʻlib qatnashing!</p>}
                {boardLoading && <p className="text-[10px] text-center mt-2">Yangilanmoqda...</p>}<p className="text-[10px] text-center mt-2" style={{ ...fontBody, color: C.inkSoft }}>15 soniyada yangilanadi · Top 100</p>
              </div>}
        <div className="mt-4 p-3 rounded-xl" style={{ background: C.paper }}><div className="text-sm font-medium mb-2" style={{ ...fontBody }}><Medal size={15} className="inline mr-1" style={{ color: divisionColor }} /> Pogʻonalar</div><div className="flex flex-wrap gap-1">{DIVISIONS.slice(1).map((item) => <span key={item.id} className="px-2 py-1 rounded-full text-[10px]" style={{ ...fontMono, color: item.color, background: item.color + '15' }}>{item.name}</span>)}</div></div>
        {session?.user?.id && <div className="mt-3 p-3 rounded-xl" style={{ background: C.paper }}><div className="text-[10px] uppercase mb-1" style={{ ...fontMono, color: C.gold }}>Sizning ligada</div><ArenaProfileBadge userId={session.user.id} compact /></div>}
        <p className="text-xs mt-3 leading-relaxed" style={{ ...fontBody, color: C.inkSoft }}>Oylik liga yangi oy boshida qaytadan boshlanadi. Nishonlar esa profilingizda qoladi.</p>
      </aside>
    </div>
  </div>;
}
