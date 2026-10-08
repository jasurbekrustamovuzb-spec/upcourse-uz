import React, { useState, useContext, useEffect } from 'react';
import {
  BookOpen, ListChecks, Newspaper, Plus, ChevronRight, ArrowLeft, Trash2,
  Pencil, ShieldCheck, Lock, Clock3, Tag, Coins, Check,
} from 'lucide-react';
import {
  C, fontBody, fontMono, NavContext, formatDate, writePosition,
  SectionHeading, EmptyState, EntryNumber, ItemMenu, GhostButton, IconButtonDelete,
  RenameCategoryModal, AddNewsForm, CommunityCoursesView, CommunityTestsView,
} from './App';
import { supabase } from './supabaseClient';

/* ------------------------------------------------------------------ */
/*  Admin panel — faqat "Admin panel" boʻlimiga kirilganda React.lazy   */
/*  orqali yuklanadi (App.jsx'dagi lazy-load qatoriga qarang).          */
/*  Bu fayl App.jsx'dan 2b-bosqichda ajratildi.                        */
/* ------------------------------------------------------------------ */

function AdminCategoriesView({ categories, courses, tests, renameCategory, deleteCategory, onBack }) {
  const [renaming, setRenaming] = useState(null);
  const { back } = useContext(NavContext);
  const countFor = (id) => courses.filter((c) => c.categoryId === id).length + tests.filter((t) => t.categoryId === id).length;

  return (
    <div>
      <button
        onClick={back}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Admin panel
      </button>
      <SectionHeading eyebrow={`${categories.length} ta soha`} title="Sohalarni boshqarish" />
      {categories.length === 0 ? (
        <EmptyState text="Hozircha soha yoʻq." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat, i) => (
            <div key={cat.id} className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                  <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{countFor(cat.id)} ta material</div>
                  {cat.status === 'pending' && (
                    <div className="text-xs mt-1 inline-flex items-center gap-1" style={{ ...fontMono, color: C.gold }}><Clock3 size={12} /> Tekshirilmoqda</div>
                  )}
                </div>
              </div>
              <ItemMenu actions={[
                { label: 'Nomini oʻzgartirish', icon: Pencil, onClick: () => setRenaming(cat) },
                { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCategory(cat.id, cat.name) },
              ]} />
            </div>
          ))}
        </div>
      )}
      {renaming && (
        <RenameCategoryModal
          category={renaming}
          onCancel={() => setRenaming(null)}
          onSave={async (newName) => {
            const ok = await renameCategory(renaming.id, renaming.name, newName);
            if (ok) setRenaming(null);
          }}
        />
      )}
    </div>
  );
}

