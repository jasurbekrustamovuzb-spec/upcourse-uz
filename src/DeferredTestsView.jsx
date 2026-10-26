import { useState, useEffect, useContext, useRef, Suspense } from 'react';
import { ArrowLeft, Award, Calculator, Check, ChevronRight, Clock3, FileText, ListChecks, Pause, Pencil, Play as Play2, RotateCcw, Settings, Share2, Trash2, Users, X } from 'lucide-react';
import { AuthorLine, C, CategoryGrid, DEFAULT_TEST_PREFS, EmptyState, EntryNumber, GhostButton, ItemMenu, LiveQuizHub, MatchingTestQuestion, MiniLearningBadge, NavContext, PinnedAddButton, SearchBox, SectionHeading, SectionLoading, SettingChip, SolidButton, TeamBattleHub, buildShareUrl, computeQuizQuestions, fontBody, fontDisplay, fontMono, formatDuration, getQuestionCount, getQuestionScore, isQuestionCorrect, shareItem, writePosition } from './App.jsx';
export function QuizSetupPanel({ test, onExit, onStart, initialConfig }) {
  const total = test.questions.length;
  const unitTotal = getQuestionCount(test.questions);
  const itemLabel = test.questions.some((question) => question.type === 'matching') ? `${unitTotal} ta moslik` : `${unitTotal} ta savol`;
  const init = initialConfig || DEFAULT_TEST_PREFS;
  const [immediate, setImmediate] = useState(!!init.immediate);
  const [autoScroll, setAutoScroll] = useState(!!init.autoScroll);
  const [shuffle, setShuffle] = useState(!!init.shuffle);
  const [mode, setMode] = useState(init.mode || 'all'); // all | random | first | split
  const [count, setCount] = useState(Math.min(init.count || 5, total));
  const [partsTotal, setPartsTotal] = useState(init.partsTotal || 2);
  const [partIndex, setPartIndex] = useState(init.partIndex || 1);

  function start() {
    const cfg = { immediate, autoScroll, shuffle, mode, count, partsTotal, partIndex };
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

      <div className="flex flex-wrap gap-2 mb-5">
        <SettingChip active={immediate} onClick={() => setImmediate((v) => !v)}>Darhol javob koʻrsatish</SettingChip>
        <SettingChip active={autoScroll} onClick={() => setAutoScroll((v) => !v)}>Keyingi savolga avtomatik oʻtish</SettingChip>
        <SettingChip active={shuffle} onClick={() => setShuffle((v) => !v)}>Savollarni aralashtirish</SettingChip>
      </div>

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

export function QuizPlayer({ test, config, onExit, onRestart, onRetry, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, session }) {
  const questions = config.questions;
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [finished, setFinished] = useState(false);
  const [showBadgeNotice, setShowBadgeNotice] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const questionRefs = useRef({});
  const resultSummaryRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(autoScrollTimerRef.current), []);

  useEffect(() => {
    if (finished || paused) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished, paused]);

  useEffect(() => {
    if (!finished || !resultSummaryRef.current) return undefined;
    const frame = requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultSummaryRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [finished]);

  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (q.type === 'matching') return Array.isArray(q.pairs) ? q.pairs.every((pair) => a?.[pair.id] !== undefined) : a !== undefined;
    return q.type === 'open' ? (typeof a === 'string' && a.trim().length > 0) : a !== undefined;
  });

  /* Keyingi javobsiz savolga brauzerning native scroll animatsiyasi bilan oʻtamiz.
     Bu har kadrda JavaScript hisoblashni talab qilmaydi va sekin qurilmalarda yengilroq. */
  function scrollToNextUnanswered(fromQid, latestAnswers) {
    if (!config.autoScroll) return;
    const fromIndex = questions.findIndex((q) => q.id === fromQid);
    const next = questions.slice(fromIndex + 1).find((q) => {
      const a = latestAnswers[q.id];
      if (q.type === 'matching') return Array.isArray(q.pairs) ? !q.pairs.every((pair) => a?.[pair.id] !== undefined) : a === undefined;
      return q.type === 'open' ? !(typeof a === 'string' && a.trim().length > 0) : a === undefined;
    });
    if (!next) return;
    const el = questionRefs.current[next.id];
    if (!el) return;

    clearTimeout(autoScrollTimerRef.current);
    autoScrollTimerRef.current = setTimeout(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    }, 160);
  }

  function select(qid, idx) {
    if (finished || paused) return;
    setAnswers((a) => {
      const next = { ...a, [qid]: idx };
      scrollToNextUnanswered(qid, next);
      return next;
    });
    if (config.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
  }

  function selectMatching(qid, pairId, optionIndex) {
    if (finished || paused) return;
    const nextMatching = { ...(answers[qid] || {}) };
    if (optionIndex === undefined) delete nextMatching[pairId];
    else nextMatching[pairId] = optionIndex;
    const next = { ...answers, [qid]: nextMatching };
    setAnswers(next);
    scrollToNextUnanswered(qid, next);
    if (config.immediate && (questions.find((q) => q.id === qid)?.pairs || []).every((pair) => nextMatching[pair.id] !== undefined)) {
      setRevealed((revealedAnswers) => ({ ...revealedAnswers, [qid]: true }));
    }
  }

  function setOpenAnswer(qid, text) {
    if (finished || paused) return;
    setAnswers((a) => ({ ...a, [qid]: text }));
  }

  function confirmOpenAnswer(qid) {
    if (finished || paused) return;
    setAnswers((a) => { scrollToNextUnanswered(qid, a); return a; });
    if (config.immediate) setRevealed((r) => ({ ...r, [qid]: true }));
  }

  function submit() {
    const correctCount = questions.reduce((s, question) => s + getQuestionScore(question, answers[question.id]), 0);
    const totalCount = getQuestionCount(questions);
    const percent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    setRevealed(Object.fromEntries(questions.map((q) => [q.id, true])));
    setFinished(true);
    if (percent >= 70 && onTestComplete) {
      Promise.resolve()
        .then(() => onTestComplete(percent))
        .then((shouldNotify) => { if (shouldNotify) setShowBadgeNotice(true); })
        .catch(() => {});
    }
  }

  if (finished) {
    const correctCount = questions.reduce((s, qq) => s + getQuestionScore(qq, answers[qq.id]), 0);
    const totalCount = getQuestionCount(questions);
    const incorrectCount = totalCount - correctCount;
    const percent = Math.round((correctCount / totalCount) * 100);
    return (
      <div>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>
        <h3 ref={resultSummaryRef} className="text-2xl sm:text-3xl mb-5" style={{ ...fontDisplay, color: C.ink, fontWeight: 600, scrollMarginTop: '5rem' }}>{test.title} — yakunlandi</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mb-8">
          <div className="p-4 rounded-sm text-center" style={{ background: C.cover }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.gold, fontWeight: 700 }}>{percent}%</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.goldSoft }}>Natija</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.successTint, border: `1px solid ${C.accent}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.accent, fontWeight: 700 }}>{correctCount}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.dangerTint, border: `1px solid ${C.red}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.red, fontWeight: 700 }}>{incorrectCount}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Notoʻgʻri</div>
          </div>
          <div className="p-4 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <div className="text-2xl" style={{ ...fontMono, color: C.ink, fontWeight: 700 }}>{formatDuration(seconds)}</div>
            <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Sarflangan vaqt</div>
          </div>
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
        <div className="flex flex-wrap gap-3 mb-8">
          <GhostButton onClick={onRetry} icon={RotateCcw}>Qayta ishlash</GhostButton>
          <GhostButton onClick={onRestart} icon={Settings}>Sozlamalarni oʻzgartirish</GhostButton>
        </div>
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
                  <div className="text-sm mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 600 }}>{qi + 1}. {q.text || 'Moslashtirish savoli'}</div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div style={{ ...fontBody, color: C.inkSoft }}>Sizning javobingiz</div>
                      <div className="mt-1 break-words" style={{ ...fontBody, color: C.ink }}>{chosenText}</div>
                    </div>
                    <div>
                      <div style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javob</div>
                      <div className="mt-1 break-words" style={{ ...fontBody, color: C.accent, fontWeight: 600 }}>{correctText || 'Javob kiritilmagan'}</div>
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[15px] focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[13px]" style={{ ...fontMono, color: C.gold, background: C.cover }}>
            <Clock3 size={13} /> {formatDuration(seconds)}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[13px]"
            style={{ ...fontBody, color: C.ink, border: `1px solid ${C.rule}` }}
          >
            {paused ? <><Play2 size={13} /> Davom</> : <><Pause size={13} /> Pauza</>}
          </button>
        </div>
      </div>

      <h3 className="text-2xl sm:text-3xl mb-1 mt-3" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-[15px] mb-6" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}

      {paused ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Pause size={26} style={{ color: C.gold }} className="mb-3" />
          <div className="text-base mb-4" style={{ ...fontBody, color: C.ink }}>Test pauzada — vaqt hisoblagich toʻxtatildi.</div>
          <SolidButton onClick={() => setPaused(false)} icon={Play2}>Davom ettirish</SolidButton>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-w-2xl">
            {questions.map((q, qi) => {
              const showResult = config.immediate ? !!revealed[q.id] : finished;
              return (
                <article key={q.id} ref={(el) => { questionRefs.current[q.id] = el; }} className="p-3 sm:p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
                  {q.type !== 'matching' && <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
                    <span style={{ ...fontMono, color: C.gold }}>{qi + 1}.</span> {q.text}
                  </div>}
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-sm mb-3" style={{ border: `1px solid ${C.rule}` }} />
                  )}
                  {q.type === 'matching' ? (
                    <MatchingTestQuestion question={q} answer={answers[q.id]} onChange={(pairId, optionIndex) => selectMatching(q.id, pairId, optionIndex)} disabled={finished || paused} showResult={showResult} />
                  ) : q.type === 'open' ? (
                    <div>
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setOpenAnswer(q.id, e.target.value)}
                        onBlur={() => confirmOpenAnswer(q.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                        disabled={showResult}
                        placeholder="Javobingizni yozing (masalan: 1/2 yoki 0,5)"
                        className="w-full px-4 py-2.5 rounded-sm text-[15px] outline-none"
                        style={{
                          ...fontBody, color: C.ink,
                          background: showResult ? (isQuestionCorrect(q, answers[q.id]) ? C.successTint : C.dangerTint) : C.surface,
                          border: `1px solid ${showResult ? (isQuestionCorrect(q, answers[q.id]) ? C.accent : C.red) : C.rule}`,
                        }}
                      />
                      {showResult && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm" style={{ ...fontBody, color: isQuestionCorrect(q, answers[q.id]) ? C.accent : C.red }}>
                          {isQuestionCorrect(q, answers[q.id]) ? <Check size={14} /> : <X size={14} />}
                          Toʻgʻri javob: {(q.answers || []).join(' yoki ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {q.options.map((opt, oi) => {
                        const isSelected = answers[q.id] === oi;
                        let bg = C.surface, border = C.rule;
                        if (showResult) {
                          if (oi === q.correct) { bg = C.successTint; border = C.accent; }
                          else if (isSelected && oi !== q.correct) { bg = C.dangerTint; border = C.red; }
                        } else if (isSelected) {
                          border = C.gold; bg = C.selectedTint;
                        }
                        return (
                          <button
                            key={oi}
                            onClick={() => select(q.id, oi)}
                            disabled={showResult}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                            style={{ ...fontBody, background: bg, border: `1px solid ${border}`, color: C.ink, outlineColor: C.gold }}
                          >
                            <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                            <span>{opt}</span>
                            {showResult && oi === q.correct && <Check size={15} className="ml-auto flex-shrink-0" style={{ color: C.accent }} />}
                            {showResult && isSelected && oi !== q.correct && <X size={15} className="ml-auto flex-shrink-0" style={{ color: C.red }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <SolidButton onClick={submit} icon={Check} disabled={!allAnswered}>Javoblarni tekshirish</SolidButton>
          </div>
        </>
      )}
    </div>
  );
}

export function QuizView({ test, onExit, effectivePrefs, forceSetup, onSavePrefs, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError, session }) {
  const prefs = effectivePrefs || DEFAULT_TEST_PREFS;
  const [config, setConfig] = useState(() => (forceSetup ? null : { ...prefs, questions: computeQuizQuestions(test, prefs) }));
  const [lastConfig, setLastConfig] = useState(prefs);
  const [attemptKey, setAttemptKey] = useState(0);

  function handleStart(cfg) {
    const { questions, ...rest } = cfg;
    setLastConfig(rest);
    setConfig(cfg);
    if (onSavePrefs) onSavePrefs(rest);
  }

  function handleRetry() {
    setConfig((current) => current ? { ...current, questions: computeQuizQuestions(test, current) } : current);
    setAttemptKey((key) => key + 1);
  }

  if (!config) {
    return <QuizSetupPanel test={test} onExit={onExit} onStart={handleStart} initialConfig={lastConfig} />;
  }
  return <QuizPlayer key={attemptKey} test={test} config={config} onExit={onExit} onRestart={() => setConfig(null)} onRetry={handleRetry} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} />;
}

export function TestsView({ tests, testsLoading, testsLoadError, onRetryTests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, profile, saveTestPrefs, initialOpenId, openRequest, onOpenRequestHandled, initialCategoryId, initialLiveCode, initialLiveSession, initialBattleToken, ensureTestContent, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
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
  const goTest = (id, forceSetup) => { if (ensureTestContent) ensureTestContent(id); setActiveId(id); setSetupMode(!!forceSetup); pushNav(() => { setActiveId(null); setSetupMode(false); }); };
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
    goTest(openRequest.id);
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
    return <QuizView test={active} onExit={back} effectivePrefs={effectivePrefs} forceSetup={setupMode} onSavePrefs={onSavePrefs} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} session={session} />;
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
            <ListChecks size={14} /> Matching test yaratish
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
