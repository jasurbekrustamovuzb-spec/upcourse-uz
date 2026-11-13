import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, Plus, RotateCcw, Search, Shuffle, Trophy, Users, X, Disc3 } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App.jsx';

const palette = ['#E44D5A','#408FD0','#4BAF7E','#F2BD3F','#9864C7','#F0793E','#20A6AC','#D94F97','#84A83A','#4166C9','#E26F83','#37A2A1','#C95E36','#6095B8','#A47A38','#5D9A59'];
const mix = (list) => [...list].sort(() => Math.random() - .5);
const cleanLines = (text) => text.split(/[\n,;]+/).map((name) => name.trim().replace(/^(?:№\s*)?\d+\s*(?:[.)-]\s*|\t+|\s{2,})/, '')).filter(Boolean);
const freshQ = () => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, question: '', answer: '', image: '' });

export default function LuckyWheel({ onBack, tests = [], ensureTestContent }) {
  const [setup, setSetup] = useState(true);
  const [briefing, setBriefing] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [manualGroups, setManualGroups] = useState({});
  const [groups, setGroups] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [testPickerOpen, setTestPickerOpen] = useState(false);
  const [testPickerQuery, setTestPickerQuery] = useState('');
  const [selectedSourceTest, setSelectedSourceTest] = useState(null);
  const [sourceQuestions, setSourceQuestions] = useState([]);
  const [loadingSourceTestId, setLoadingSourceTestId] = useState(null);
  const [positive, setPositive] = useState('3');
  const [negative, setNegative] = useState('0');
  const [effectsOn, setEffectsOn] = useState(true);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [remaining, setRemaining] = useState([]);
  const [current, setCurrent] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState(() => new Set());
  const [showAnswer, setShowAnswer] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(1440);
  const [spinDuration, setSpinDuration] = useState(5200);
  const dragStart = useRef(null);
  const [turn, setTurn] = useState(0);
  const [result, setResult] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showSelectedParticipant, setShowSelectedParticipant] = useState(false);
  const parsedNames = useMemo(() => cleanLines(namesText), [namesText]);
  const normalizedPickerQuery = testPickerQuery.trim().toLocaleLowerCase();
  const matchingSourceTests = tests.filter((test) => `${test.title || ''} ${test.author || ''}`.toLocaleLowerCase().includes(normalizedPickerQuery));
  const matchingSourceQuestions = sourceQuestions.filter((question) => `${question.text || question.question || ''} ${(question.options || []).join(' ')} ${(question.answers || []).join(' ')}`.toLocaleLowerCase().includes(normalizedPickerQuery));

  const openTestPicker = () => {
    setTestPickerOpen((open) => !open);
    setTestPickerQuery('');
    setSelectedSourceTest(null);
    setSourceQuestions([]);
  };
  const chooseSourceTest = async (test) => {
    setLoadingSourceTestId(test.id);
    setSelectedSourceTest(test);
    try {
      const loaded = test.questions ?? (ensureTestContent ? await ensureTestContent(test.id) : []);
      setSourceQuestions(Array.isArray(loaded) ? loaded : []);
      setTestPickerQuery('');
    } finally {
      setLoadingSourceTestId(null);
    }
  };
  const normalizeSourceQuestion = (source) => {
    const question = source.text || source.question || source.prompt || '';
    let answer = source.answer || (Array.isArray(source.answers) ? source.answers.join(' / ') : '');
    if (source.type === 'matching' && Array.isArray(source.pairs)) {
      answer = source.pairs.map((pair) => `${pair.left || pair.prompt || pair.term || ''} — ${pair.right || pair.answer || pair.target || ''}`).join('\n');
    } else if (!answer && Number.isInteger(source.correct)) {
      answer = source.options?.[source.correct] ?? '';
    } else if (!answer && typeof source.correct === 'string') {
      answer = source.correct;
    }
    if (!question.trim() && !String(answer).trim() && !(source.imageUrl || source.image)) return null;
    return { ...freshQ(), question, answer: String(answer), image: source.imageUrl || source.image || source.image_url || '' };
  };
  const addSourceQuestion = (source) => {
    const question = normalizeSourceQuestion(source);
    if (question) setQuestions((list) => [...list, question]);
  };
  const addWholeTest = () => {
    const imported = sourceQuestions.map(normalizeSourceQuestion).filter((question) => question?.question.trim() && question.answer.trim());
    if (imported.length) setQuestions((list) => [...list, ...imported]);
    setSelectedSourceTest(null); setSourceQuestions([]); setTestPickerOpen(false); setQuestionEditorOpen(false); setEditingQuestionId(null);
  };

  const importNames = async (file) => {
    if (!file) return;
    let text = await file.text();
    if (/\.xlsx$/i.test(file.name)) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const view = new DataView(bytes.buffer);
        let directory = -1;
        for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) if (view.getUint32(i, true) === 0x06054b50) { directory = i; break; }
        if (directory < 0) throw new Error('Invalid workbook');
        const entries = new Map(); let pos = view.getUint32(directory + 16, true); const count = view.getUint16(directory + 10, true);
        for (let i = 0; i < count; i++) {
          if (view.getUint32(pos, true) !== 0x02014b50) break;
          const method = view.getUint16(pos + 10, true), size = view.getUint32(pos + 20, true), nameLen = view.getUint16(pos + 28, true), extraLen = view.getUint16(pos + 30, true), commentLen = view.getUint16(pos + 32, true), offset = view.getUint32(pos + 42, true);
          const name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + nameLen));
          const localName = view.getUint16(offset + 26, true), localExtra = view.getUint16(offset + 28, true), begin = offset + 30 + localName + localExtra;
          let data = bytes.slice(begin, begin + size);
          if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
          entries.set(name, new TextDecoder().decode(data)); pos += 46 + nameLen + extraLen + commentLen;
        }
        const xml = new DOMParser(); const shared = (entries.get('xl/sharedStrings.xml') || '');
        const strings = Array.from(xml.parseFromString(shared, 'text/xml').getElementsByTagName('si')).map((si) => Array.from(si.getElementsByTagName('t')).map((t) => t.textContent || '').join(''));
        const sheet = entries.get('xl/worksheets/sheet1.xml'); if (!sheet) throw new Error('Sheet not found');
        const doc = xml.parseFromString(sheet, 'text/xml'); const columns = (ref) => { let n = 0; for (const c of ref.match(/[A-Z]+/)?.[0] || '') n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
        const rows = Array.from(doc.getElementsByTagName('row')).map((row) => {
          const cells = []; for (const cell of Array.from(row.getElementsByTagName('c'))) { const value = cell.getElementsByTagName('v')[0]?.textContent || ''; cells[columns(cell.getAttribute('r') || '')] = cell.getAttribute('t') === 's' ? strings[Number(value)] : value; }
          return cells.filter(Boolean);
        }).filter((row) => row.length);
        text = rows.map((row) => row.join('\t')).join('\n');
      } catch { return; }
    }
    // Accept CSV and Excel's tab-separated export. Name columns are detected when present.
    const rows = text.split(/\r?\n/).map((line) => line.split(/[\t,;]+/).map((cell) => cell.replace(/^\s*["']|["']\s*$/g, '').trim()).filter(Boolean)).filter((row) => row.length);
    const headerAt = rows.findIndex((row) => row.some((cell) => /ism|famili|name|surname/i.test(cell)));
    const data = headerAt >= 0 ? rows.slice(headerAt + 1) : rows;
    const names = data.map((row) => {
      const cells = [...row];
      if (cells.length > 1 && /^\d+$/.test(cells[0] || '')) cells.shift();
      return cells.join(' ').trim();
    }).filter((name) => name && !/^(ism|famili|name)/i.test(name));
    if (names.length) setNamesText((old) => [old, ...names].filter(Boolean).join('\n'));
  };
  const start = () => {
    if (parsedNames.length < 2) return;
    const list = parsedNames.map((name, index) => ({ id: `${index}-${name}`, name }));
    let nextGroups = [];
    if (groupMode) {
      nextGroups = Array.from({ length: Math.max(2, Number(groupCount)) }, (_, i) => ({ id: `g${i}`, name: `Guruh ${i + 1}`, members: [] }));
      const randomGroups = mix(list); const randomPlacement = new Map(randomGroups.map((person, i) => [person.id, i % nextGroups.length]));
      list.forEach((person) => { const target = manualGroups[person.name] != null ? Number(manualGroups[person.name]) : randomPlacement.get(person.id); nextGroups[target]?.members.push(person); person.groupId = nextGroups[target]?.id; });
    }
    const active = groupMode ? nextGroups : list;
    const scoresInit = Object.fromEntries(active.map((p) => [p.id, 0]));
    setGroups(nextGroups); setPlayers(list); setQuestions(mix(questions)); setScores(scoresInit); setRemaining(list.map((p) => p.id));
    setCurrent(null); setResult(null); setTurn(0); setUsedQuestionIds(new Set()); setSelectedQuestion(null); setShowSelectedParticipant(false); setSetup(false); setBriefing(true);
  };
  const spin = (effort = 1, direction = 1) => {
    if (spinning || !remaining.length) return;
    setSpinning(true);
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    const slice = 360 / Math.max(1, wheelItems.length);
    const segment = wheelItems.findIndex((person) => person.id === chosen);
    const currentAngle = ((spinAngle % 360) + 360) % 360;
    const target = (segment + .5) * slice;
    const offset = direction >= 0 ? (360 - target - currentAngle + 720) % 360 : -((currentAngle + target + 720) % 360);
    const power = Math.min(1.8, Math.max(.3, effort));
    const turns = 4 + Math.round(power * .65);
    const duration = Math.round(17000 + power * 1800);
    const endAngle = spinAngle + direction * turns * 360 + offset;
    setSpinDuration(duration);
    setSpinAngle(endAngle);
    window.setTimeout(() => {
      setCurrent(chosen); setRemaining((prev) => prev.filter((id) => id !== chosen)); setSpinning(false); setShowSelectedParticipant(true);
      window.setTimeout(() => setShowSelectedParticipant(false), 6500);
    }, duration + 100);
  };
  const onWheelPointerDown = (event) => { if (!spinning && remaining.length) dragStart.current = { x: event.clientX, y: event.clientY }; };
  const onWheelPointerUp = (event) => {
    if (!dragStart.current) return;
    const distance = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
    const direction = event.clientX - dragStart.current.x < 0 ? 1 : -1;
    dragStart.current = null;
    if (distance >= 18) spin(Math.min(1.8, Math.max(.8, distance / 110)), direction);
  };
  const activeItems = groupMode ? groups : players;
  const wheelItems = players.filter((person) => remaining.includes(person.id));
  const finishAnswer = (correct) => {
    const participant = players.find((person) => person.id === current);
    const scoreId = groupMode ? participant?.groupId : current;
    const delta = correct ? Number(positive) : (effectsOn ? -Math.abs(Number(negative) || 0) : 0);
    setScores((old) => ({ ...old, [scoreId]: (old[scoreId] || 0) + delta }));
    if (selectedQuestion) setQuestions((old) => old.filter((question) => question.id !== selectedQuestion.id));
    setSelectedQuestion(null); setQuestionIndex(null); setShowAnswer(false); setTurn((n) => n + 1);
    if (!remaining.length) {
      const final = activeItems.map((person) => ({ ...person, score: (scores[person.id] || 0) + (person.id === scoreId ? delta : 0) })).sort((a,b) => b.score-a.score);
      setResult(final); setCurrent(null);
    } else setCurrent(null);
    return participant;
  };
  const addImage = (id, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader(); reader.onload = () => setQuestions((rows) => rows.map((q) => q.id === id ? { ...q, image: String(reader.result) } : q)); reader.readAsDataURL(file);
  };
  const ranked = result || activeItems.map((person) => ({ ...person, score: scores[person.id] || 0 })).sort((a,b) => b.score-a.score);

  return <main className="fixed inset-0 z-[110] w-full min-w-0 overflow-x-hidden overflow-y-auto px-3 pb-5 sm:px-6" style={{ background:C.paper }}>
    <div className="mx-auto w-full min-w-0 max-w-[1680px]">
    <style>{`@keyframes card-in { from { opacity:0;transform:translateY(14px) scale(.97) } to { opacity:1;transform:none } } @keyframes wheel-card-flip { from { opacity:0;transform:perspective(1000px) rotateY(-78deg) scale(.9) } to { opacity:1;transform:perspective(1000px) rotateY(0) scale(1) } } @keyframes wheel-slow-progress { from { transform:scaleX(0) } to { transform:scaleX(1) } } .wheel-card { animation:card-in .3s ease-out both } .wheel-question-card { animation:wheel-card-flip .42s cubic-bezier(.2,.8,.2,1) both; backface-visibility:hidden } .wheel-slow-progress { transform-origin:left; animation:wheel-slow-progress 6.5s linear forwards }`}</style>
    <button onClick={onBack} className="mb-3 mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium" style={{ ...fontBody,color:C.ink,background:C.surface,borderColor:C.rule }}><ArrowLeft size={17}/> Testlarga qaytish</button>
    {setup ? <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="w-full min-w-0 rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}><h2 className="mb-3 flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><Users size={18}/> Ishtirokchilar</h2><label className="block text-xs" style={{...fontBody,color:C.inkSoft}}>Ism-familiyalarni kiriting, har qatorga bittadan<textarea rows={8} value={namesText} onChange={(e)=>setNamesText(e.target.value)} placeholder={'Ali Valiyev\nMalika Karimova\n...'} className="mt-1.5 w-full resize-y rounded-xl p-3 text-sm" style={{background:C.paper,border:`1px solid ${C.rule}`,color:C.ink}}/></label><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule,color:C.ink}}><Shuffle size={14}/> Jadval import qilish<input type="file" accept=".csv,.txt,.tsv,.xlsx" className="sr-only" onChange={(e)=>importNames(e.target.files?.[0])}/></label><p className="mt-2 text-xs" style={{...fontBody,color:C.inkSoft}}>{parsedNames.length} ishtirokchi · Excel XLSX, CSV va TSV jadvallari</p><div className="mt-4 rounded-xl p-3" style={{background:C.paper}}><label className="flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={groupMode} onChange={(e)=>setGroupMode(e.target.checked)}/> Guruhlarga ajratish</label>{groupMode&&<><label className="mt-3 block text-xs" style={{...fontBody,color:C.inkSoft}}>Guruhlar soni<input type="number" min="2" max="12" value={groupCount} onChange={(e)=>setGroupCount(e.target.value)} className="mt-1 block w-full rounded-lg p-2 text-sm" style={{background:C.surface,border:`1px solid ${C.rule}`}}/></label><div className="mt-3 max-h-44 space-y-2 overflow-auto">{parsedNames.map((name,i)=><label key={`${name}-${i}`} className="flex items-center justify-between gap-2 text-xs" style={{...fontBody,color:C.ink}}><span className="truncate">{name}</span><select aria-label={`${name} uchun guruh`} value={manualGroups[name] ?? ''} onChange={(e)=>setManualGroups((old)=>({...old,[name]:e.target.value===''?undefined:Number(e.target.value)}))} className="rounded-lg border p-1.5" style={{borderColor:C.rule,background:C.surface}}><option value="">Tasodifiy</option>{Array.from({length:Number(groupCount)},(_,g)=><option key={g} value={g}>{g+1}-guruh</option>)}</select></label>)}</div><p className="mt-2 text-[11px]" style={{...fontBody,color:C.inkSoft}}>Alohida belgilanmagan o‘quvchilar guruhlarga tasodifiy taqsimlanadi.</p></>}</div></section>
      <section className="w-full min-w-0 rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}>
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><CircleHelp size={18}/> Savol kartalari</h2><p className="mt-1 text-xs" style={{...fontBody,color:C.inkSoft}}>{questions.length} ta savol · savollar kartani ochganda ko‘rinadi</p></div><div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap"><button type="button" onClick={()=>{const question=freshQ();setQuestions((list)=>[...list,question]);setEditingQuestionId(question.id);setQuestionEditorOpen(true);setTestPickerOpen(false)}} className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold leading-tight whitespace-normal text-center sm:w-auto" style={{borderColor:C.rule,background:C.paper,color:C.ink}}><Plus size={16} className="shrink-0"/>Savol tuzish</button><button type="button" onClick={()=>{setTestPickerOpen((open)=>!open);setSelectedSourceTest(null);setSourceQuestions([]);setTestPickerQuery('');setQuestionEditorOpen(false);setEditingQuestionId(null)}} className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold leading-tight whitespace-normal text-center text-white sm:w-auto" style={{background:'linear-gradient(110deg,#4e91c7,#7657b8)'}}><Search size={16} className="shrink-0"/>Mavjud testdan savol qo‘shish</button></div></div>
        {!!questions.length&&<div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto rounded-xl border p-2" style={{borderColor:C.rule,background:C.paper}}>{questions.map((q,i)=><div key={q.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{background:editingQuestionId===q.id?'#edf4fa':'transparent'}}><span className="w-7 shrink-0 text-xs" style={{...fontMono,color:C.inkSoft}}>{String(i+1).padStart(2,'0')}</span><span className="min-w-0 flex-1 truncate text-xs" style={{...fontBody,color:C.ink}}>{q.question.trim()||'Yangi savol — matn kiritilmagan'}</span>{q.image&&<span className="shrink-0 text-[10px]" style={{color:'#548267'}}>Rasm</span>}<button type="button" onClick={()=>{setEditingQuestionId(q.id);setQuestionEditorOpen(true)}} className="rounded-md px-2 py-1 text-xs" style={{background:'#e7eff7',color:'#3d6689'}}>Tahrir</button><button type="button" aria-label={`Savol ${i+1} ni o‘chirish`} onClick={()=>{setQuestions((list)=>list.filter((x)=>x.id!==q.id));if(editingQuestionId===q.id){setEditingQuestionId(null);setQuestionEditorOpen(false)}}} className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{background:'#fde9e8',color:'#b94747'}}><X size={14}/></button></div>)}</div>}
        {questionEditorOpen&&editingQuestionId&&questions.find((q)=>q.id===editingQuestionId)&&<div className="mt-3 rounded-xl border p-3" style={{borderColor:C.rule,background:'#f6f8fa'}}>{(()=>{const q=questions.find((row)=>row.id===editingQuestionId);return <><div className="mb-2 flex items-center justify-between"><strong className="text-xs" style={{...fontMono,color:C.inkSoft}}>{questions.findIndex((row)=>row.id===q.id)+1}-savol</strong><button type="button" onClick={()=>{setQuestionEditorOpen(false);setEditingQuestionId(null)}} className="rounded-md px-2 py-1 text-xs" style={{background:C.surface,color:C.ink}}>Yopish</button></div><textarea autoFocus value={q.question} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,question:e.target.value}:x))} placeholder="Savol matni" rows={2} className="w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/><textarea value={q.answer} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,answer:e.target.value}:x))} placeholder="Javob" rows={2} className="mt-2 w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/>{q.image&&<img src={q.image} alt="Savol rasmi" className="mt-2 max-h-32 max-w-full rounded-lg object-contain"/>}<label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule,background:C.surface}}>{q.image?'Rasmni almashtirish':'Savolga rasm qo‘shish'}<input type="file" accept="image/*" className="sr-only" onChange={(e)=>addImage(q.id,e.target.files?.[0])}/></label></>})()}</div>}        {testPickerOpen&&<div className="mt-4 rounded-xl border p-3" style={{borderColor:C.rule,background:'#f7f8fa'}}><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold" style={{...fontBody,color:C.ink}}>{selectedSourceTest?selectedSourceTest.title:'Mavjud testni tanlang'}</h3>{selectedSourceTest&&<button type="button" onClick={()=>{setSelectedSourceTest(null);setSourceQuestions([]);setTestPickerQuery('')}} className="text-xs underline" style={{color:C.inkSoft}}>Testlar ro‘yxati</button>}</div><label className="flex items-center gap-2 rounded-lg border px-3" style={{borderColor:C.rule,background:C.surface,color:C.inkSoft}}><Search size={15}/><input type="search" value={testPickerQuery} onChange={(e)=>setTestPickerQuery(e.target.value)} placeholder={selectedSourceTest?'Savollar ichidan qidirish':'Testlarni qidirish'} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" style={{color:C.ink}}/></label>{selectedSourceTest?<div className="mt-3">{loadingSourceTestId?<p className="py-3 text-center text-sm">Savollar yuklanmoqda…</p>:<><p className="mb-2 text-xs" style={{...fontBody,color:C.inkSoft}}>{matchingSourceQuestions.length} savol ko‘rinmoqda — testdagi barcha mos savollar qo‘shiladi.</p><div className="max-h-52 space-y-1.5 overflow-y-auto">{matchingSourceQuestions.map((question,index)=><div key={question.id||index} className="rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule,background:C.surface}}>{question.text||question.question||question.prompt||`Savol ${index+1}`}</div>)}</div><button type="button" onClick={addWholeTest} disabled={!sourceQuestions.length} className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{background:'linear-gradient(110deg,#4e91c7,#7657b8)'}}>Shu testdagi barcha savollarni qo‘shish ({sourceQuestions.length})</button></>}</div>:<div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">{matchingSourceTests.length?matchingSourceTests.map((test)=><button type="button" key={test.id} disabled={loadingSourceTestId===test.id} onClick={()=>chooseSourceTest(test)} className="flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm disabled:opacity-60" style={{borderColor:C.rule,background:C.surface,color:C.ink}}><span className="min-w-0 truncate">{test.title}</span><span className="shrink-0 text-xs" style={{color:C.inkSoft}}>{loadingSourceTestId===test.id?'Yuklanmoqda…':`${test.questionCount||test.questions?.length||0} savol`}</span></button>):<p className="py-3 text-center text-xs" style={{color:C.inkSoft}}>Mos test topilmadi.</p>}</div>}</div>}
        <div className="mt-4 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>To‘g‘ri javob balli<input type="number" value={positive} onChange={(e)=>setPositive(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/></label><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>Xato javobda ayiriladigan ball<input type="number" min="0" value={negative} onChange={(e)=>setNegative(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/><span className="mt-1 block">0 — ayirilmaydi. Masalan, 4 kiritsangiz 4 ball ayriladi.</span></label></div><label className="mt-3 flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={effectsOn} onChange={(e)=>setEffectsOn(e.target.checked)}/> Xato javobda ball ayirish</label>
      </section>
      <button type="button" disabled={parsedNames.length<2||!questions.some((q)=>q.question.trim()&&q.answer.trim())} onClick={start} className="lg:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40" style={{background:'linear-gradient(110deg,#3977ad,#8062b7)'}}><Disc3 size={20}/>Baraban o‘yinini boshlash</button>
    </div> : <section className="rounded-2xl border p-4 sm:p-6" style={{background:C.surface,borderColor:C.rule}}>
        {briefing ? <div className="mx-auto max-w-5xl text-center"><h2 className="text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>Ishtirokchilar bilan tanishing</h2><p className="mb-4 mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>Tayyorgarlik tugagach boshlash tugmasini bosing.</p><div className="grid max-h-[55vh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{activeItems.map((item,index)=><article key={item.id} className="rounded-xl border p-3 text-left" style={{background:C.paper,borderColor:palette[index%palette.length]}}><strong style={{...fontBody,color:C.ink}}>{item.name}</strong>{groupMode&&<p className="mt-1 text-xs" style={{...fontBody,color:C.inkSoft}}>{item.members.map((person)=>person.name).join(' · ')}</p>}</article>)}</div><div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={()=>{setSetup(true);setBriefing(false)}} className="rounded-xl border px-4 py-3 text-sm" style={{borderColor:C.rule,background:C.surface,color:C.ink}}>Ishtirokchi/guruhni o‘zgartirish</button><button onClick={()=>setBriefing(false)} className="rounded-xl px-6 py-3 text-sm font-semibold text-white" style={{background:'#426f9c'}}>Hamma tayyor — boshlash</button></div></div> : result ? <div className="mx-auto max-w-2xl"><h2 className="mb-3 text-center text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>O‘yin natijalari</h2>{ranked.map((item,index)=><div key={item.id} className="mb-2 flex justify-between rounded-xl border p-3" style={{background:C.paper,borderColor:C.rule}}><span style={{...fontBody,color:C.ink}}>{index+1}. {item.name}</span><strong style={{...fontMono,color:C.ink}}>{item.score} ball</strong></div>)}<div className="text-center"><button onClick={()=>{setSetup(true);setBriefing(false)}} className="mt-3 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{background:'#344356'}}>Yangi o‘yin</button></div></div> : current && showSelectedParticipant ? <div className="mx-auto flex min-h-[75vh] w-full max-w-5xl flex-col items-center justify-center rounded-3xl border p-6 text-center shadow-xl sm:p-10" style={{background:'radial-gradient(circle at 50% 10%,#fff 0%,#eff6fb 45%,#f5f0e0 100%)',borderColor:C.rule}}><div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl" style={{background:'#e7f3e9',color:'#34875b'}}><Trophy size={30}/></div><p className="text-sm font-semibold uppercase tracking-wider" style={{...fontMono,color:'#668071'}}>Baraban tanladi</p><h2 className="mt-2 max-w-4xl break-words text-4xl font-bold leading-tight sm:text-6xl" style={{...fontDisplay,color:'#2f5875'}}>{players.find((person)=>person.id===current)?.name}</h2>{groupMode&&<p className="mt-3 rounded-full px-4 py-2 text-base font-semibold" style={{...fontBody,color:'#44744f',background:'#e4f1e4'}}>{groups.find((group)=>group.id===players.find((person)=>person.id===current)?.groupId)?.name}</p>}<p className="mt-5 text-sm" style={{...fontBody,color:C.inkSoft}}>{groupMode?'Javob uchun ball jamoaga yoziladi.':'Javob uchun ball ishtirokchining o‘ziga yoziladi.'}</p><div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full" style={{background:'#dfe8ec'}}><div className="wheel-slow-progress h-full rounded-full" style={{background:'linear-gradient(90deg,#39a96b,#4387c5)'}}/></div><button type="button" onClick={()=>{setSetup(true);setShowSelectedParticipant(false)}} className="mt-4 text-sm underline" style={{color:C.inkSoft}}>Ishtirokchi yoki guruh sozlamalarini o‘zgartirish</button></div> : current ? <div className="mx-auto w-full max-w-6xl"><section className="mb-4 rounded-2xl border p-3 sm:p-4" style={{background:'linear-gradient(110deg,#fffdf8,#edf4f8)',borderColor:C.rule}}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>{groupMode?'Guruh navbati':'Ishtirokchi navbati'}</p><h2 className="text-2xl font-bold sm:text-3xl" style={{...fontDisplay,color:'#385f7e'}}>{players.find((p)=>p.id===current)?.name}</h2>{groupMode&&<p className="mt-1 inline-flex rounded-full px-3 py-1 text-sm" style={{...fontBody,color:'#44744f',background:'#e4f1e4'}}>{groups.find((group)=>group.id===players.find((p)=>p.id===current)?.groupId)?.name}</p>}</div><button type="button" onClick={()=>setShowScoreboard((value)=>!value)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{background:C.surface,borderColor:C.rule,color:C.ink}}><Trophy size={16} className="mr-2 inline"/>{showScoreboard?'Natijalarni yashirish':'Natijalar'}</button></div>{showScoreboard&&<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{ranked.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-xl border p-3" style={{background:C.paper,borderColor:palette[i%palette.length]}}><span style={{...fontBody,color:C.ink}}>{item.name}</span><b style={{...fontMono,color:C.ink}}>{item.score} ball</b></div>)}</div>}</section><div className="mb-3 flex items-end justify-between"><div><h3 className="text-xl font-semibold" style={{...fontDisplay,color:C.ink}}>Yashirin kartalardan birini tanlang</h3><p className="mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>Savol kartani ochganda ko‘rinadi.</p></div><span className="rounded-full px-3 py-1 text-sm" style={{...fontMono,color:C.inkSoft,background:C.surface}}>{questions.filter((q)=>q.question.trim()&&q.answer.trim()&&!usedQuestionIds.has(q.id)).length} karta</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{questions.map((q,i)=>usedQuestionIds.has(q.id)?null:<button key={q.id} disabled={!q.question.trim()||!q.answer.trim()} onClick={()=>{setQuestionIndex(i);setSelectedQuestion(q);setUsedQuestionIds((old)=>new Set(old).add(q.id));setShowAnswer(false)}} className="wheel-question-card relative flex aspect-[5/3] flex-col items-center justify-center overflow-hidden rounded-2xl border p-3 text-center shadow-md transition hover:-translate-y-1 hover:shadow-xl disabled:opacity-40" style={{animationDelay:String((i%8)*35)+'ms',background:`linear-gradient(145deg,${palette[i%palette.length]},${palette[(i+5)%palette.length]})`,borderColor:'#ffffff99',color:'white'}}><span className="absolute right-2 top-1 text-xs opacity-80">✦</span><span className="text-3xl font-bold" style={{...fontMono,textShadow:'0 2px 4px #0005'}}>{String(i+1).padStart(2,'0')}</span><span className="mt-1 text-xs font-semibold uppercase tracking-wider">Yashirin savol</span></button>)}</div><div className="mt-5 text-center"><button type="button" onClick={()=>{setRemaining((rows)=>[current,...rows]);setCurrent(null)}} className="rounded-xl border px-4 py-2.5 text-sm" style={{borderColor:C.rule,background:C.surface,color:C.ink}}>Ishtirokchini qaytarib, barabanga qaytish</button></div></div> : <div className="mx-auto w-full max-w-6xl">
          <div className="mb-2 flex justify-end"><button type="button" onClick={()=>{setSetup(true);setShowSelectedParticipant(false)}} className="rounded-lg border px-3 py-1.5 text-xs" style={{background:C.surface,borderColor:C.rule,color:C.ink}}>Ishtirokchi/guruh sozlamalarini o‘zgartirish</button></div>{groupMode&&<section className="mb-2 rounded-xl border px-3 py-2" style={{background:'linear-gradient(110deg,#fffdf8,#edf4f8)',borderColor:C.rule}}><div className="mb-1 text-[11px] font-semibold" style={{...fontBody,color:C.ink}}>Jamoalar hisobi</div><div className="flex flex-wrap gap-2">{ranked.map((item,i)=><div key={item.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1" style={{background:C.paper,borderColor:palette[i%palette.length]}}><span className="max-w-36 truncate text-xs" style={{...fontBody,color:C.ink}}>{item.name}</span><strong className="text-xs" style={{...fontMono,color:C.ink}}>{item.score}</strong></div>)}</div></section>}
          <div className="text-center"><div onPointerDown={(event)=>{const box=event.currentTarget.getBoundingClientRect();const cx=box.left+box.width/2,cy=box.top+box.height/2;const radius=Math.hypot(event.clientX-cx,event.clientY-cy);if(radius>box.width*.37){onWheelPointerDown(event);event.currentTarget.setPointerCapture(event.pointerId)}}} onPointerUp={onWheelPointerUp} onPointerCancel={()=>{dragStart.current=null}} className="relative mx-auto aspect-square w-[min(88vw,78vh)] min-w-[min(280px,88vw)] max-w-[860px] touch-none select-none">
            <div className="absolute inset-0 rounded-full border-[10px] border-white shadow-[0_20px_65px_rgba(48,65,83,.22)]" style={{background:`conic-gradient(${wheelItems.map((_,i)=>`${palette[i%palette.length]} ${i*360/Math.max(1,wheelItems.length)}deg ${(i+1)*360/Math.max(1,wheelItems.length)}deg`).join(',')})`,transform:`rotate(${spinAngle}deg)`,transition:spinning?`transform ${spinDuration}ms cubic-bezier(.12,.62,.18,1)`:'none'}}>
              <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full" aria-hidden="true">{wheelItems.map((person,i)=>{const middle=(i+.5)*360/Math.max(1,wheelItems.length);const fontSize=Math.min(wheelItems.length>26?12:wheelItems.length>18?14:wheelItems.length>12?16:18,Math.max(9,145/(person.name.length*.58)));const radialRotation=middle>180?90:-90;return <g key={person.id} transform={`rotate(${middle} 250 250)`}><text x="250" y="105" transform={`rotate(${radialRotation} 250 105)`} textAnchor="middle" fill="white" stroke="#26384c" strokeOpacity=".75" strokeWidth="1.2" paintOrder="stroke" fontSize={fontSize} fontWeight="700" fontFamily="system-ui, sans-serif">{person.name}</text></g>})}</svg>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[-4px] z-20 -translate-x-1/2"><div className="h-0 w-0 border-x-[17px] border-t-[28px] border-x-transparent border-t-[#25a45a] drop-shadow-md"/></div>
            <div className="pointer-events-none absolute inset-[43%] z-10 grid place-items-center rounded-full border-[5px] border-white bg-gradient-to-br from-white to-slate-100 shadow-lg"><span className="h-3 w-3 rounded-full" style={{background:'#597aa0'}}/></div>
          </div><div className="mt-3 flex flex-wrap items-center justify-center gap-3"><button type="button" disabled={spinning||!remaining.length} onClick={()=>spin(1.25,-1)} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.03] disabled:opacity-50" style={{background:'linear-gradient(110deg,#3384c2,#7258b8)'}}><RotateCcw size={18} className={spinning?'animate-spin':''}/>{spinning?'Aylanmoqda…':'Aylantirish'}</button><span className="text-sm" style={{...fontBody,color:C.inkSoft}}>yoki baraban chetidan suring</span></div><p className="mt-1 text-xs" style={{...fontMono,color:C.inkSoft}}>Navbat {turn+1} · {remaining.length} ishtirokchi qoldi{spinning?' · asta sekinlashmoqda':''}</p></div>
        </div>}
    </section>}
    {current&&questionIndex!==null&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-3 sm:p-6"><section className="wheel-card w-full max-w-5xl rounded-3xl border p-5 shadow-2xl sm:p-8" style={{background:C.paper,borderColor:C.rule}}><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Barabandan tanlandi · navbat {turn+1}</div><h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={{...fontDisplay,color:'#385f7e'}}>{players.find((p)=>p.id===current)?.name}</h2>{groupMode&&<p className="mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>{groups.find((group)=>group.id===players.find((p)=>p.id===current)?.groupId)?.name}</p>}</div><button type="button" aria-label="Savolni yopish" onClick={()=>{setQuestionIndex(null);setSelectedQuestion(null);setShowAnswer(false)}} className="rounded-full p-2" style={{color:C.inkSoft,background:C.surface}}>✕</button></div><article className="rounded-2xl border p-5 sm:p-7" style={{background:'linear-gradient(135deg,#fff8e9,#eef5fb)',borderColor:C.rule}}><span className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{...fontMono,color:'#526d7f',background:'#e6f0f5'}}>Savol {questionIndex+1}</span><p className="whitespace-pre-wrap text-2xl font-semibold leading-relaxed sm:text-4xl" style={{...fontBody,color:C.ink}}>{selectedQuestion?.question}</p>{selectedQuestion?.image&&<img src={selectedQuestion?.image} alt="Savol rasmi" className="mx-auto mt-5 max-h-[55vh] max-w-full rounded-2xl object-contain"/>}</article>{showAnswer?<div className="mt-3 rounded-2xl border p-4 sm:p-5" style={{background:'#edf5ed',borderColor:'#c5ddc6',color:C.ink}}><div className="mb-1 text-xs uppercase tracking-wider" style={fontMono}>Javob</div><div className="whitespace-pre-wrap text-xl font-medium sm:text-3xl" style={fontBody}>{selectedQuestion?.answer}</div></div>:<button onClick={()=>setShowAnswer(true)} className="mt-3 rounded-xl border px-5 py-3 text-base font-semibold" style={{...fontBody,borderColor:C.rule,background:C.surface,color:C.ink}}>Javobni ko‘rish</button>}{showAnswer&&<div className="mt-4 grid grid-cols-2 gap-3"><button onClick={()=>finishAnswer(true)} className="rounded-xl py-3 text-base font-semibold text-white shadow-sm" style={{background:'linear-gradient(110deg,#4d9a72,#3e8066)'}}><Check size={18} className="mr-1 inline"/>To‘g‘ri · +{positive}</button><button onClick={()=>finishAnswer(false)} className="rounded-xl py-3 text-base font-semibold text-white shadow-sm" style={{background:'linear-gradient(110deg,#cb7460,#a85d59)'}}>Noto‘g‘ri{effectsOn?(' · '+negative):' · 0'}</button></div>}<button onClick={()=>{setRemaining((rows)=>[current,...rows]);setCurrent(null);setQuestionIndex(null)}} className="mt-4 text-sm underline" style={{color:C.inkSoft}}>Tanlovni bekor qilish</button></section></div>}
  </div>
  </main>;
}