function AdminNewsView({ news, addNews, deleteNews, onBack }) {
  const [formOpen, setFormOpen] = useState(false);
  const { pushNav, back } = useContext(NavContext);
  const openForm = () => { setFormOpen(true); pushNav(() => setFormOpen(false)); };
  const sorted = [...news].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <button
        onClick={back}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Admin panel
      </button>
      <SectionHeading eyebrow={`${news.length} ta yangilik`} title="Yangiliklarni boshqarish" />

      {formOpen ? (
        <AddNewsForm onAdd={addNews} onDone={back} />
      ) : (
        <div className="mb-6">
          <GhostButton onClick={openForm} icon={Plus}>Yangi yangilik qoʻshish</GhostButton>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState text="Hozircha yangilik yoʻq." />
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sorted.map((n) => (
            <div key={n.id} className="p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs mb-1" style={{ ...fontMono, color: C.gold }}>{formatDate(n.date)}</div>
                  <div className="font-medium text-base mb-1" style={{ ...fontBody, color: C.ink }}>{n.title}</div>
                  <p className="text-[15px] leading-6" style={{ ...fontBody, color: C.inkSoft }}>{n.content}</p>
                </div>
                <IconButtonDelete onClick={() => deleteNews(n.id, n.title)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


const ARENA_IMPORT_TEMPLATE = String.raw`# UpCourse Kunlik Arena shabloni
# Sana bo‘sh qolsa, admin oynasida tanlangan sana ishlatiladi.
# Reyting qiymatlari: pattern, logic, word, visual, matching, calculation, fact, cipher, attention.

Sana:
Sarlavha: Bugungi aqliy chaqiriq — tahrirlanadigan namuna
Izoh: Besh bosqichli namuna. Nashrdan oldin matn va javoblarni tekshiring.
Reyting: logic

[BOSQICH 1]
Shakl: choice
Savol: Ketma-ketlikni davom ettiring: 3, 6, 9, 12, ?
Variantlar:
A) 13
B) 15
C) 18
D) 21
Javob: B
Izoh: Har safar 3 qo‘shiladi, shuning uchun keyingi son 15.

[BOSQICH 2]
Shakl: visual
Savol: Jadvaldagi qonuniyatni toping. ? o‘rniga qaysi belgi keladi?
Kataklar:
● | ▲ | ■
▲ | ■ | ●
■ | ● | ?
Variantlar:
A) ▲
B) ●
C) ■
D) ◆
Javob: A
Izoh: Har qatorda belgilar bir o‘rin chapga siljiydi. ? o‘rniga ▲ keladi.

[BOSQICH 3]
Shakl: match
Savol: Iqtisodiy tushunchalarni ta’riflari bilan moslang.
Chap:
- Talab
- Taklif
- Narx
O‘ng:
- Sotuvchilar sotishga tayyor bo‘lgan miqdor
- Tovar qiymatining puldagi ifodasi
- Xaridorlar sotib olishga tayyor bo‘lgan miqdor
Moslik: 3, 1, 2
Izoh: Talab xaridorlar istagan miqdor; taklif sotuvchilar taklif qiladigan miqdor; narx qiymatning puldagi ifodasidir.

[BOSQICH 4]
Shakl: text
Savol: Bir sonni 3 ga ko‘paytirib, 4 qo‘shilganda 25 chiqdi. Bu qaysi son?
Javob: 7
Izoh: 25 dan 4 ni ayiramiz: 21. 21 ni 3 ga bo‘lsak, 7 chiqadi.

[BOSQICH 5]
Shakl: visual
Savol: Har qatorda belgilar soni bittadan ortadi. ? o‘rniga qaysi katak keladi?
Kataklar:
● | ●● | ●●●
▲ | ▲▲ | ▲▲▲
■ | ■■ | ?
Variantlar:
A) ■■■
B) ■■
C) ■
D) ■■■■
Javob: A
Izoh: Har bir qatorda bir xil belgi bittadan qo‘shiladi. Oxirgi katakda uchta ■ bo‘ladi.
`;

const ARENA_MODE_IDS = ['pattern', 'logic', 'word', 'visual', 'matching', 'calculation', 'fact', 'cipher', 'attention'];

function normalizeArenaImportKey(value) {
  return value.toLocaleLowerCase().replace(/[ʻʼ’'"`]/g, '').replace(/[\s_-]+/g, '');
}

function parseArenaImport(text, fallbackMode) {
  const header = {};
  const stages = new Map();
  let stage = null;
  let blockKey = '';
  let implicitStageNumber = 0;
  const known = new Set(['sana', 'sarlavha', 'izoh', 'reyting', 'reytingkategoriyasi', 'shakl', 'tur', 'savol', 'kataklar', 'naqsh', 'variantlar', 'javob', 'chap', 'ong', 'moslik']);
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const marker = line.match(/^\[\s*(?:bosqich\s*)?([1-5])?(?:\s*-\s*bosqich)?\s*\]$/i);
    if (marker) {
      const number = marker[1] ? Number(marker[1]) : ++implicitStageNumber;
      implicitStageNumber = Math.max(implicitStageNumber, number);
      if (number > 5) throw new Error('TXT faylda beshtadan ortiq bosqich bor.');
      if (stages.has(number)) throw new Error((lineIndex + 1) + '-qatorda bosqich takrorlangan.');
      stage = { number, fields: {} };
      stages.set(number, stage);
      blockKey = '';
      return;
    }
    const field = rawLine.match(/^\s*([^:=]+)\s*[:=]\s*(.*)$/);
    if (field) {
      const key = normalizeArenaImportKey(field[1]);
      if (!known.has(key)) {
        if (stage && blockKey && Array.isArray(stage.fields[blockKey])) {
          stage.fields[blockKey].push(line.replace(/^[-•]\s*/, ''));
          return;
        }
        throw new Error((lineIndex + 1) + '-qatordagi "' + field[1].trim() + '" maydoni tanilmadi.');
      }
      const value = field[2].trim();
      if (stage) {
        stage.fields[key] = value ? value : [];
        blockKey = value ? '' : key;
      } else {
        header[key] = value;
        blockKey = '';
      }
      return;
    }
    if (stage && blockKey && Array.isArray(stage.fields[blockKey])) {
      stage.fields[blockKey].push(line.replace(/^[-•]\s*/, ''));
      return;
    }
    throw new Error((lineIndex + 1) + '-qatorda matn maydon nomidan keyin kelishi kerak.');
  });
  if (stages.size !== 5 || [1, 2, 3, 4, 5].some((number) => !stages.has(number))) {
    throw new Error('Faylda beshta [BOSQICH] bo‘lishi kerak.');
  }
  const get = (fields, key) => {
    const value = fields[key];
    return Array.isArray(value) ? value.join('\n').trim() : String(value || '').trim();
  };
  const list = (fields, key) => {
    const value = fields[key];
    const values = Array.isArray(value) ? value.flatMap((item) => String(item).split(/[|,]/)) : String(value || '').split(/[|,]/);
    return values.map((item) => String(item).trim().replace(/^[-•]\s*/, '')).filter(Boolean);
  };
  const rounds = [1, 2, 3, 4, 5].map((number) => {
    const fields = stages.get(number).fields;
    const rawKind = get(fields, 'shakl') || get(fields, 'tur');
    const kindAliases = { variantli: 'choice', tanlov: 'choice', tanlash: 'choice', vizual: 'visual', moslik: 'match', juftlik: 'match', yozma: 'text', matn: 'text' };
    const kind = kindAliases[normalizeArenaImportKey(rawKind)] || rawKind.toLowerCase();
    const prompt = get(fields, 'savol');
    const explanation = get(fields, 'izoh');
    if (!['choice', 'visual', 'match', 'text'].includes(kind)) throw new Error(number + '-bosqich: turi choice, visual, match yoki text bo‘lishi kerak.');
    if (!prompt) throw new Error(number + '-bosqichda Savol maydoni bo‘sh.');
    const round = { prompt, kind, explanation, options: ['', '', '', ''], visual: ['', '', ''], visualLayoutType: 'grid', visualGridText: '', left: ['', ''], right: ['', ''], answer: '' };
    if (kind === 'choice' || kind === 'visual') {
      const importedOptions = list(fields, 'variantlar').map((item) => item.replace(/^[A-D][).]\s*/i, '').trim());
      const rawAnswer = get(fields, 'javob').trim();
      const answerLetter = rawAnswer.toUpperCase();
      const answerIndex = /^[A-D]$/.test(answerLetter) ? answerLetter.charCodeAt(0) - 65 : importedOptions.findIndex((option) => option.toLocaleLowerCase() === rawAnswer.toLocaleLowerCase());
      if (importedOptions.length < 2 || importedOptions.length > 4 || importedOptions.some((item) => !item) || answerIndex < 0 || !importedOptions[answerIndex]) {
        throw new Error(number + '-bosqich: 2–4 ta variant va ulardan biriga mos Javob kiriting (masalan A yoki variant matni).');
      }
      round.options = [...importedOptions, ...Array(4 - importedOptions.length).fill('')];
      round.answer = String.fromCharCode(65 + answerIndex);
    }
    if (kind === 'visual') {
      const rawGrid = get(fields, 'kataklar') || get(fields, 'naqsh');
      const rawRows = rawGrid.split(/\n/).map((row) => row.trim()).filter(Boolean);
      let grid = rawRows.map((row) => row.split('|').map((cell) => cell.trim()));
      if (grid.length === 1 && grid[0].length > 3 && grid[0].length <= 9 && grid[0].length % 3 === 0) {
        grid = Array.from({ length: grid[0].length / 3 }, (_, i) => grid[0].slice(i * 3, i * 3 + 3));
      } else if (grid.length === 1 && grid[0].length === 4) {
        grid = [grid[0].slice(0, 2), grid[0].slice(2)];
      }
      const width = grid[0]?.length || 0;
      if (grid.length < 2 || grid.length > 3 || width < 2 || width > 3 || grid.some((row) => row.length !== width || row.some((cell) => !cell)) || grid.flat().filter((cell) => cell === '?').length !== 1) {
        throw new Error(number + '-bosqich: Kataklar 2×2 yoki 3×3 bo‘lsin va ichida bitta ? bo‘lsin.');
      }
      if (!explanation) throw new Error(number + '-bosqich: naqsh qoidasini Izoh maydonida yozing.');
      round.visualGridText = grid.map((row) => row.join(' | ')).join('\n');
    }
    if (kind === 'match') {
      round.left = list(fields, 'chap');
      round.right = list(fields, 'ong');
      const rawMapping = get(fields, 'moslik').trim();
      let digits;
      if (/^\s*\d+(?:\s*[,|]\s*\d+)*\s*$/.test(rawMapping)) digits = rawMapping.split(/[,|]/).map((digit) => digit.trim());
      else {
        const pairs = rawMapping.split(/[|,;]/).map((pair) => pair.trim()).filter(Boolean);
        digits = pairs.map((pair, index) => {
          const match = pair.match(/^(\d+)\s*[-= >]\s*(\d+)$/);
          return match ? match[2] : String(index + 1);
        });
        if (pairs.some((pair) => !/^(\d+)\s*[-= >]\s*\d+$/.test(pair))) digits = [];
      }
      if (round.left.length < 2 || round.left.length !== round.right.length || round.left.some((item) => !item) || digits.length !== round.left.length || new Set(digits).size !== digits.length || digits.some((digit) => !/^[1-9]$/.test(digit) || Number(digit) > round.right.length)) {
        throw new Error(number + '-bosqich: Chap va O‘ng ro‘yxatlar teng bo‘lsin; Moslikda 1-1|2-2 ko‘rinishida kiriting.');
      }
      if (!explanation) throw new Error(number + '-bosqich: juftliklar sababini Izoh maydonida yozing.');
      round.answer = digits.join('');
    }
    if (kind === 'text') {
      round.answer = get(fields, 'javob');
      if (!round.answer) throw new Error(number + '-bosqichda to‘g‘ri Javob maydoni bo‘sh.');
    }
    return round;
  });
  const rawMode = get(header, 'reyting') || get(header, 'reytingkategoriyasi') || fallbackMode;
  const modeAliases = { bilim: 'fact', mantiq: 'logic' };
  const mode = modeAliases[normalizeArenaImportKey(rawMode)] || rawMode;
  if (!ARENA_MODE_IDS.includes(mode)) throw new Error('Reyting qiymati tanilmadi. Quyidagilardan birini ishlating: ' + ARENA_MODE_IDS.join(', ') + '.');
  const date = get(header, 'sana');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Sana YYYY-MM-DD ko‘rinishida bo‘lishi kerak.');
  return { mode, date, title: get(header, 'sarlavha'), subtitle: get(header, 'izoh'), rounds };
}

const arenaRoundTemplates = {
  visual: [
    {
      id: 'rotation', label: 'Belgi aylanishi (3×3)',
      round: { kind: 'visual', prompt: 'Jadvaldagi qonuniyatni toping. ? o‘rniga qaysi belgi keladi?', visualLayoutType: 'grid', visualGridText: '● | ▲ | ■\n▲ | ■ | ●\n■ | ● | ?', options: ['▲', '●', '■', '◆'], answer: 'A', explanation: 'Har qatorda belgilar bir o‘rin chapga siljiydi. Uchinchi qatorda davom ettirsak, ? o‘rniga ▲ keladi.' },
    },
    {
      id: 'count', label: 'Har qatorda belgilar soni ortadi (3×3)',
      round: { kind: 'visual', prompt: 'Har qatorda belgilar soni qanday o‘zgarayotganini toping. ? o‘rniga qaysi katak keladi?', visualLayoutType: 'grid', visualGridText: '● | ●● | ●●●\n▲ | ▲▲ | ▲▲▲\n■ | ■■ | ?', options: ['■■■', '■■', '■', '■■■■'], answer: 'A', explanation: 'Har bir qatorda bir xil belgi bittadan qo‘shilib boradi. Uchinchi qatorning oxirida uchta ■ bo‘lishi kerak.' },
    },
  ],
  match: [
    {
      id: 'definition', label: 'Tushuncha–ta’rif',
      round: { kind: 'match', prompt: 'Iqtisodiy tushunchalarni ularning ta’riflari bilan moslang.', left: ['Talab', 'Taklif', 'Narx'], right: ['Sotuvchilar sotishga tayyor bo‘lgan miqdor', 'Tovar qiymatining puldagi ifodasi', 'Xaridorlar sotib olishga tayyor bo‘lgan miqdor'], answer: '312', explanation: 'Talab xaridorlar istagan miqdor; taklif sotuvchilar taklif qiladigan miqdor; narx esa qiymatning puldagi ifodasidir.' },
    },
    {
      id: 'cause-effect', label: 'Sabab–natija',
      round: { kind: 'match', prompt: 'Har bir sababni unga mos natija bilan bog‘lang.', left: ['Suv 0°C dan past haroratgacha soviydi', 'O‘simlikka yorug‘lik yetishmaydi', 'Muntazam mashq qilinadi'], right: ['Ko‘nikma mustahkamlanadi', 'Suv muzlaydi', 'Fotosintez susayadi'], answer: '231', explanation: 'Sovigan suv muzlaydi; yorug‘lik yetishmasa fotosintez susayadi; muntazam mashq ko‘nikmani mustahkamlaydi.' },
    },
  ],
};

function AdminArenaContentView({ onBack }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const blankRound = () => ({ prompt: '', kind: 'choice', options: ['', '', '', ''], visualLayoutType: 'grid', visualGridText: '', visual: ['', '', ''], left: ['', ''], right: ['', ''], answer: '', explanation: '' });
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('Bugungi aqliy chaqiriq');
  const [subtitle, setSubtitle] = useState('');
  const [mode, setMode] = useState('visual');
  const [rounds, setRounds] = useState(() => Array.from({ length: 5 }, blankRound));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const modes = [['pattern','Naqsh laboratoriyasi'],['logic','Deduksiya xonasi'],['word','Harflar aralashmasi'],['visual','Vizual signal'],['matching','Moslik sinovi'],['calculation','Tez hisob'],['fact','Faktlar maydoni'],['cipher','Raqamli shifr'],['attention','Diqqat sinovi']];
  const stageLabels = ['Isinish', 'Diqqat', 'Tafakkur', 'Murakkab', 'Usta'];
  const stagePoints = [30, 60, 110, 200, 360];
  const modeDescriptions = {
    pattern: 'Ketma-ketlikdagi qonuniyatni aniqlash.',
    logic: 'Mantiqiy xulosa yoki qoidani topish.',
    word: 'Soʻzlar va harflar bilan ishlash.',
    visual: 'Katakli naqshdagi takrorlanish qoidasini topish.',
    matching: 'Ikki roʻyxatdagi aniq mantiqiy aloqaga ega juftlarni aniqlash.',
    calculation: 'Hisoblash va sonli javoblar.',
    fact: 'Aniq bilim yoki faktga oid savollar.',
    cipher: 'Shifrni yechish yoki kodni topish.',
    attention: 'Diqqat bilan kuzatib, farqlarni sezish.',
  };
  async function loadItems() {
    setLoading(true);
    const result = await supabase.rpc('daily_arena_admin_list_content');
    if (result.error) { setError(true); setNotice(result.error.message.includes('ADMIN_REQUIRED') ? 'Bu bo‘lim faqat administrator uchun.' : 'Materiallarni yuklab bo‘lmadi. SQL migration bajarilganini tekshiring.'); }
    else { setItems(Array.isArray(result.data) ? result.data : []); setNotice(''); setError(false); }
    setLoading(false);
  }
  useEffect(() => { loadItems(); }, []);
  function applyRoundTemplate(index, template) {
    const current = rounds[index];
    const hasContent = current.prompt.trim() || current.answer.trim() || current.explanation.trim()
      || current.options.some(Boolean) || current.visualGridText.trim() || current.visual.some(Boolean)
      || current.left.some(Boolean) || current.right.some(Boolean);
    if (hasContent && !window.confirm('Bu namuna bosqichdagi mavjud maydonlarni almashtiradi. Davom etasizmi?')) return;
    setRounds((old) => old.map((round, i) => i === index ? { ...round, ...template.round } : round));
    setError(false);
    setNotice('Namuna yuklandi. Savol, javob va izohni ehtiyojingizga moslab tahrirlang.');
  }
  async function importArenaFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setError(true); setNotice('Faqat .txt formatidagi Arena shablonini yuklang.'); return;
    }
    try {
      const imported = parseArenaImport(await file.text(), mode);
      const hasContent = rounds.some((round) => round.prompt.trim() || round.answer.trim() || round.explanation.trim()
        || round.options.some(Boolean) || round.visualGridText.trim() || round.visual.some(Boolean)
        || round.left.some(Boolean) || round.right.some(Boolean));
      if (hasContent && !window.confirm('Fayldagi besh bosqich joriy formadagi ma’lumotlarni almashtiradi. Davom etasizmi?')) return;
      setDate(imported.date || date);
      setTitle(imported.title || title);
      setSubtitle(imported.subtitle || '');
      setMode(imported.mode);
      setRounds(imported.rounds.map((round) => ({ ...blankRound(), ...round })));
      setShowPreview(true);
      setError(false);
      setNotice('Fayldan 5 bosqich yuklandi. Ma’lumotlarni tahrirlang va nashrdan oldin preview’da tekshiring.');
    } catch (importError) {
      setError(true);
      setNotice(importError.message || 'TXT fayl o‘qilmadi. Shablonni tekshirib qayta yuklang.');
    }
  }
  function downloadArenaTemplate() {
    const url = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF), ARENA_IMPORT_TEMPLATE], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UpCourse-Arena-shablon.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateRound(index, key, value) {
    setRounds((old) => old.map((round, i) => i === index ? { ...round, [key]: value } : round));
  }
  function editItem(item) {
    setDate(item.challenge_date); setTitle(item.title); setSubtitle(item.subtitle || ''); setMode(item.mode);
    setRounds((item.rounds || []).map((round, index) => ({ ...blankRound(), ...round, visualLayoutType: round.visual_grid ? 'grid' : 'sequence', visualGridText: (round.visual_grid || []).map((row) => row.join(' | ')).join('\n'), options: round.options || ['', '', '', ''], visual: round.visual || ['', '', ''], left: round.left || ['', ''], right: round.right || ['', ''], answer: (item.answer_key || [])[index] || '' })));
    setError(false); setNotice('Material tahrirlash uchun ochildi.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function save(event, publish) {
    event.preventDefault();
    if (busy) return;
    const builtRounds = []; const answers = [];
    for (let i = 0; i < rounds.length; i += 1) {
      const round = rounds[i];
      if (!round.prompt.trim() || !round.answer.trim()) { setError(true); setNotice((i + 1) + '-bosqichda savol va to‘g‘ri javobni kiriting.'); return; }
      const value = { kind: round.kind, prompt: round.prompt.trim(), explanation: round.explanation.trim() };
      if (round.kind === 'choice' || round.kind === 'visual') {
        value.options = round.options.map((item) => item.trim());
        while (value.options.length && !value.options[value.options.length - 1]) value.options.pop();
        const answerLetter = round.answer.trim().toUpperCase();
        const answerIndex = answerLetter.charCodeAt(0) - 65;
        if (value.options.length < 2 || value.options.some((item) => !item) || !/^[A-D]$/.test(answerLetter) || answerIndex < 0 || answerIndex >= value.options.length) { setError(true); setNotice((i + 1) + '-bosqichda variantlarni va to‘g‘ri javob harfini (A–D) tekshiring.'); return; }
        if (round.kind === 'visual') {
          if (!round.explanation.trim()) { setError(true); setNotice((i + 1) + '-bosqichda naqsh qoidasini izohlang.'); return; }
          if (round.visualLayoutType === 'grid') {
            const rows = round.visualGridText.split(/\r?\n/).map((row) => row.split('|').map((cell) => cell.trim())).filter((row) => row.some(Boolean));
            const width = rows[0]?.length || 0;
            const missingCells = rows.flat().filter((cell) => cell === '?').length;
            if (rows.length < 2 || rows.length > 3 || width < 2 || width > 3 || rows.some((row) => row.length !== width || row.some((cell) => !cell)) || missingCells !== 1) { setError(true); setNotice((i + 1) + '-bosqich uchun 2×2 yoki 3×3 katakli, bitta ? joyi bor to‘liq naqsh kiriting.'); return; }
            value.visual_grid = rows;
          } else {
            value.visual = round.visual.map((item) => item.trim());
            while (value.visual.length && !value.visual[value.visual.length - 1]) value.visual.pop();
            if (value.visual.length < 2 || value.visual.some((item) => !item)) { setError(true); setNotice((i + 1) + '-bosqich uchun kamida 2 ta belgi kiriting.'); return; }
          }
        }
      }
      if (round.kind === 'match') {
        if (!round.explanation.trim()) { setError(true); setNotice((i + 1) + '-bosqichda juftliklar orasidagi mantiqiy aloqani izohlang.'); return; }
        value.left = round.left.map((item) => item.trim()); value.right = round.right.map((item) => item.trim());
        while (value.left.length && !value.left[value.left.length - 1]) value.left.pop();
        while (value.right.length && !value.right[value.right.length - 1]) value.right.pop();
        const chars = round.answer.trim().split('');
        const validDigits = chars.length === value.left.length && new Set(chars).size === value.left.length && chars.every((digit) => Number(digit) >= 1 && Number(digit) <= value.left.length);
        if (value.left.length < 2 || value.left.length !== value.right.length || value.left.some((item) => !item) || value.right.some((item) => !item) || !validDigits) { setError(true); setNotice((i + 1) + '-bosqichda juftlarni va takrorlanmaydigan moslik raqamlarini tekshiring.'); return; }
      }
      builtRounds.push(value);
      answers.push(round.kind === 'choice' || round.kind === 'visual' ? round.answer.trim().toUpperCase() : round.answer.trim());
    }
    setBusy(true); setNotice(''); setError(false);
    const result = await supabase.rpc('daily_arena_admin_save_content', { p_date: date, p_title: title, p_subtitle: subtitle, p_mode: mode, p_rounds: builtRounds, p_answer_key: answers, p_published: publish });
    setBusy(false);
    if (result.error) { setError(true); setNotice(result.error.message.includes('ADMIN_REQUIRED') ? 'Bu amal faqat administrator uchun.' : 'Saqlanmadi. Ma’lumotlarni tekshiring.'); return; }
    setNotice(publish ? 'Material saqlandi va nashr qilindi.' : 'Material qoralama sifatida saqlandi.');
    await loadItems();
  }
  const inputStyle = { ...fontBody, color: C.ink, background: C.paper, border: '1px solid ' + C.rule };
  return <div>
    <button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Admin panel</button>
    <SectionHeading eyebrow="Kunlik Arena" title="Arena materiallari" />
    <p className="text-sm mb-5 max-w-3xl" style={{ ...fontBody, color: C.inkSoft }}>Har bir sana uchun besh bosqich tuzing. Qoralama foydalanuvchilarga ko‘rinmaydi; nashr qilinganda shu sanadagi avtomatik topshiriq o‘rnini oladi. Oldingi natijalar o‘zgarmaydi.</p>
    <form onSubmit={(event) => save(event, false)} className="max-w-4xl space-y-4">
      <div className="rounded-sm p-3 sm:p-4 space-y-3" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="font-medium text-sm" style={{ ...fontBody, color: C.ink }}>Besh bosqichni TXT fayldan yuklash</h3><p className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Faylni yuklang — savollar, kataklar, javoblar va izohlar formaga ajratib joylanadi. Hech narsa avtomatik nashr qilinmaydi.</p></div>
          <button type="button" onClick={downloadArenaTemplate} className="rounded-sm px-3 py-2 text-xs" style={{ ...fontBody, color: C.ink, background: C.goldSoft, border: '1px solid ' + C.coverLine }}>TXT shablonni yuklab olish</button>
        </div>
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Tahrirlangan .txt faylni tanlang<input type="file" accept=".txt,text/plain" onChange={importArenaFile} className="mt-1.5 block w-full rounded-sm px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:px-3 file:py-1.5" style={inputStyle} /></label>
        <details className="text-xs" style={{ ...fontBody, color: C.inkSoft }}><summary className="cursor-pointer">TXT fayl qanday tuziladi?</summary><div className="mt-2 space-y-1.5 leading-relaxed"><p>Shablonni yuklab oling va oddiy matn muharririda oching. Har bir bosqichda Shakl, Savol va Javob/Izoh maydonlarini tahrirlang.</p><p>Vizual kataklar har qatorda yoziladi, kataklar orasiga | qo‘yiladi. Variantlar A) dan boshlanadi. Moslikda Chap va O‘ng ro‘yxatlarini kiriting; “Moslik”dagi raqamlar chap ro‘yxat tartibida mos o‘ng javobni bildiradi (masalan, 3, 1, 2).</p><p>Reyting: pattern, logic, word, visual, matching, calculation, fact, cipher yoki attention. TXT ichidagi besh tur: choice, visual, match, text. Importdan keyin hamma maydonlar tahrirlanadi.</p></div></details>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Sana<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} /></label>
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Reyting kategoriyasi<select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle}>{modes.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Sarlavha<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} /></label>
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Izoh<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} maxLength={240} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} /></label>
      </div>
      <p className="text-xs -mt-2" style={{ ...fontBody, color: C.inkSoft }}>{modeDescriptions[mode]} Bu kategoriya reytingni belgilaydi; o‘yinchiga ko‘rinadigan mashq turini har bosqichda alohida tanlang.</p>
      {rounds.map((round, index) => <section key={index} className="rounded-sm p-4 space-y-3" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
        <div><h3 className="font-medium" style={{ ...fontBody, color: C.ink }}>Bosqich {index + 1} · {stageLabels[index]}</h3><p className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>Toʻgʻri javob uchun +{stagePoints[index]} ball</p></div>
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Savol<input value={round.prompt} onChange={(event) => updateRound(index, 'prompt', event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} placeholder="Topshiriq matni" /></label>
        <label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>Javob shakli<select value={round.kind} onChange={(event) => updateRound(index, 'kind', event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle}><option value="choice">Variantli savol</option><option value="visual">Katakli naqsh + variantlar</option><option value="text">Yozma javob</option><option value="match">Juftliklarni moslash</option></select></label><p className="text-xs -mt-2" style={{ ...fontBody, color: C.inkSoft }}>{round.kind === 'visual' ? 'O‘yinchi katakli naqshni ko‘radi, qoida asosida yetishmayotgan belgini topadi va variantlardan javob tanlaydi.' : round.kind === 'match' ? 'O‘yinchi chapdagi har bir bandga o‘ng ro‘yxatdan mos javobni tanlaydi.' : round.kind === 'text' ? 'O‘yinchi javobni o‘zi yozadi.' : 'O‘yinchi javob variantlaridan birini tanlaydi.'}</p>
        {round.kind === 'visual' && <div className="space-y-2"><label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>Tayyor vizual namuna<select value="" onChange={(event) => { const template = arenaRoundTemplates.visual.find((item) => item.id === event.target.value); if (template) applyRoundTemplate(index, template); }} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle}><option value="">Namuna tanlang…</option>{arenaRoundTemplates.visual.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="block mt-1">Namuna barcha shu bosqich maydonlarini to‘ldiradi; keyin uni tahrirlashingiz mumkin.</span></label><label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>Naqsh ko‘rinishi<select value={round.visualLayoutType || 'grid'} onChange={(event) => updateRound(index, 'visualLayoutType', event.target.value)} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle}><option value="grid">Katakli mantiqiy naqsh</option><option value="sequence">Eski ketma-ketlik</option></select></label>{round.visualLayoutType === 'sequence' ? <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ketma-ketlik belgilari (vergul bilan)<input value={round.visual.join(', ')} onChange={(event) => updateRound(index, 'visual', event.target.value.split(','))} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle} placeholder="●, ▲, ●" /></label> : <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Kataklar (har qatorni yangi satrda, kataklarni | bilan ajrating)<textarea value={round.visualGridText} onChange={(event) => updateRound(index, 'visualGridText', event.target.value)} rows={3} className="mt-1 w-full rounded-sm px-3 py-2 text-sm font-mono" style={inputStyle} placeholder={'● | ▲ | ■\n▲ | ■ | ●\n■ | ● | ?'} /><span className="block mt-1">2×2 yoki 3×3 naqsh tuzing, bitta katakka ? qo‘ying va izohda qoidani tushuntiring. Har qator bir xil sondagi kataklardan iborat bo‘lsin.</span><details className="mt-2 rounded-sm p-3 text-xs" style={{ background: C.paper, border: '1px solid ' + C.rule }}><summary className="cursor-pointer font-medium" style={{ ...fontBody, color: C.ink }}>Namuna: qoida va javobni qanday tuzaman?</summary><pre className="mt-2 font-mono whitespace-pre-wrap" style={{ color: C.ink }}>● | ▲ | ■{'\n'}▲ | ■ | ●{'\n'}■ | ● | ?</pre><p className="mt-2" style={{ ...fontBody, color: C.inkSoft }}>Qoida: har qatorda belgilar bir o‘rin chapga siljiydi. Demak, ? o‘rniga ▲ keladi. Variantlardan biriga ▲ yozib, to‘g‘ri variantni pastdagi ro‘yxatdan tanlang.</p></details></label>}</div>}
        {(round.kind === 'choice' || round.kind === 'visual') && <div className="grid sm:grid-cols-2 gap-2">{round.options.map((option, optionIndex) => <label key={optionIndex} className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Variant {String.fromCharCode(65 + optionIndex)}<input value={option} onChange={(event) => updateRound(index, 'options', round.options.map((old, i) => i === optionIndex ? event.target.value : old))} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle} /></label>)}</div>}
        {round.kind === 'match' && <label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>Tayyor moslik namunasi<select value="" onChange={(event) => { const template = arenaRoundTemplates.match.find((item) => item.id === event.target.value); if (template) applyRoundTemplate(index, template); }} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle}><option value="">Namuna tanlang…</option>{arenaRoundTemplates.match.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="block mt-1">Namuna savol, juftlar, javob kaliti va izohni to‘ldiradi; barchasini o‘zgartirish mumkin.</span></label>}{round.kind === 'match' && <div className="grid sm:grid-cols-2 gap-2"><label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Chap juftlar (vergul bilan)<input value={round.left.join(', ')} onChange={(event) => updateRound(index, 'left', event.target.value.split(','))} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle} /></label><label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>O‘ng javoblar (vergul bilan)<input value={round.right.join(', ')} onChange={(event) => updateRound(index, 'right', event.target.value.split(','))} className="mt-1 w-full rounded-sm px-3 py-2 text-sm" style={inputStyle} /></label><p className="sm:col-span-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Ro‘yxatlardagi juftlar aniq qoida yoki munosabat bilan bog‘lansin (masalan, tushuncha–ta’rif, so‘z–sinonim, sabab–natija). Chap juftliklar tartibida mos javob raqamlarini yozing, masalan 21; izohda nima uchun mosligini tushuntiring.</p></div>}
{round.kind === 'choice' || round.kind === 'visual' ? <label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>Qaysi variant to‘g‘ri?<select value={round.answer.toUpperCase()} onChange={(event) => updateRound(index, 'answer', event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle}><option value="">To‘g‘ri variantni tanlang</option>{round.options.map((option, optionIndex) => <option key={optionIndex} value={String.fromCharCode(65 + optionIndex)}>Variant {String.fromCharCode(65 + optionIndex)}{option.trim() ? ' — ' + option.trim() : ''}</option>)}</select><span className="block mt-1">Javob harfini qo‘lda yozmang; ro‘yxatdan to‘g‘ri variantni tanlang.</span></label> : round.kind === 'match' ? <div className="space-y-2"><p className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Har bir chapdagi element uchun mos o‘ng javobni tanlang. Tizim javob kalitini o‘zi tuzadi.</p>{round.left.map((left, leftIndex) => { const selected = round.answer[leftIndex] || ''; return <label key={leftIndex} className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center text-xs" style={{ ...fontBody, color: C.inkSoft }}><span>{left.trim() || 'Chapdagi ' + (leftIndex + 1) + '-element'}</span><select value={selected} onChange={(event) => { const next = round.left.map((_, i) => (round.answer[i] || '')); next[leftIndex] = event.target.value; updateRound(index, 'answer', next.join('')); }} className="w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle}><option value="">Mos javobni tanlang</option>{round.right.map((right, rightIndex) => <option key={rightIndex} value={String(rightIndex + 1)} disabled={round.answer.split('').some((value, i) => i !== leftIndex && value === String(rightIndex + 1))}>{right.trim() || 'O‘ngdagi ' + (rightIndex + 1) + '-javob'}</option>)}</select></label>})}</div> : <label className="block text-xs sm:max-w-xs" style={{ ...fontBody, color: C.inkSoft }}>To‘g‘ri javob matni<input value={round.answer} onChange={(event) => updateRound(index, 'answer', event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} placeholder="Masalan: 42" /></label>}
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>{round.kind === 'visual' ? 'Naqsh qoidasi va yechim izohi' : round.kind === 'match' ? 'Juftliklar orasidagi mantiqiy aloqa' : 'Izoh'}<input value={round.explanation} onChange={(event) => updateRound(index, 'explanation', event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm" style={inputStyle} placeholder={round.kind === 'visual' ? 'Masalan: har qatorda belgilar bir katak chapga siljiydi.' : round.kind === 'match' ? 'Masalan: chapdagi so‘zlar o‘ngdagi sinonimlari bilan mos.' : 'Javob nima uchun to‘g‘ri?'} /></label>
      </section>)}
      <button type="button" onClick={() => setShowPreview((old) => !old)} className="rounded-sm px-4 py-2.5 text-sm" style={{ ...fontBody, color: C.ink, border: '1px solid ' + C.rule }}>{showPreview ? 'Ko‘rinishni yopish' : 'Foydalanuvchi ko‘rinishini ko‘rish'}</button>
      {showPreview && <section className="rounded-sm p-4 sm:p-5 space-y-3" style={{ background: C.paper, border: '1px solid ' + C.coverLine }}>
        <div><p className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Oldindan ko‘rish</p><h3 className="text-lg font-semibold mt-1" style={{ ...fontDisplay, color: C.ink }}>{title || 'Bugungi aqliy chaqiriq'}</h3>{subtitle && <p className="text-sm mt-1" style={{ ...fontBody, color: C.inkSoft }}>{subtitle}</p>}</div>
        {rounds.map((round, index) => {
          const grid = (round.visualGridText || '').split(/\r?\n/).map((row) => row.split('|').map((cell) => cell.trim())).filter((row) => row.some(Boolean));
          const columns = round.visualLayoutType === 'grid' ? (grid[0]?.length || 3) : 0;
          return <article key={index} className="rounded-sm p-3 sm:p-4" style={{ background: C.surface, border: '1px solid ' + C.rule }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ ...fontMono, color: C.gold }}>Bosqich {index + 1} · {stageLabels[index]} · {stagePoints[index]} ball</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3" style={{ ...fontBody, color: C.ink }}>{round.prompt || 'Savol matni shu yerda ko‘rinadi.'}</p>
            {round.kind === 'visual' && (round.visualLayoutType === 'grid' ? <div className="grid gap-2 mb-3 max-w-md mx-auto" style={{ gridTemplateColumns: 'repeat(' + Math.min(Math.max(columns, 2), 3) + ', minmax(0, 1fr))' }}>{grid.flat().map((cell, i) => <div key={i} className="aspect-square rounded-lg flex items-center justify-center text-xl sm:text-2xl" style={{ ...fontBody, color: cell === '?' ? C.gold : C.cover, background: C.paper, border: cell === '?' ? '1px dashed ' + C.gold : '1px solid ' + C.rule }}>{cell || '·'}</div>)}</div> : <div className="flex flex-wrap gap-2 mb-3">{round.visual.filter(Boolean).map((symbol, i) => <span key={i} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ color: C.cover, background: C.paper, border: '1px solid ' + C.rule }}>{symbol}</span>)}<span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ ...fontMono, color: C.gold, background: C.paper, border: '1px dashed ' + C.gold }}>?</span></div>)}
            {round.kind === 'match' ? <div className="space-y-2 mb-3">{round.left.filter(Boolean).map((left, i) => <div key={i} className="grid grid-cols-2 gap-2 items-center"><span className="rounded-lg p-2.5 text-xs sm:text-sm" style={{ ...fontBody, color: C.ink, background: C.paper }}>{left}</span><select disabled className="min-w-0 p-2.5 rounded-lg text-xs sm:text-sm" style={{ ...fontBody, color: C.inkSoft, background: C.paper, border: '1px solid ' + C.rule }}><option>Mosini tanlang</option>{round.right.filter(Boolean).map((right, j) => <option key={j}>{right}</option>)}</select></div>)}</div>
              : round.kind === 'text' ? <div className="rounded-lg p-3 mb-3 text-sm" style={{ ...fontBody, color: C.inkSoft, background: C.paper, border: '1px solid ' + C.rule }}>Javob yozish maydoni</div>
                : <div className={round.kind === 'visual' ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3' : 'grid sm:grid-cols-2 gap-2 mb-3'}>{round.options.filter(Boolean).map((option, i) => <div key={i} className="rounded-lg p-3 text-sm" style={{ ...fontBody, color: C.ink, background: C.paper, border: '1px solid ' + C.rule }}><span className="mr-2" style={{ ...fontMono, color: C.gold }}>{String.fromCharCode(65 + i)}.</span>{option || 'Variant'}</div>)}</div>}
            <p className="text-[11px]" style={{ ...fontBody, color: C.inkSoft }}>Javob tekshirilgach, yechim izohi ko‘rsatiladi.</p>
          </article>;
        })}
      </section>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="rounded-sm px-4 py-2.5 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.ink, background: C.goldSoft, border: '1px solid ' + C.coverLine }}>{busy ? 'Saqlanmoqda…' : 'Qoralama saqlash'}</button><button type="button" disabled={busy} onClick={(event) => save(event, true)} className="rounded-sm px-4 py-2.5 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>{busy ? 'Saqlanmoqda…' : 'Saqlash va nashr qilish'}</button><button type="button" onClick={() => { setDate(today); setTitle('Bugungi aqliy chaqiriq'); setSubtitle(''); setMode('visual'); setRounds(Array.from({ length: 5 }, blankRound)); setNotice(''); }} className="rounded-sm px-4 py-2.5 text-sm" style={{ ...fontBody, color: C.inkSoft, border: '1px solid ' + C.rule }}>Yangi material</button></div>
    </form>
    {notice && <p role={error ? 'alert' : 'status'} className="mt-3 text-sm" style={{ ...fontBody, color: error ? C.red : C.accent }}>{notice}</p>}
    <div className="mt-8 max-w-4xl"><div className="flex items-center justify-between mb-3"><h3 className="font-medium" style={{ ...fontBody, color: C.ink }}>Saqlangan materiallar</h3><button onClick={loadItems} className="text-xs underline" style={{ ...fontBody, color: C.gold }}>Yangilash</button></div>{loading ? <p className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Yuklanmoqda…</p> : items.length === 0 ? <EmptyState text="Hozircha Arena materiali yo‘q." /> : <div className="space-y-2">{items.map((item) => <div key={item.challenge_date} className="flex flex-wrap items-center gap-3 p-3 rounded-sm" style={{ background: C.surface, border: '1px solid ' + C.rule }}><div className="min-w-0 flex-1"><div className="font-medium text-sm" style={{ ...fontBody, color: C.ink }}>{item.title}</div><div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{item.challenge_date} · {modes.find((entry) => entry[0] === item.mode)?.[1] || item.mode} · {item.published ? 'Nashr qilingan' : 'Qoralama'}</div></div><button type="button" onClick={() => editItem(item)} className="text-sm underline" style={{ ...fontBody, color: C.gold }}>Tahrirlash</button></div>)}</div>}</div>
  </div>;
}

