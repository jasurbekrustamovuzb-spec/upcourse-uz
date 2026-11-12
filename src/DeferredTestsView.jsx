import { useState, useEffect, useContext, useRef, Suspense, lazy } from 'react';
import { ArrowLeft, Award, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, ListChecks, LogIn, LogOut, Moon, PanelTopClose, PanelTopOpen, Pause, Pencil, RotateCcw, Save, Settings, Share2, Sparkles, Sun, Trash2, Type, Users, X } from 'lucide-react';
import { signInWithGoogle, supabase } from './supabaseClient.js';
import { AuthorLine, C, CategoryGrid, DEFAULT_TEST_PREFS, EmptyState, EntryNumber, GhostButton, ItemMenu, LiveQuizHub, MatchingTestQuestion, MiniLearningBadge, NavContext, ThemeContext, PinnedAddButton, SearchBox, SectionHeading, SectionLoading, SettingChip, SolidButton, TeamBattleHub, buildShareUrl, computeQuizQuestions, fontBody, fontDisplay, fontMono, formatDuration, getQuestionCount, getQuestionScore, isQuestionCorrect, shareItem, writePosition } from './App.jsx';
const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));
const NationalCertificate = lazy(() => import('./NationalCertificate.jsx'));
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
          {total > 1 && <SettingChip active={mode === 'split'} onClick={() => setMode('split')}>Qismlarga boʻlib</SettingChip>}

          {(mode === 'random' || mode === 'first') && (
            <input
              type="number"
              min={1}
              max={total}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(total, Number(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 rounded-sm text-[13px] outline-none"
              style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
            />
          )}

          {mode === 'split' && (
            <>
              <span className="text-[13px]" style={{ ...fontBody, color: C.inkSoft }}>Necha qism:</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                minLength={1}
                maxLength={String(total).length}
                value={partsTotalDraft}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(e) => { const draft = e.target.value.replace(/\D/g, '').slice(0, String(total).length); setPartsTotalDraft(draft); if (draft) { setPartsTotal(Math.max(2, Math.min(total, Number(draft)))); setPartIndex(1); } }}
                onBlur={() => { const normalized = Math.max(2, Math.min(total, Number(partsTotalDraft) || 2)); setPartsTotal(normalized); setPartsTotalDraft(String(normalized)); setPartIndex((index) => Math.min(index, Math.max(2, Math.min(normalized, total)))); }}
                aria-label="Qismlar soni"
                className="w-14 px-2 py-1.5 rounded-sm text-[13px] outline-none"
                style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              />
              <span className="text-[13px]" style={{ ...fontBody, color: C.inkSoft }}>Qaysi qism:</span>
              <select
                value={partIndex}
                onChange={(e) => setPartIndex(Number(e.target.value))}
                className="px-2 py-1.5 rounded-sm text-[13px] outline-none"
                style={{ ...fontMono, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              >
                {Array.from({ length: parts }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>{p}-qism</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <SolidButton onClick={start} icon={Award}>Testni boshlash</SolidButton>
    </div>
  );
}

export function QuizPlayer({ test, config, onExit, onRestart, onRetry, onNextTest, nextTest, onSavePrefs, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, session, initialProgress, onPauseAttempt, onClearPaused, onRequireAccount, onReconfigure }) {
  // Older saved tests may store a single answer string or omit choices.
  // Normalize once so scoring and the result view accept both old and new rows.
  const questions = Array.isArray(config.questions) ? config.questions.filter(Boolean).map((question) => ({
    ...question,
    answers: Array.isArray(question.answers) ? question.answers : (question.answers == null || question.answers === '' ? [] : [String(question.answers)]),
    options: Array.isArray(question.options) ? question.options : [],
  })) : [];
  const matchingOnly = questions.length > 0 && questions.every((question) => question.type === 'matching');
  const [answers, setAnswers] = useState(() => initialProgress?.answers || {});
  const answersRef = useRef(initialProgress?.answers || {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => Math.max(0, Math.min(questions.length - 1, Number(initialProgress?.questionIndex) || 0)));
  const [playerPrefs, setPlayerPrefs] = useState(() => ({ ...DEFAULT_TEST_PREFS, ...config }));
  const viewMode = playerPrefs.viewMode === 'reels' ? 'reels' : 'list';
  const [playerSettingsOpen, setPlayerSettingsOpen] = useState(false);
  const [playerAnimationsOpen, setPlayerAnimationsOpen] = useState(false);
  const [questionMapOpen, setQuestionMapOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [reconfigureDialog, setReconfigureDialog] = useState(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState('');
  const [answerNoticeTone, setAnswerNoticeTone] = useState('correct');
  const [visibleListCount, setVisibleListCount] = useState(() => Math.min(questions.length, QUIZ_LIST_BATCH_SIZE));
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(config.fontScale);
    if (Number.isFinite(saved) && saved > 0) return Math.max(0.7, Math.min(1.3, saved));
    try { return Math.max(0.7, Math.min(1.3, Number(localStorage.getItem('upcourse-quiz-font-scale')) || 0.85)); } catch { return 0.85; }
  });
  const [revealed, setRevealed] = useState({});
  const [celebrationParticles, setCelebrationParticles] = useState(null);
  const [transitioningQuestion, setTransitioningQuestion] = useState(null);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const [showBadgeNotice, setShowBadgeNotice] = useState(false);
  const [seconds, setSeconds] = useState(() => Math.max(0, Number(initialProgress?.seconds) || 0));
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [finishDialog, setFinishDialog] = useState(!!initialProgress?.finishOnResume);
  const [guestPausePrompt, setGuestPausePrompt] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [accountSignInBusy, setAccountSignInBusy] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const questionRefs = useRef({});
  const resultSummaryRef = useRef(null);
  const autoScrollTimerRef = useRef(null);
  const autoExitTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const feedbackOutcomesRef = useRef([]);
  const feedbackQuestionIdsRef = useRef(new Set());
  const autoAdvanceQuestionRef = useRef(null);
  const autoFinishTimerRef = useRef(null);
  const listContainerRef = useRef(null);
  const listProgrammaticScrollUntilRef = useRef(0);
  const reelsStageRef = useRef(null);
  const reelsQuestionBodyRef = useRef(null);
  const swipeStartRef = useRef(null);
  const lastWheelAdvanceRef = useRef(0);
  const justSwipedRef = useRef(false);
  const { registerBackGuard } = useContext(NavContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const unregisterBackGuardRef = useRef(null);

  function requestLeave() {
    setLeaveError('');
    clearTimeout(autoScrollTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    if (questionMapOpen) { setQuestionMapOpen(false); return; }
    if (playerSettingsOpen) { setPlayerSettingsOpen(false); return; }
    if (reconfigureDialog) { setReconfigureDialog(false); return; }
    // Orqaga qaytish avval ochiq yakunlash ogohlantirishini yopadi.
    if (finishDialog) { setFinishDialog(false); return; }
    setLeaveDialog(true);
  }
  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;

  useEffect(() => {
    if (finished) return undefined;
    const unregister = registerBackGuard ? registerBackGuard(() => requestLeaveRef.current()) : null;
    unregisterBackGuardRef.current = unregister;
    return () => { unregister?.(); unregisterBackGuardRef.current = null; };
  }, [finished, registerBackGuard]);

  useEffect(() => {
    if (finished) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [finished]);

  useEffect(() => {
    if (finished || viewMode !== 'list' || !listContainerRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (performance.now() < listProgrammaticScrollUntilRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number(visible.target.dataset.questionIndex);
      if (Number.isInteger(index)) setCurrentQuestionIndex(index);
    }, { root: listContainerRef.current, rootMargin: '-12% 0px -56% 0px', threshold: [0.15, 0.35, 0.6] });
    Object.values(questionRefs.current).forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [finished, viewMode, visibleListCount, questions.length]);

  useEffect(() => {
    if (finished || viewMode !== 'list') return;
    setVisibleListCount((count) => Math.max(count, Math.min(questions.length, currentQuestionIndex + 1)));
    scrollListToQuestion(currentQuestionIndex, 'auto');
  }, [viewMode]);

  useEffect(() => {
    if (autoAdvanceQuestionRef.current !== null && currentQuestionIndex !== autoAdvanceQuestionRef.current) {
      clearTimeout(autoScrollTimerRef.current);
      clearTimeout(autoExitTimerRef.current);
      clearTimeout(noticeTimerRef.current);
      setTransitioningQuestion(null);
      autoAdvanceQuestionRef.current = null;
      setAutoAdvanceNotice('');
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (finished || viewMode !== 'reels') return undefined;
    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || questionMapOpen || playerSettingsOpen || leaveDialog || finishDialog || reconfigureDialog) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable || event.target?.closest?.('math-field')) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); goToQuestion(currentQuestionIndex + 1); }
      else if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); goToQuestion(currentQuestionIndex - 1); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finished, viewMode, currentQuestionIndex, questionMapOpen, playerSettingsOpen, leaveDialog, finishDialog, reconfigureDialog]);

  function exitTest() {
    unregisterBackGuardRef.current?.();
    unregisterBackGuardRef.current = null;
    onExit();
  }

  useEffect(() => () => { clearTimeout(autoScrollTimerRef.current); clearTimeout(autoExitTimerRef.current); clearTimeout(celebrationTimerRef.current); clearTimeout(autoFinishTimerRef.current); clearTimeout(noticeTimerRef.current); }, []);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  useEffect(() => {
    if (!finished || !resultSummaryRef.current) return undefined;
    const frame = requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultSummaryRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [finished]);

  const answeredCount = countAnsweredUnits(questions, answers);
  const totalCount = getQuestionCount(questions);
  const currentQuestion = questions[currentQuestionIndex] || null;
  const showAdaptiveFeedback = Boolean(autoAdvanceNotice && playerPrefs.adaptiveFeedback);

  function updatePlayerPrefs(patch) {
    clearTimeout(autoScrollTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    const next = { ...playerPrefs, ...patch };
    setPlayerPrefs(next);
    if (patch.adaptiveFeedback === false) {
      clearTimeout(noticeTimerRef.current);
      setAutoAdvanceNotice('');
    }
    const { questions: _selectedQuestions, ...savedPrefs } = next;
    onSavePrefs?.(savedPrefs);
  }

  function triggerCorrectCelebration(question, answer) {
    clearTimeout(celebrationTimerRef.current);
    if (!playerPrefs.immediate || question?.type === 'open' || !isQuestionCorrect(question, answer) || playerPrefs.celebrationStyle === 'none') {
      setCelebrationParticles(null);
      return;
    }
    setCelebrationParticles(makeCelebrationParticles(playerPrefs.celebrationStyle || 'mixed'));
    celebrationTimerRef.current = setTimeout(() => setCelebrationParticles(null), 760);
  }

  function setQuizFontScale(value) {
    const next = Math.round(Math.max(0.7, Math.min(1.3, value)) * 20) / 20;
    setFontScale(next);
    try { localStorage.setItem('upcourse-quiz-font-scale', String(next)); } catch {}
    updatePlayerPrefs({ fontScale: next });
  }

  function goToQuestion(index) {
    clearTimeout(autoScrollTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    const nextIndex = Math.max(0, Math.min(questions.length - 1, index));
    setCurrentQuestionIndex(nextIndex);
    setQuestionMapOpen(false);
    if (viewMode === 'list') {
      setVisibleListCount((count) => Math.max(count, Math.min(questions.length, nextIndex + 1)));
      scrollListToQuestion(nextIndex, 'smooth');
    } else {
      if (reelsQuestionBodyRef.current) reelsQuestionBodyRef.current.scrollTop = 0;
    }
  }

  function scrollListToQuestion(index, behavior = 'smooth', onScrollEnd) {
    // Keep automatic navigation inside the quiz scroller. scrollIntoView may
    // also move the page/webview itself and repeatedly trigger the observer.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const container = listContainerRef.current;
      const target = questionRefs.current[index];
      if (!container || !target) return;
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const top = container.scrollTop + targetTop - containerTop - 96;
      listProgrammaticScrollUntilRef.current = performance.now() + (behavior === 'smooth' ? 850 : 100);
      let settled = false;
      let fallbackTimer;
      const finishScroll = () => {
        if (settled) return;
        settled = true;
        container.removeEventListener('scrollend', finishScroll);
        window.clearTimeout(fallbackTimer);
        onScrollEnd?.();
      };
      if (onScrollEnd) {
        container.addEventListener('scrollend', finishScroll, { once: true });
        fallbackTimer = window.setTimeout(finishScroll, behavior === 'smooth' ? 1100 : 0);
      }
      container.scrollTo({ top: Math.max(0, top), behavior });
    }));
  }

  function handleListScroll() {
    const container = listContainerRef.current;
    if (!container || visibleListCount >= questions.length) return;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 420) {
      setVisibleListCount((count) => Math.min(questions.length, count + QUIZ_LIST_BATCH_SIZE));
    }
  }

  function handleReelsTouchStart(event) {
    if (event.target?.closest?.('input, textarea, select, math-field, [contenteditable="true"]')) return;
    const touch = event.touches?.[0];
    if (touch) swipeStartRef.current = { y: touch.clientY, scrollTop: reelsQuestionBodyRef.current?.scrollTop || 0 };
  }

  function handleReelsTouchEnd(event) {
    const start = swipeStartRef.current;
    const touch = event.changedTouches?.[0];
    swipeStartRef.current = null;
    if (!start || !touch) return;
    const delta = start.y - touch.clientY;
    const body = reelsQuestionBodyRef.current;
    if (Math.abs(delta) < 56 || Math.abs((body?.scrollTop || 0) - start.scrollTop) > 6) return;
    justSwipedRef.current = true;
    window.setTimeout(() => { justSwipedRef.current = false; }, 450);
    goToQuestion(currentQuestionIndex + (delta > 0 ? 1 : -1));
  }

  function handleReelsWheel(event) {
    if (Math.abs(event.deltaY) < 36) return;
    const body = reelsQuestionBodyRef.current;
    const canScrollDown = body && body.scrollHeight > body.clientHeight + 4 && body.scrollTop + body.clientHeight < body.scrollHeight - 4;
    const canScrollUp = body && body.scrollTop > 4;
    if (event.deltaY > 0 && canScrollDown) return;
    if (event.deltaY < 0 && canScrollUp) return;
    const now = Date.now();
    if (now - lastWheelAdvanceRef.current < 420) return;
    lastWheelAdvanceRef.current = now;
    event.preventDefault();
    goToQuestion(currentQuestionIndex + (event.deltaY > 0 ? 1 : -1));
  }

  function scheduleAutoAdvance(question, questionIndex, answer) {
    clearTimeout(autoScrollTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    autoAdvanceQuestionRef.current = null;
    clearTimeout(noticeTimerRef.current);
    setAutoAdvanceNotice('');
    if (countAnsweredUnits([question], { [question.id]: answer }) === 0) return;
    const correct = isQuestionCorrect(question, answer);
    const delay = normalizedDelay(correct ? playerPrefs.autoAdvanceCorrectSeconds : playerPrefs.autoAdvanceWrongSeconds, correct ? 2 : 3);
    if (playerPrefs.immediate && playerPrefs.adaptiveFeedback && !feedbackQuestionIdsRef.current.has(question.id)) {
      feedbackQuestionIdsRef.current.add(question.id);
      const previousOutcomes = feedbackOutcomesRef.current;
      const recentOutcomes = [...previousOutcomes.slice(-2), correct];
      const previousWasWrong = previousOutcomes.length > 0 && previousOutcomes[previousOutcomes.length - 1] === false;
      const recentAccuracy = recentOutcomes.filter(Boolean).length / recentOutcomes.length;
      feedbackOutcomesRef.current = [...previousOutcomes, correct];
      setAnswerNoticeTone(correct ? 'correct' : 'wrong');
      setAutoAdvanceNotice(correct
        ? previousWasWrong
          ? 'Xatoni tahlil qildingiz — bu safar to‘g‘ri.'
          : recentOutcomes.length >= 3 && recentAccuracy >= 0.8
            ? 'Javoblaringiz aniq. Shu diqqatni saqlang.'
            : 'To‘g‘ri javob. Sababini ham yodda saqlang.'
        : recentOutcomes.length >= 3 && recentAccuracy < 0.5
          ? 'Bu mavzuni yana bir ko‘rib chiqish foydali bo‘ladi.'
          : 'Bu safar xato. To‘g‘ri javob bilan farqini toping.');
      if (!playerPrefs.autoScroll) noticeTimerRef.current = setTimeout(() => setAutoAdvanceNotice(''), 2400);
    }
    if (!playerPrefs.autoScroll) return;
    autoAdvanceQuestionRef.current = questionIndex;
    const nextIndex = questionIndex + 1;
    const exitEffect = correct ? (playerPrefs.correctTransition || 'shatter') : (playerPrefs.wrongTransition || 'fade');
    const exitDuration = ['shatter', 'dissolve', 'fly', 'slide'].includes(exitEffect) ? 420 : 240;
    if (viewMode === 'reels' && nextIndex < questions.length && exitEffect !== 'none') {
      autoExitTimerRef.current = setTimeout(() => {
        if (autoAdvanceQuestionRef.current !== questionIndex) return;
        setTransitioningQuestion({ questionId: question.id, effect: exitEffect, fragments: makeTransitionFragments(exitEffect) });
      }, Math.max(0, delay * 1000 - exitDuration - 24));
    }
    autoScrollTimerRef.current = setTimeout(() => {
      if (autoAdvanceQuestionRef.current !== questionIndex) return;
      autoAdvanceQuestionRef.current = null;
      clearTimeout(autoExitTimerRef.current);
      setTransitioningQuestion(null);
      setAutoAdvanceNotice('');
      const nextIndex = questionIndex + 1;
      if (nextIndex >= questions.length) {
        submit(answersRef.current);
        return;
      }
      if (viewMode === 'list') {
        setVisibleListCount((count) => Math.max(count, Math.min(questions.length, nextIndex + 1)));
        scrollListToQuestion(nextIndex, 'smooth', () => setCurrentQuestionIndex(nextIndex));
      } else {
        setCurrentQuestionIndex(nextIndex);
        if (reelsQuestionBodyRef.current) reelsQuestionBodyRef.current.scrollTop = 0;
      }
    }, delay * 1000);
  }

  function createPauseSnapshot() {
    const { questions: _selectedQuestions, ...prefs } = config;
    const currentAnswers = answersRef.current;
    return { testId: test.id, testTitle: test.title, questionIds: questions.map((question) => question.id), optionOrders: questions.flatMap((question) => Array.isArray(question.optionOrder) ? [{ id: question.id, order: question.optionOrder }] : []), questionIndex: currentQuestionIndex, prefs: { ...prefs, immediate: playerPrefs.immediate, autoScroll: playerPrefs.autoScroll, autoAdvanceCorrectSeconds: playerPrefs.autoAdvanceCorrectSeconds, autoAdvanceWrongSeconds: playerPrefs.autoAdvanceWrongSeconds, correctAnimation: playerPrefs.correctAnimation, wrongAnimation: playerPrefs.wrongAnimation, celebrationStyle: playerPrefs.celebrationStyle, correctTransition: playerPrefs.correctTransition, wrongTransition: playerPrefs.wrongTransition, adaptiveFeedback: playerPrefs.adaptiveFeedback, viewMode: playerPrefs.viewMode, fontScale, shuffle: playerPrefs.shuffle }, answers: currentAnswers, seconds, answeredCount: countAnsweredUnits(questions, currentAnswers), totalCount, savedAt: new Date().toISOString(), hiddenOnHome: false };
  }

  async function pauseAndExit() {
    if (!session) { setGuestPausePrompt(true); return; }
    if (!onPauseAttempt) { setLeaveError('Testni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); return; }
    setPauseBusy(true);
    setLeaveError('');
    try {
      const saved = await onPauseAttempt(createPauseSnapshot());
      if (!saved) throw new Error('save-failed');
      setLeaveDialog(false);
      exitTest();
    } catch {
      setLeaveError('Javoblarni saqlab bo‘lmadi. Internetni tekshirib, yana urinib ko‘ring.');
    } finally {
      setPauseBusy(false);
    }
  }

  async function signInToSavePause() {
    if (accountSignInBusy) return;
    setAccountSignInBusy(true);
    setLeaveError('');
    try {
      const snapshot = createPauseSnapshot();
      let currentSession = session;
      if (!currentSession?.user?.id) {
        try {
          const { data } = await supabase.auth.getSession();
          currentSession = data?.session || null;
        } catch {}
      }
      if (currentSession?.user?.id && onPauseAttempt) {
        const saved = await onPauseAttempt(snapshot);
        if (!saved) throw new Error('pause-save-failed');
        setGuestPausePrompt(false);
        setLeaveDialog(false);
        exitTest();
        return;
      }
      let result;
      if (onRequireAccount) {
        result = await onRequireAccount(snapshot);
      } else {
        sessionStorage.setItem('upcourse-pending-test-pause', JSON.stringify(snapshot));
        const { error } = await signInWithGoogle();
        result = error ? { error } : { ok: true };
      }
      if (result?.error) setLeaveError('Google orqali kirish oynasini ochib bo‘lmadi. Qayta urinib ko‘ring.');
    } catch {
      setLeaveError('Javoblarni saqlab yoki Google orqali kirish oynasini ochib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setAccountSignInBusy(false);
    }
  }

  function select(qid, idx) {
    if (finished) return;
    const next = { ...answersRef.current, [qid]: idx };
    answersRef.current = next;
    setAnswers(next);
    if (playerPrefs.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
    const question = questions.find((item) => item.id === qid);
    if (question) {
      triggerCorrectCelebration(question, idx);
      scheduleAutoAdvance(question, questions.findIndex((item) => item.id === qid), idx);
    }
  }

  function selectMatching(qid, pairId, optionIndex) {
    if (finished) return;
    const nextMatching = { ...(answersRef.current[qid] || {}) };
    if (optionIndex === undefined) delete nextMatching[pairId];
    else nextMatching[pairId] = optionIndex;
    const next = { ...answersRef.current, [qid]: nextMatching };
    answersRef.current = next;
    setAnswers(next);
    const question = questions.find((q) => q.id === qid);
    const matchingComplete = (question?.pairs || []).every((pair) => nextMatching[pair.id] !== undefined);
    if (!matchingOnly && playerPrefs.immediate && matchingComplete) {
      setRevealed((revealedAnswers) => ({ ...revealedAnswers, [qid]: true }));
    }
    if (question && matchingComplete) {
      triggerCorrectCelebration(question, nextMatching);
      scheduleAutoAdvance(question, questions.findIndex((item) => item.id === qid), nextMatching);
    }
    if (matchingOnly) {
      const allCorrect = questions.every((question) => getQuestionScore(question, next[question.id]) === getQuestionCount([question]));
      clearTimeout(autoFinishTimerRef.current);
      if (allCorrect) autoFinishTimerRef.current = setTimeout(() => submit(next), 360);
    }
  }

  function setOpenAnswer(qid, text) {
    if (finished) return;
    const next = { ...answersRef.current, [qid]: text };
    answersRef.current = next;
    setAnswers(next);
  }

  function finishTest(latestAnswers = answersRef.current) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimeout(autoFinishTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    const correctCount = questions.reduce((s, question) => s + getQuestionScore(question, latestAnswers[question.id]), 0);
    const percent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    answersRef.current = latestAnswers;
    setAnswers(latestAnswers);
    setRevealed(Object.fromEntries(questions.map((q) => [q.id, true])));
    setFinishDialog(false);
    setLeaveDialog(false);
    onClearPaused?.(test.id);
    setFinished(true);
    if (percent >= 70 && onTestComplete) {
      Promise.resolve()
        .then(() => onTestComplete(percent))
        .then((shouldNotify) => { if (shouldNotify) setShowBadgeNotice(true); })
        .catch(() => {});
    }
  }

  function submit(latestAnswers = answersRef.current) {
    if (finishedRef.current) return;
    clearTimeout(autoScrollTimerRef.current);
    clearTimeout(autoExitTimerRef.current);
    setTransitioningQuestion(null);
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    if (countAnsweredUnits(questions, latestAnswers) < totalCount) {
      setLeaveDialog(false);
      setFinishDialog(true);
      return;
    }
    finishTest(latestAnswers);
  }

  if (finished) {
    const correctCount = questions.reduce((s, qq) => s + getQuestionScore(qq, answers[qq.id]), 0);
    const totalCount = getQuestionCount(questions);
    const resultAnsweredCount = countAnsweredUnits(questions, answers);
    const incorrectCount = Math.max(0, resultAnsweredCount - correctCount);
    const unansweredCount = Math.max(0, totalCount - resultAnsweredCount);
    const percent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    return (
      <div>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-sm mb-3 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>

        <section ref={resultSummaryRef} aria-labelledby="quiz-result-title" className="max-w-3xl rounded-xl border p-4 sm:p-5 mb-3" style={{ background: C.surface, borderColor: C.rule, scrollMarginTop: '5rem' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.16em]" style={{ ...fontBody, color: C.inkSoft }}>Test yakunlandi</div>
              <h3 id="quiz-result-title" className="mt-1 text-xl sm:text-2xl" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
            </div>
            <button type="button" aria-label="Natijani ulashish" title="Natijani ulashish" onClick={() => {
              const message = `🏆 Men «${test.title}» testidan ${percent}% oldim — ${correctCount}/${totalCount}! ⏱️ ${formatDuration(seconds)}\nBu mavzuni siz qanchalik yaxshi bilasiz? Bilimingizni sinab ko‘ring 👇`;
              shareItem(buildShareUrl({ test: test.id }), `${test.title} · UpCourse Uz`, message);
            }} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 focus-visible:outline focus-visible:outline-2" style={{ color: C.cover, borderColor: C.rule, background: C.successTint, outlineColor: C.gold }}>
              <Share2 size={17} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg px-3 py-2" style={{ background: C.successTint }}>
              <div className="text-2xl leading-none" style={{ ...fontMono, color: C.accent, fontWeight: 700 }}>{percent}%</div>
              <div className="mt-1 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>Natija</div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: C.successTint }}>
              <div className="inline-flex items-center gap-1.5 text-lg leading-none" style={{ ...fontMono, color: C.accent, fontWeight: 700 }}><Check size={16} /> {correctCount}/{totalCount}</div>
              <div className="mt-1 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>To‘g‘ri</div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: C.dangerTint }}>
              <div className="inline-flex items-center gap-1.5 text-lg leading-none" style={{ ...fontMono, color: C.red, fontWeight: 700 }}><X size={16} /> {incorrectCount}</div>
              <div className="mt-1 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>Xato</div>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(184, 137, 57, .11)' }}>
              <div className="inline-flex items-center gap-1.5 text-lg leading-none" style={{ ...fontMono, color: C.gold, fontWeight: 700 }}><Clock3 size={15} /> {formatDuration(seconds)}</div>
              <div className="mt-1 text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>Vaqt</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: C.dangerTint }} role="progressbar" aria-label="Test natijasi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: C.accent }} />
          </div>
          {unansweredCount > 0 && <p className="mt-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{resultAnsweredCount}/{totalCount} ta javob belgilandi · {unansweredCount} ta javobsiz</p>}
          <p className="mt-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>
            {percent === 100 ? 'Ajoyib! Mavzuni juda yaxshi o‘zlashtirdingiz.' : 'Yaxshi urinish — yana bir bor urinib, natijangizni oshiring.'}
          </p>
        </section>

        <div className={`grid ${nextTest ? 'grid-cols-3' : 'grid-cols-2'} max-w-2xl gap-2 mb-5`}>
          <button type="button" onClick={onRestart} aria-label="Sozlamalarni oʻzgartirish" title="Sozlamalarni oʻzgartirish" className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule, outlineColor: C.gold }}>
            <Settings size={16} /><span className="text-[11px] sm:text-xs font-semibold">Sozlash</span>
          </button>
          <button type="button" onClick={onRetry} aria-label="Qayta ishlash" title="Qayta ishlash" className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule, outlineColor: C.gold }}>
            <RotateCcw size={16} /><span className="text-[11px] sm:text-xs font-semibold">Qayta</span>
          </button>
          {nextTest && <button type="button" onClick={onNextTest} aria-label={`Keyingi test: ${nextTest.title}`} title={`Keyingi test: ${nextTest.title}`} className="flex min-h-[48px] items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.ink, background: C.goldSoft, borderColor: C.goldSoft, outlineColor: C.cover }}>
            <ChevronRight size={18} /><span className="text-[11px] sm:text-xs font-semibold">Keyingi</span>
          </button>}
        </div>
        {showBadgeNotice && (
          <div role="status" className="mb-6 flex max-w-2xl flex-wrap items-center gap-3 rounded-xl px-3 py-3 sm:px-4" style={{ background: 'rgba(232, 229, 238, .78)', border: '1px solid #D2CDD7', backdropFilter: 'blur(8px)', boxShadow: '0 4px 14px rgba(45, 40, 58, .07)' }}>
            <MiniLearningBadge size={34} />
              const current = index === currentQuestionIndex;
              return <button key={question.id} type="button" onClick={() => goToQuestion(index)} aria-label={`Savol ${index + 1}${complete ? ', javob berilgan' : partial ? ', qisman javob berilgan' : ', javobsiz'}`} className="relative flex h-11 items-center justify-center rounded-xl border text-sm font-semibold" style={{ ...fontMono, color: current ? C.coverDeep : complete ? C.accent : C.ink, background: current ? C.goldSoft : complete ? C.successTint : C.surface, borderColor: current ? C.gold : partial ? C.gold : C.rule }}>
                {index + 1}{partial && <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ background: C.gold }} />}
              </button>;
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ ...fontBody, color: C.inkSoft }}><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: C.successTint, border: `1px solid ${C.rule}` }} />Javob bor</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: C.goldSoft }} />Hozirgi</span></div>
        </section>
      </div>}

      {playerSettingsOpen && <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlayerSettingsOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="quiz-settings-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl p-4 shadow-2xl sm:rounded-2xl sm:p-5" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
          <div className="mb-4 flex items-center justify-between gap-3"><div><h3 id="quiz-settings-title" className="text-lg font-semibold" style={{ ...fontDisplay, color: C.ink }}>Test sozlamalari</h3><p className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>O‘qish va ishlash uslubini hozir o‘zgartiring.</p></div><button type="button" onClick={() => setPlayerSettingsOpen(false)} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: C.ink, background: C.surface }}><X size={18} /></button></div>
          <div className="space-y-2">
            <div className="rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}>
              <div className="mb-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Ishlash uslubi</div>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'reels', title: 'Reels', detail: 'Vertikal surish' }, { id: 'list', title: 'Ro‘yxat', detail: 'Barcha savollar' }].map((option) => {
                  const active = viewMode === option.id;
                  return <button key={option.id} type="button" aria-pressed={active} onClick={() => updatePlayerPrefs({ viewMode: option.id })} className="rounded-lg border px-3 py-2 text-left" style={{ ...fontBody, color: C.ink, background: active ? C.goldSoft : C.paper, borderColor: active ? C.gold : C.rule }}><span className="block text-sm font-semibold">{option.title}</span><span className="text-[11px]" style={{ color: C.inkSoft }}>{option.detail}</span></button>;
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}><div className="flex items-center gap-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}{theme === 'dark' ? 'Tungi rejim' : 'Kunduzgi rejim'}</div><button type="button" onClick={toggleTheme} aria-label="Rang rejimini almashtirish" className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ ...fontBody, color: C.cover, background: C.goldSoft }}>Almashtirish</button></div>
            <div className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}><div className="flex items-center gap-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}><Type size={17} />Matn kattaligi</div><div className="flex items-center gap-1"><button type="button" onClick={() => setQuizFontScale(fontScale - 0.05)} aria-label="Matnni kichraytirish" className="h-9 w-9 rounded-lg border text-lg" style={{ color: C.ink, borderColor: C.rule }}>−</button><span className="min-w-12 text-center text-xs" style={{ ...fontMono, color: C.ink }}>{Math.round(fontScale * 100)}%</span><button type="button" onClick={() => setQuizFontScale(fontScale + 0.05)} aria-label="Matnni kattalashtirish" className="h-9 w-9 rounded-lg border text-lg" style={{ color: C.ink, borderColor: C.rule }}>+</button></div></div>
            <button type="button" role="switch" aria-checked={!!playerPrefs.immediate} onClick={() => updatePlayerPrefs({ immediate: !playerPrefs.immediate })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobni darhol ko‘rsatish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Xatoni shu savolning o‘zida ko‘rib tahlil qilasiz.</span></span><span className="h-6 w-11 rounded-full p-1" style={{ background: playerPrefs.immediate ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.immediate ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            <button type="button" role="switch" aria-checked={!!playerPrefs.autoScroll} onClick={() => updatePlayerPrefs({ autoScroll: !playerPrefs.autoScroll })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin avtomatik o‘tish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Javobni ko‘rishga vaqt beradi; xato bo‘lsa ham o‘tadi.</span></span><span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: playerPrefs.autoScroll ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.autoScroll ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            <button type="button" role="switch" aria-checked={!!playerPrefs.adaptiveFeedback} onClick={() => updatePlayerPrefs({ adaptiveFeedback: !playerPrefs.adaptiveFeedback })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobga mos qisqa fikrlar</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Xato va to‘g‘ri javobga qarab izoh. Odatiy holatda o‘chiq.</span></span><span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: playerPrefs.adaptiveFeedback ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.adaptiveFeedback ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            {playerPrefs.autoScroll && <section className="rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }} aria-label="Avtomatik o‘tish vaqti"><div className="mb-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Keyingisiga o‘tish vaqti</div><div className="grid grid-cols-2 gap-2">{[['To‘g‘ri javob', 'autoAdvanceCorrectSeconds', 2], ['Xato javob', 'autoAdvanceWrongSeconds', 3]].map(([label, key, fallback]) => <label key={key} className="min-w-0 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{label}<select value={normalizedDelay(playerPrefs[key], fallback)} onChange={(event) => updatePlayerPrefs({ [key]: Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" style={{ ...fontMono, color: C.ink, background: C.paper, borderColor: C.rule }} aria-label={`${label}dan keyin kutish`}>{AUTO_ADVANCE_DELAYS.map((delay) => <option key={delay} value={delay}>{delay} soniya</option>)}</select></label>)}</div></section>}
            <QuizAnimationSettings open={playerAnimationsOpen} onToggle={() => setPlayerAnimationsOpen((open) => !open)} prefs={playerPrefs} onChange={updatePlayerPrefs} />
          </div>
          <button type="button" onClick={() => { setPlayerSettingsOpen(false); setReconfigureDialog(true); }} className="mt-4 w-full rounded-xl border px-3 py-3 text-sm font-semibold" style={{ ...fontBody, color: C.ink, backgReconfigure(nextPrefs) {
    onClearPaused?.(test.id);
    setLastConfig(nextPrefs);
    setResumeProgress(null);
    setConfig(null);
    setAttemptKey((key) => key + 1);
  }

  function handleRetry() {
    onClearPaused?.(test.id);
    setResumeProgress(null);
    setConfig((current) => current ? { ...current, questions: computeQuizQuestions(test, current) } : current);
    setAttemptKey((key) => key + 1);
  }

  if (!config) {
    return <QuizSetupPanel test={test} onExit={onExit} onStart={handleStart} initialConfig={lastConfig} onSavePrefs={onSavePrefs} />;
  }
  return <QuizPlayer key={attemptKey} test={test} config={config} initialProgress={resumeProgress} onExit={onExit} onRestart={() => { onClearPaused?.(test.id); setResumeProgress(null); setConfig(null); }} onRetry={handleRetry} onNextTest={onNextTest} nextTest={nextTest} onSavePrefs={savePlayerPrefs} onReconfigure={handleReconfigure} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} onPauseAttempt={onPauseAttempt} onClearPaused={onClearPaused} onRequireAccount={onRequireAccount} />;
}

function LiveEntryLoading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '24px 12px' }}>
      <div style={{ width: 'min(100%, 380px)', padding: '28px 24px', borderRadius: 22, textAlign: 'center', background: '#FBFAF3', border: '1px solid #B7C4AE', boxShadow: '0 16px 44px rgba(31,61,43,.08)' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 16, display: 'grid', placeItems: 'center', color: '#1F3D2B', background: '#DCC28F', fontSize: 23 }} aria-hidden="true">◉</div>
        <div style={{ font: "700 20px Georgia, 'Times New Roman', serif", color: '#1F3D2B' }}>Jonli testga ulanish</div>
        <div style={{ marginTop: 8, color: '#5C6152', font: '14px/1.5 system-ui, sans-serif' }}>Xona tayyorlanmoqda. Bir oz kuting.</div>
      </div>
    </div>
  );
}

export function TestsView({ tests, testsLoading, testsLoadError, onRetryTests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, profile, saveTestPrefs, initialOpenId, openRequest, onOpenRequestHandled, initialCategoryId, initialLiveCode, initialLiveSession, initialBattleToken, initialCertificateId, ensureTestContent, loadTestForOpening, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, onPauseAttempt, onClearPaused, onRequireAccount, onRequireTestAccount, onExitInitialLive, onExitInitialTest }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeResumeState, setActiveResumeState] = useState(null);
  const [activeStartConfig, setActiveStartConfig] = useState(null);
  const [openingInitialTest, setOpeningInitialTest] = useState(Boolean(initialOpenId || openRequest));
  const [activeTestOverride, setActiveTestOverride] = useState(null);
  const [openTestError, setOpenTestError] = useState(null);
  const openTestGenerationRef = useRef(0);
  const handledOpenRequestRef = useRef(null);
  const [setupMode, setSetupMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(Boolean(initialLiveCode || initialLiveSession));
  const [teamBattleOpen, setTeamBattleOpen] = useState(Boolean(initialBattleToken));
  const [certificateOpen, setCertificateOpen] = useState(Boolean(initialCertificateId || new URLSearchParams(window.location.search).get('verifyCertificate')));
  /* Jonli xona holati (xona ochgan/qo'shilgan bo'lsa) — LiveQuizHub
     shuni o'zgarganda xabar beradi, biz esa sessionStorage'ga yozamiz,
     shu tufayli refresh qilinganda xonaga qaytib kirish mumkin. */
  const [liveSession, setLiveSession] = useState(initialLiveSession || null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const exitInitialLiveRoute = () => {
    onExitInitialLive?.();
    setLiveOpen(false);
  };
  /* forceSetup=true bo'lsa (⋮ menyudagi "Sozlamalar"), test ochilishidan
     oldin sozlamalar ekrani ko'rsatiladi; aks holda (oddiy "Boshlash")
     saqlangan/andoza sozlamalar bilan darhol boshlanadi. */
  const openTest = async (id, forceSetup = false, resumeState = null, onLeave = null, startConfig = null, recordHistory = true) => {
    if (!session?.user?.id && !forceSetup) {
      const access = await onRequireTestAccount?.({ testId: id, action: 'open' });
      if (!access?.authenticated) { setOpeningInitialTest(false); return; }
    }
    const generation = ++openTestGenerationRef.current;
    setOpeningInitialTest(true);
    setOpenTestError(null);
    setActiveTestOverride(null);
    setActiveId(id);
    setActiveResumeState(resumeState);
    setActiveStartConfig(startConfig);
    setSetupMode(!!forceSetup);
    if (recordHistory) pushNav(() => {
      openTestGenerationRef.current += 1;
      setActiveId(null);
      setActiveTestOverride(null);
      setOpenTestError(null);
      setOpeningInitialTest(false);
      setActiveResumeState(null);
      setActiveStartConfig(null);
      setSetupMode(false);
      onLeave?.();
    });
    try {
      let result;
      if (loadTestForOpening) result = await loadTestForOpening(id);
      else {
        const questions = ensureTestContent ? await ensureTestContent(id) : undefined;
        const cached = tests.find((test) => test.id === id);
        result = cached ? { status: 'ok', test: { ...cached, questions: questions ?? cached.questions } } : { status: 'missing' };
      }
      if (generation !== openTestGenerationRef.current) return;
      if (result?.status === 'ok' && result.test) setActiveTestOverride(result.test);
      else setOpenTestError(result?.status === 'missing' ? 'missing' : 'error');
    } catch {
      if (generation === openTestGenerationRef.current) setOpenTestError('error');
    } finally {
      if (generation === openTestGenerationRef.current) setOpeningInitialTest(false);
    }
  };
  const goTest = (id, forceSetup, resumeState = null, onLeave = null, startConfig = null) => openTest(id, forceSetup, resumeState, onLeave, startConfig, true);
  const goEdit = (id) => { if (ensureTestContent) ensureTestContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const goLive = () => { setLiveOpen(true); pushNav(() => setLiveOpen(false)); };
  const goTeamBattle = () => { setTeamBattleOpen(true); pushNav(() => setTeamBattleOpen(false)); };
  const goCertificateCenter = () => { setCertificateOpen(true); pushNav(() => setCertificateOpen(false)); };
  const goTxtImport = () => onGoToCommunity('testlar', '', 'txt');
  const goMathTest = () => onGoToCommunity('testlar', '', 'math');
  const goMatchingTest = () => onGoToCommunity('testlar', '', 'matching');

  const myId = session?.user?.id;
  const approved = tests.filter((t) => t.status === 'approved');
  const approvedCategories = categories.filter((c) => c.status !== 'pending' || approved.some((test) => test.categoryId === c.id));
  const viewable = isAdmin ? tests : tests.filter((t) => t.status === 'approved' || t.authorId === myId);
  /* To'liq tests ro'yxatidan qidiramiz (faqat viewable'dan emas) — shu
     tufayli ulashilgan havola orqali kirilgan tekshirilmoqda/xususiy
     test ham (uning muallifi yoki admin bo'lmasa ham) ochiladi:
     ensureTestContent uni ID bo'yicha to'g'ridan-to'g'ri yuklab, tests
     ro'yxatiga qo'shib qo'yadi. */
  const active = activeTestOverride?.id === activeId ? activeTestOverride : tests.find((t) => t.id === activeId);
  const activeCategoryTests = active ? approved.filter((test) => test.categoryId === active.categoryId) : [];
  const activeCategoryIndex = activeCategoryTests.findIndex((test) => test.id === activeId);
  const nextTest = activeCategoryIndex >= 0 ? activeCategoryTests[activeCategoryIndex + 1] || null : null;
  const editing = approved.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((t) => t.categoryId === categoryId);
  const q = query.trim().toLowerCase();
  const effectivePrefs = { ...DEFAULT_TEST_PREFS, ...(profile?.testPrefs || {}) };
  const onSavePrefs = session ? saveTestPrefs : undefined;

  /* Ulashilgan havola orqali kirilgan bo'lsa (?test=ID), shu testni
     avtomatik ochamiz — faqat ilk yuklanganda, bitta marta. Statusidan
     qat'i nazar ochishga urinib ko'ramiz (ensureTestContent ID bo'yicha
     to'g'ridan-to'g'ri so'raydi). Havola bo'lmasa, oxirgi saqlangan
     pozitsiyani tiklaymiz — masalan internet uzilib sahifa yangilanib
     ketgan bo'lsa, foydalanuvchi Bosh sahifaga emas, aynan shu teolor: C.gold }}
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
            <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                  {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                  <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questionCount ?? t.questions?.length ?? 0} ta savol</div>
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
