import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, Plus, RotateCcw, Search, Shuffle, Sparkles, Trophy, Users } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App.jsx';

const palette = ['#E6B84B','#4E91C7','#61A98C','#9A73C9','#E77C59','#55A9B1','#D96688','#86A84D'];
const mix = (list) => [...list].sort(() => Math.random() - .5);
const cleanLines = (text) => text.split(/[\n,;]+/).map((name) => name.trim().replace(/^\d+\s*(?:[.)-]\s*|\t+|\s{2,})/, '')).filter(Boolean);
const freshQ = () => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, question: '', answer: '', image: '' });

export default function LuckyWheel({ onBack, tests = [], ensureTestContent }) {
  const [setup, setSetup] = useState(true);
  const [briefing, setBriefing] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [manualGroups, setManualGroups] = useState({});
  const [groups, setGroups] = useState([]);
  const [questions, setQuestions] = useState([freshQ(), freshQ(), freshQ()]);
  const [testPickerOpen, setTestPickerOpen] = useState(false);
  const [testPickerQuery, setTestPickerQuery] = useState('');
  const [selectedSourceTest, setSelectedSourceTest] = useState(null);
  const [sourceQuestions, setSourceQuestions] = useState([]);
  const [loadingSourceTestId, setLoadingSourceTestId] = useState(null);
  const [positive, setPositive] = useState('10');
  const [negative, setNegative] = useState('-5');
  const [effectsOn, setEffectsOn] = useState(false);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [remaining, setRemaining] = useState([]);
  const [current, setCurrent] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(1440);
  const [spinDuration, setSpinDuration] = useState(5200);
  const dragStart = useRef(null);
  const [turn, setTurn] = useState(0);
  const [result, setResult] = useState(null);
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
  const addSourceQuestion = (source) => {
    const question = source.text || source.question || source.prompt || '';
    let answer = source.answer || (Array.isArray(source.answers) ? source.answers.join(' / ') : '');
    if (source.type === 'matching' && Array.isArray(source.pairs)) {
      answer = source.pairs.map((pair) => `${pair.left || pair.prompt || pair.term || ''} — ${pair.right || pair.answer || pair.target || ''}`).join('\n');
    } else if (!answer && Number.isInteger(source.correct)) {
      answer = source.options?.[source.correct] ?? '';
    } else if (!answer && typeof source.correct === 'string') {
      answer = source.correct;
    }
    if (!question.trim() || !String(answer).trim()) return;
    setQuestions((list) => [...list, { ...freshQ(), question, answer: String(answer), image: source.imageUrl || source.image || '' }]);
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
      list.forEach((person) => { const target = manualGroups[person.name] != null ? Number(manualGroups[person.name]) : randomPlacement.get(person.id); nextGroups[target]?.members.push(person); });
    }
    const active = groupMode ? nextGroups : list;
    const scoresInit = Object.fromEntries(active.map((p) => [p.id, 0]));
    setGroups(nextGroups); setPlayers(list); setScores(scoresInit); setRemaining(active.map((p) => p.id));
    setCurrent(null); setResult(null); setTurn(0); setSetup(false); setBriefing(true);
  };
  const spin = (effort = 1, direction = 1) => {
    if (spinning || !remaining.length) return;
    setSpinning(true);
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    const slice = 360 / Math.max(1, activeItems.length);
    const segment = activeItems.findIndex((person) => person.id === chosen);
    const currentAngle = ((spinAngle % 360) + 360) % 360;
    const target = (segment + .5) * slice;
    const offset = direction >= 0 ? (90 - target - currentAngle + 720) % 360 : -((currentAngle + target - 90 + 720) % 360);
    const power = Math.min(1.8, Math.max(.3, effort));
    const turns = 4 + Math.round(power * 1.4);
    const duration = Math.round(4600 + power * 1050);
    const endAngle = spinAngle + direction * turns * 360 + offset;
    setSpinDuration(duration);
    setSpinAngle(endAngle);
    window.setTimeout(() => { setCurrent(chosen); setRemaining((prev) => prev.filter((id) => id !== chosen)); setSpinning(false); }, duration + 100);
  };
  const onWheelPointerDown = (event) => { if (!spinning && remaining.length) dragStart.current = { x: event.clientX, y: event.clientY }; };
  const onWheelPointerUp = (event) => {
    if (!dragStart.current) return;
    const distance = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
    const direction = event.clientX - dragStart.current.x < 0 ? -1 : 1;
    dragStart.current = null;
    if (distance >= 28) spin(distance / 150, direction);
  };
  const activeItems = groupMode ? groups : players;
  const finishAnswer = (correct) => {
    const item = activeItems.find((person) => person.id === current);
    const delta = correct ? Number(positive) : (effectsOn ? Number(negative) : 0);
    setScores((old) => ({ ...old, [current]: (old[current] || 0) + delta }));
    setQuestionIndex(null); setShowAnswer(false); setTurn((n) => n + 1);
    if (!remaining.length) {
      const final = activeItems.map((person) => ({ ...person, score: (scores[person.id] || 0) + (person.id === current ? delta : 0) })).sort((a,b) => b.score-a.score);
      setResult(final); setCurrent(null);
    } else setCurrent(null);
    return item;
  };
  const addImage = (id, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader(); reader.onload = () => setQuestions((rows) => rows.map((q) => q.id === id ? { ...q, image: String(reader.result) } : q)); reader.readAsDataURL(file);
  };
  const ranked = result || activeItems.map((person) => ({ ...person, score: scores[person.id] || 0 })).sort((a,b) => b.score-a.score);

  return <main className="fixed inset-0 z-[110] overflow-y-auto px-3 pb-5 sm:px-6" style={{ background:C.paper }}>
    <div className="mx-auto max-w-[1680px]">
    <style>{`@keyframes card-in { from { opacity:0;transform:translateY(14px) scale(.97) } to { opacity:1;transform:none } } @keyframes wheel-card-flip { from { opacity:0;transform:perspective(1000px) rotateY(-78deg) scale(.9) } to { opacity:1;transform:perspective(1000px) rotateY(0) scale(1) } } .wheel-card { animation:card-in .3s ease-out both } .wheel-question-card { animation:wheel-card-flip .42s cubic-bezier(.2,.8,.2,1) both; backface-visibility:hidden }`}</style>
    <button onClick={onBack} className="mb-3 mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium" style={{ ...fontBody,color:C.ink,background:C.surface,borderColor:C.rule }}><ArrowLeft size={17}/> Testlarga qaytish</button>
    <header className="mb-3 flex items-center gap-3 rounded-2xl border p-3 sm:p-4" style={{ background:'linear-gradient(115deg,#fff8e8,#edf6fb 55%,#f0f8f1)',borderColor:C.rule }}><span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background:'#f2dfb1',color:'#7b5e21' }}><Sparkles size={22}/></span><div><p className="text-[10px] uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Sinfdagi savol-javob o‘yini</p><h1 className="text-xl font-semibold sm:text-2xl" style={{...fontDisplay,color:C.ink}}>Bilim charxpalagi</h1></div></header>
    {setup ? <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}><h2 className="mb-3 flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><Users size={18}/> Ishtirokchilar</h2><label className="block text-xs" style={{...fontBody,color:C.inkSoft}}>Ism-familiyalarni kiriting, har qatorga bittadan<textarea rows={8} value={namesText} onChange={(e)=>setNamesText(e.target.value)} placeholder={'Ali Valiyev\nMalika Karimova\n...'} className="mt-1.5 w-full resize-y rounded-xl p-3 text-sm" style={{background:C.paper,border:`1px solid ${C.rule}`,color:C.ink}}/></label><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule,color:C.ink}}><Shuffle size={14}/> Jadval import qilish<input type="file" accept=".csv,.txt,.tsv,.xlsx" className="sr-only" onChange={(e)=>importNames(e.target.files?.[0])}/></label><p className="mt-2 text-xs" style={{...fontBody,color:C.inkSoft}}>{parsedNames.length} ishtirokchi · Excel XLSX, CSV va TSV jadvallari</p><div className="mt-4 rounded-xl p-3" style={{background:C.paper}}><label className="flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={groupMode} onChange={(e)=>setGroupMode(e.target.checked)}/> Guruhlarga ajratish</label>{groupMode&&<><label className="mt-3 block text-xs" style={{...fontBody,color:C.inkSoft}}>Guruhlar soni<input type="number" min="2" max="12" value={groupCount} onChange={(e)=>setGroupCount(e.target.value)} className="mt-1 block w-full rounded-lg p-2 text-sm" style={{background:C.surface,border:`1px solid ${C.rule}`}}/></label><div className="mt-3 max-h-44 space-y-2 overflow-auto">{parsedNames.map((name,i)=><label key={`${name}-${i}`} className="flex items-center justify-between gap-2 text-xs" style={{...fontBody,color:C.ink}}><span className="truncate">{name}</span><select aria-label={`${name} uchun guruh`} value={manualGroups[name] ?? ''} onChange={(e)=>setManualGroups((old)=>({...old,[name]:e.target.value===''?undefined:Number(e.target.value)}))} className="rounded-lg border p-1.5" style={{borderColor:C.rule,background:C.surface}}><option value="">Tasodifiy</option>{Array.from({length:Number(groupCount)},(_,g)=><option key={g} value={g}>{g+1}-guruh</option>)}</select></label>)}</div><p className="mt-2 text-[11px]" style={{...fontBody,color:C.inkSoft}}>Alohida belgilanmagan o‘quvchilar guruhlarga tasodifiy taqsimlanadi.</p></>}</div></section>
      <section className="rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}><h2 className="mb-1 flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><CircleHelp size={18}/> Yashirin savollar</h2><p className="mb-3 text-xs" style={{...fontBody,color:C.inkSoft}}>Savol, javob va istasangiz savol rasmini ham kiriting.</p><div className="space-y-3">{questions.map((q,i)=><article key={q.id} className="rounded-xl border p-3" style={{background:C.paper,borderColor:C.rule}}><div className="mb-2 flex justify-between text-xs" style={{...fontMono,color:C.inkSoft}}>Karta {i+1}<button onClick={()=>setQuestions((list)=>list.filter((x)=>x.id!==q.id))} className="text-red-700">O‘chirish</button></div><textarea value={q.question} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,question:e.target.value}:x))} placeholder="Savol" rows={2} className="w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/><textarea value={q.answer} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,answer:e.target.value}:x))} placeholder="Javob" rows={2} className="mt-2 w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/>{q.image&&<img src={q.image} alt="Savol" className="mt-2 max-h-32 rounded-lg object-contain"/>}<label className="mt-2 inline-block cursor-pointer rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule}}>{q.image?'Rasmni almashtirish':'Savolga rasm qo‘shish'}<input type="file" accept="image/*" className="sr-only" onChange={(e)=>addImage(q.id,e.target.files?.[0])}/></label></article>)}</div><button onClick={()=>setQuestions((list)=>[...list,freshQ()])} className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{borderColor:C.rule}}>+ Savol qo‘shish</button><button type="button" onClick={openTestPicker} className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium" style={{background:'#e9edf1',color:'#344356'}}><Plus size={15}/> Mavjud testdan savol qo‘shish</button>
        {testPickerOpen&&<div className="mt-3 rounded-xl border p-3" style={{borderColor:C.rule,background:'#f8f7f3'}}><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-semibold" style={{...fontBody,color:C.ink}}>{selectedSourceTest?selectedSourceTest.title:'Testni qidiring'}</p>{selectedSourceTest&&<button type="button" onClick={()=>{setSelectedSourceTest(null);setSourceQuestions([]);setTestPickerQuery('')}} className="text-xs underline" style={{color:C.inkSoft}}>Testlar ro‘yxati</button>}</div><label className="flex items-center gap-2 rounded-lg border px-3" style={{borderColor:C.rule,background:C.surface,color:C.inkSoft}}><Search size={15}/><input type="search" value={testPickerQuery} onChange={(e)=>setTestPickerQuery(e.target.value)} placeholder={selectedSourceTest?'Savolni qidirish':'Mavjud testlarni qidirish'} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" style={{color:C.ink}}/></label>
          {selectedSourceTest?<div className="mt-2 max-h-64 space-y-2 overflow-y-auto">{loadingSourceTestId?<p className="py-3 text-center text-xs" style={{color:C.inkSoft}}>Savollar yuklanmoqda…</p>:matchingSourceQuestions.length?matchingSourceQuestions.map((question,index)=><div key={question.id||index} className="flex items-start justify-between gap-3 rounded-lg border p-2.5" style={{borderColor:C.rule,background:C.surface}}><p className="min-w-0 whitespace-pre-wrap text-xs" style={{...fontBody,color:C.ink}}>{question.text||question.question||question.prompt||`Savol ${index+1}`}</p><button type="button" onClick={()=>addSourceQuestion(question)} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium" style={{background:'#344356',color:'#fff'}}>Qo‘shish</button></div>):<p className="py-3 text-center text-xs" style={{color:C.inkSoft}}>Mos savol topilmadi.</p>}</div>:<div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">{matchingSourceTests.length?matchingSourceTests.map((test)=><button type="button" key={test.id} disabled={loadingSourceTestId===test.id} onClick={()=>chooseSourceTest(test)} className="flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-xs disabled:opacity-60" style={{borderColor:C.rule,background:C.surface,color:C.ink}}><span className="min-w-0 truncate">{test.title}</span><span className="shrink-0" style={{color:C.inkSoft}}>{loadingSourceTestId===test.id?'Yuklanmoqda…':`${test.questionCount||test.questions?.length||0} savol`}</span></button>):<p className="py-3 text-center text-xs" style={{color:C.inkSoft}}>Mos test topilmadi.</p>}</div>}
        </div>}
        <div className="mt-4 grid grid-cols-2 gap-2"><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>To‘g‘ri javob balli<input type="number" value={positive} onChange={(e)=>setPositive(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/></label><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>Xato javobdagi ball<input type="number" value={negative} onChange={(e)=>setNegative(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/></label></div><label className="mt-3 flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={effectsOn} onChange={(e)=>setEffectsOn(e.target.checked)}/> Xato javobda ball ayirish</label><button disabled={parsedNames.length<2||!questions.some((q)=>q.question.trim()&&q.answer.trim())} onClick={start} className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40" style={{...fontBody,background:'#344356',color:'#fff'}}>O‘yinni boshlash</button></section>
    </div> : <section className="rounded-2xl border p-4 sm:p-6" style={{background:C.surface,borderColor:C.rule}}>
      {briefing ? <div className="wheel-card rounded-3xl border p-4 sm:p-6" style={{background:'linear-gradient(135deg,#fffaf0,#eff7fb 60%,#f2f8f1)',borderColor:C.rule}}><div className="mx-auto mb-4 max-w-2xl text-center"><span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{...fontBody,color:'#486f5d',background:'#e8f3e9'}}><Users size={14}/>{groupMode?'Jamoalar tanishuvi':'Ishtirokchilar tanishuvi'}</span><h2 className="mt-3 text-2xl font-semibold sm:text-3xl" style={{...fontDisplay,color:C.ink}}>Hamma navbatini ko‘rib olsin</h2><p className="mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>Tarkib va ismlarni ko‘zdan kechiring. Tayyorgarlik tugagach o‘yinni o‘zingiz boshlaysiz.</p></div><div className="mx-auto grid max-h-[58vh] max-w-5xl gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{activeItems.map((item,index)=><article key={item.id} className="rounded-2xl border p-4" style={{background:C.surface,borderColor:palette[index%palette.length]}}><div className="flex items-center justify-between"><h3 className="text-lg font-semibold" style={{...fontBody,color:C.ink}}>{groupMode?item.name:`${index+1}. ${item.name}`}</h3>{groupMode&&<span className="rounded-full px-2 py-1 text-[11px]" style={{...fontMono,color:C.inkSoft,background:C.paper}}>{item.members.length} kishi</span>}</div>{groupMode&&<div className="mt-2 flex flex-wrap gap-1.5">{item.members.map((person)=><span key={person.id} className="rounded-full px-2.5 py-1 text-xs" style={{...fontBody,color:'#405a71',background:'#eaf2f8'}}>{person.name}</span>)}</div>}</article>)}</div><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={()=>{setBriefing(false);setSetup(true)}} className="rounded-xl border px-4 py-3 text-sm" style={{...fontBody,color:C.ink,borderColor:C.rule,background:C.surface}}>Tarkibni tahrirlash</button><button onClick={()=>setBriefing(false)} className="rounded-xl px-6 py-3 text-sm font-semibold shadow-sm" style={{...fontBody,color:'#fff',background:'linear-gradient(110deg,#426f9c,#547b67)'}}>Hamma tayyor — o‘yinni boshlash</button></div></div> : result ? <><div className="mb-4 text-center"><Trophy className="mx-auto" size={34} style={{color:'#b38d43'}}/><h2 className="mt-2 text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>O‘yin natijalari</h2></div><div className="mx-auto max-w-xl space-y-2">{ranked.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-xl border p-3" style={{background:i===0?'linear-gradient(110deg,#f5edda,#fffdf8)':C.paper,borderColor:i===0?'#d8c58f':C.rule}}><span style={{...fontBody,color:C.ink}}>{i===0?'🏆 ':''}{i+1}. {item.name}</span><b style={{...fontMono,color:C.ink}}>{item.score} ball</b></div>)}</div><div className="mt-5 text-center"><button onClick={()=>{setSetup(true);setBriefing(false)}} className="rounded-xl px-5 py-3 text-sm font-semibold" style={{...fontBody,background:'#344356',color:'#fff'}}><RotateCcw size={16} className="mr-2 inline"/>Yangi o‘yin</button></div></> : <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:items-center">
        <div className="text-center"><div onPointerDown={(event)=>{onWheelPointerDown(event);if(dragStart.current)event.currentTarget.setPointerCapture(event.pointerId)}} onPointerUp={onWheelPointerUp} onPointerCancel={()=>{dragStart.current=null}} className="relative mx-auto aspect-square w-[min(68vw,62vh)] min-w-[260px] max-w-[620px] touch-none select-none"><div className="absolute inset-0 rounded-full border-[12px] border-white shadow-[0_20px_65px_rgba(48,65,83,.25)]" style={{background:`conic-gradient(${activeItems.map((_,i)=>`${palette[i%palette.length]} ${i*360/Math.max(1,activeItems.length)}deg ${(i+1)*360/Math.max(1,activeItems.length)}deg`).join(',')})`,transform:`rotate(${spinAngle}deg)`,transition:spinning?`transform ${spinDuration}ms cubic-bezier(.08,.76,.13,1)`:'none'}}/><div className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 text-5xl font-bold" style={{color:'#33465b',filter:'drop-shadow(0 2px 2px #ffffff)'}}>◀</div><button type="button" disabled={spinning||!remaining.length} onClick={()=>spin()} className="absolute inset-[34%] z-10 grid place-items-center rounded-full border-[8px] border-white text-center shadow-lg transition-transform hover:scale-105 disabled:cursor-wait" style={{...fontBody,color:'#304b60',background:'radial-gradient(circle at 35% 30%,#fff,#eef4f4)'}}><span><RotateCcw size={24} className={`mx-auto mb-1 ${spinning?'animate-spin':''}`} style={{animationDuration:'2s'}}/><span className="block text-xs font-bold uppercase tracking-wider">{spinning?'Aylanmoqda':remaining.length?'Surib aylantiring':'Yakunlandi'}</span></span></button><span className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 -translate-y-1/3 text-3xl" aria-hidden="true">🔻</span></div><p className="mt-2 text-sm font-medium" style={{...fontBody,color:C.ink}}>Barabanni chetidan suring yoki markazni bosing</p><p className="mt-1 text-xs" style={{...fontMono,color:C.inkSoft}}>Navbat {turn+1} · {remaining.length} ishtirokchi qoldi{spinning?' · sekinlashmoqda':''}</p></div>
        <div><h2 className="mb-3 text-lg font-semibold" style={{...fontDisplay,color:C.ink}}>Joriy hisob</h2><div className="space-y-2">{ranked.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-xl border p-3" style={{background:C.paper,borderColor:C.rule}}><span className="text-sm" style={{...fontBody,color:C.ink}}>{item.name}</span><strong style={{...fontMono,color:C.ink}}>{item.score} ball</strong></div>)}</div></div>
      </div>}
    </section>}
    {current&&questionIndex===null&&<section className="wheel-card mt-4 rounded-3xl border p-4 sm:p-5" style={{background:'linear-gradient(130deg,#fff8e9,#eef5fb)',borderColor:C.rule}}><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Navbatdagi ishtirokchi</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={{...fontDisplay,color:'#385f7e'}}>{activeItems.find((p)=>p.id===current)?.name}</h2>{groupMode&&<p className="mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>Jamoa tarkibi: {activeItems.find((p)=>p.id===current)?.members?.map((person)=>person.name).join(' · ')}</p>}</div><button type="button" onClick={()=>{setRemaining((rows)=>[current,...rows]);setCurrent(null)}} className="rounded-xl border px-3 py-2 text-xs" style={{...fontBody,color:C.inkSoft,borderColor:C.rule,background:C.surface}}>Navbatni qaytarish</button></div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold" style={{...fontBody,color:C.ink}}>Yashirin kartalardan savol tanlang</h3><p className="text-xs" style={{...fontBody,color:C.inkSoft}}>Savol kartalari hisob jadvalidan alohida.</p></div><span className="rounded-full px-3 py-1 text-xs" style={{...fontMono,color:C.inkSoft,background:C.surface}}>{questions.filter((q)=>q.question.trim()&&q.answer.trim()).length} karta</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{questions.map((q,i)=><button key={q.id} disabled={!q.question.trim()||!q.answer.trim()} onClick={()=>{setQuestionIndex(i);setShowAnswer(false)}} className="wheel-question-card group relative min-h-24 overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md disabled:opacity-40" style={{animationDelay:String((i%8)*35)+'ms',background:'linear-gradient(135deg,'+palette[i%palette.length]+'22,#fff 75%)',borderColor:palette[i%palette.length]+'88'}}><span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm" style={{...fontMono,background:palette[i%palette.length]}}>{String(i+1).padStart(2,'0')}</span><span className="block line-clamp-2 text-xs font-semibold leading-snug" style={{...fontBody,color:C.ink}}>{q.question||'Savol hali kiritilmagan'}</span>{q.image&&<span className="absolute right-2 top-2 rounded-md bg-white/90 p-1 text-[10px]" style={{color:C.inkSoft}}>Rasm</span>}</button>)}</div></section>}
    {current&&questionIndex!==null&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-3 sm:p-6"><section className="wheel-card w-full max-w-4xl rounded-3xl border p-5 shadow-2xl sm:p-8" style={{background:C.paper,borderColor:C.rule}}><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Baraban tanladi · navbat {turn+1}</div><h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={{...fontDisplay,color:'#385f7e'}}>{activeItems.find((p)=>p.id===current)?.name}</h2>{groupMode&&<p className="mt-1 text-sm" style={{...fontBody,color:C.inkSoft}}>{activeItems.find((p)=>p.id===current)?.members?.map((person)=>person.name).join(' · ')}</p>}</div><button type="button" aria-label="Savolni yopish" onClick={()=>{setQuestionIndex(null);setShowAnswer(false)}} className="rounded-full p-2" style={{color:C.inkSoft,background:C.surface}}>✕</button></div><article className="rounded-2xl border p-4 sm:p-6" style={{background:'linear-gradient(135deg,#fff8e9,#eef5fb)',borderColor:C.rule}}><span className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{...fontMono,color:'#526d7f',background:'#e6f0f5'}}>Yashirin karta {questionIndex+1}</span><p className="whitespace-pre-wrap text-xl font-semibold leading-relaxed sm:text-3xl" style={{...fontBody,color:C.ink}}>{questions[questionIndex].question}</p>{questions[questionIndex].image&&<img src={questions[questionIndex].image} alt="Savol rasmi" className="mx-auto mt-4 max-h-[42vh] max-w-full rounded-2xl object-contain"/>}</article>{showAnswer?<div className="mt-3 rounded-2xl border p-4 sm:p-5" style={{background:'#edf5ed',borderColor:'#c5ddc6',color:C.ink}}><div className="mb-1 text-xs uppercase tracking-wider" style={fontMono}>Javob</div><div className="whitespace-pre-wrap text-lg font-medium sm:text-2xl" style={fontBody}>{questions[questionIndex].answer}</div></div>:<button onClick={()=>setShowAnswer(true)} className="mt-3 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{...fontBody,borderColor:C.rule,background:C.surface,color:C.ink}}>Javobni ko‘rish</button>}{showAnswer&&<div className="mt-4 grid grid-cols-2 gap-3"><button onClick={()=>finishAnswer(true)} className="rounded-xl py-3 text-base font-semibold text-white shadow-sm" style={{background:'linear-gradient(110deg,#4d9a72,#3e8066)'}}><Check size={18} className="mr-1 inline"/>To‘g‘ri · +{positive}</button><button onClick={()=>finishAnswer(false)} className="rounded-xl py-3 text-base font-semibold text-white shadow-sm" style={{background:'linear-gradient(110deg,#cb7460,#a85d59)'}}>Noto‘g‘ri{effectsOn?(' · '+negative):' · 0'}</button></div>}<button onClick={()=>{setRemaining((rows)=>[current,...rows]);setCurrent(null);setQuestionIndex(null)}} className="mt-4 text-sm underline" style={{color:C.inkSoft}}>Tanlovni bekor qilish</button></section></div>}
  </div>
  </main>;
}