function AdminPromoView({ onBack }) {
  const [code, setCode] = useState('');
  const [coins, setCoins] = useState('100');
  const [uses, setUses] = useState('1');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setNotice('');
    setError(false);
    setCreatedCode('');
    const { data, error: rpcError } = await supabase.rpc('daily_arena_create_promo', {
      p_code: code,
      p_coins: Number(coins),
      p_max_uses: Number(uses),
    });
    setBusy(false);
    if (rpcError) {
      const message = rpcError.message || '';
      setNotice(message.includes('ADMIN_REQUIRED')
        ? 'Bu amal faqat administrator uchun.'
        : message.includes('INVALID_PROMO')
          ? 'Kod, coin miqdori yoki foydalanish limiti notoʻgʻri.'
          : 'Promo kod yaratilmadi. Kod band boʻlishi mumkin.');
      setError(true);
      return;
    }
    const normalized = data?.code || code.trim().toUpperCase();
    setCreatedCode(normalized);
    setCode('');
    setNotice('Promo kod yaratildi. Uni foydalanuvchilarga ulashing.');
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}>
        <ArrowLeft size={15} /> Admin panel
      </button>
      <SectionHeading eyebrow="Mukofotlar boshqaruvi" title="Promo kod yaratish" />
      <div className="max-w-xl rounded-sm p-4 sm:p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <p className="mb-4 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Kod foydalanuvchi profilidagi Coin hamyonidan ishlatiladi. Har bir hisob kodni bir marta qoʻllashi mumkin.</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>
            Promo kod
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} minLength={4} maxLength={32} required placeholder="MASALAN: BILIM2026" className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>
              Beriladigan coin
              <input type="number" min="1" max="10000" required value={coins} onChange={(event) => setCoins(event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} />
            </label>
            <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>
              Jami ishlatish limiti
              <input type="number" min="1" max="100000" required value={uses} onChange={(event) => setUses(event.target.value)} className="mt-1.5 w-full rounded-sm px-3 py-2.5 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} />
            </label>
          </div>
          <button type="submit" disabled={busy || code.trim().length < 4} className="inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Tag size={15} />} Promo kod yaratish
          </button>
        </form>
        {notice && <div role="status" className="mt-3 flex items-center gap-2 text-sm" style={{ ...fontBody, color: error ? C.red : C.accent }}>
          {!error && <Check size={15} />} {notice}
        </div>}
        {createdCode && <div className="mt-3 flex items-center gap-2 rounded-sm p-3" style={{ background: C.goldSoft }}>
          <Coins size={16} style={{ color: C.gold }} />
          <code className="font-semibold tracking-wide" style={{ color: C.cover }}>{createdCode}</code>
          <span className="ml-auto text-xs" style={{ ...fontMono, color: C.inkSoft }}>{coins} coin · {uses} marta</span>
        </div>}
      </div>
    </div>
  );
}

