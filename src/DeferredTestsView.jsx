import { useState, useEffect, useContext, useRef, Suspense, lazy } from 'react';
import { ArrowLeft, Award, Calculator, Check, CheckCircle2, ChevronRight, Clock3, FileText, ListChecks, LogIn, LogOut, Moon, PanelTopClose, PanelTopOpen, Pause, Pencil, RotateCcw, Save, Settings, Share2, Sun, Trash2, Type, Users, X } from 'lucide-react';
import { AuthorLine, C, CategoryGrid, DEFAULT_TEST_PREFS, EmptyState, EntryNumber, GhostButton, ItemMenu, LiveQuizHub, MatchingTestQuestion, MiniLearningBadge, NavContext, ThemeContext, PinnedAddButton, SearchBox, SectionHeading, SectionLoading, SettingChip, SolidButton, TeamBattleHub, buildShareUrl, computeQuizQuestions, fontBody, fontDisplay, fontMono, formatDuration, getQuestionCount, getQuestionScore, isQuestionCorrect, shareItem, writePosition } from './App.jsx';
const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));

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
export function QuizSetupPanel({ test, onExit, onStart, initialConfig }) {
  const total = test.questions.length;
  const unitTotal = getQuestionCount(test.questions);
  const itemLabel = test.questions.some((question) => question.type === 'matching') ? `${unitTotal} ta moslik` : `${unitTotal} ta savol`;
  const init = initialConfig || DEFAULT_TEST_PREFS;
  const [immediate, setImmediate] = useState(!!init.immediate);
  const [autoScroll, setAutoScroll] = useState(!!init.autoScroll);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState([4, 6, 8, 10, 12].includes(Number(init.autoAdvanceSeconds)) ? Number(init.autoAdvanceSeconds) : 6);
  const [viewMode, setViewMode] = useState(init.viewMode === 'list' ? 'list' : 'reels');
  const [shuffle, setShuffle] = useState(!!init.shuffle);
  const [mode, setMode] = useState(init.mode || 'all'); // all | random | first | split
  const [count, setCount] = useState(Math.min(init.count || 5, total));
  const [partsTotal, setPartsTotal] = useState(init.partsTotal || 2);
  const [partIndex, setPartIndex] = useState(init.partIndex || 1);

  function start() {
    const cfg = { immediate, autoScroll, autoAdvanceSeconds, viewMode, shuffle, mode, count, partsTotal, partIndex };
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
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin natijani ko‘rsatish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>To‘g‘ri javob va xatoni shu zahoti ko‘rasiz.</span></span>
          <span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: immediate ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: immediate ? 'translateX(20px)' : 'translateX(0)' }} /></span>
        </button>
        <button type="button" role="switch" aria-checked={autoScroll} onClick={() => setAutoScroll((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left" style={{ background: C.surface, borderColor: C.rule }}>
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Javobdan keyin keyingisiga o‘tish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Reels’da keyingi savolga suradi, ro‘yxatda pastga olib boradi.</span></span>
          <span className="h-6 w-11 shrink-0 rounded-full p-1" style={{ background: autoScroll ? C.accent : C.rule }}><i className="block h-4 w-4 rounded-full transition-transform" style={{ background: C.white, transform: autoScroll ? 'translateX(20px)' : 'translateX(0)' }} /></span>
        </button>
        {autoScroll && <label className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}>
          <span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>O‘tishdan oldin kutish</span><span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Javobni bemalol o‘qib chiqing.</span></span>
          <select value={autoAdvanceSeconds} onChange={(event) => setAutoAdvanceSeconds(Number(event.target.value))} className="rounded-lg border px-2.5 py-2 text-sm" style={{ ...fontMono, color: C.ink, background: C.paper, borderColor: C.rule }} aria-label="Avtomatik o‘tish kechikishi">
            {[4, 6, 8, 10, 12].map((seconds) => <option key={seconds} value={seconds}>{seconds} soniya</option>)}
          </select>
        </label>}
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
                type="number"
                min={2}
                max={total}
                value={partsTotal}
                onChange={(e) => { setPartsTotal(Math.max(2, Math.min(total, Number(e.target.value) || 2))); setPartIndex(1); }}
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
  const [playerPrefs, setPlayerPrefs] = useState(() => ({ ...config }));
  const viewMode = playerPrefs.viewMode === 'list' ? 'list' : 'reels';
  const [playerSettingsOpen, setPlayerSettingsOpen] = useState(false);
  const [questionMapOpen, setQuestionMapOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [reconfigureDialog, setReconfigureDialog] = useState(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState('');
  const [visibleListCount, setVisibleListCount] = useState(() => Math.min(questions.length, 20));
  const [fontScale, setFontScale] = useState(() => {
    try { return Math.max(0.95, Math.min(1.3, Number(localStorage.getItem('upcourse-quiz-font-scale')) || 1)); } catch { return 1; }
  });
  const [revealed, setRevealed] = useState({});
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const [showBadgeNotice, setShowBadgeNotice] = useState(false);
  const [seconds, setSeconds] = useState(() => Math.max(0, Number(initialProgress?.seconds) || 0));
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [finishDialog, setFinishDialog] = useState(!!initialProgress?.finishOnResume);
  const [guestPausePrompt, setGuestPausePrompt] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const questionRefs = useRef({});
  const resultSummaryRef = useRef(null);
  const autoScrollTimerRef = useRef(null);
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

  useEffect(() => () => { clearTimeout(autoScrollTimerRef.current); clearTimeout(autoFinishTimerRef.current); }, []);

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

  function updatePlayerPrefs(patch) {
    clearTimeout(autoScrollTimerRef.current);
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    const next = { ...playerPrefs, ...patch };
    setPlayerPrefs(next);
    const { questions: _selectedQuestions, ...savedPrefs } = next;
    onSavePrefs?.(savedPrefs);
  }

  function setQuizFontScale(value) {
    const next = Math.max(0.95, Math.min(1.3, value));
    setFontScale(next);
    try { localStorage.setItem('upcourse-quiz-font-scale', String(next)); } catch {}
  }

  function goToQuestion(index) {
    clearTimeout(autoScrollTimerRef.current);
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
    autoAdvanceQuestionRef.current = null;
    setAutoAdvanceNotice('');
    if (!playerPrefs.autoScroll) return;
    if (countAnsweredUnits([question], { [question.id]: answer }) === 0) return;
    const delay = [4, 6, 8, 10, 12].includes(Number(playerPrefs.autoAdvanceSeconds)) ? Number(playerPrefs.autoAdvanceSeconds) : 6;
    const correct = isQuestionCorrect(question, answer);
    autoAdvanceQuestionRef.current = questionIndex;
    setAutoAdvanceNotice(`${playerPrefs.immediate ? (correct ? 'To‘g‘ri' : 'Xato') : 'Javob saqlandi'} · ${delay} soniyadan keyin ${questionIndex < questions.length - 1 ? 'keyingisiga o‘tamiz' : 'test yakunlanadi'}`);
    autoScrollTimerRef.current = setTimeout(() => {
      if (autoAdvanceQuestionRef.current !== questionIndex) return;
      autoAdvanceQuestionRef.current = null;
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
    return { testId: test.id, testTitle: test.title, questionIds: questions.map((question) => question.id), questionIndex: currentQuestionIndex, prefs: { ...prefs, immediate: playerPrefs.immediate, autoScroll: playerPrefs.autoScroll, autoAdvanceSeconds: playerPrefs.autoAdvanceSeconds, viewMode: playerPrefs.viewMode, shuffle: playerPrefs.shuffle }, answers: currentAnswers, seconds, answeredCount: countAnsweredUnits(questions, currentAnswers), totalCount, savedAt: new Date().toISOString(), hiddenOnHome: false };
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

  function select(qid, idx) {
    if (finished) return;
    const next = { ...answersRef.current, [qid]: idx };
    answersRef.current = next;
    setAnswers(next);
    if (playerPrefs.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
    const question = questions.find((item) => item.id === qid);
    if (question) scheduleAutoAdvance(question, questions.findIndex((item) => item.id === qid), idx);
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
    if (question && matchingComplete) scheduleAutoAdvance(question, questions.findIndex((item) => item.id === qid), nextMatching);
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

  function confirmOpenAnswer(qid) {
    if (finished) return;
    if (playerPrefs.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
    const question = questions.find((item) => item.id === qid);
    if (question) scheduleAutoAdvance(question, questions.findIndex((item) => item.id === qid), answersRef.current[qid]);
  }

  function finishTest(latestAnswers = answersRef.current) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimeout(autoFinishTimerRef.current);
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
              const message = `🧠 Men «${test.title}» testidan ${percent}% oldim — ${correctCount}/${totalCount}! ⏱️ ${formatDuration(seconds)}\nBu mavzuni siz qanchalik yaxshi bilasiz? Bilimingizni sinab ko‘ring 👇`;
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
    const showResult = playerPrefs.immediate && !!revealed[question.id];
    return (
      <article
        key={question.id}
        ref={(node) => { if (node) questionRefs.current[index] = node; else delete questionRefs.current[index]; }}
        data-question-index={index}
        aria-labelledby={`quiz-question-title-${index}`}
        className={reel ? 'quiz-reel-enter flex h-full min-h-0 w-full flex-col' : 'w-full border-b py-5 last:border-b-0'}
        style={reel ? undefined : { borderColor: C.rule, scrollMarginTop: '96px' }}
      >
        {reel ? (
          <div ref={reelsQuestionBodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-6 sm:pb-5" style={{ touchAction: 'pan-y', paddingTop: controlsVisible ? 'calc(env(safe-area-inset-top) + 112px)' : 'calc(env(safe-area-inset-top) + 56px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}>
            {test.description && index === 0 && <p className="mb-3 text-sm leading-5" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}
            {renderQuestionContent(question, index, answer, showResult)}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-1 sm:px-3">
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
        <div className="mb-2 flex flex-wrap items-center gap-2">
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
              <Suspense fallback={<div className="py-3 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Javob maydoni…</div>}><MathInput value={answer || ''} onChange={(value) => setOpenAnswer(question.id, value)} onBlur={() => confirmOpenAnswer(question.id)} disabled={showResult} placeholder="Javobingiz" scale={fontScale} /></Suspense>
            ) : (
              <input type="text" value={answer || ''} onChange={(event) => setOpenAnswer(question.id, event.target.value)} onBlur={() => confirmOpenAnswer(question.id)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} disabled={showResult} placeholder="Javobingizni kiriting" className="w-full min-h-12 rounded-xl px-4 py-2.5 outline-none" style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, fontSize: `${Math.round(17 * fontScale)}px` }} />
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
              const background = correct ? C.successTint : wrong ? C.dangerTint : selected ? C.selectedTint : C.surface;
              const border = correct ? C.accent : wrong ? C.red : selected ? C.gold : C.rule;
              return <button key={optionIndex} type="button" onClick={() => select(question.id, optionIndex)} disabled={showResult} aria-pressed={selected} className="flex min-h-12 w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 disabled:cursor-default" style={{ ...fontBody, color: C.ink, background, borderColor: border, outlineColor: C.gold, fontSize: `${Math.round(16 * fontScale)}px` }}>
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
      <style>{`@keyframes quiz-reel-enter{from{opacity:.35;transform:translateY(28px) scale(.992)}to{opacity:1;transform:translateY(0) scale(1)}}.quiz-reel-enter{animation:quiz-reel-enter 320ms cubic-bezier(.2,.7,.2,1)}.quiz-control-panel{transition:transform 320ms cubic-bezier(.2,.7,.2,1),opacity 220ms ease}.quiz-control-panel[data-hidden="true"]{transform:translateY(-110%);opacity:0;pointer-events:none}@media(prefers-reduced-motion:reduce){.quiz-reel-enter,.quiz-control-panel{animation:none;transition:none}}`}</style>
      <div className="quiz-control-panel absolute inset-x-0 top-0 z-30 border-b px-3 pb-2 pt-2 sm:px-5" data-hidden={!controlsVisible} aria-hidden={!controlsVisible} style={{ background: C.paper, borderColor: C.rule, paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={requestLeave} aria-label="Testdan chiqish amallari" title="Ortga" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{test.title}</div><div className="flex items-center gap-1 text-xs" style={{ ...fontMono, color: C.inkSoft }}><Clock3 size={12} />{formatDuration(seconds)}</div></div>
          <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); autoAdvanceQuestionRef.current = null; setAutoAdvanceNotice(''); setQuestionMapOpen(true); }} aria-label="Savollar ro‘yxati" title="Savollar ro‘yxati" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.cover, background: C.successTint, border: `1px solid ${C.rule}` }}><ListChecks size={18} /></button>
          <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); autoAdvanceQuestionRef.current = null; setAutoAdvanceNotice(''); setPlayerSettingsOpen(true); }} aria-label="Test sozlamalari" title="Test sozlamalari" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><Settings size={18} /></button>
          <button type="button" onClick={() => submit(answersRef.current)} aria-label="Testni yakunlash" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}><CheckCircle2 size={16} /><span className="hidden sm:inline">Yakunlash</span></button>
          <button type="button" onClick={() => setControlsVisible(false)} aria-label="Yuqori boshqaruvni yashirish" title="Boshqaruvni yig‘ish" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><PanelTopClose size={18} /></button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}><span>Savol {Math.min(currentQuestionIndex + 1, Math.max(questions.length, 1))} / {questions.length}</span><span>{answeredCount} / {totalCount} javob</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: C.rule }} role="progressbar" aria-label="Test bajarilishi" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={answeredCount}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${totalCount ? Math.min(100, answeredCount / totalCount * 100) : 0}%`, background: C.accent }} /></div>
      </div>

      {questions.length ? viewMode === 'reels' ? (
        <div ref={reelsStageRef} className="relative min-h-0 w-full flex-1 overflow-hidden" style={{ background: C.paper, touchAction: 'pan-y' }} onTouchStart={handleReelsTouchStart} onTouchEnd={handleReelsTouchEnd} onWheel={handleReelsWheel} onClickCapture={(event) => { if (justSwipedRef.current) { event.preventDefault(); event.stopPropagation(); justSwipedRef.current = false; } }} aria-label="Reels uslubidagi savollar">
          {renderQuestionCard(currentQuestion, currentQuestionIndex, true)}
        </div>
      ) : (
        <div ref={listContainerRef} onScroll={handleListScroll} className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6" style={{ paddingTop: controlsVisible ? 'calc(env(safe-area-inset-top) + 124px)' : 'calc(env(safe-area-inset-top) + 58px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }} aria-label="Savollar ro‘yxati">
          {questions.slice(0, visibleListCount).map((question, index) => renderQuestionCard(question, index))}
          {visibleListCount < questions.length && <div className="py-4 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Pastga suring — keyingi savollar yuklanadi…</div>}
        </div>
      ) : <div className="my-8 rounded-2xl border p-5 text-center" style={{ ...fontBody, color: C.inkSoft, background: C.surface, borderColor: C.rule }}>Bu testda ishlash uchun savollar topilmadi.</div>}

      {!controlsVisible && <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-2 pt-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7px)', background: `linear-gradient(180deg, ${C.paper} 72%, transparent)` }}>
        <div className="min-w-0 flex-1 text-xs" style={{ ...fontBody, color: C.ink }}><span className="font-semibold">{Math.min(currentQuestionIndex + 1, Math.max(questions.length, 1))}/{questions.length}</span><span className="mx-2" style={{ color: C.inkSoft }}>·</span><span style={{ color: C.inkSoft }}>{answeredCount}/{totalCount} javob</span><span className="mx-2" style={{ color: C.inkSoft }}>·</span><span className="inline-flex items-center gap-1" style={{ ...fontMono, color: C.inkSoft }}><Clock3 size={12} />{formatDuration(seconds)}</span></div>
        <button type="button" onClick={() => setControlsVisible(true)} aria-label="Yuqori boshqaruvni ko‘rsatish" title="Boshqaruvni ko‘rsatish" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-md backdrop-blur" style={{ color: C.ink, background: C.surface, borderColor: C.rule }}><PanelTopOpen size={18} /></button>
      </div>}

      {autoAdvanceNotice && <div role="status" className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule, marginBottom: 'env(safe-area-inset-bottom)' }}>
        <span>{autoAdvanceNotice}</span>
        <button type="button" onClick={() => { clearTimeout(autoScrollTimerRef.current); autoAdvanceQuestionRef.current = null; setAutoAdvanceNotice(''); }} className="shrink-0 rounded-full px-2 py-1 font-semibold" style={{ color: C.cover, background: C.goldSoft }}>Bekor</button>
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
            {playerPrefs.autoScroll && <label className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ background: C.surface, borderColor: C.rule }}><span><span className="block text-sm font-medium" style={{ ...fontBody, color: C.ink }}>Kutish vaqti</span><span className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>O‘qib ulgurish uchun</span></span><select value={[4, 6, 8, 10, 12].includes(Number(playerPrefs.autoAdvanceSeconds)) ? Number(playerPrefs.autoAdvanceSeconds) : 6} onChange={(event) => updatePlayerPrefs({ autoAdvanceSeconds: Number(event.target.value) })} className="rounded-lg border px-2.5 py-2 text-sm" style={{ ...fontMono, color: C.ink, background: C.paper, borderColor: C.rule }} aria-label="Avtomatik o‘tishdan oldingi vaqt">{[4, 6, 8, 10, 12].map((delay) => <option key={delay} value={delay}>{delay} soniya</option>)}</select></label>}
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
                  <button type="button" disabled={pauseBusy} onClick={pauseAndExit} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold disabled:opacity-60" style={{ ...fontBody, color: C.ink, background: C.surface, borderColor: C.rule }}><Save size={18} style={{ color: C.accent }} />Tanaffus</button>
                  <button type="button" onClick={() => { setLeaveDialog(false); exitTest(); }} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold" style={{ ...fontBody, color: C.red, background: C.surface, borderColor: C.rule }}><LogOut size={18} />Chiqish</button>
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
    onSavePrefs?.(nextPrefs);
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
    return <QuizSetupPanel test={test} onExit={onExit} onStart={handleStart} initialConfig={lastConfig} />;
  }
  return <QuizPlayer key={attemptKey} test={test} config={config} initialProgress={resumeProgress} onExit={onExit} onRestart={() => { onClearPaused?.(test.id); setResumeProgress(null); setConfig(null); }} onRetry={handleRetry} onNextTest={onNextTest} nextTest={nextTest} onSavePrefs={savePlayerPrefs} onReconfigure={handleReconfigure} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} onPauseAttempt={onPauseAttempt} onClearPaused={onClearPaused} onRequireAccount={onRequireAccount} />;
}

export function TestsView({ tests, testsLoading, testsLoadError, onRetryTests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, profile, saveTestPrefs, initialOpenId, openRequest, onOpenRequestHandled, initialCategoryId, initialLiveCode, initialLiveSession, initialBattleToken, ensureTestContent, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, onPauseAttempt, onClearPaused, onRequireAccount }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeResumeState, setActiveResumeState] = useState(null);
  const [openingInitialTest, setOpeningInitialTest] = useState(Boolean(initialOpenId || openRequest));
  const handledOpenRequestRef = useRef(null);
  const [setupMode, setSetupMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(!!initialLiveCode);
  const [teamBattleOpen, setTeamBattleOpen] = useState(Boolean(initialBattleToken));
  /* Jonli xona holati (xona ochgan/qo'shilgan bo'lsa) — LiveQuizHub
     shuni o'zgarganda xabar beradi, biz esa sessionStorage'ga yozamiz,
     shu tufayli refresh qilinganda xonaga qaytib kirish mumkin. */
  const [liveSession, setLiveSession] = useState(null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  /* forceSetup=true bo'lsa (⋮ menyudagi "Sozlamalar"), test ochilishidan
     oldin sozlamalar ekrani ko'rsatiladi; aks holda (oddiy "Boshlash")
     saqlangan/andoza sozlamalar bilan darhol boshlanadi. */
  const goTest = (id, forceSetup, resumeState = null) => { if (ensureTestContent) ensureTestContent(id); setActiveId(id); setActiveResumeState(resumeState); setSetupMode(!!forceSetup); pushNav(() => { setActiveId(null); setActiveResumeState(null); setSetupMode(false); }); };
  const goEdit = (id) => { if (ensureTestContent) ensureTestContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const goLive = () => { setLiveOpen(true); pushNav(() => setLiveOpen(false)); };
  const goTeamBattle = () => { setTeamBattleOpen(true); pushNav(() => setTeamBattleOpen(false)); };
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
  const active = tests.find((t) => t.id === activeId);
  const activeCategoryTests = active ? approved.filter((test) => test.categoryId === active.categoryId) : [];
  const activeCategoryIndex = activeCategoryTests.findIndex((test) => test.id === activeId);
  const nextTest = activeCategoryIndex >= 0 ? activeCategoryTests[activeCategoryIndex + 1] || null : null;
  const editing = approved.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((t) => t.categoryId === categoryId);
  const q = query.trim().toLowerCase();
  const effectivePrefs = profile?.testPrefs || DEFAULT_TEST_PREFS;
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
      goTest(initialOpenId);
      setOpeningInitialTest(false);
    }
    else if (initialCategoryId) goCategory(initialCategoryId);
    if (initialLiveCode) pushNav(() => setLiveOpen(false));
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
    writePosition({ testlar: { openId: activeId, categoryId, live: liveOpen ? liveSession : null } });
  }, [activeId, categoryId, liveOpen, liveSession]);


  const matchedCategories = q ? approvedCategories.filter((cat) => cat.name.toLowerCase().includes(q) && approved.some((t) => t.categoryId === cat.id)) : [];
  const matchedTests = q ? approved.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedTests.length === 0;

  useEffect(() => {
    if (onReadingChange) onReadingChange(!!active);
    return () => { if (onReadingChange) onReadingChange(false); };
  }, [active, onReadingChange]);

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
    <Suspense fallback={<SectionLoading label="Jonli test yuklanmoqda…" />}>
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
          <SectionHeading eyebrow={`${approvedCategories.filter((cat) => approved.some((t) => t.categoryId === cat.id)).length} ta soha`} title="Testlar" />
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
            style={{ ...fontBody, color: C.mathDeep, background: C.mathTint, border: `1px solid ${C.mathSoft}`, outlineColor: C.mathSoft, fontWeight: 600 }}
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
                      const count = approved.filter((t) => t.categoryId === cat.id).length;
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
