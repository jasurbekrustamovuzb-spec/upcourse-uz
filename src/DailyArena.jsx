import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Loader2, Medal, RefreshCw, Trophy, UserRound, XCircle } from 'lucide-react';
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
const ARENA_MODES = [
  { id: 'all', label: 'Barcha rejimlar' },
  { id: 'pattern', label: 'Naqsh laboratoriyasi' },
  { id: 'logic', label: 'Deduksiya xonasi' },
  { id: 'word', label: 'Harflar aralashmasi' },
  { id: 'visual', label: 'Vizual signal' },
  { id: 'matching', label: 'Moslik sinovi' },
  { id: 'calculation', label: 'Tez hisob' },
  { id: 'fact', label: 'Faktlar maydoni' },
  { id: 'cipher', label: 'Raqamli shifr' },
  { id: 'attention', label: 'Diqqat sinovi' },
];
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

export default function DailyArena({ session, isAdmin = false, onOpenProfile, onExit }) {
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
  const [boardMode, setBoardMode] = useState('all');
  const [boardOpen, setBoardOpen] = useState(false);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState('');
  const [openingProfileId, setOpeningProfileId] = useState(null);
  const [showTopTen, setShowTopTen] = useState(false);
  const [showDivisionInfo, setShowDivisionInfo] = useState(false);
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
    const { data, error: rpcError } = boardMode === 'all'
      ? await supabase.rpc('daily_arena_leaderboard', { p_period: period, p_division: division || null, p_limit: 100 })
      : await supabase.rpc('daily_arena_mode_leaderboard', { p_period: period, p_division: division || null, p_limit: 100, p_mode: boardMode });
    if (rpcError) { setBoardError('Reytingni yuklab boʻlmadi. Qayta urinib koʻring.'); setBoard(null); }
    else setBoard(data);
    setBoardLoading(false);
  }, [period, division, boardMode]);

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
    if (data.correct) { setChoice(''); setTextAnswer(''); setPairs([]); }
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
  const visibleBoardRows = boardRows.slice(0, showTopTen ? 10 : 5);

  return <div className="w-full px-0 py-2 sm:py-3" style={{ color: C.ink }}>
    <div className="flex items-center justify-between gap-3 mb-3">
      <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
        <ArrowLeft size={16} /> Orqaga
      </button>
      <span className="text-[10px] uppercase tracking-[.14em]" style={{ ...fontMono, color: C.gold }}>Kunlik arena</span>
    </div>

    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-3 lg:gap-4 items-start">
      <section className="min-w-0">
        <div className="rounded-2xl p-4 sm:p-5 mb-3" style={{ color: C.white, background: 'linear-gradient(135deg, ' + C.coverDeep + ', ' + C.cover + ')', border: '1px solid ' + C.coverLine }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold" style={{ ...fontDisplay, color: C.white }}>{challenge?.title || 'Bugungi aqliy chaqiriq'}</h1>
                <span className="px-2 py-1 rounded-full text-[10px]" style={{ ...fontMono, color: C.goldSoft, background: 'rgba(255,255,255,.1)' }}>{challenge?.date || 'BUGUN'}</span>
              </div>
              {challenge?.subtitle && <p className="text-xs sm:text-sm mt-1 opacity-85" style={{ ...fontBody }}>{challenge.subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-xl text-right" style={{ background: 'rgba(255,255,255,.1)' }}>
                <span className="block text-[9px] uppercase tracking-wider" style={{ ...fontMono, color: C.goldSoft }}>Bugungi ball</span>
                <b className="block text-lg leading-tight" style={{ ...fontMono, color: C.white }}>{points}</b>
              </div>
              <button type="button" onClick={loadChallenge} aria-label="Bugungi topshiriq holatini yangilash" title="Yangilash" className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ color: C.white, background: 'rgba(255,255,255,.12)' }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Besh bosqich">
            {LEVELS.map((name, index) => {
              const number = index + 1;
              const passed = number < stage || (number === stage && resolved);
              const current = number === stage && !done;
              return <div key={name} className="min-w-0 text-center">
                <div className="flex items-center gap-1.5">
                  {index > 0 && <span className="h-px flex-1" style={{ background: passed || current ? C.goldSoft : 'rgba(255,255,255,.2)' }} />}
                  <span className="w-7 h-7 sm:w-8 sm:h-8 mx-auto flex-shrink-0 rounded-full flex items-center justify-center text-[11px]" style={{ ...fontMono, color: passed || current ? C.coverDeep : C.white, background: passed ? C.goldSoft : current ? C.white : 'rgba(255,255,255,.12)' }}>
                    {passed ? <Check size={14} /> : number}
                  </span>
                  {index < 4 && <span className="h-px flex-1" style={{ background: passed ? C.goldSoft : 'rgba(255,255,255,.2)' }} />}
                </div>
                <span className="block truncate mt-1 text-[9px] sm:text-[10px]" style={{ ...fontMono, color: current ? C.goldSoft : 'rgba(255,255,255,.66)' }}>{name}</span>
              </div>;
            })}
          </div>
        </div>

        {loading ? <Notice><Loader2 size={15} className="inline animate-spin mr-2" />Bugungi topshiriq ochilmoqda...</Notice>
          : error && !challenge ? <Notice error>{error} <button type="button" onClick={loadChallenge} className="underline ml-2">Qayta urinish</button></Notice>
            : done && !round ? <div className="p-6 sm:p-8 rounded-2xl text-center" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
              <Trophy size={32} className="mx-auto mb-2" style={{ color: C.gold }} />
              <div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Bugungi topshiriq yakunlandi</div>
              <h2 className="text-2xl mt-1" style={{ ...fontDisplay }}>Siz {points} ball oldingiz</h2>
              <p className="text-sm mt-1" style={{ ...fontBody, color: C.inkSoft }}>Ertaga yangi kunlik topshiriq boshlanadi.</p>
            </div>
              : round && <div className="rounded-2xl p-4 sm:p-5" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Bosqich {stage} · {LEVELS[stage - 1]}</div>
                    <h2 className="text-base font-semibold mt-0.5" style={{ ...fontBody }}>Topshiriq</h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}>+{MAX_POINTS[stage - 1]} ball</span>
                </div>
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-3" style={{ ...fontBody }}>{round.prompt}</p>
                {round.kind === 'visual' && <div className="flex flex-wrap gap-2 mb-4">{round.visual.map((symbol, i) => <span key={symbol + i} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ color: C.cover, background: C.paper, border: '1px solid ' + C.rule }}>{symbol}</span>)}<span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ ...fontMono, color: C.gold, background: C.paper, border: '1px dashed ' + C.gold }}>?</span></div>}
                {round.kind === 'match' && <div className="space-y-2 mb-4">{round.left.map((left, i) => <label key={left} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center"><span className="min-w-0 rounded-lg p-2.5 text-xs sm:text-sm" style={{ ...fontBody, background: C.paper }}>{left}</span><select aria-label={left + ' uchun mos javob'} value={pairs[i] || ''} disabled={resolved || !session?.user?.id} onChange={(event) => { setFeedback(null); setPairs((old) => round.left.map((_, n) => n === i ? event.target.value : (old[n] || ''))); }} className="min-w-0 p-2.5 rounded-lg text-xs sm:text-sm" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }}><option value="">Mosini tanlang</option>{round.right.map((right, j) => <option key={right} value={j + 1} disabled={pairs.some((value, n) => n !== i && value === String(j + 1))}>{right}</option>)}</select></label>)}</div>}
                {round.kind === 'text' ? <input aria-label="Javobingiz" autoComplete="off" value={textAnswer} onChange={(event) => { setFeedback(null); setTextAnswer(event.target.value); }} disabled={resolved || !session?.user?.id} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="Javobni yozing..." className="w-full p-3 rounded-xl text-base mb-3" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }} /> : round.kind !== 'match' && <div className={round.kind === 'visual' ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3' : 'grid sm:grid-cols-2 gap-2 mb-3'}>{(round.options || []).map((label, i) => { const key = String.fromCharCode(65 + i); return <Choice key={key} value={{ key, label }} visual={round.kind === 'visual'} selected={choice === key} onClick={() => { setFeedback(null); setChoice(key); }} />; })}</div>}
                {!session?.user?.id && <Notice>Mashqni koʻring, natijangiz saqlanishi uchun Google hisobingiz bilan kiring. <button type="button" onClick={signIn} className="underline ml-1">Kirish</button></Notice>}
                {error && challenge && <p role="alert" className="text-sm my-2" style={{ ...fontBody, color: C.red }}>{error}</p>}
                {feedback && feedback.correct === false && !resolved && <div role="alert" className="p-3 rounded-xl mb-3" style={{ background: C.dangerTint, border: '1px solid ' + C.red }}>
                  <div className="flex items-start gap-2"><XCircle size={18} style={{ color: C.red }} /><div className="text-sm" style={{ ...fontBody }}><b>Xato. Qayta urinib ko‘ring.</b><div className="mt-1 text-xs" style={{ color: C.inkSoft }}>{feedback.attempts_left > 0 ? feedback.attempts_left + ' ta urinish qoldi.' : 'Urinishlar tugadi.'}</div></div></div>
                </div>}
                {resolved && <div role="status" className="p-3 rounded-xl mb-3" style={{ background: feedback.correct ? C.successTint : C.dangerTint, border: '1px solid ' + (feedback.correct ? C.accent : C.red) }}>
                  <div className="flex items-start gap-2">{feedback.correct ? <CheckCircle2 size={18} style={{ color: C.accent }} /> : <XCircle size={18} style={{ color: C.red }} />}<div className="text-sm" style={{ ...fontBody }}>
                    <b>{feedback.correct ? 'Toʻgʻri! +' + (feedback.points_awarded || 0) + ' ball.' : feedback.attempts_left ? 'Yana ' + feedback.attempts_left + ' urinish bor.' : 'Urinishlar tugadi.'}</b>
                    {feedback.correct_answer && <div className="mt-1">Javob: <b>{round.kind === 'choice' || round.kind === 'visual' ? round.options[feedback.correct_answer.charCodeAt(0) - 65] : feedback.correct_answer}</b></div>}
                    <div className="mt-1 text-xs" style={{ color: C.inkSoft }}>{round.explanation}</div>
                  </div></div>
                </div>}
                {!resolved ? <button type="button" onClick={submit} disabled={sending || !session?.user?.id || !(round.kind === 'text' ? textAnswer.trim() : round.kind === 'match' ? answerCount === round.left.length : choice)} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ ...fontBody, color: C.white, background: C.cover }}>{sending ? <><Loader2 size={17} className="animate-spin" /> Tekshirilmoqda...</> : <>Javobni tekshirish <ChevronRight size={17} /></>}</button>
                  : <button type="button" onClick={next} className="inline-flex w-full sm:w-auto items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>{feedback.completed ? 'Natijani koʻrish' : 'Keyingi bosqich'} <ChevronRight size={17} /></button>}
              </div>}

        {error && challenge && !resolved && <p role="alert" className="text-xs mt-2" style={{ ...fontBody, color: C.red }}>{error}</p>}
      </section>

      <aside className="rounded-2xl p-3 sm:p-4" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
        <button type="button" onClick={() => setBoardOpen((open) => !open)} aria-expanded={boardOpen} aria-controls="arena-leaderboard-content" className="w-full flex items-center justify-between gap-3 text-left">
          <span>
            <span className="block text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Siz va boshqalar</span>
            <span className="block text-lg font-semibold" style={{ ...fontDisplay }}>Reyting</span>
            <span className="block text-xs mt-0.5" style={{ ...fontBody, color: C.inkSoft }}>{boardOpen ? 'Natijalar va ligalar' : 'Top natijalar va ligalarni koʻrish'}</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" style={{ color: C.gold, transform: boardOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }} />
        </button>
        {boardOpen && <div id="arena-leaderboard-content" className="mt-3">
          <div className="flex justify-end mb-2">
            <button type="button" onClick={loadBoard} aria-label="Reytingni yangilash" title="Yangilash" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: C.cover, background: C.goldSoft }}><RefreshCw size={15} /></button>
          </div>
        <div className="flex gap-1.5 mb-2" aria-label="Reyting davri">
          {[['day','Kunlik'],['month','Oylik']].map(([item,label]) => <button type="button" key={item} onClick={() => { setPeriod(item); setBoardOpen(true); setShowTopTen(false); }} aria-pressed={period === item} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ ...fontBody, color: period === item ? C.white : C.inkSoft, background: period === item ? C.cover : C.paper, border: '1px solid ' + (period === item ? C.cover : C.rule) }}>{label}</button>)}
        </div>
        <label htmlFor="arena-mode" className="sr-only">Reyting o‘yin turi</label>
        <select id="arena-mode" value={boardMode} onChange={(event) => { setBoardMode(event.target.value); setBoardOpen(true); setShowTopTen(false); }} className="w-full p-2 mb-2 rounded-lg text-xs" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }}>
          {ARENA_MODES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <div className="flex items-center gap-2 mb-3">
          <label htmlFor="arena-division" className="text-[10px] uppercase whitespace-nowrap" style={{ ...fontMono, color: C.inkSoft }}>Liga</label>
          <select id="arena-division" value={division} onChange={(event) => { setDivision(event.target.value); setBoardOpen(true); setShowTopTen(false); }} className="min-w-0 flex-1 p-2 rounded-lg text-xs" style={{ ...fontBody, background: C.paper, border: '1px solid ' + C.rule }}>
            <option value="">Barcha ligalar</option>{DIVISIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        {boardLoading && !board ? <Notice><Loader2 size={15} className="inline animate-spin mr-2" />Reyting yuklanmoqda...</Notice>
          : boardError ? <Notice error>{boardError} <button onClick={loadBoard} className="underline ml-1">Qayta urinish</button></Notice>
            : <div>
              <div className="flex items-center justify-between mb-2 px-1 text-[10px]" style={{ ...fontMono, color: C.inkSoft }}><span>{period === 'day' ? 'BUGUNGI NATIJALAR' : 'OYLIK NATIJALAR'}</span><span>{board?.participants || 0} kishi</span></div>
              <ol className="space-y-1.5">{visibleBoardRows.map((row) => {
                const tier = divisionInfo(row.division);
                const rankColor = row.rank === 1 ? C.gold : row.rank === 2 ? C.silver : row.rank === 3 ? C.bronze : C.inkSoft;
                const initials = (row.name || 'U').replace(/^@/, '').split(/[ ._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
                const isOpening = openingProfileId === row.user_id;
                return <li key={row.user_id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: row.user_id === session?.user?.id ? C.successTint : C.paper, border: '1px solid ' + (row.rank <= 3 ? rankColor + '55' : C.rule) }}>
                  <span className="w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px]" style={{ ...fontMono, color: rankColor, background: rankColor + '18' }}>#{row.rank}</span>
                  <button type="button" onClick={() => openPublicProfile(row)} disabled={!onOpenProfile || isOpening} aria-label={row.name + ' profilini koʻrish'} title="Profilni koʻrish" className="flex min-w-0 flex-1 items-center gap-1.5 text-left rounded-lg focus-visible:outline focus-visible:outline-2 disabled:cursor-default" style={{ ...fontBody, color: C.ink, outlineColor: C.gold }}>
                    <span className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ color: tier.color, background: tier.color + '1A', border: '1px solid ' + tier.color + '55' }}>{isOpening ? <Loader2 size={13} className="animate-spin" /> : initials}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{row.name}</span></span>
                  </button>
                  <span className="flex-shrink-0 text-right text-xs font-semibold" style={{ ...fontMono, color: tier.color }}>{row.points} <span className="text-[9px] font-normal" style={{ ...fontBody, color: C.inkSoft }}>ball</span></span>
                </li>;
              })}</ol>
              {!boardRows.length && <p className="text-sm py-4 text-center" style={{ ...fontBody, color: C.inkSoft }}>Hali natija yoʻq. Birinchi boʻlib qatnashing!</p>}
              {boardRows.length > 5 && <button type="button" onClick={() => setShowTopTen((old) => !old)} className="w-full mt-2 py-2 rounded-lg text-xs" style={{ ...fontBody, color: C.cover, background: C.paper, border: '1px solid ' + C.rule }}>{showTopTen ? 'Top 5 ni ko‘rsatish' : 'Top 10 ni ko‘rsatish'}</button>}
              <p className="text-[10px] text-center mt-2" style={{ ...fontBody, color: C.inkSoft }}>{boardLoading ? 'Yangilanmoqda…' : 'Har 15 soniyada yangilanadi'}</p>
            </div>}
        <div className="mt-3 p-3 rounded-xl flex items-center justify-between gap-2" style={{ background: C.paper }}>
          <div><div className="text-[10px] uppercase mb-1" style={{ ...fontMono, color: C.gold }}>Sizning divizioningiz</div><ArenaProfileBadge userId={session?.user?.id} compact /></div>
          {session?.user?.id && <div className="text-right"><span className="block text-base font-semibold" style={{ ...fontMono, color: divisionColor }}>{board?.rows?.find((row) => row.user_id === session.user.id)?.points ?? points}</span><span className="text-[9px]" style={{ ...fontBody, color: C.inkSoft }}>joriy ball</span></div>}
        </div>
        <button type="button" onClick={() => setShowDivisionInfo((old) => !old)} aria-expanded={showDivisionInfo} className="w-full flex items-center justify-between mt-2 py-2 px-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>
          <span><Medal size={14} className="inline mr-1" style={{ color: C.gold }} />Ligalar va esdalik nishonlari</span><ChevronRight size={14} style={{ transform: showDivisionInfo ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }} />
        </button>
        {showDivisionInfo && <div className="p-3 rounded-xl text-xs" style={{ ...fontBody, color: C.inkSoft, background: C.paper }}>
          <div className="grid grid-cols-2 gap-1.5">{DIVISIONS.map((item) => <span key={item.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ color: item.color, background: item.color + '12' }}><Medal size={12} />{item.name}<span className="ml-auto text-[9px]" style={{ ...fontMono }}>{item.range}</span></span>)}</div>
          <p className="mt-2 leading-relaxed">Koʻproq qatnashib ball toʻplang va ligalarda yuqorilang. Oylik reyting har yangi oyda yangilanadi, olgan nishonlaringiz profilingizda qoladi.</p>
        </div>}
        </div>}
      </aside>
    </div>
  </div>;
}