export default function AdminPanelView({ courses, tests, categories, news, submitCourse, approveCourse, deleteCourse, updateCourse, submitTest, approveTest, deleteTest, updateTest, renameCategory, deleteCategory, addNews, deleteNews, ensureCourseContent, ensureTestContent, initialSubTab }) {
  const [subTab, setSubTab] = useState(initialSubTab || null);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const { pushNav } = useContext(NavContext);
  const goSubTab = (id) => { setSubTab(id); pushNav(() => setSubTab(null)); };

  /* Qaysi bo'lim ochiqligini eslab qolamiz — sahifa yangilanganda
     (refresh) admin panelning o'sha bo'limida qolish uchun. */
  useEffect(() => {
    writePosition({ admin: { subTab } });
  }, [subTab]);

  const pendingCourses = courses.flatMap((course) => {
    if (course.pendingEdit && course.status === 'approved') return [{ ...course, ...course.pendingEdit, pendingEdit: course.pendingEdit, pendingRevision: true, status: 'pending' }];
    return course.status === 'pending' ? [course] : [];
  });
  const pendingTests = tests.flatMap((test) => {
    if (test.pendingEdit && test.status === 'approved') return [{ ...test, ...test.pendingEdit, pendingEdit: test.pendingEdit, pendingRevision: true, status: 'pending' }];
    return test.status === 'pending' ? [test] : [];
  });
  const privateCourses = courses.filter((c) => c.status === 'private');
  const privateTests = tests.filter((t) => t.status === 'private');

  if (subTab === 'kurslar') {
    return (
      <CommunityCoursesView
        mode="admin"
        courses={pendingCourses}
        categories={categories}
        openId={openCourseId}
        setOpenId={setOpenCourseId}
        onBack={() => setSubTab(null)}
        submitCourse={submitCourse}
        approveCourse={approveCourse}
        deleteCourse={deleteCourse}
        updateCourse={updateCourse}
        formOpen={false}
        onOpenForm={() => {}}
        onCloseForm={() => {}}
        prefillCategory=""
        ensureCourseContent={ensureCourseContent}
      />
    );
  }
  if (subTab === 'testlar') {
    return (
      <CommunityTestsView
        mode="admin"
        tests={pendingTests}
        categories={categories}
        openId={openTestId}
        setOpenId={setOpenTestId}
        onBack={() => setSubTab(null)}
        submitTest={submitTest}
        approveTest={approveTest}
        deleteTest={deleteTest}
        updateTest={updateTest}
        formOpen={false}
        onOpenForm={() => {}}
        onCloseForm={() => {}}
        prefillCategory=""
        ensureTestContent={ensureTestContent}
      />
    );
  }
  if (subTab === 'xususiy-kurslar') {
    return (
      <CommunityCoursesView
        mode="admin"
        courses={privateCourses}
        categories={categories}
        openId={openCourseId}
        setOpenId={setOpenCourseId}
        onBack={() => setSubTab(null)}
        submitCourse={submitCourse}
        deleteCourse={deleteCourse}
        updateCourse={updateCourse}
        formOpen={false}
        onOpenForm={() => {}}
        onCloseForm={() => {}}
        prefillCategory=""
        ensureCourseContent={ensureCourseContent}
      />
    );
  }
  if (subTab === 'xususiy-testlar') {
    return (
      <CommunityTestsView
        mode="admin"
        tests={privateTests}
        categories={categories}
        openId={openTestId}
        setOpenId={setOpenTestId}
        onBack={() => setSubTab(null)}
        submitTest={submitTest}
        deleteTest={deleteTest}
        updateTest={updateTest}
        formOpen={false}
        onOpenForm={() => {}}
        onCloseForm={() => {}}
        prefillCategory=""
        ensureTestContent={ensureTestContent}
      />
    );
  }
  if (subTab === 'arena-materiallar') return <AdminArenaContentView onBack={() => setSubTab(null)} />;
  if (subTab === 'promo-kodlar') return <AdminPromoView onBack={() => setSubTab(null)} />;
  if (subTab === 'sohalar') {
    return <AdminCategoriesView categories={categories} courses={courses} tests={tests} renameCategory={renameCategory} deleteCategory={deleteCategory} onBack={() => setSubTab(null)} />;
  }
  if (subTab === 'yangiliklar') {
    return <AdminNewsView news={news} addNews={addNews} deleteNews={deleteNews} onBack={() => setSubTab(null)} />;
  }

  return (
    <div>
      <SectionHeading eyebrow="Faqat administrator uchun" title="Admin panel" />
      <p className="text-[15px] mb-6" style={{ ...fontBody, color: C.inkSoft }}>
        Foydalanuvchilar yuborgan mavzu va testlarni shu yerda tekshirasiz. Tasdiqlangach, ular asosiy Kurslar/Testlar boʻlimiga chiqadi va hammaga ochiq boʻladi. Xususiy deb belgilanganlar tasdiqlashsiz saqlanadi — bu yerda faqat koʻrish uchun.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={() => goSubTab('kurslar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <BookOpen size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Kurslar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{pendingCourses.length} ta kutilmoqda</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('testlar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <ListChecks size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Testlar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{pendingTests.length} ta kutilmoqda</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('xususiy-kurslar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Lock size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Xususiy kurslar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{privateCourses.length} ta — faqat koʻrish</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('xususiy-testlar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Lock size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Xususiy testlar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{privateTests.length} ta — faqat koʻrish</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('sohalar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Sohalar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{categories.length} ta soha</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('yangiliklar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Newspaper size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Yangiliklar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{news.length} ta eʼlon</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('arena-materiallar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Clock3 size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Arena materiallari</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>Kunlik mashqlarni boshqarish</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('promo-kodlar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.goldSoft, border: `1px solid ${C.coverLine}` }}>
          <div className="flex items-center gap-3">
            <Tag size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Promo kodlar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>Coin mukofotlari yaratish</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
      </div>
    </div>
  );
}
