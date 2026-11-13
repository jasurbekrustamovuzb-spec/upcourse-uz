import { useMemo, useState } from 'react';
import { ArrowLeft, Check, CircleHelp, RotateCcw, Shuffle, Sparkles, Trophy, Users } from 'lucide-react';
import { C, fontBody, fontDisplay, fontMono } from './App.jsx';

const palette = ['#d8b765','#687c9b','#b67b67','#77928b','#88749c','#c69a55','#7087a1','#aa786d'];
const mix = (list) => [...list].sort(() => Math.random() - .5);
const cleanLines = (text) => text.split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
const freshQ = () => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, question: '', answer: '', image: '' });

export default function LuckyWheel({ onBack }) {
  const [setup, setSetup] = useState(true);
  const [namesText, setNamesText] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [manualGroups, setManualGroups] = useState({});
  const [groups, setGroups] = useState([]);
  const [questions, setQuestions] = useState([freshQ(), freshQ(), freshQ()]);
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
  const [turn, setTurn] = useState(0);
  const [result, setResult] = useState(null);
  const parsedNames = useMemo(() => cleanLines(namesText), [namesText]);

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
    const names = data.map((row) => row.join(' ').trim()).filter((name) => name && !/^(ism|famili|name)/i.test(name));
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
    setCurrent(null); setResult(null); setTurn(0); setSetup(false);
  };
  const spin = () => {
    if (spinning || !remaining.length) return;
    setSpinning(true);
    const chosen = remaining[Math.floor(Math.random() * remaining.length)];
    const slice = 360 / Math.max(1, activeItems.length);
    const segment = activeItems.findIndex((person) => person.id === chosen);
    setSpinAngle(1440 + (90 - ((segment + .5) * slice) + 360) % 360);
    window.setTimeout(() => { setCurrent(chosen); setRemaining((prev) => prev.filter((id) => id !== chosen)); setSpinning(false); }, 1350);
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

  return <main className="mx-auto max-w-5xl px-3 pb-10 sm:px-5">
    <style>{`@keyframes wheel-spin { from { transform:rotate(0deg) } to { transform:rotate(var(--wheel-end)) } } @keyframes card-in { from { opacity:0;transform:translateY(10px) scale(.98) } to { opacity:1;transform:none } } .wheel-spin { animation:wheel-spin 1.35s cubic-bezier(.12,.76,.18,1) forwards } .wheel-card { animation:card-in .28s ease-out both }`}</style>
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm" style={{ ...fontBody,color:C.inkSoft }}><ArrowLeft size={16}/> Testlarga qaytish</button>
    <header className="mb-5 flex items-center gap-3 rounded-2xl border p-4 sm:p-5" style={{ background:'linear-gradient(120deg,#fbf8ef,#f4f5f7)',borderColor:C.rule }}><span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background:'#eae2cd',color:'#776542' }}><Sparkles size={22}/></span><div><p className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Sinf o‘yini · Tasodifiy tanlov</p><h1 className="text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>Ismlar barabani</h1></div></header>
    {setup ? <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}><h2 className="mb-3 flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><Users size={18}/> Ishtirokchilar</h2><label className="block text-xs" style={{...fontBody,color:C.inkSoft}}>Ism-familiyalarni kiriting, har qatorga bittadan<textarea rows={8} value={namesText} onChange={(e)=>setNamesText(e.target.value)} placeholder={'Ali Valiyev\nMalika Karimova\n...'} className="mt-1.5 w-full resize-y rounded-xl p-3 text-sm" style={{background:C.paper,border:`1px solid ${C.rule}`,color:C.ink}}/></label><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule,color:C.ink}}><Shuffle size={14}/> Jadval import qilish<input type="file" accept=".csv,.txt,.tsv,.xlsx" className="sr-only" onChange={(e)=>importNames(e.target.files?.[0])}/></label><p className="mt-2 text-xs" style={{...fontBody,color:C.inkSoft}}>{parsedNames.length} ishtirokchi · Excel XLSX, CSV va TSV jadvallari</p><div className="mt-4 rounded-xl p-3" style={{background:C.paper}}><label className="flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={groupMode} onChange={(e)=>setGroupMode(e.target.checked)}/> Guruhlarga ajratish</label>{groupMode&&<><label className="mt-3 block text-xs" style={{...fontBody,color:C.inkSoft}}>Guruhlar soni<input type="number" min="2" max="12" value={groupCount} onChange={(e)=>setGroupCount(e.target.value)} className="mt-1 block w-full rounded-lg p-2 text-sm" style={{background:C.surface,border:`1px solid ${C.rule}`}}/></label><div className="mt-3 max-h-44 space-y-2 overflow-auto">{parsedNames.map((name,i)=><label key={`${name}-${i}`} className="flex items-center justify-between gap-2 text-xs" style={{...fontBody,color:C.ink}}><span className="truncate">{name}</span><select aria-label={`${name} uchun guruh`} value={manualGroups[name] ?? ''} onChange={(e)=>setManualGroups((old)=>({...old,[name]:e.target.value===''?undefined:Number(e.target.value)}))} className="rounded-lg border p-1.5" style={{borderColor:C.rule,background:C.surface}}><option value="">Tasodifiy</option>{Array.from({length:Number(groupCount)},(_,g)=><option key={g} value={g}>{g+1}-guruh</option>)}</select></label>)}</div><p className="mt-2 text-[11px]" style={{...fontBody,color:C.inkSoft}}>Alohida belgilanmagan o‘quvchilar guruhlarga tasodifiy taqsimlanadi.</p></>}</div></section>
      <section className="rounded-2xl border p-4 sm:p-5" style={{background:C.surface,borderColor:C.rule}}><h2 className="mb-1 flex items-center gap-2 font-semibold" style={{...fontBody,color:C.ink}}><CircleHelp size={18}/> Yashirin savollar</h2><p className="mb-3 text-xs" style={{...fontBody,color:C.inkSoft}}>Savol, javob va istasangiz savol rasmini ham kiriting.</p><div className="space-y-3">{questions.map((q,i)=><article key={q.id} className="rounded-xl border p-3" style={{background:C.paper,borderColor:C.rule}}><div className="mb-2 flex justify-between text-xs" style={{...fontMono,color:C.inkSoft}}>Karta {i+1}<button onClick={()=>setQuestions((list)=>list.filter((x)=>x.id!==q.id))} className="text-red-700">O‘chirish</button></div><textarea value={q.question} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,question:e.target.value}:x))} placeholder="Savol" rows={2} className="w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/><textarea value={q.answer} onChange={(e)=>setQuestions((list)=>list.map((x)=>x.id===q.id?{...x,answer:e.target.value}:x))} placeholder="Javob" rows={2} className="mt-2 w-full rounded-lg border p-2 text-sm" style={{borderColor:C.rule}}/>{q.image&&<img src={q.image} alt="Savol" className="mt-2 max-h-32 rounded-lg object-contain"/>}<label className="mt-2 inline-block cursor-pointer rounded-lg border px-3 py-2 text-xs" style={{borderColor:C.rule}}>{q.image?'Rasmni almashtirish':'Savolga rasm qo‘shish'}<input type="file" accept="image/*" className="sr-only" onChange={(e)=>addImage(q.id,e.target.files?.[0])}/></label></article>)}</div><button onClick={()=>setQuestions((list)=>[...list,freshQ()])} className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{borderColor:C.rule}}>+ Savol qo‘shish</button><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>To‘g‘ri javob balli<input type="number" value={positive} onChange={(e)=>setPositive(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/></label><label className="text-xs" style={{...fontBody,color:C.inkSoft}}>Xato javobdagi ball<input type="number" value={negative} onChange={(e)=>setNegative(e.target.value)} className="mt-1 w-full rounded-lg border p-2" style={{borderColor:C.rule}}/></label></div><label className="mt-3 flex items-center gap-2 text-sm" style={{...fontBody,color:C.ink}}><input type="checkbox" checked={effectsOn} onChange={(e)=>setEffectsOn(e.target.checked)}/> Xato javobda ball ayirish</label><button disabled={parsedNames.length<2||!questions.some((q)=>q.question.trim()&&q.answer.trim())} onClick={start} className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40" style={{...fontBody,background:'#344356',color:'#fff'}}>O‘yinni boshlash</button></section>
    </div> : <section className="rounded-2xl border p-4 sm:p-6" style={{background:C.surface,borderColor:C.rule}}>
      {result ? <><div className="mb-4 text-center"><Trophy className="mx-auto" size={34} style={{color:'#b38d43'}}/><h2 className="mt-2 text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>O‘yin natijalari</h2></div><div className="mx-auto max-w-xl space-y-2">{ranked.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-xl border p-3" style={{background:i===0?'linear-gradient(110deg,#f5edda,#fffdf8)':C.paper,borderColor:i===0?'#d8c58f':C.rule}}><span style={{...fontBody,color:C.ink}}>{i===0?'🏆 ':''}{i+1}. {item.name}</span><b style={{...fontMono,color:C.ink}}>{item.score} ball</b></div>)}</div><div className="mt-5 text-center"><button onClick={()=>setSetup(true)} className="rounded-xl px-5 py-3 text-sm font-semibold" style={{...fontBody,background:'#344356',color:'#fff'}}><RotateCcw size={16} className="mr-2 inline"/>Yangi o‘yin</button></div></> : <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="text-center"><div className="relative mx-auto h-64 w-64 sm:h-80 sm:w-80"><div className={`absolute inset-0 rounded-full border-[10px] border-white shadow-xl ${spinning?'wheel-spin':''}`} style={{'--wheel-end':`${spinAngle}deg`,background:`conic-gradient(${activeItems.map((_,i)=>`${palette[i%palette.length]} ${i*360/Math.max(1,activeItems.length)}deg ${(i+1)*360/Math.max(1,activeItems.length)}deg`).join(',')})`}}/><div className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 text-3xl text-slate-800">◀</div><div className="absolute inset-1/3 grid place-items-center rounded-full border-4 border-white bg-white text-xs font-semibold shadow" style={{...fontBody,color:C.ink}}>AYLANTIR</div></div><button disabled={spinning||!remaining.length} onClick={spin} className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-40" style={{...fontBody,background:'#344356',color:'#fff'}}><RotateCcw size={17}/> {spinning?'Baraban aylanmoqda…':remaining.length?'Barabanni aylantirish':'Tanlov yakunlandi'}</button><p className="mt-2 text-xs" style={{...fontBody,color:C.inkSoft}}>Navbat {turn+1} · {remaining.length} ishtirokchi qoldi</p></div>
        <div><h2 className="mb-3 text-lg font-semibold" style={{...fontDisplay,color:C.ink}}>Joriy hisob</h2><div className="space-y-2">{ranked.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-xl border p-3" style={{background:C.paper,borderColor:C.rule}}><span className="text-sm" style={{...fontBody,color:C.ink}}>{item.name}</span><strong style={{...fontMono,color:C.ink}}>{item.score} ball</strong></div>)}</div></div>
      </div>}
    </section>}
    {current&&<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4"><section className="wheel-card w-full max-w-xl rounded-2xl p-5 shadow-2xl sm:p-7" style={{background:C.paper}}><div className="text-xs uppercase tracking-wider" style={{...fontMono,color:C.inkSoft}}>Baraban tanladi · navbat {turn+1}</div><h2 className="mt-2 text-2xl font-semibold" style={{...fontDisplay,color:C.ink}}>{activeItems.find((p)=>p.id===current)?.name}</h2>{questionIndex===null?<><p className="mt-4 text-sm" style={{...fontBody,color:C.inkSoft}}>Yashirin kartalardan savolni tanlang.</p><div className="mt-4 grid grid-cols-3 gap-2">{questions.map((q,i)=><button key={q.id} disabled={!q.question.trim()||!q.answer.trim()} onClick={()=>{setQuestionIndex(i);setShowAnswer(false)}} className="aspect-square rounded-xl border text-2xl font-semibold transition hover:-translate-y-1 disabled:opacity-30" style={{background:`linear-gradient(145deg,${palette[i%palette.length]},#fff)`,borderColor:C.rule,color:C.ink}}>{i+1}</button>)}</div></>:<><div className="mt-4 rounded-xl border p-4" style={{background:C.surface,borderColor:C.rule}}><p className="whitespace-pre-wrap text-lg" style={{...fontBody,color:C.ink}}>{questions[questionIndex].question}</p>{questions[questionIndex].image&&<img src={questions[questionIndex].image} alt="Savol rasmi" className="mt-3 max-h-64 rounded-xl object-contain"/>}</div>{showAnswer?<div className="mt-3 rounded-xl p-4" style={{background:'#f1eee6',color:C.ink}}><div className="mb-1 text-[10px] uppercase" style={fontMono}>Javob</div>{questions[questionIndex].answer}</div>:<button onClick={()=>setShowAnswer(true)} className="mt-3 rounded-lg border px-4 py-2 text-sm" style={{borderColor:C.rule}}>Javobni ko‘rish</button>}{showAnswer&&<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>finishAnswer(true)} className="rounded-xl py-3 text-sm font-semibold" style={{background:'#e7efe9',color:'#365747'}}><Check size={16} className="mr-1 inline"/>To‘g‘ri · +{positive}</button><button onClick={()=>finishAnswer(false)} className="rounded-xl py-3 text-sm font-semibold" style={{background:'#f5eae5',color:'#8b5144'}}>Noto‘g‘ri{effectsOn?` · ${negative}`:' · 0'}</button></div>}</>}<button onClick={()=>{setRemaining((rows)=>[current,...rows]);setCurrent(null);setQuestionIndex(null)}} className="mt-4 text-xs underline" style={{color:C.inkSoft}}>Tanlovni bekor qilish</button></section></div>}
  </main>;
}
