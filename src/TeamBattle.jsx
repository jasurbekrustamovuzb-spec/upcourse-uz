import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Eye, Loader2, Plus, RotateCcw, Search, Share2, Shuffle, Trash2, Trophy, Users, X } from 'lucide-react';
import { C, fontBody, fontMono, SectionLoading, shareItem, buildShareUrl } from './App';
import { signInWithGoogle } from './supabaseClient';
import { deleteTeamBattleSet, getSharedTeamBattleSet, listTeamBattleSets, saveTeamBattleSet, setTeamBattleSetShared } from './teamBattleData';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const newQuestion = () => ({ id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: '', answer: '' });

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toTestCards(test) {
  const cards = [];
  (test.questions || []).forEach((question, qi) => {
    if (question.type === 'matching' && Array.isArray(question.pairs)) {
      question.pairs.forEach((pair, pi) => {
        const answer = question.options?.[pair.correct];
        if (pair.text?.trim() && answer?.trim()) cards.push({ id: `${question.id || qi}-${pair.id || pi}`, text: pair.text, answer: `${LETTERS[pair.correct]}. ${answer}`, imageUrl: question.imageUrl });
      });
      return;
    }
    let answer = '';
    if (question.type === 'open') answer = (question.answers || []).filter(Boolean).join(' / ');
    else if (Array.isArray(question.options)) {
      const option = question.options[question.correct];
      if (option) answer = `${LETTERS[question.correct] || ''}. ${option}`;
    }
    if (question.text?.trim() && answer.trim()) cards.push({ id: question.id || `question-${qi}`, text: question.text, answer, imageUrl: question.imageUrl });
  });
  return shuffle(cards);
}

function toSavedCards(questions = []) {
  return shuffle(questions.filter((q) => q.text?.trim() && q.answer?.trim()).map((q, index) => ({
    id: q.id || `saved-${index}`,
    text: q.text.trim(),
    answer: q.answer.trim(),
  })));
}

