Warning: truncated output (original token count: 32450)
Total output lines: 1682

import { useState, useEffect, useContext, useRef, Suspense, lazy } from 'react';
import { ArrowLeft, Award, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Dices, Eye, FileCheck2, FileText, ListChecks, LogIn, LogOut, Moon, PanelTopClose, PanelTopOpen, Pause, Pencil, RotateCcw, Save, Settings, Share2, Sparkles, Sun, Trash2, Type, Users, X } from 'lucide-react';
import { signInWithGoogle, supabase } from './supabaseClient.js';
import { AuthorLine, BrowseHeading, C, CategoryGrid, DEFAULT_TEST_PREFS, EmptyState, EntryNumber, GhostButton, ItemMenu, LiveQuizHub, MatchingTestQuestion, MiniLearningBadge, NavContext, ThemeContext, PinnedAddButton, SearchBox, SectionHeading, SectionLoading, SettingChip, SolidButton, TeamBattleHub, buildShareUrl, computeQuizQuestions, fontBody, fontDisplay, fontMono, formatDuration, getQuestionCount, getQuestionScore, isQuestionCorrect, shareItem, getBrowseCardStyle, writePosition } from './App.jsx';
const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));
const NationalCertificate = lazy(() => import('./NationalCertificate.jsx'));
const LuckyWheel = lazy(() => import('./LuckyWheel.jsx'));
const AUTO_ADVANCE_DELAYS = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
const QUIZ_LIST_BATCH_SIZE = 12;
const CORRECT_ANIMATION_OPTIONS = [{ id: 'pop', title: 'Yengil sakrash' }, { id: 'glow', title: 'Yorqin belgi' }, { id: 'slide', title: 'Silliq siljish' }, { id: 'none', title: 'Animatsiyasiz' }];
const WRONG_ANIMATION_OPTIONS = [{ id: 'shake', title: 'Yengil tebranish' }, { id: 'nudge', title: 'Qisqa siljish' }, { id: 'flash', title: 'Yumshoq chaqnash' }, { id: 'none', title: 'Animatsiyasiz' }];
const CELEBRATION_STYLE_OPTIONS = [{ id: 'mixed', title: 'Aralash bayram', symbol: '🎉' }, { id: 'confetti', title: 'Konfetti', symbol: '🎊' }, { id: 'stars', title: 'Yulduzlar', symbol: '✨' }, { id: 'badges', title: 'Nishonlar', symbol: '🏅' }, { id: 'none', title: 'O‘chiq', symbol: '○' }];
const CORRECT_TRANSITION_OPTIONS = [{ id: 'shatter', title: 'Parchalanib uchish', symbol: '✦' }, { id: 'dissolve', title: 'Maydalanib erish', symbol: '✧' }, { id: 'fly', title: 'Yuqoriga uchish', symbol: '↗' }, { id: 'fade', title: 'Sekin so‘nish', symbol: '◌' }, { id: 'none', title: 'Oddiy o‘tish', symbol: '→' }];
const WRONG_TRANSITION_OPTIONS = [{ id: 'fade', title: 'Sekin so‘nish', symbol: '◌' }, { id: 'slide', title: 'Yon tomonga', symbol: '↗' }, { id: 'shatter', title: 'Mayda bo‘laklar', symbol: '✧' }, { id: 'none', title: 'Oddiy o‘tish', symbol: '→' }];
const CELEBRATION_SYMBOLS = {
  confetti: ['🎉', '🎊', '✨', '✦', '🟡', '🟢', '🔷', '🎈'],
  stars: ['✨', '⭐', '🌟', '✦', '💫', '✧'],
  badges: ['🏅', '🏆', '🎖️', '⭐', '✨', '🥇'],
};
const normalizedDelay = (value, fallback) => AUTO_ADVANCE_DELAYS.includes(Number(value)) ? Number(value) : fallback;

