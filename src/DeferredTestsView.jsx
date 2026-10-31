import { useState, useEffect, useContext, useRef, Suspense, lazy } from 'react';
import { ArrowLeft, Award, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, ListChecks, Lock, LogIn, LogOut, Moon, PanelTopClose, PanelTopOpen, Pause, Pencil, RotateCcw, Save, Settings, Share2, Sparkles, Sun, Trash2, Type, Users, X } from 'lucide-react';
import { signInWithGoogle, supabase } from './supabaseClient.js';
import { AuthorLine, C, CategoryGrid, DEFAULT_TEST_PREFS, EmptyState, EntryNumber, GhostButton, ItemMenu, LiveQuizHub, MatchingTestQuestion, MiniLearningBadge, NavContext, ThemeContext, PinnedAddButton, SearchBox, SectionHeading, SectionLoading, SettingChip, SolidButton, TeamBattleHub, buildShareUrl, computeQuizQuestions, fontBody, fontDisplay, fontMono, formatDuration, getQuestionCount, getQuestionScore, isQuestionCorrect, shareItem, writePosition } from './App.jsx';
const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));
const AUTO_ADVANCE_DELAYS = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];
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
  const [autoAdvanceCorrectSeconds, setAutoAdvanceCorrectSeconds] = useState(normalizedDelay(init.autoAdvanceCorrectSeconds, 1.5));
  const [autoAdvanceWrongSeconds, setAutoAdvanceWrongSeconds] = useState(normalizedDelay(init.autoAdvanceWrongSeconds, 2));
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
    return Number.isFinite(value) && value > 0 ? Math.max(0.7, Math.min(1.3, value)) : 0.9;
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
  const [visibleListCount, setVisibleListCount] = useState(() => Math.min(questions.length, 20));
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(config.fontScale);
    if (Number.isFinite(saved) && saved > 0) return Math.max(0.7, Math.min(1.3, saved));
    try { return Math.max(0.7, Math.min(1.3, Number(localStorage.getItem('upcourse-quiz-font-scale')) || 0.9)); } catch { return 0.9; }
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
    requestAnimationFrame(() => questionRefs.current[currentQuestionIndex]?.scrollIntoView({ behavior: 'auto', block: 'start' }));
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
    const next = Math.round(Math.max(0.7, Math.min(1.3, value)) * 10) / 10;
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
      requestAnimationFrame(() => questionRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      if (reelsQuestionBodyRef.current) reelsQuestionBodyRef.current.scrollTop = 0;
    }
  }

  function handleListScroll() {
    const container = listContainerRef.current;
    if (!container || visibleListCount >= questions.length) return;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 420) {
      setVisibleListCount((count) => Math.min(questions.length, count + 20));
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
    const delay = normalizedDelay(correct ? playerPrefs.autoAdvanceCorrectSeconds : playerPrefs.autoAdvanceWrongSeconds, correct ? 1.5 : 2);
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
    if (viewMode === 'reels' && nextIndex < questions.length && exitEffect !== 'none') {
      autoExitTimerRef.current = setTimeout(() => {
        if (autoAdvanceQuestionRef.current !== questionIndex) return;
        setTransitioningQuestion({ questionId: question.id, effect: exitEffect, fragments: makeTransitionFragments(exitEffect) });
      }, Math.max(0, delay * 1000 - 620));
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
        setCurrentQuestionIndex(nextIndex);
        requestAnimationFrame(() => questionRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else {
        setCurrentQuestionIndex(nextIndex);
        if (reelsQuestionBodyRef.current) reelsQuestionBodyRef.current.scrollTop = 0;
      }
    }, delay * 1000);
  }

  function createPauseSnapshot() {
    const { questions: _selectedQuestions, ...prefs } = config;
    const currentAnswers = answersRef.current;
    return { testId: test.id, testTitle: test.title, questionIds: questions.map((question) => question.id), questionIndex: currentQuestionIndex, prefs: { ...prefs, immediate: playerPrefs.immediate, autoScroll: playerPrefs.autoScroll, autoAdvanceCorrectSeconds: playerPrefs.autoAdvanceCorrectSeconds, autoAdvanceWrongSeconds: playerPrefs.autoAdvanceWrongSeconds, correctAnimation: playerPrefs.correctAnimation, wrongAnimation: playerPrefs.wrongAnimation, celebrationStyle: playerPrefs.celebrationStyle, correctTransition: playerPrefs.correctTransition, wrongTransition: playerPrefs.wrongTransition, adaptiveFeedback: playerPrefs.adaptiveFeedback, viewMode: playerPrefs.viewMode, fontScale, shuffle: playerPrefs.shuffle }, answers: currentAnswers, seconds, answeredCount: countAnsweredUnits(questions, currentAnswers), totalCount, savedAt: new Date().toISOString(), hiddenOnHome: false };
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
            <div className="min-w-[150px] flex-1">
              <div className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Tabriklaymiz, shart bajarildi!</div>
              <div className="mt-0.5 text-xs" style={{ ...fontBody, color: C.inkSoft }}>“Bilimga qadam” nishonini kolleksiyaga qo‘shing.</div>
            </div>
            <button type="button" disabled={badgeClaimBusy} onClick={async () => { try { await onBadgeClaim?.(); setShowBadgeNotice(false); } catch {} }} className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60" style={{ background: '#65539A', color: '#fff' }}>{badgeClaimBusy ? '...' : session ? 'Qabul qilish' : 'Kirish va olish'}</button>
            <button type="button" aria-label="Yopish" onClick={() => setShowBadgeNotice(false)} className="rounded-md px-2 py-1 text-xs" style={{ color: C.inkSoft }}>Yopish</button>
            {badgeClaimError && <div className="w-full text-xs" style={{ ...fontBody, color: C.red }}>{badgeClaimError}</div>}
          </div>
        )}
        <section className="max-w-2xl mb-8">
          <h4 className="text-lg mb-3" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Javoblar tahlili</h4>
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const userAnswer = answers[q.id];
              const correct = getQuestionScore(q, userAnswer);
              const total = getQuestionCount([q]);
              let chosenText = 'Javob berilmadi';
              let correctText = '';
              if (q.type === 'open') {
                chosenText = typeof userAnswer === 'string' && userAnswer.trim() ? userAnswer : 'Javob berilmadi';
                correctText = (q.answers || []).join(' yoki ');
              } else if (q.type === 'matching') {
                const pairs = q.pairs || [{ id: q.id, text: q.text, correct: q.correct }];
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                if (!q.pairs) {
                  chosenText = q.options?.[userAnswer] ?? 'Javob berilmadi';
                  correctText = q.options?.[q.correct] ?? '';
                } else {
                  chosenText = pairs.map((pair, i) => `${i + 1}. ${userAnswer?.[pair.id] === undefined ? '—' : letters[userAnswer[pair.id]]}`).join(' · ');
                  correctText = pairs.map((pair, i) => `${i + 1}. ${letters[pair.correct]}`).join(' · ');
                }
              } else {
                chosenText = q.options?.[userAnswer] ?? 'Javob berilmadi';
                correctText = q.options?.[q.correct] ?? '';
              }
              const isCorrect = correct === total;
              return (
                <article key={q.id} className="p-4 rounded-sm" style={{ background: isCorrect ? C.successTint : C.dangerTint, border: `1px solid ${isCorrect ? C.accent : C.red}` }}>
                  <div className="text-sm mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 600 }}>{qi + 1}. {q.text || 'Moslashtirish savoli'}{q.mathFormula && <Suspense fallback={null}><MathInput value={q.mathFormula} readOnly compact /></Suspense>}</div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div style={{ ...fontBody, color: C.inkSoft }}>Sizning javobingiz</div>
                      {q.answerMode === 'math' && chosenText !== 'Javob berilmadi' ? <Suspense fallback={<div className="mt-1 break-words">{chosenText}</div>}><MathInput value={chosenText} readOnly compact /></Suspense> : <div className="mt-1 break-words" style={{ ...fontBody, color: C.ink }}>{chosenText}</div>}
                    </div>
                    <div>
                      <div style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javob</div>
                      {q.answerMode === 'math' && correctText ? <Suspense fallback={<div className="mt-1 break-words">{correctText}</div>}><MathInput value={correctText} readOnly compact /></Suspense> : <div className="mt-1 break-words" style={{ ...fontBody, color: C.accent, fontWeight: 600 }}>{correctText || 'Javob kiritilmagan'}</div>}
                    </div>
                  </div>
                  <div className="mt-3 text-xs" style={{ ...fontMono, color: isCorrect ? C.accent : C.red }}>
                    {isCorrect ? 'Toʻgʻri' : 'Notoʻgʻri'} · {correct}/{total} ball
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  const renderQuestionCard = (question, index, reel = false) => {
    const answer = answers[question.id];
    const showResult = playerPrefs.immediate && question.type !== 'open' && !!revealed[question.id];
    const exitEffect = reel && transitioningQuestion?.questionId === question.id ? transitioningQuestion.effect : null;
    return (
      <article
        key={question.id}
        ref={(node) => { if (node) questionRefs.current[index] = node; else delete questionRefs.current[index]; }}
        data-question-index={index}
        aria-labelledby={`quiz-question-title-${index}`}
        className={`relative ${reel ? 'quiz-reel-enter flex h-full min-h-0 w-full flex-col' : question.type === 'matching' ? 'w-full border-b pb-2 pt-0.5 last:border-b-0' : 'w-full border-b py-5 last:border-b-0'} ${exitEffect && exitEffect !== 'none' ? `quiz-exit-${exitEffect}` : ''}`}
        style={reel ? undefined : { borderColor: C.rule, scrollMarginTop: '96px' }}
      >
        {exitEffect && transitioningQuestion?.questionId === question.id && transitioningQuestion.fragments?.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-visible">
            {transitioningQuestion.fragments.map((fragment) => (
              <span key={fragment.id} className="quiz-transition-fragment" style={{ left: '50%', top: '50%', width: fragment.size, height: fragment.size, background: fragment.color, borderRadius: fragment.shape === 'circle' ? '50%' : '2px', clipPath: fragment.shape === 'shard' ? 'polygon(50% 0,100% 100%,0 82%)' : undefined, '--dx': fragment.x, '--dy': fragment.y, '--turn': fragment.rotate, '--delay': fragment.delay }} />
            ))}
          </div>
        )}
        {reel ? (
          <div ref={reelsQuestionBodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 sm:px-6 sm:pb-5" style={{ touchAction: 'pan-y', paddingTop: controlsVisible ? `calc(env(safe-area-inset-top) + ${showAdaptiveFeedback ? 150 : 112}px)` : 'calc(env(safe-area-inset-top) + 56px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}>
            {test.description && index === 0 && <p className="mb-3 text-sm leading-5" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}
            {renderQuestionContent(question, index, answer, showResult)}
          </div>
        ) : (
          <div className={question.type === 'matching' ? "w-full px-0" : "mx-auto max-w-3xl px-2 sm:px-3"}>
            {test.description && index === 0 && <p className="mb-3 text-sm leading-5" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}
            {renderQuestionContent(question, index, answer, showResult)}
          </div>
        )}
      </article>
    );
  };

  function renderQuestionContent(question, index, answer, showResult) {
    return (
      <>
        <div className={question.type === 'matching' ? "mb-1 flex flex-wrap items-center gap-2" : "mb-2 flex flex-wrap items-center gap-2"}>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}>Savol {index + 1}</span>
          <span className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>{question.type === 'open' ? 'Javob yozing' : question.type === 'matching' ? 'Moslikni toping' : 'To‘g‘ri variantni tanlang'}</span>
          {countAnsweredUnits([question], answers) > 0 && <span className="ml-auto inline-flex items-center gap-1 text-xs" style={{ ...fontBody, color: C.accent }}><Check size={13} /> Belgilangan</span>}
        </div>
        {question.type !== 'matching' && !question.pdfSourceImageOnly && <h2 id={`quiz-question-title-${index}`} className="mb-3 max-w-3xl font-medium leading-snug" style={{ ...fontBody, color: C.ink, fontSize: `${Math.round(18 * fontScale)}px` }}>
          {question.text}
          {question.mathFormula && <Suspense fallback={null}><MathInput value={question.mathFormula} readOnly compact scale={fontScale} /></Suspense>}
        </h2>}
        {question.type === 'matching' && <h2 id={`quiz-question-title-${index}`} className="sr-only">{question.text || `Moslik savoli ${index + 1}`}</h2>}
        {question.pdfSourceImageOnly && <h2 id={`quiz-question-title-${index}`} className="sr-only">{question.text || `Savol ${index + 1}`}</h2>}
        {question.imageUrl && (question.pdfSourceImageOnly
          ? <Suspense fallback={<div className="mb-3 h-28 animate-pulse rounded-xl" style={{ background: C.rule }} />}><PdfQuestionImage src={question.imageUrl} alt={question.text || 'PDFdagi savol'} /></Suspense>
          : <img src={question.imageUrl} alt="Savolga tegishli rasm" loading="lazy" decoding="async" className="mb-3 max-h-[34dvh] max-w-full rounded-xl object-contain" style={{ border: `1px solid ${C.rule}` }} />)}
        {question.type === 'matching' ? (
          <MatchingTestQuestion question={question} answer={answer} onChange={(pairId, optionIndex) => selectMatching(question.id, pairId, optionIndex)} disabled={finished} showResult={showResult} fontScale={fontScale} />
        ) : question.type === 'open' ? (
          <div>
            {question.answerMode === 'math' ? (
              <Suspense fallback={<div className="py-3 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Javob maydoni…</div>}><MathInput value={answer || ''} onChange={(value) => setOpenAnswer(question.id, value)} disabled={finished} placeholder="Javobingiz" scale={fontScale} /></Suspense>
            ) : (
              <input type="text" value={answer || ''} onChange={(event) => setOpenAnswer(question.id, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} disabled={finished} placeholder="Javobingizni kiriting" className="w-full min-h-12 rounded-xl px-4 py-2.5 outline-none" style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, fontSize: `${Math.round(17 * fontScale)}px` }} />
            )}
            {showResult && <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ ...fontBody, color: isQuestionCorrect(question, answer) ? C.accent : C.red, background: isQuestionCorrect(question, answer) ? C.successTint : C.dangerTint }}>
              {isQuestionCorrect(question, answer) ? <Check size={17} className="mt-0.5 shrink-0" /> : <X size={17} className="mt-0.5 shrink-0" />}<span>To‘g‘ri javob: {(question.answers || []).join(' yoki ') || 'Javob kaliti kiritilmagan'}</span>
            </div>}
          </div>
        ) : (
          <div className="space-y-2" role="group" aria-label="Javob variantlari">
            {question.options.map((option, optionIndex) => {
              const selected = answer === optionIndex;
              const correct = showResult && optionIndex === question.correct;
              const wrong = showResult && selected && optionIndex !== question.correct;
              const optionAnimation = correct ? playerPrefs.correctAnimation : wrong ? playerPrefs.wrongAnimation : 'none';
              const optionEffectClass = showResult && optionAnimation !== 'none' ? `quiz-result-${optionAnimation}` : '';
              const background = correct ? C.successTint : wrong ? C.dangerTint : selected ? C.selectedTint : C.surface;
              const border = correct ? C.accent : wrong ? C.red : selected ? C.gold : C.rule;
              return <button key={optionIndex} type="button" onClick={() => select(question.id, optionIndex)} disabled={showResult} aria-pressed={selected} className={`flex min-h-12 w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 disabled:cursor-default ${optionEffectClass}`} style={{ ...fontBody, color: C.ink, background, borderColor: border, outlineColor: C.gold, fontSize: `${Math.round(16 * fontScale)}px` }}>
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ ...fontMono, color: selected || correct || wrong ? C.cover : C.inkSoft, background: C.paper }}>{String.fromCharCode(65 + optionIndex)}</span>
                {question.pdfSourceImageOnly ? null : <span className="min-w-0 flex-1 pt-0.5">{question.optionsAreMath ? <Suspense fallback={<span>{option}</span>}><MathInput value={option} readOnly compact scale={fontScale} /></Suspense> : option}</span>}
                {correct && <Check size={18} className="mt-1 shrink-0" style={{ color: C.accent }} />}{wrong && <X size={18} className="mt-1 shrink-0" style={{ color: C.red }} />}
              </button>;
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col overflow-hidden" style={{ background: C.paper, color: C.ink, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <style>{`
@keyframes quiz-reel-enter{from{opacity:.55;transform:translate3d(0,14px,0) scale(.99)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
@keyframes quiz-feedback-enter{from{opacity:0;transform:translate3d(0,-3px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes quiz-result-pop{0%{transform:scale(1)}45%{transform:scale(1.018)}100%{transform:scale(1)}}
@keyframes quiz-result-glow{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(52,160,104,0)}45%{transform:scale(1.015);box-shadow:0 0 0 3px rgba(52,160,104,.22)}100%{transform:scale(1);box-shadow:0 0 0 0 rgba(52,160,104,0)}}
@keyframes quiz-result-slide{0%{transform:translate3d(7px,0,0);opacity:.82}65%{transform:translate3d(-2px,0,0)}100%{transform:translate3d(0,0,0);opacity:1}}
@keyframes quiz-result-shake{0%,100%{transform:translate3d(0,0,0)}25%{transform:translate3d(-3px,0,0)}50%{transform:translate3d(3px,0,0)}75%{transform:translate3d(-1px,0,0)}}
@keyframes quiz-result-nudge{0%,100%{transform:translate3d(0,0,0)}45%{transform:translate3d(0,-2px,0)}75%{transform:translate3d(0,1px,0)}}
@keyframes quiz-result-flash{0%,100%{background-color:inherit}35%{background-color:rgba(205,66,55,.1)}}
@keyframes quiz-celebrate-burst{0%{opacity:0;transform:translate(-50%,-50%) scale(.5) rotate(0)}18%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.82) rotate(var(--turn))}}
@keyframes quiz-transition-shard{0%{opacity:0;transform:translate(-50%,-50%) scale(.75) rotate(0)}14%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.35) rotate(var(--turn))}}
@keyframes quiz-exit-shatter{to{opacity:0;transform:translate3d(0,-10px,0) scale(.96) rotate(-.6deg)}}
@keyframes quiz-exit-dissolve{to{opacity:0;transform:translate3d(0,7px,0) scale(.97)}}
@keyframes quiz-exit-fly{to{opacity:0;transform:translate3d(0,-72vh,0) rotate(-4deg) scale(.9)}}
@keyframes quiz-exit-fade{to{opacity:0;transform:translate3d(0,-8px,0) scale(.97)}}
@keyframes quiz-exit-slide{to{opacity:0;transform:translate3d(-110vw,0,0) rotate(-2deg) scale(.94)}}
.quiz-reel-enter{animation:quiz-reel-enter 220ms cubic-bezier(.2,.7,.2,1)}
.quiz-feedback-enter{animation:quiz-feedback-enter 160ms ease-out}
.quiz-result-pop{animation:quiz-result-pop 300ms cubic-bezier(.2,.7,.2,1)}
.quiz-result-glow{animation:quiz-result-glow 440ms ease-out}
.quiz-result-slide{animation:quiz-result-slide 280ms cubic-bezier(.2,.7,.2,1)}
.quiz-result-shake{animation:quiz-result-shake 260ms ease-in-out}
.quiz-result-nudge{animation:quiz-result-nudge 240ms ease-out}
.quiz-result-flash{animation:quiz-result-flash 360ms ease-out}
.quiz-result-slide{border-left:3px solid #37875b}
.quiz-celebration-particle{position:absolute;left:50%;top:44%;opacity:0;animation:quiz-celebrate-burst var(--duration) cubic-bezier(.16,.72,.25,1) var(--delay) forwards}
.quiz-transition-fragment{position:absolute;left:50%;top:50%;opacity:0;animation:quiz-transition-shard 420ms cubic-bezier(.16,.72,.25,1) var(--delay) forwards}
.quiz-exit-shatter{animation:quiz-exit-shatter 420ms ease-in forwards;pointer-events:none}
.quiz-exit-dissolve{animation:quiz-exit-dissolve 420ms ease-in forwards;pointer-events:none}
.quiz-exit-fly{animation:quiz-exit-fly 420ms cubic-bezier(.4,0,.8,.4) forwards;pointer-events:none}
.quiz-exit-fade{animation:quiz-exit-fade 360ms ease-in forwards;pointer-events:none}
.quiz-exit-slide{animation:quiz-exit-slide 420ms ease-in forwards;pointer-events:none}
.quiz-control-panel{transition:transform 320ms cubic-bezier(.2,.7,.2,1),opacity 220ms ease}
.quiz-control-panel[data-hidden="true"]{transform:translateY(-110%);opacity:0;pointer-events:none}
@media(prefers-reduced-motion:reduce){.quiz-reel-enter,.quiz-feedback-enter,.quiz-result-pop,.quiz-result-glow,.quiz-result-slide,.quiz-result-shake,.quiz-result-nudge,.quiz-result-flash,.quiz-celebration-particle,.quiz-transition-fragment,.quiz-exit-shatter,.quiz-exit-dissolve,.quiz-exit-fly,.quiz-exit-fade,.quiz-exit-slide,.quiz-control-panel{animation:none;transition:none;will-change:auto}}
`}</style>
      {celebrationParticles && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">{celebrationParticles.map((particle) => <span key={particle.id} className="quiz-celebration-particle" style={{ '--dx': particle.x, '--dy': particle.y, '--turn': particle.rotate, '--delay': particle.delay, '--duration': particle.duration, fontSize: particle.size, filter: 'none' }}>{particle.symbol}</span>)}</div>}
      <div className="quiz-control-panel absolute inset-x-0 top-0 z-30 border-b px-5 pb-2 pt-2 sm:px-6" data-hidden={!controlsVisible} aria-hidden={!controlsVisible} style={{ background: C.paper, borderColor: C.rule, paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={requestLeave} aria-label="Testdan chiqish amallari" title="Ortga" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{test.title}</div><div className="flex items-center gap-1 text-xs" style={{ ...fontMono, color: C.inkSoft }}><Clock3 size={12} />{formatDuration(seconds)}</div></div>
          <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); clearTimeout(autoExitTimerRef.current); autoAdvanceQuestionRef.current = null; setTransitioningQuestion(null); setAutoAdvanceNotice(''); setQuestionMapOpen(true); }} aria-label="Savollar ro‘yxati" title="Savollar ro‘yxati" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.cover, background: C.successTint, border: `1px solid ${C.rule}` }}><ListChecks size={18} /></button>
          <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); clearTimeout(autoExitTimerRef.current); autoAdvanceQuestionRef.current = null; setTransitioningQuestion(null); setAutoAdvanceNotice(''); setPlayerSettingsOpen(true); }} aria-label="Test sozlamalari" title="Test sozlamalari" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><Settings size={18} /></button>
          <button type="button" onClick={() => submit(answersRef.current)} aria-label="Testni yakunlash" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}><CheckCircle2 size={16} /><span className="hidden sm:inline">Yakunlash</span></button>
          <button type="button" onClick={() => setControlsVisible(false)} aria-label="Yuqori boshqaruvni yashirish" title="Boshqaruvni yig‘ish" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><PanelTopClose size={18} /></button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}><span>Savol {Math.min(currentQuestionIndex + 1, Math.max(questions.length, 1))} / {questions.length}</span><span>{answeredCount} / {totalCount} javob</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: C.rule }} role="progressbar" aria-label="Test bajarilishi" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={answeredCount}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${totalCount ? Math.min(100, answeredCount / totalCount * 100) : 0}%`, background: C.accent }} /></div>
        {showAdaptiveFeedback && controlsVisible && <div key={`${currentQuestionIndex}-${autoAdvanceNotice}`} role="status" aria-live="polite" className="quiz-feedback-enter mt-2 flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs" style={{ ...fontBody, color: C.ink, background: answerNoticeTone === 'correct' ? C.successTint : C.dangerTint, border: `1px solid ${answerNoticeTone === 'correct' ? C.accent : C.red}` }}>
          {answerNoticeTone === 'correct' ? <CheckCircle2 size={14} className="shrink-0" style={{ color: C.accent }} /> : <X size={14} className="shrink-0" style={{ color: C.red }} />}
          <span className="min-w-0 flex-1">{autoAdvanceNotice}</span>
          {playerPrefs.autoScroll && <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); clearTimeout(autoExitTimerRef.current); autoAdvanceQuestionRef.current = null; setTransitioningQuestion(null); setAutoAdvanceNotice(''); }} className="shrink-0 rounded-md px-2 py-1 font-semibold" style={{ color: C.cover, background: C.goldSoft }}>Bekor</button>}
        </div>}
      </div>

      {questions.length ? viewMode === 'reels' ? (
        <div ref={reelsStageRef} className="relative min-h-0 w-full flex-1 overflow-hidden" style={{ background: C.paper, touchAction: 'pan-y' }} onTouchStart={handleReelsTouchStart} onTouchEnd={handleReelsTouchEnd} onWheel={handleReelsWheel} onClickCapture={(event) => { if (justSwipedRef.current) { event.preventDefault(); event.stopPropagation(); justSwipedRef.current = false; } }} aria-label="Reels uslubidagi savollar">
          {renderQuestionCard(currentQuestion, currentQuestionIndex, true)}
        </div>
      ) : (
        <div ref={listContainerRef} onScroll={handleListScroll} className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6" style={{ paddingTop: controlsVisible ? `calc(env(safe-area-inset-top) + ${showAdaptiveFeedback ? 162 : 124}px)` : 'calc(env(safe-area-inset-top) + 58px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }} aria-label="Savollar ro‘yxati">
          {questions.slice(0, visibleListCount).map((question, index) => renderQuestionCard(question, index))}
          {visibleListCount < questions.length && <div className="py-4 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Pastga suring — keyingi savollar yuklanadi…</div>}
        </div>
      ) : <div className="my-8 rounded-2xl border p-5 text-center" style={{ ...fontBody, color: C.inkSoft, background: C.surface, borderColor: C.rule }}>Bu testda ishlash uchun savollar topilmadi.</div>}

      {!controlsVisible && <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-4 pb-2 pt-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7px)', background: `linear-gradient(180deg, ${C.paper} 72%, transparent)` }}>
        <div className="min-w-0 flex-1 text-xs" style={{ ...fontBody, color: C.ink }}><span className="font-semibold">{Math.min(currentQuestionIndex + 1, Math.max(questions.length, 1))}/{questions.length}</span><span className="mx-2" style={{ color: C.inkSoft }}>·</span><span style={{ color: C.inkSoft }}>{answeredCount}/{totalCount} javob</span><span className="mx-2" style={{ color: C.inkSoft }}>·</span><span className="inline-flex items-center gap-1" style={{ ...fontMono, color: C.inkSoft }}><Clock3 size={12} />{formatDuration(seconds)}</span></div>
        <button type="button" onClick={() => setControlsVisible(true)} aria-label="Yuqori boshqaruvni ko‘rsatish" title="Boshqaruvni ko‘rsatish" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-md backdrop-blur" style={{ color: C.ink, background: C.surface, borderColor: C.rule }}><PanelTopOpen size={18} /></button>
      </div>}

      {questionMapOpen && <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuestionMapOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="question-map-title" className="w-full max-w-xl rounded-t-2xl p-4 shadow-2xl sm:rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 id="question-map-title" className="text-lg font-semibold" style={{ ...fontDisplay, color: C.ink }}>Savollar</h3><p className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>{answeredCount}/{totalCount} javob belgilangan</p></div>
            <button type="button" onClick={() => setQuestionMapOpen(false)} aria-label="Yopish" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: C.ink, background: C.surface }}><X size={18} /></button>
          </div>
          <div className="grid max-h-[55dvh] grid-cols-6 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-8">
            {questions.map((question, index) => {
              const units = countAnsweredUnits([question], answers);
              const unitTotal = getQuestionCount([question]);
              const complete = units >= unitTotal;
              const partial = units > 0 && !complete;
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
            <div className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}><div className="flex items-center gap-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}><Type size={17} />Matn kattaligi</div><div className="flex items-center gap-1"><button type="button" onClick={() => setQuizFontScale(fontScale - 0.1)} aria-label="Matnni kichraytirish" className="h-9 w-9 rounded-lg border text-lg" style={{ color: C.ink, borderColor: C.rule }}>−</button><span className="min-w-12 text-center text-xs" style={{ ...fontMono, color: C.ink }}>{Math.round(fontScale * 100)}%</span><button type="button" onClick={() => setQuizFontScale(fontScale + 0.1)} aria-label="Matnni kattalashtirish" className="h-9 w-9 rounded-lg border text-lg" style={{ color: C.ink, borderColor: C.rule }}>+</button></div></div>
            <button type="button" role="switch" aria-checked={!!playerPrefs.immediate} onClick={() => updatePlayerPrefs({ immediate: !playerPrefs.immediate })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobni darhol ko‘rsatish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Xatoni shu savolning o‘zida ko‘rib tahlil qilasiz.</span></span><span className="h-6 w-11 rounded-full p-1" style={{ background: playerPrefs.immediate ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.immediate ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            <button type="button" role="switch" aria-checked={!!playerPrefs.autoScroll} onClick={() => updatePlayerPrefs({ autoScroll: !playerPrefs.autoScroll })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin avtomatik o‘tish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Javobni ko‘rishga vaqt beradi; xato bo‘lsa ham o‘tadi.</span></span><span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: playerPrefs.autoScroll ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.autoScroll ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            <button type="button" role="switch" aria-checked={!!playerPrefs.adaptiveFeedback} onClick={() => updatePlayerPrefs({ adaptiveFeedback: !playerPrefs.adaptiveFeedback })} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobga mos qisqa fikrlar</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Xato va to‘g‘ri javobga qarab izoh. Odatiy holatda o‘chiq.</span></span><span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: playerPrefs.adaptiveFeedback ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: playerPrefs.adaptiveFeedback ? 'translateX(20px)' : 'translateX(0)' }} /></span></button>
            {playerPrefs.autoScroll && <section className="rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }} aria-label="Avtomatik o‘tish vaqti"><div className="mb-2 text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Keyingisiga o‘tish vaqti</div><div className="grid grid-cols-2 gap-2">{[['To‘g‘ri javob', 'autoAdvanceCorrectSeconds', 1.5], ['Xato javob', 'autoAdvanceWrongSeconds', 2]].map(([label, key, fallback]) => <label key={key} className="min-w-0 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{label}<select value={normalizedDelay(playerPrefs[key], fallback)} onChange={(event) => updatePlayerPrefs({ [key]: Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" style={{ ...fontMono, color: C.ink, background: C.paper, borderColor: C.rule }} aria-label={`${label}dan keyin kutish`}>{AUTO_ADVANCE_DELAYS.map((delay) => <option key={delay} value={delay}>{delay} soniya</option>)}</select></label>)}</div></section>}
            <QuizAnimationSettings open={playerAnimationsOpen} onToggle={() => setPlayerAnimationsOpen((open) => !open)} prefs={playerPrefs} onChange={updatePlayerPrefs} />
          </div>
          <button type="button" onClick={() => { setPlayerSettingsOpen(false); setReconfigureDialog(true); }} className="mt-4 w-full rounded-xl border px-3 py-3 text-sm font-semibold" style={{ ...fontBody, color: C.ink, background: C.paperSoft, borderColor: C.rule }}>Savollar soni va tartibini o‘zgartirish…</button>
        </section>
      </div>}

      {reconfigureDialog && <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReconfigureDialog(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="reconfigure-title" className="w-full max-w-md rounded-2xl p-4 shadow-2xl" style={{ background: C.paper, border: `1px solid ${C.rule}` }}><h3 id="reconfigure-title" className="text-lg font-semibold" style={{ ...fontDisplay, color: C.ink }}>Testni qayta sozlaysizmi?</h3><p className="mt-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Savollar soni yoki aralashish tartibini o‘zgartirish uchun test qayta boshlanadi. Hozirgi javoblaringiz tozalanadi.</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setReconfigureDialog(false)} className="min-h-11 rounded-xl border text-sm font-semibold" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule }}>Davom etish</button><button type="button" onClick={() => { setReconfigureDialog(false); onReconfigure?.(playerPrefs); }} className="min-h-11 rounded-xl text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>Qayta sozlash</button></div></section>
      </div>}

      {(leaveDialog || finishDialog) && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setLeaveDialog(false); setFinishDialog(false); setGuestPausePrompt(false); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="quiz-exit-title" className="w-full max-w-md rounded-2xl p-4 shadow-2xl sm:p-5" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="quiz-exit-title" className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>{finishDialog ? 'Testni yakunlaysizmi?' : 'Testni to‘xtatish'}</h3>
                <p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>{finishDialog ? `${countAnsweredUnits(questions, answersRef.current)}/${totalCount} ta javob belgilangan. Qolgan savollar javobsiz hisoblanadi.` : 'Javoblaringizni saqlab davom ettirishingiz yoki testdan chiqishingiz mumkin.'}</p>
              </div>
              <button type="button" onClick={() => { setLeaveDialog(false); setFinishDialog(false); setGuestPausePrompt(false); }} aria-label="Yopish" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: C.surface, color: C.inkSoft }}><X size={18} /></button>
            </div>
            {finishDialog ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFinishDialog(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule }}><ArrowLeft size={16} /> Davom etish</button>
                <button type="button" onClick={() => finishTest(answersRef.current)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}><CheckCircle2 size={17} /> Yakunlash</button>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  
                  <button type="button" onClick={() => { setLeaveDialog(false); exitTest(); }} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold" style={{ ...fontBody, color: C.red, background: C.surface, borderColor: C.rule }}><LogOut size={18} />Chiqish</button>
                  <button type="button" disabled={pauseBusy} onClick={pauseAndExit} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold disabled:opacity-60" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule }}><Save size={18} style={{ color: C.accent }} />{pauseBusy ? 'Saqlanmoqda…' : 'Tanaffus'}</button>
                  <button type="button" onClick={() => submit(answersRef.current)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold" style={{ ...fontBody, color: C.ink, background: C.goldSoft, borderColor: C.goldSoft }}><CheckCircle2 size={18} />Yakunlash</button>
                </div>
                {guestPausePrompt && <div className="mt-3 rounded-xl p-3 text-sm" style={{ ...fontBody, color: C.ink, background: C.goldSoft }}><div className="flex items-start gap-2"><LogIn size={17} className="mt-0.5 shrink-0" />Testni tanaffusga saqlash uchun hisobga kiring. Hisob bilan javoblaringiz keyin ham saqlanadi.</div><button type="button" onClick={() => onRequireAccount?.(createPauseSnapshot())} className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ color: C.white, background: C.cover }}>Hisobga kirish</button></div>}
                {leaveError && <p role="alert" className="mt-3 text-sm" style={{ ...fontBody, color: C.red }}>{leaveError}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function QuizView({ test, onExit, onNextTest, nextTest, effectivePrefs, forceSetup, onSavePrefs, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, session, initialProgress, onPauseAttempt, onClearPaused, onRequireAccount }) {
  const prefs = effectivePrefs || DEFAULT_TEST_PREFS;
  const [resumeProgress, setResumeProgress] = useState(initialProgress || null);
  const [config, setConfig] = useState(() => {
    const restoredQuestions = initialProgress?.questionIds?.map((id) => test.questions.find((question) => question.id === id)).filter(Boolean);
    if (restoredQuestions?.length) return { ...(initialProgress.prefs || prefs), questions: restoredQuestions };
    return forceSetup ? null : { ...prefs, questions: computeQuizQuestions(test, prefs) };
  });
  const [lastConfig, setLastConfig] = useState(prefs);
  const [attemptKey, setAttemptKey] = useState(0);

  function handleStart(cfg) {
    const { questions, ...rest } = cfg;
    setResumeProgress(null);
    setLastConfig(rest);
    setConfig(cfg);
    if (onSavePrefs) onSavePrefs(rest);
  }

  function savePlayerPrefs(nextPrefs) {
    setLastConfig(nextPrefs);
    setConfig((current) => current ? { ...current, ...nextPrefs } : current);
    return onSavePrefs?.(nextPrefs);
  }

  function handleReconfigure(nextPrefs) {
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

export function TestsView({ tests, testsLoading, testsLoadError, onRetryTests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, profile, saveTestPrefs, initialOpenId, openRequest, onOpenRequestHandled, initialCategoryId, initialLiveCode, initialLiveSession, initialBattleToken, ensureTestContent, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, onPauseAttempt, onClearPaused, onRequireAccount, onExitInitialLive, onExitInitialTest, onShareToFollowers }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeResumeState, setActiveResumeState] = useState(null);
  const [openingInitialTest, setOpeningInitialTest] = useState(Boolean(initialOpenId || openRequest));
  const handledOpenRequestRef = useRef(null);
  const [setupMode, setSetupMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(Boolean(initialLiveCode || initialLiveSession));
  const [teamBattleOpen, setTeamBattleOpen] = useState(Boolean(initialBattleToken));
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
  const goTest = (id, forceSetup, resumeState = null, onLeave = null) => { if (ensureTestContent) ensureTestContent(id); setActiveId(id); setActiveResumeState(resumeState); setSetupMode(!!forceSetup); pushNav(() => { setActiveId(null); setActiveResumeState(null); setSetupMode(false); onLeave?.(); }); };
  const goEdit = (id) => { if (ensureTestContent) ensureTestContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const goLive = () => { setLiveOpen(true); pushNav(() => setLiveOpen(false)); };
  const goTeamBattle = () => { setTeamBattleOpen(true); pushNav(() => setTeamBattleOpen(false)); };
  const goTxtImport = () => onGoToCommunity('testlar', '', 'txt');
  const goMathTest = () => onGoToCommunity('testlar', '', 'math');
  const goMatchingTest = () => onGoToCommunity('testlar', '', 'matching');

  const myId = session?.user?.id;
  const approved = tests.filter((t) => t.status === 'approved');
  const viewable = isAdmin ? tests : tests.filter((t) => t.status === 'approved' || t.authorId === myId);
  const categoryCategories = categories.filter((category) =>
    (isAdmin || category.status === 'approved' || category.authorId === myId || approved.some((test) => test.categoryId === category.id))
    && viewable.some((test) => test.categoryId === category.id)
  );
  /* To'liq tests ro'yxatidan qidiramiz (faqat viewable'dan emas) — shu
     tufayli ulashilgan havola orqali kirilgan tekshirilmoqda/xususiy
     test ham (uning muallifi yoki admin bo'lmasa ham) ochiladi:
     ensureTestContent uni ID bo'yicha to'g'ridan-to'g'ri yuklab, tests
     ro'yxatiga qo'shib qo'yadi. */
  const active = tests.find((t) => t.id === activeId);
  const activeCategoryTests = active ? approved.filter((test) => test.categoryId === active.categoryId) : [];
  const activeCategoryIndex = activeCategoryTests.findIndex((test) => test.id === activeId);
  const nextTest = activeCategoryIndex >= 0 ? activeCategoryTests[activeCategoryIndex + 1] || null : null;
  const editing = approved.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = viewable.filter((t) => t.categoryId === categoryId);
  const privateInCategory = inCategory.filter((test) => test.status !== 'approved' && test.authorId === myId);
  const q = query.trim().toLowerCase();
  const effectivePrefs = { ...DEFAULT_TEST_PREFS, ...(profile?.testPrefs || {}) };
  const onSavePrefs = session ? saveTestPrefs : undefined;

  /* Ulashilgan havola orqali kirilgan bo'lsa (?test=ID), shu testni
     avtomatik ochamiz — faqat ilk yuklanganda, bitta marta. Statusidan
     qat'i nazar ochishga urinib ko'ramiz (ensureTestContent ID bo'yicha
     to'g'ridan-to'g'ri so'raydi). Havola bo'lmasa, oxirgi saqlangan
     pozitsiyani tiklaymiz — masalan internet uzilib sahifa yangilanib
     ketgan bo'lsa, foydalanuvchi Bosh sahifaga emas, aynan shu test
     turgan joyga qaytadi (test qaytadan, boshidan boshlanadi — allaqachon
     bergan javoblar saqlanmaydi, lekin hech bo'lmasa qaysi testda
     ekanini qayta izlashga hojat qolmaydi). */
  useEffect(() => {
    if (initialOpenId) {
      goTest(initialOpenId, false, null, onExitInitialTest);
      setOpeningInitialTest(false);
    }
    else if (initialCategoryId) goCategory(initialCategoryId);
    if (initialLiveCode) pushNav(exitInitialLiveRoute);
    else if (initialLiveSession) { setLiveSession(initialLiveSession); setLiveOpen(true); pushNav(() => setLiveOpen(false)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigatsiya testlar sahifasini lazy-load qilayotgan paytda kelishi mumkin.
  // So‘rovni mount bilan bog‘lamaymiz: komponent tayyor bo‘lgach aniq testni ochadi.
  useEffect(() => {
    if (!openRequest || handledOpenRequestRef.current === openRequest.requestId) return;
    handledOpenRequestRef.current = openRequest.requestId;
    goTest(openRequest.id, false, openRequest.resumeState || null);
    setOpeningInitialTest(false);
    onOpenRequestHandled?.(openRequest.requestId);
    // goTest/nav callback render oralig‘ida yangilanadi; requestId bir marta bajarilishini ta’minlaydi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest, onOpenRequestHandled]);

  /* Joriy holatni (qaysi test yoki soha ochiq, jonli xonadamizmi)
     sessionStorage'ga yozib boramiz. Agar bu test keyinchalik
     o'chirilgan bo'lsa, "active" topilmay qoladi va sahifa oddiy
     ro'yxatga qaytadi — xatolik chiqmaydi. */
  useEffect(() => {
    writePosition({ testlar: { openId: activeId, categoryId, live: liveSession } });
  }, [activeId, categoryId, liveOpen, liveSession]);


  const matchedCategories = q ? categoryCategories.filter((cat) => cat.name.toLowerCase().includes(q)) : [];
  const matchedTests = q ? viewable.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedTests.length === 0;

  useEffect(() => {
    if (onReadingChange) onReadingChange(!!active || (Boolean(initialOpenId) && (openingInitialTest || Boolean(activeId))) || (Boolean(initialLiveCode) && liveOpen));
    return () => { if (onReadingChange) onReadingChange(false); };
  }, [active, activeId, initialOpenId, initialLiveCode, liveOpen, onReadingChange, openingInitialTest]);

  if (active) {
    if (active.questions === undefined) {
      return <SectionLoading label="Test yuklanmoqda…" compact />;
    }
    const openNextTest = nextTest ? () => { if (ensureTestContent) ensureTestContent(nextTest.id); onClearPaused?.(active.id); setActiveId(nextTest.id); setActiveResumeState(null); setSetupMode(false); } : undefined;
    return <QuizView key={active.id} test={active} initialProgress={activeResumeState} onPauseAttempt={onPauseAttempt} onClearPaused={onClearPaused} onRequireAccount={onRequireAccount} onExit={back} onNextTest={openNextTest} nextTest={nextTest} effectivePrefs={effectivePrefs} forceSetup={setupMode} onSavePrefs={onSavePrefs} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} />;
  }

  // Mavzudan testga o'tishda ro'yxatni ko'rsatib yubormaymiz: tanlangan
  // test metadata/savollari kelguncha foydalanuvchi bevosita ochilish holatini ko'radi.
  if (openingInitialTest || activeId) {
    return (
      <div className="flex flex-col items-start gap-3 py-6" aria-live="polite">
        <button onClick={back} className="inline-flex items-center gap-1 text-[15px]" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Ortga</button>
        {testsLoadError ? (
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
        <div className="flex items-start justify-between gap-3 mb-1">
          <SectionHeading eyebrow={`${categoryCategories.length} ta soha`} title="Testlar" />
          <PinnedAddButton icon={ListChecks} label="Test yaratish" onClick={() => onGoToCommunity('testlar')} />
        </div>
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
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button
            onClick={goTxtImport}
            className="flex items-center justify-center gap-1 min-w-0 min-h-11 px-2 py-2 rounded-xl text-[12px] leading-tight text-center focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.ink, background: 'transparent', border: `1px solid ${C.rule}`, outlineColor: C.gold }}
          >
            <FileText size={13} /> TXT fayldan
          </button>
          <button
            onClick={goMatchingTest}
            className="flex items-center justify-center gap-1.5 min-w-0 min-h-11 px-2 py-2 rounded-xl text-[12px] leading-tight text-center focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.math, background: C.mathTint, border: `1px solid ${C.mathSoft}`, outlineColor: C.mathSoft, fontWeight: 600 }}
          >
            <ListChecks size={14} /> Moslik testi
          </button>
          <button
            onClick={goTeamBattle}
            className="flex items-center justify-center gap-1.5 min-w-0 min-h-11 px-2 py-2 rounded-xl text-[12px] leading-tight text-center focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.cover, background: C.goldSoft, border: `1px solid ${C.coverLine}`, outlineColor: C.gold, fontWeight: 600 }}
          >
            <Users size={14} /> Jamoaviy jang
          </button>
          <button
            onClick={goMathTest}
            className="flex items-center justify-center gap-1 min-w-0 min-h-11 px-2 py-2 rounded-xl text-[12px] leading-tight text-center focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.white, background: C.math, outlineColor: C.mathSoft, fontWeight: 500 }}
          >
            <Calculator size={13} /> Matematik test
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
                      const count = viewable.filter((t) => t.categoryId === cat.id).length;
                      return (
                        <div
                          key={cat.id}
                          className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                          style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                          onClick={() => goCategory(cat.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                            <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta test</div>
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
                      <div key={t.id} className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide mb-0.5 truncate" style={{ ...fontMono, color: C.gold }}>
                            {categories.find((cat) => cat.id === t.categoryId)?.name || ''}
                          </div>
                          <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                          <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{t.questionCount ?? t.questions?.length ?? 0} ta savol</div>
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
          <CategoryGrid
            categories={categoryCategories}
            itemsByCategory={viewable.reduce((acc, t) => { acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
            approvedCountsByCategory={approved.reduce((acc, t) => { acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
            privateCountsByCategory={viewable.reduce((acc, t) => { if (t.status !== 'approved' && t.authorId === myId) acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
            onSharePrivateCategory={(cat) => onShareToFollowers?.('bundle', { title: `${cat.name} — maxfiy va kutilayotgan testlar`, resources: viewable.filter((test) => test.categoryId === cat.id && test.status !== 'approved' && test.authorId === myId).map((test) => ({ type: 'test', id: test.id, title: test.title })) })}
            itemLabel="test"
            onSelect={goCategory}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
            onGoToCommunity={() => onGoToCommunity('testlar')}
            isAdmin={isAdmin}
            userId={session?.user?.id}
            shareParam="testCategory"
          />
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
      {privateInCategory.length > 0 && onShareToFollowers && <button type="button" onClick={() => onShareToFollowers('bundle', { title: `${activeCategory?.name || 'Soha'} — maxfiy va kutilayotgan testlar`, resources: privateInCategory.map((test) => ({ type: 'test', id: test.id, title: test.title })) })} className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium" style={{ ...fontBody, color: C.cover, background: C.goldSoft, borderColor: C.coverLine }}><Users size={14} /> Maxfiy testlarni do‘stlarga yuborish · {privateInCategory.length}</button>}
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
                  {t.status === 'private' && <div className="mt-1 inline-flex items-center gap-1 text-[10px]" style={{ ...fontMono, color: C.inkSoft }}><Lock size={11} /> Maxfiy</div>}
                  {t.status === 'pending' && <div className="mt-1 inline-flex items-center gap-1 text-[10px]" style={{ ...fontMono, color: C.gold }}><Clock3 size={11} /> Tasdiq kutilmoqda</div>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <ItemMenu actions={[
                  { label: 'Sozlamalar', icon: Settings, onClick: () => goTest(t.id, true) },
                  { label: 'Havolani ulashish', icon: Share2, onClick: () => shareItem(buildShareUrl({ test: t.id }), t.title) },
                  ...(t.authorId === myId && onShareToFollowers ? [{ label: 'Kuzatuvchilarga yuborish', icon: Users, onClick: () => onShareToFollowers('test', t) }] : []),
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