export default function TeamBattle({ tests = [], testsLoading = false, testsLoadError = null, onRetryTests, categories = [], ensureTestContent, onExit, session, initialShareToken }) {
  const [mode, setMode] = useState('tests');
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [deck, setDeck] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [groupCount, setGroupCount] = useState(2);
  const [groupNames, setGroupNames] = useState(['1-guruh', '2-guruh']);
  const [pointsInput, setPointsInput] = useState('10');
  const [turn, setTurn] = useState(0);
  const [usedIds, setUsedIds] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [scores, setScores] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftQuestions, setDraftQuestions] = useState([newQuestion()]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [sharedLoading, setSharedLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || mode !== 'questions') return;
    let cancelled = false;
    setSetsLoading(true);
    listTeamBattleSets()
      .then((rows) => { if (!cancelled) setSets(rows); })
      .catch(() => { if (!cancelled) setError('Saqlangan savollarni yuklab boʻlmadi. Qayta urinib koʻring.'); })
      .finally(() => { if (!cancelled) setSetsLoading(false); });
    return () => { cancelled = true; };
  }, [mode, session?.user?.id]);

  useEffect(() => {
    if (!initialShareToken) return;
    let cancelled = false;
    setMode('questions');
    setSharedLoading(true);
    getSharedTeamBattleSet(initialShareToken)
      .then((row) => {
        if (!row || cancelled) return;
        const cards = toSavedCards(row.questions);
        if (!cards.length) throw new Error('Savollar topilmadi');
        setSelectedSet(row);
        setSelectedTitle(row.title);
        setDeck(cards);
        setError('');
      })
      .catch(() => { if (!cancelled) setError('Bu havola yaroqsiz yoki savol toʻplami ulashishdan olingan.'); })
      .finally(() => { if (!cancelled) setSharedLoading(false); });
    return () => { cancelled = true; };
  }, [initialShareToken]);

  async function chooseTest(test) {
    setLoadingId(test.id);
    setError(''); setSelectedSet(null); setSelectedTest(null); setSelectedTitle(''); setDeck([]);
    try {
      const questions = await ensureTestContent(test.id);
      if (!Array.isArray(questions)) {
        setError('Test savollarini yuklab boʻlmadi. Internetni tekshirib, qayta urinib koʻring.');
        return;
      }
      const cards = toTestCards({ ...test, questions: questions || [] });
      if (!cards.length) setError('Bu testda jamoaviy jang uchun savol-javob topilmadi.');
      else { setSelectedTest(test); setSelectedTitle(test.title); setDeck(cards); }
    } catch (e) {
      setError('Test savollarini yuklab boʻlmadi. Internetni tekshirib, qayta urinib koʻring.');
    } finally { setLoadingId(null); }
  }

  function switchMode(nextMode) {
    setMode(nextMode); setSelectedTest(null); setSelectedSet(null); setSelectedTitle(''); setDeck([]); setError(''); setCreateOpen(false);
  }

  function chooseSet(set) {
    const cards = toSavedCards(set.questions || []);
    if (!cards.length) { setError('Toʻplamda foydalanish mumkin boʻlgan savol-javob yoʻq.'); return; }
    setSelectedTest(null); setSelectedSet(set); setSelectedTitle(set.title); setDeck(cards); setError(''); setSaveMessage('');
  }

  async function submitNewSet(event) {
    event.preventDefault();
    const questions = draftQuestions.map((question) => ({ id: question.id, text: question.text.trim(), answer: question.answer.trim() })).filter((question) => question.text && question.answer);
    if (!draftTitle.trim()) { setError('Savollar toʻplamiga nom kiriting.'); return; }
    if (!questions.length) { setError('Kamida bitta savol va javobni toʻliq kiriting.'); return; }
    setSaving(true); setError(''); setSaveMessage('');
    try {
      const row = await saveTeamBattleSet({ ownerId: session.user.id, title: draftTitle, questions });
      setSets((current) => [row, ...current.filter((item) => item.id !== row.id)]);
      chooseSet(row); setCreateOpen(false); setDraftTitle(''); setDraftQuestions([newQuestion()]);
      setSaveMessage('Saqlandi');
    } catch (e) {
      setError('Saqlash amalga oshmadi. Birozdan soʻng qayta urinib koʻring.');
    } finally { setSaving(false); }
  }

  async function shareSet(set) {
    setError(''); setSaveMessage('');
    try {
      let current = set;
      if (!set.is_shared) {
        const result = await setTeamBattleSetShared(set.id, true);
        current = { ...set, ...result, is_shared: true };
        setSets((items) => items.map((item) => item.id === set.id ? current : item));
        if (selectedSet?.id === set.id) setSelectedSet(current);
      }
      const url = buildShareUrl({ battle: current.share_token });
      await shareItem(url, current.title);
    } catch (e) { setError('Ulashish havolasini tayyorlab boʻlmadi.'); }
  }

  async function removeSet(set) {
    if (!window.confirm(`“${set.title}” savollar toʻplami oʻchirilsinmi?`)) return;
    try {
      await deleteTeamBattleSet(set.id);
      setSets((items) => items.filter((item) => item.id !== set.id));
      if (selectedSet?.id === set.id) { setSelectedSet(null); setSelectedTitle(''); setDeck([]); }
    } catch (e) { setError('Toʻplamni oʻchirib boʻlmadi.'); }
  }

  function startGame() {
    const parsedPoints = Number(pointsInput);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > 1000) { setError('Toʻgʻri javob ballini 1 dan 1000 gacha kiriting.'); return; }
    if (!deck.length) { setError('Avval test yoki savollar toʻplamini tanlang.'); return; }
    setGroupNames((names) => Array.from({ length: groupCount }, (_, i) => names[i] || `${i + 1}-guruh`));
    setScores(Array(groupCount).fill(0)); setTurn(0); setUsedIds(new Set()); setActiveId(null); setAnswerVisible(false); setError('');
  }

  function finishCard(correct) {
    const card = deck.find((item) => item.id === activeId);
    if (!card) return;
    if (correct) setScores((current) => current.map((score, i) => i === turn ? score + Number(pointsInput) : score));
    setUsedIds((current) => new Set([...current, card.id]));
    setTurn((current) => (current + 1) % groupCount);
    setActiveId(null); setAnswerVisible(false);
  }

  function resetGame() {
    setUsedIds(new Set()); setScores([]); setTurn(0); setActiveId(null); setAnswerVisible(false); setError('');
  }

  const activeCard = deck.find((card) => card.id === activeId);
  const finished = deck.length > 0 && usedIds.size === deck.length && !activeId;
  const ranked = groupNames.slice(0, groupCount).map((name, index) => ({ name, score: scores[index] || 0, index })).sort((a, b) => b.score - a.score);
  const winners = ranked.length ? ranked.filter((team) => team.score === ranked[0].score) : [];
  const normalizedTestSearch = testSearch.trim().toLocaleLowerCase();
  const filteredTests = normalizedTestSearch ? tests.filter((test) => {
    const categoryName = categories.find((category) => category.id === test.categoryId)?.name || '';
    return `${test.title} ${categoryName}`.toLocaleLowerCase().includes(normalizedTestSearch);
  }) : tests;

  return <div className="mx-[-1.25rem] w-[calc(100%+2.5rem)] max-w-6xl px-2 py-4 sm:mx-auto sm:w-full sm:px-5 sm:py-6" style={{ color: C.ink }}>
    <button type="button" onClick={onExit} className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Testlarga qaytish</button>
    {!scores.length && !finished ? <div>
      <div className="flex items-start gap-3 mb-5"><div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color: C.white, background: C.cover }}><Users size={21} /></div><div><h1 className="text-2xl sm:text-3xl font-semibold" style={{ ...fontBody }}>Jamoaviy jang</h1><p className="text-sm mt-1" style={{ ...fontBody, color: C.inkSoft }}>Test yoki saqlangan savol-javob toʻplamini tanlang.</p></div></div>
      <div className="flex gap-2 mb-4" role="tablist" aria-label="Jamoaviy jang manbasi">
        <button type="button" role="tab" aria-selected={mode === 'tests'} onClick={() => switchMode('tests')} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ ...fontBody, color: mode === 'tests' ? C.white : C.inkSoft, background: mode === 'tests' ? C.cover : C.surface, border: `1px solid ${mode === 'tests' ? C.cover : C.rule}` }}>Testlar</button>
        <button type="button" role="tab" aria-selected={mode === 'questions'} onClick={() => switchMode('questions')} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ ...fontBody, color: mode === 'questions' ? C.white : C.inkSoft, background: mode === 'questions' ? C.cover : C.surface, border: `1px solid ${mode === 'questions' ? C.cover : C.rule}` }}>Savollar</button>
      </div>
      {mode === 'tests' ? <section className="p-3 sm:p-5 rounded-xl mb-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <h2 className="text-base font-semibold mb-3" style={{ ...fontBody }}>Jamoaviy jang uchun testni tanlang</h2>
        <div className="relative mb-3"><Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }} /><input type="search" aria-label="Jamoaviy jang uchun test qidirish" value={testSearch} onChange={(event) => setTestSearch(event.target.value)} placeholder="Test yoki soha nomini qidiring..." className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}`, '--tw-ring-color': C.mathSoft }} /></div>
        {testsLoading && !tests.length ? <SectionLoading label="Testlar yuklanmoqda…" compact /> : testsLoadError && !tests.length ? <div role="alert" className="flex flex-wrap items-center gap-3 py-4 text-sm" style={{ ...fontBody, color: C.red }}><span>{testsLoadError}</span><button type="button" onClick={onRetryTests} className="px-3 py-1.5 rounded-sm" style={{ color: C.white, background: C.cover }}>Qayta yuklash</button></div> : <div className="grid sm:grid-cols-2 gap-2">{filteredTests.map((test) => <button key={test.id} type="button" onClick={() => chooseTest(test)} disabled={!!loadingId} className="min-w-0 flex items-center gap-3 text-left p-3 rounded-lg transition-colors disabled:opacity-60" style={{ background: selectedTest?.id === test.id ? C.mathTint : C.paper, border: `1px solid ${selectedTest?.id === test.id ? C.math : C.rule}` }}>{loadingId === test.id ? <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: C.math }} /> : <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: C.mathDeep, background: C.mathTint }}><Shuffle size={15} /></span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" style={{ ...fontBody }}>{test.title}</span><span className="block text-xs mt-0.5 truncate" style={{ ...fontBody, color: C.inkSoft }}>{categories.find((cat) => cat.id === test.categoryId)?.name || 'Test'} · {test.questionCount || test.questions?.length || 0} savol</span></span>{selectedTest?.id === test.id && <Check size={17} style={{ color: C.math, flexShrink: 0 }} />}</button>)}</div>}
        {!testsLoading && !testsLoadError && !filteredTests.length && <p className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>{tests.length ? 'Qidiruv boʻyicha test topilmadi.' : 'Hozircha foydalanish mumkin boʻlgan test yoʻq.'}</p>}
      </section> : <section className="p-3 sm:p-5 rounded-xl mb-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="text-base font-semibold" style={{ ...fontBody }}>Savol-javob toʻplamlari</h2><p className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Toʻplamni tanlang yoki oʻzingiz yangisini tuzing.</p></div><button type="button" onClick={() => session ? setCreateOpen((open) => !open) : signInWithGoogle()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}><Plus size={15} /> {session ? 'Savol tuzish' : 'Kirish'}</button></div>
        {createOpen && <form onSubmit={submitNewSet} className="mb-4 rounded-xl p-2.5 sm:p-4" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
          <label className="block text-xs mb-3" style={{ ...fontMono, color: C.inkSoft }}>Toʻplam nomi<input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={120} required placeholder="Masalan: Biologiya — 1-mavzu" className="block w-full mt-1 p-2.5 rounded-lg text-sm" style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }} /></label>
          <div className="space-y-2">{draftQuestions.map((question, index) => <div key={question.id} className="grid min-w-0 sm:grid-cols-2 gap-2 rounded-lg p-2 sm:p-3" style={{ background: C.surface, border: `1px solid ${C.rule}` }}><label className="block text-xs" style={{ ...fontMono, color: C.inkSoft }}>{index + 1}. Savol<textarea value={question.text} onChange={(event) => setDraftQuestions((rows) => rows.map((row) => row.id === question.id ? { ...row, text: event.target.value } : row))} maxLength={1000} rows={2} required placeholder="Savolni yozing" className="block w-full mt-1 p-2 rounded-md text-sm resize-y" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} /></label><div className="flex gap-2 items-end"><label className="block flex-1 text-xs" style={{ ...fontMono, color: C.inkSoft }}>Toʻgʻri javob<input value={question.answer} onChange={(event) => setDraftQuestions((rows) => rows.map((row) => row.id === question.id ? { ...row, answer: event.target.value } : row))} maxLength={500} required placeholder="Javobni yozing" className="block w-full mt-1 p-2 rounded-md text-sm" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} /></label>{draftQuestions.length > 1 && <button type="button" aria-label={`${index + 1}-savolni olib tashlash`} onClick={() => setDraftQuestions((rows) => rows.filter((row) => row.id !== question.id))} className="p-2 rounded-md" style={{ color: C.red, background: C.dangerBannerTint }}><X size={16} /></button>}</div></div>)}</div>
          {draftQuestions.length < 100 && <button type="button" onClick={() => setDraftQuestions((rows) => [...rows, newQuestion()])} className="inline-flex items-center gap-1 mt-3 text-xs font-semibold" style={{ ...fontBody, color: C.cover }}><Plus size={14} /> Yana savol</button>}
          <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-2 rounded-lg text-xs" style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}` }}>Bekor</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button></div>
        </form>}
        {!session ? <p className="text-sm py-3" style={{ ...fontBody, color: C.inkSoft }}>Savollarni saqlash va ulashish uchun akkauntga kiring.</p> : setsLoading ? <SectionLoading label="Savollar yuklanmoqda…" compact /> : sets.length ? <div className="grid sm:grid-cols-2 gap-2">{sets.map((set) => <div key={set.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: C.paper, border: `1px solid ${selectedSet?.id === set.id ? C.math : C.rule}` }}><button type="button" onClick={() => chooseSet(set)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: C.mathDeep, background: C.mathTint }}><Shuffle size={15} /></span><span className="min-w-0"><span className="block truncate text-sm font-medium" style={{ ...fontBody }}>{set.title}</span><span className="block text-xs mt-0.5" style={{ ...fontBody, color: C.inkSoft }}>{set.questions?.length || 0} ta savol</span></span>{selectedSet?.id === set.id && <Check size={16} style={{ color: C.math }} />}</button><button type="button" onClick={() => shareSet(set)} aria-label={`${set.title} toʻplamini ulashish`} title="Ulashish" className="p-2 rounded-lg" style={{ color: C.cover, background: C.goldSoft }}><Share2 size={16} /></button><button type="button" onClick={() => removeSet(set)} aria-label={`${set.title} toʻplamini oʻchirish`} title="Oʻchirish" className="p-2 rounded-lg" style={{ color: C.red, background: C.dangerBannerTint }}><Trash2 size={15} /></button></div>)}</div> : <p className="text-sm py-3" style={{ ...fontBody, color: C.inkSoft }}>Hozircha savol toʻplami yoʻq. “Savol tuzish” orqali birinchisini yarating.</p>}
        {saveMessage && <p className="text-xs mt-3" role="status" style={{ ...fontBody, color: C.accent }}>{saveMessage}</p>}
      </section>}
      {(sharedLoading || setsLoading) && initialShareToken && <SectionLoading label="Savollar yuklanmoqda…" compact />}
      {selectedTitle && deck.length > 0 && <section className="p-3 sm:p-5 rounded-xl mb-4" style={{ background: C.surface, border: `1px solid ${C.rule}`, opacity: 1 }}><h2 className="text-base font-semibold mb-1" style={{ ...fontBody }}>Guruhlarni sozlang</h2><p className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>{selectedTitle} · {deck.length} ta savol</p><label className="block text-xs mb-1" htmlFor="battle-group-count" style={{ ...fontMono, color: C.inkSoft }}>Guruhlar soni</label><select id="battle-group-count" name="groupCount" value={groupCount} onChange={(event) => { const count = Number(event.target.value); setGroupCount(count); setGroupNames((names) => Array.from({ length: count }, (_, i) => names[i] || `${i + 1}-guruh`)); }} className="w-full sm:w-48 p-2.5 rounded-lg text-sm mb-3" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }}>{Array.from({ length: 7 }, (_, i) => i + 2).map((count) => <option key={count} value={count}>{count} ta guruh</option>)}</select><div className="grid sm:grid-cols-2 gap-2">{groupNames.slice(0, groupCount).map((name, index) => <label key={index} htmlFor={`battle-group-${index + 1}`} className="block text-xs" style={{ ...fontMono, color: C.inkSoft }}>{index + 1}-guruh nomi<input id={`battle-group-${index + 1}`} name={`group${index + 1}`} value={name} onChange={(event) => setGroupNames((names) => names.map((item, i) => i === index ? event.target.value : item))} className="block w-full mt-1 p-2.5 rounded-lg text-sm" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} /></label>)}</div><label className="block text-xs mt-3" htmlFor="battle-points" style={{ ...fontMono, color: C.inkSoft }}>Toʻgʻri javob uchun ball<input id="battle-points" name="points" type="number" min="1" max="1000" value={pointsInput} onChange={(event) => setPointsInput(event.target.value)} className="block w-full sm:w-48 mt-1 p-2.5 rounded-lg text-sm" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} /></label></section>}
      {error && <div role="alert" className="text-sm mb-3" style={{ ...fontBody, color: C.red }}>{error}</div>}
      <button type="button" onClick={startGame} disabled={!selectedTitle || !deck.length || !!loadingId || sharedLoading} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ ...fontBody, color: C.white, background: C.cover }}>Guruhli testni boshlash <ChevronRight size={17} /></button>
    </div> : finished ? <div className="max-w-2xl mx-auto text-center py-8 sm:py-12">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.goldSoft, color: C.cover }}><Trophy size={31} /></div><p className="text-xs uppercase tracking-wider mb-2" style={{ ...fontMono, color: C.gold }}>Oʻyin yakunlandi</p><h1 className="text-3xl sm:text-4xl font-semibold mb-2" style={{ ...fontBody }}>{winners.length === 1 ? `${winners[0].name} gʻolib!` : 'Durrang!'}</h1><p className="text-sm mb-6" style={{ ...fontBody, color: C.inkSoft }}>{selectedTitle}</p>
      <div className="space-y-2 text-left mb-6">{ranked.map((team, i) => <div key={team.index} className="flex items-center justify-between p-4 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}><span className="flex items-center gap-3" style={{ ...fontBody }}><span className="text-xs" style={{ ...fontMono, color: C.gold }}>#{i + 1}</span>{team.name}</span><strong style={{ ...fontMono, color: C.cover }}>{team.score}</strong></div>)}</div>
      <button type="button" onClick={resetGame} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm" style={{ ...fontBody, color: C.white, background: C.cover }}><RotateCcw size={16} /> Yangi jang</button>
    </div> : <div>
      <div className="flex items-start justify-between gap-3 mb-4"><div><div className="text-xs uppercase tracking-wider mb-1" style={{ ...fontMono, color: C.gold }}>{selectedTitle}</div><h1 className="text-2xl sm:text-3xl font-semibold" style={{ ...fontBody }}>Jamoalar hisobi</h1></div><button type="button" onClick={resetGame} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ ...fontBody, color: C.inkSoft, background: C.surface, border: `1px solid ${C.rule}`}}><RotateCcw size={14} /> Yangidan</button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">{groupNames.slice(0, groupCount).map((name, i) => <div key={i} className="p-3 sm:p-4 rounded-xl" style={{ background: i === turn ? C.cover : C.surface, border: `2px solid ${i === turn ? C.gold : C.rule}`, color: i === turn ? C.white : C.ink }}><div className="text-xs truncate" style={{ ...fontBody, opacity: 0.8 }}>{name}{i === turn ? ' · navbat' : ''}</div><div className="text-2xl sm:text-3xl mt-1" style={{ ...fontMono, color: i === turn ? C.gold : C.cover }}>{scores[i] || 0}</div></div>)}</div>
      <div className="flex items-center justify-between gap-2 mb-3"><div><div className="text-base font-semibold" style={{ ...fontBody }}>Yashirin savollar</div><div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Navbatdagi jamoa bitta kartani tanlasin.</div></div><div className="text-xs flex-shrink-0" style={{ ...fontMono, color: C.inkSoft }}>{usedIds.size}/{deck.length}</div></div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">{deck.map((card, i) => { const used = usedIds.has(card.id); return <button key={card.id} type="button" disabled={used} onClick={() => { setActiveId(card.id); setAnswerVisible(false); }} className="aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 disabled:cursor-default" style={{ color: used ? C.inkSoft : C.white, background: used ? C.paperSoft : `linear-gradient(145deg, ${C.math}, ${C.cover})`, border: `1px solid ${used ? C.rule : C.cover}` }}>{used ? <Check size={21} /> : <span className="text-2xl sm:text-3xl" style={{ ...fontMono }}>{String(i + 1).padStart(2, '0')}</span>}<span className="text-[10px] uppercase tracking-wider" style={{ ...fontMono }}>{used ? 'Ochildi' : 'Savol'}</span></button>; })}</div>
      <p className="text-center text-xs mt-4" style={{ ...fontBody, color: C.inkSoft }}>Jami {deck.length} ta savol · navbat oʻzi keyingi guruhga oʻtadi</p>
    </div>}
    {activeCard && <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(15, 20, 25, 0.82)' }} role="dialog" aria-modal="true" aria-label="Jamoaviy jang savoli"><div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl p-5 sm:p-8" style={{ color: C.ink, background: C.paper }}><div className="flex items-start justify-between gap-3 mb-5"><div><div className="text-xs uppercase tracking-wider" style={{ ...fontMono, color: C.gold }}>Navbat: {groupNames[turn]}</div><div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javob uchun +{pointsInput} ball</div></div><button type="button" onClick={() => { setActiveId(null); setAnswerVisible(false); }} aria-label="Savolni yopish" className="p-2 rounded-full" style={{ color: C.inkSoft, background: C.surface }}><X size={19} /></button></div><h2 className="text-xl sm:text-3xl font-semibold leading-relaxed whitespace-pre-wrap" style={{ ...fontBody }}>{activeCard.text}</h2>{activeCard.imageUrl && <img src={activeCard.imageUrl} alt="Savol rasmi" className="max-h-60 max-w-full object-contain rounded-lg mt-4" />}<div className="mt-5 p-4 sm:p-5 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.rule}`, minHeight: 76 }}>{answerVisible ? <><div className="text-[10px] uppercase tracking-wider mb-1" style={{ ...fontMono, color: C.gold }}>Toʻgʻri javob</div><div className="text-lg sm:text-xl whitespace-pre-wrap" style={{ ...fontBody }}>{activeCard.answer}</div></> : <button type="button" onClick={() => setAnswerVisible(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}><Eye size={17} /> Javobni koʻrish</button>}</div>{answerVisible && <div className="grid sm:grid-cols-2 gap-2 mt-5"><button type="button" onClick={() => finishCard(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.accent }}><Check size={18} /> Toʻgʻri · +{pointsInput} ball</button><button type="button" onClick={() => finishCard(false)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.red }}>Notoʻgʻri · 0 ball</button></div>}</div></div>}
  </div>;
}