function makeCelebrationParticles(style) {
  const variants = style === 'mixed' ? ['confetti', 'stars', 'badges'] : [style];
  const selected = variants[Math.floor(Math.random() * variants.length)] || 'confetti';
  const symbols = CELEBRATION_SYMBOLS[selected] || CELEBRATION_SYMBOLS.confetti;
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8 + (Math.random() - 0.5) * 0.28;
    const distance = 75 + Math.random() * 105;
    return {
      id: `${Date.now()}-${Math.random()}-${index}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      x: `${Math.round(Math.cos(angle) * distance)}px`,
      y: `${Math.round(Math.sin(angle) * distance - 24)}px`,
      rotate: `${Math.round((Math.random() - 0.5) * 260)}deg`,
      delay: `${Math.round(Math.random() * 70)}ms`,
      duration: `${Math.round(520 + Math.random() * 180)}ms`,
      size: `${16 + Math.round(Math.random() * 5)}px`,
    };
  });
}

function makeTransitionFragments(effect) {
  if (!['shatter', 'dissolve'].includes(effect)) return [];
  const colors = ['#c58a35', '#e5c78d', '#527d68', '#7c6bb1', '#d86e58', '#61a4a1'];
  const count = effect === 'shatter' ? 10 : 12;
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.28;
    const distance = 78 + Math.random() * 130;
    return {
      id: `${Date.now()}-${Math.random()}-${index}`,
      x: `${Math.round(Math.cos(angle) * distance)}px`,
      y: `${Math.round(Math.sin(angle) * distance - 16)}px`,
      rotate: `${Math.round((Math.random() - 0.5) * 360)}deg`,
      delay: `${Math.round(Math.random() * 32)}ms`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: `${8 + Math.round(Math.random() * 8)}px`,
      shape: Math.random() > 0.55 ? 'circle' : 'shard',
    };
  });
}

function AnimationChoiceGroup({ label, description, value, options, onChange }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold" style={{ ...fontBody, color: C.ink }}>{label}</div>
      {description && <p className="mb-2 text-[11px] leading-4" style={{ ...fontBody, color: C.inkSoft }}>{description}</p>}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {options.map((option) => {
          const active = value === option.id;
          return <button key={option.id} type="button" aria-pressed={active} onClick={() => onChange(option.id)} className="flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors" style={{ ...fontBody, color: C.ink, background: active ? C.goldSoft : C.paper, borderColor: active ? C.gold : C.rule }}>
            <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-base" style={{ background: active ? C.surface : C.paperSoft }}>{option.symbol || (option.id === 'none' ? '○' : '✦')}</span>
            <span className="text-[11px] font-medium leading-tight">{option.title}</span>
          </button>;
        })}
      </div>
    </div>
  );
}

function QuizAnimationSettings({ open, onToggle, prefs, onChange }) {
  return (
    <section className="overflow-hidden rounded-xl border" style={{ background: C.surface, borderColor: C.rule }}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-3 text-left" style={{ ...fontBody, color: C.ink }}>
        <span className="flex items-center gap-2 text-sm font-medium"><Sparkles size={17} style={{ color: C.gold }} />Javob va o‘tish effektlari</span>
        <ChevronDown size={17} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 180ms ease' }} />
      </button>
      {open && <div className="space-y-4 border-t p-3" style={{ borderColor: C.rule }}>
        <AnimationChoiceGroup label="To‘g‘ri javob belgisi" description="Javob to‘g‘ri bo‘lsa, tanlagan effekt ko‘rinadi." value={prefs.correctAnimation} options={CORRECT_ANIMATION_OPTIONS} onChange={(value) => onChange({ correctAnimation: value })} />
        <AnimationChoiceGroup label="Rangli tabrik" description="To‘g‘ri javobda yulduzlar, konfetti yoki nishonlar sochiladi." value={prefs.celebrationStyle || 'mixed'} options={CELEBRATION_STYLE_OPTIONS} onChange={(value) => onChange({ celebrationStyle: value })} />
        <AnimationChoiceGroup label="Xato javob belgisi" description="Xatoni muloyim ko‘rsatadi, savol matnini berkitmaydi." value={prefs.wrongAnimation} options={WRONG_ANIMATION_OPTIONS} onChange={(value) => onChange({ wrongAnimation: value })} />
        <div className="space-y-3 rounded-lg border p-2.5" style={{ borderColor: C.rule, background: C.paperSoft }}>
          <div><div className="text-xs font-semibold" style={{ ...fontBody, color: C.ink }}>Keyingi savolga o‘tish</div><p className="mt-0.5 text-[11px] leading-4" style={{ ...fontBody, color: C.inkSoft }}>Reels ko‘rinishida joriy savol tanlangan uslubda yo‘qoladi. Ro‘yxatda oldingi savollar joyida qoladi.</p></div>
          <AnimationChoiceGroup label="To‘g‘ri javobdan keyin" value={prefs.correctTransition || 'shatter'} options={CORRECT_TRANSITION_OPTIONS} onChange={(value) => onChange({ correctTransition: value })} />
          <AnimationChoiceGroup label="Xato javobdan keyin" value={prefs.wrongTransition || 'fade'} options={WRONG_TRANSITION_OPTIONS} onChange={(value) => onChange({ wrongTransition: value })} />
        </div>
      </div>}
    </section>
  );
}


function countAnsweredUnits(questions, answers) {
  return questions.reduce((count, question) => {
    const answer = answers?.[question.id];
    if (question.type === 'matching') {
      const pairs = question.pairs || [];
      return count + (pairs.length ? pairs.filter((pair) => answer?.[pair.id] !== undefined).length : (answer === undefined ? 0 : 1));
    }
    if (question.type === 'open') return count + (typeof answer === 'string' && answer.trim() ? 1 : 0);
    return count + (answer === undefined ? 0 : 1);
  }, 0);
}
export function QuizSetupPanel({ test, onExit, onStart, initialConfig, onSavePrefs }) {
  const total = test.questions.length;
  const unitTotal = getQuestionCount(test.questions);
  const itemLabel = test.questions.some((question) => question.type === 'matching') ? `${unitTotal} ta moslik` : `${unitTotal} ta savol`;
  const init = initialConfig || DEFAULT_TEST_PREFS;
  const [immediate, setImmediate] = useState(!!init.immediate);
  const [autoScroll, setAutoScroll] = useState(init.autoScroll !== false);
  const [autoAdvanceCorrectSeconds, setAutoAdvanceCorrectSeconds] = useState(normalizedDelay(init.autoAdvanceCorrectSeconds, 2));
  const [autoAdvanceWrongSeconds, setAutoAdvanceWrongSeconds] = useState(normalizedDelay(init.autoAdvanceWrongSeconds, 3));
  const [correctAnimation, setCorrectAnimation] = useState(CORRECT_ANIMATION_OPTIONS.some((option) => option.id === init.correctAnimation) ? init.correctAnimation : 'pop');
  const [wrongAnimation, setWrongAnimation] = useState(WRONG_ANIMATION_OPTIONS.some((option) => option.id === init.wrongAnimation) ? init.wrongAnimation : 'shake');
  const [celebrationStyle, setCelebrationStyle] = useState(CELEBRATION_STYLE_OPTIONS.some((option) => option.id === init.celebrationStyle) ? init.celebrationStyle : 'mixed');
  const [correctTransition, setCorrectTransition] = useState(CORRECT_TRANSITION_OPTIONS.some((option) => option.id === init.correctTransition) ? init.correctTransition : 'shatter');
  const [wrongTransition, setWrongTransition] = useState(WRONG_TRANSITION_OPTIONS.some((option) => option.id === init.wrongTransition) ? init.wrongTransition : 'fade');
  const [animationsOpen, setAnimationsOpen] = useState(false);
  const [adaptiveFeedback, setAdaptiveFeedback] = useState(!!init.adaptiveFeedback);
  const [viewMode, setViewMode] = useState(init.viewMode === 'reels' ? 'reels' : 'list');
  const [shuffle, setShuffle] = useState(!!init.shuffle);
  const [mode, setMode] = useState(init.mode || 'all'); // all | random | first | split
  const [count, setCount] = useState(Math.min(init.count || 5, total));
  const [partsTotal, setPartsTotal] = useState(Math.max(2, Math.min(total, Number(init.partsTotal) || 2)));
  const [partsTotalDraft, setPartsTotalDraft] = useState(String(Math.max(2, Math.min(total, Number(init.partsTotal) || 2))));
  const [partIndex, setPartIndex] = useState(init.partIndex || 1);
  const [fontScale] = useState(() => {
    const value = Number(init.fontScale);
    return Number.isFinite(value) && value > 0 ? Math.max(0.7, Math.min(1.3, value)) : 0.85;
  });
  const lastSavedSetupPrefsRef = useRef(null);

  useEffect(() => {
    if (!onSavePrefs) return;
    const next = { immediate, autoScroll, autoAdvanceCorrectSeconds, autoAdvanceWrongSeconds, correctAnimation, wrongAnimation, celebrationStyle, correctTransition, wrongTransition, adaptiveFeedback, viewMode, fontScale, shuffle, mode, count, partsTotal, partIndex };
    const serialized = JSON.stringify(next);
    if (lastSavedSetupPrefsRef.current === serialized) return;
    const changed = lastSavedSetupPrefsRef.current !== null;
    lastSavedSetupPrefsRef.current = serialized;
    if (changed) onSavePrefs(next);
  }, [onSavePrefs, immediate, autoScroll, autoAdvanceCorrectSeconds, autoAdvanceWrongSeconds, correctAnimation, wrongAnimation, celebrationStyle, correctTransition, wrongTransition, adaptiveFeedback, viewMode, fontScale, shuffle, mode, count, partsTotal, partIndex]);

  function start() {
    const cfg = { immediate, autoScroll, autoAdvanceCorrectSeconds, autoAdvanceWrongSeconds, correctAnimation, wrongAnimation, celebrationStyle, correctTransition, wrongTransition, adaptiveFeedback, viewMode, fontScale, shuffle, mode, count, partsTotal, partIndex };
    const questions = computeQuizQuestions(test, cfg);
    if (questions.length === 0) return;
    onStart({ ...cfg, questions });
  }

  const parts = Math.max(2, Math.min(partsTotal, total));

  return (
    <div>
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha testlar
      </button>

      <h3 className="text-2xl sm:text-3xl mb-1" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}
      <div className="text-xs mb-6" style={{ ...fontMono, color: C.gold }}>{itemLabel} mavjud</div>

      <section className="mb-4 rounded-2xl border p-3 sm:p-4" style={{ background: C.surface, borderColor: C.rule }} aria-label="Test ko‘rinishini tanlash">
        <div className="mb-2 text-xs font-semibold" style={{ ...fontBody, color: C.ink }}>Ishlash uslubi</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'reels', title: 'Reels', detail: 'Yuqoriga yoki pastga suring' },
            { id: 'list', title: 'Ro‘yxat', detail: 'Savollar ketma-ket ko‘rinadi' },
          ].map((option) => {
            const active = viewMode === option.id;
            return <button key={option.id} type="button" onClick={() => setViewMode(option.id)} aria-pressed={active} className="rounded-xl border px-3 py-2.5 text-left transition-colors" style={{ ...fontBody, color: C.ink, background: active ? C.goldSoft : C.paper, borderColor: active ? C.gold : C.rule }}>
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="mt-0.5 block text-[11px]" style={{ color: C.inkSoft }}>{option.detail}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="mb-5 space-y-2" aria-label="Javob va o‘tish sozlamalari">
        <button type="button" role="switch" aria-checked={immediate} onClick={() => setImmediate((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}>
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin natijani ko‘rsatish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Faqat variantli savollarda javobni darhol ko‘rsatadi.</span></span>
          <span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: immediate ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: immediate ? 'translateX(20px)' : 'translateX(0)' }} /></span>
        </button>
        <button type="button" role="switch" aria-checked={autoScroll} onClick={() => setAutoScroll((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}>
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin keyingisiga o‘tish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Reels’da keyingi savolga suradi, ro‘yxatda pastga olib boradi.</span></span>
          <span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: autoScroll ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: autoScroll ? 'translateX(20px)' : 'translateX(0)' }} /></span>
        </button>
        <button type="button" role="switch" aria-checked={adaptiveFeedback} onClick={() => setAdaptiveFeedback((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}>
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobga mos qisqa fikrlar</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>To‘g‘ri yoki xatoga qarab ixcham izoh chiqadi. Odatiy holatda o‘chiq.</span></span>
          <span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: adaptiveFeedback ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: adaptiveFeedback ? 'translateX(20px)' : 'translateX(0)' }} /></span>
        </button>
        {autoScroll && <section className="rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }} aria-label="Avtomatik o‘tish vaqti">
          <div className="mb-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Keyingisiga o‘tish vaqti</div>
          <div className="grid grid-cols-2 gap-2">
            {[['To‘g‘ri javob', autoAdvanceCorrectSeconds, setAutoAdvanceCorrectSeconds], ['Xato javob', autoAdvanceWrongSeconds, setAutoAdvanceWrongSeconds]].map(([label, value, setValue]) => <label key={label} className="min-w-0 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{label}<select value={value} onChange={(event) => setValue(Number(event.target.value))} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" style={{ ...fontMono, color: C.ink, background: C.paper, borderColor: C.rule }} aria-label={`${label}dan keyin kutish`}>{AUTO_ADVANCE_DELAYS.map((seconds) => <option key={seconds} value={seconds}>{seconds} soniya</option>)}</select></label>)}
          </div>
        </section>}
        <QuizAnimationSettings open={animationsOpen} onToggle={() => setAnimationsOpen((open) => !open)} prefs={{ correctAnimation, wrongAnimation, celebrationStyle, correctTransition, wrongTransition }} onChange={(patch) => {
          if (patch.correctAnimation) setCorrectAnimation(patch.correctAnimation);
          if (patch.wrongAnimation) setWrongAnimation(patch.wrongAnimation);
          if (patch.celebrationStyle) setCelebrationStyle(patch.celebrationStyle);
          if (patch.correctTransition) setCorrectTransition(patch.correctTransition);
          if (patch.wrongTransition) setWrongTransition(patch.wrongTransition);
        }} />
        <div className="flex flex-wrap gap-2 pt-1"><SettingChip active={shuffle} onClick={() => setShuffle((value) => !value)}>Savollarni aralashtirish</SettingChip></div>
      </section>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Savollar toʻplami</div>
        <div className="flex flex-wrap gap-2 items-center">
          <SettingChip active={mode === 'all'} onClick={() => setMode('all')}>Hammasi ({total})</SettingChip>
          <SettingChip active={mode === 'random'} onClick={() => setMode('random')}>Tasodifiy N ta</SettingChip>
          <SettingChip active={mode === 'first'} onClick={() => setMode('first')}>Dastlabki N ta</SettingChip>
          {total > 1 && <SettingChip active={mode === 's…22450 tokens truncated…t yoki soha ochiq, jonli xonadamizmi)
     sessionStorage'ga yozib boramiz. Agar bu test keyinchalik
     o'chirilgan bo'lsa, "active" topilmay qoladi va sahifa oddiy
     ro'yxatga qaytadi — xatolik chiqmaydi. */
  useEffect(() => {
    writePosition({ testlar: { openId: activeId, categoryId, live: liveSession } });
  }, [activeId, categoryId, liveOpen, liveSession]);

  useEffect(() => {
    if (initialCertificateId || new URLSearchParams(window.location.search).has('verifyCertificate')) pushNav(() => setCertificateOpen(false));
    // Deep link is captured once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchedCategories = q ? approvedCategories.filter((cat) => cat.name.toLowerCase().includes(q) && approved.some((t) => t.categoryId === cat.id)) : [];
  const matchedTests = q ? approved.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedTests.length === 0;

  useEffect(() => {
    if (onReadingChange) onReadingChange(!!active || (Boolean(initialOpenId) && (openingInitialTest || Boolean(activeId))) || (Boolean(initialLiveCode) && liveOpen));
    return () => { if (onReadingChange) onReadingChange(false); };
  }, [active, activeId, initialOpenId, initialLiveCode, liveOpen, onReadingChange, openingInitialTest]);

  if (certificateOpen) return <Suspense fallback={<SectionLoading label="Milliy sertifikat markazi yuklanmoqda…" />}><NationalCertificate tests={approved} session={session} profile={profile} isAdmin={isAdmin} initialVerifyId={initialCertificateId || new URLSearchParams(window.location.search).get('verifyCertificate') || ''} onBack={() => setCertificateOpen(false)} /></Suspense>;

  if (active && active.questions !== undefined) {
    const openNextTest = nextTest ? async () => {
      setActiveTestOverride(null);
      setActiveId(nextTest.id);
      setOpeningInitialTest(true);
      setOpenTestError(null);
      try {
        const result = loadTestForOpening ? await loadTestForOpening(nextTest.id) : null;
        if (result?.status === 'ok') {
          onClearPaused?.(active.id);
          setActiveTestOverride(result.test);
          setActiveResumeState(null);
          setSetupMode(false);
        } else {
          setOpenTestError(result?.status === 'missing' ? 'missing' : 'error');
        }
      } finally {
        setOpeningInitialTest(false);
      }
    } : undefined;
    return <QuizView key={active.id} test={active} initialProgress={activeResumeState} initialStartConfig={activeStartConfig} onPauseAttempt={onPauseAttempt} onClearPaused={onClearPaused} onRequireAccount={onRequireAccount} onRequireTestAccount={onRequireTestAccount} onExit={back} onNextTest={openNextTest} nextTest={nextTest} effectivePrefs={effectivePrefs} forceSetup={setupMode} onSavePrefs={onSavePrefs} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} />;
  }
  if (active && active.questions === undefined && !openTestError) return <SectionLoading label="Test yuklanmoqda…" compact />;

  // Mavzudan testga o'tishda ro'yxatni ko'rsatib yubormaymiz: tanlangan
  // test metadata/savollari kelguncha foydalanuvchi bevosita ochilish holatini ko'radi.
  if (openingInitialTest || activeId) {
    return (
      <div className="flex flex-col items-start gap-3 py-6" aria-live="polite">
        <button onClick={back} className="inline-flex items-center gap-1 text-[15px]" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Ortga</button>
        {openTestError === 'missing' ? (
          <div role="status" className="w-full rounded-xl p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <div className="font-semibold" style={{ ...fontDisplay, color: C.ink }}>Test mavjud emas</div>
            <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Bu test o‘chirilgan yoki havolasi eskirgan.</p>
          </div>
        ) : openTestError === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm" style={{ ...fontBody, color: C.red }}>
            <span>Testni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.</span>
            <button type="button" onClick={() => openTest(activeId, setupMode, activeResumeState, null, activeStartConfig, false)} className="rounded-sm px-3 py-1.5" style={{ color: C.white, background: C.cover }}>Qayta urinish</button>
          </div>
        ) : testsLoadError ? (
          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ ...fontBody, color: C.red }}>
            <span>Testni yuklab bo‘lmadi.</span>
            <button type="button" onClick={onRetryTests} className="rounded-sm px-3 py-1.5" style={{ color: C.white, background: C.cover }}>Qayta urinish</button>
          </div>
        ) : (
          <SectionLoading label="Tanlangan test ochilmoqda…" compact />
        )}
      </div>
    );
  }

  if (liveOpen) return (
    <Suspense fallback={initialLiveCode ? <LiveEntryLoading /> : <SectionLoading label="Jonli test yuklanmoqda…" />}>
      <LiveQuizHub tests={viewable} testsLoading={testsLoading} testsLoadError={testsLoadError} onRetryTests={onRetryTests} session={session} onExit={back} initialCode={initialLiveCode} restoreSession={liveSession} onSessionChange={setLiveSession} ensureTestContent={ensureTestContent} />
    </Suspense>
  );

  if (teamBattleOpen) return (
    <Suspense fallback={<SectionLoading label="Jamoaviy test yuklanmoqda…" />}>
      <TeamBattleHub tests={viewable} testsLoading={testsLoading} testsLoadError={testsLoadError} onRetryTests={onRetryTests} categories={categories} ensureTestContent={ensureTestContent} onExit={back} session={session} initialShareToken={initialBattleToken} />
    </Suspense>
  );

  if (luckyWheelOpen) return <Suspense fallback={<SectionLoading label="Ismlar barabani yuklanmoqda…" />}><LuckyWheel onBack={back} tests={viewable} ensureTestContent={ensureTestContent} /></Suspense>;

  if (editing) {
    return (
      <div>
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Ortga
        </button>
        <SectionHeading eyebrow="Tahrirlash" title={editing.title} />
        {editing.questions === undefined ? (
          <SectionLoading label="Test ma’lumotlari yuklanmoqda…" compact />
        ) : (
          <EditTestForm test={editing?.pendingEdit ? { ...editing, ...editing.pendingEdit } : editing} onSave={(data) => updateTest(editing.id, data, editing.title, editing)} onDone={back} />
        )}
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <PinnedAddButton icon={ListChecks} label="Test yaratish" onClick={() => onGoToCommunity('testlar')} />
        <button
          onClick={goLive}
          className="w-full flex items-center gap-3 px-4 py-3 mb-2.5 rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2"
          style={{ background: C.liveTint, border: `1.5px solid ${C.live}`, outlineColor: C.liveSoft }}
        >
          <div className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.live }}>
            <Users size={18} style={{ color: C.white }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full live-pulse"
              style={{ background: '#e5484d', border: `2px solid ${C.paper}` }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[15px]" style={{ ...fontBody, color: C.ink, fontWeight: 600 }}>Jonli test rejimi</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase live-pulse"
                style={{ ...fontMono, background: C.live, color: C.white, fontWeight: 700 }}
              >
                Live
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ ...fontBody, color: C.inkSoft }}>Guruh boʻlib bir vaqtda ishlang</div>
          </div>
          <ChevronRight size={16} style={{ color: C.live, flexShrink: 0, marginLeft: 'auto' }} />
        </button>
        <button type="button" onClick={goCertificateCenter} className="group mb-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:shadow-sm focus-visible:outline focus-visible:outline-2" style={{ background: C.surface, borderColor: theme === 'dark' ? '#52645A' : '#D2DDD4', outlineColor: C.accent }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color: theme === 'dark' ? '#A9C4AF' : '#476554', background: theme === 'dark' ? '#35453A' : '#E8EFE9' }}><FileCheck2 size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold" style={{ ...fontBody, color: C.ink }}>Milliy sertifikat mock testlari</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Fan bo‘yicha sinov, natija va sertifikat</span></span><ChevronRight className="transition-transform group-hover:translate-x-0.5" size={17} style={{ color: theme === 'dark' ? '#A9C4AF' : '#63806A' }} />
        </button>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <button
            onClick={goMatchingTest}
            className="flex items-center justify-center gap-1.5 min-w-0 min-h-11 px-2 py-2 rounded-xl text-[12px] leading-tight text-center focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.math, background: C.mathTint, border: `1px solid ${C.mathSoft}`, outlineColor: C.mathSoft, fontWeight: 600 }}
          >
            <ListChecks size={14} /> Moslik testi
          </button>
          <button
            onClick={goTeamBattle}
            className="flex items-center justify-center gap-1.5 min-w-0 min-h-11 px-2 py-2 rounded-xl border text-[12px] leading-tight text-center transition-colors hover:shadow-sm focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: theme === 'dark' ? '#52645A' : '#D2DDD4', outlineColor: C.accent, fontWeight: 600 }}
          >
            <Users size={15} style={{ color: theme === 'dark' ? '#A9C4AF' : '#476554' }} /> Jamoaviy jang
          </button>
          <button
            onClick={goLuckyWheel}
            className="flex items-center justify-center gap-1.5 min-w-0 min-h-11 px-2 py-2 rounded-xl border text-[12px] leading-tight text-center transition-colors hover:shadow-sm focus-visible:outline focus-visible:outline-2"
             style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: theme === 'dark' ? '#52645A' : '#D2DDD4', outlineColor: C.accent, fontWeight: 600 }}
          >
             <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border" style={{ color: '#fff', borderColor: theme === 'dark' ? '#65756A' : '#CAD6CA', background: 'conic-gradient(#c9534d 0deg 90deg,#d8a92d 90deg 180deg,#42865e 180deg 270deg,#457caf 270deg 360deg)' }}><Dices size={14} /></span> Omad charxpalagi
          </button>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Test yoki soha nomi boʻyicha qidirish..." />
        {testsLoading && !tests.length ? (
          <SectionLoading label="Testlar yuklanmoqda…" />
        ) : testsLoadError && !tests.length ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-sm" style={{ ...fontBody, color: C.red }}>
            <span>{testsLoadError}</span>
            <button type="button" onClick={onRetryTests} className="px-3 py-1.5 rounded-sm" style={{ color: C.white, background: C.cover }}>Qayta yuklash</button>
          </div>
        ) : isSearching ? (
          noSearchResults ? (
            <EmptyState text="Hech narsa topilmadi." cta="Boshqa soʻz bilan qidirib koʻring." />
          ) : (
            <div className="space-y-6">
              {matchedCategories.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Sohalar</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {matchedCategories.map((cat) => {
                      const count = approved.filter((t) => t.categoryId === cat.id).length;
                      return (
                        <div
                          key={cat.id}
                          className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-3xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                          style={getBrowseCardStyle(theme, 'area')}
                          onClick={() => goCategory(cat.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                            <div className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{count} ta test</div>
                            <AuthorLine authorId={cat.authorId} authorName={cat.author} className="text-xs mt-1" />
                          </div>
                          <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {matchedTests.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Testlar</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {matchedTests.map((t) => (
                      <div key={t.id} className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-3xl" style={getBrowseCardStyle(theme, 'test')}>
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide mb-0.5 truncate" style={{ ...fontMono, color: C.gold }}>
                            {categories.find((cat) => cat.id === t.categoryId)?.name || ''}
                          </div>
                          <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ ...fontBody, color: C.inkSoft }}><ListChecks size={13} style={{ color: theme === 'dark' ? '#D2AA8C' : '#8A553F' }} />{t.questionCount ?? t.questions?.length ?? 0} savol</div>
                        </div>
                        <button
                          onClick={() => goTest(t.id)}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm flex-shrink-0"
                          style={{ ...fontBody, color: C.white, background: C.cover }}
                        >
                          <Award size={13} /> Boshlash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <>
          <BrowseHeading icon={ListChecks} kind="test" eyebrow={`${approvedCategories.filter((cat) => approved.some((t) => t.categoryId === cat.id)).length} ta soha`} title="Testlar" />
          <CategoryGrid
            categories={approvedCategories.filter((cat) => approved.some((t) => t.categoryId === cat.id))}
            itemsByCategory={approved.reduce((acc, t) => { acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
            itemLabel="test"
            onSelect={goCategory}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
            onGoToCommunity={() => onGoToCommunity('testlar')}
            isAdmin={isAdmin}
            userId={session?.user?.id}
            shareParam="testCategory"
          />
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={back}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta test`} title={activeCategory ? activeCategory.name : 'Testlar'} />
      <PinnedAddButton icon={ListChecks} label="Test yaratish" onClick={() => onGoToCommunity('testlar', activeCategory ? activeCategory.name : '')} />
      {testsLoading && !tests.length ? (
        <SectionLoading label="Testlar yuklanmoqda…" />
      ) : testsLoadError && !tests.length ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-sm" style={{ ...fontBody, color: C.red }}>
          <span>{testsLoadError}</span>
          <button type="button" onClick={onRetryTests} className="px-3 py-1.5 rounded-sm" style={{ color: C.white, background: C.cover }}>Qayta yuklash</button>
        </div>
      ) : inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha test qoʻshilmagan." cta="Quyidagi tugma orqali birinchi testni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((t, i) => (
            <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-3xl transition-all hover:-translate-y-0.5 hover:shadow-md" style={getBrowseCardStyle(theme, 'test')}>
              <div className="flex items-start min-w-0">
                <EntryNumber icon={ListChecks} kind="test" />
                <div className="min-w-0">
                  <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                  {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ ...fontBody, color: C.inkSoft }}><ListChecks size={13} style={{ color: theme === 'dark' ? '#D2AA8C' : '#8A553F' }} />{t.questionCount ?? t.questions?.length ?? 0} savol</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <ItemMenu actions={[
                  { label: 'Sozlamalar', icon: Settings, onClick: () => goTest(t.id, true) },
                  { label: 'Ulashish', icon: Share2, onClick: () => shareItem(buildShareUrl({ test: t.id }), t.title) },
                  ...(isAdmin ? [
                    { label: 'Tahrirlash', icon: Pencil, onClick: () => goEdit(t.id) },
                    { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) },
                  ] : []),
                ]} />
                <button
                  onClick={() => goTest(t.id)}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm"
                  style={{ ...fontBody, color: C.white, background: C.cover }}
                >
                  <Award size={13} /> Boshlash
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
}
import { EditTestForm } from './DeferredTestForms.jsx';
