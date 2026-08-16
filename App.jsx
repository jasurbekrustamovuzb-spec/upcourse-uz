import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, ListChecks, Newspaper, Info, Plus, X, Check,
  ChevronRight, ArrowLeft, Trash2, Award, Loader2, GraduationCap,
  Paperclip, RotateCcw
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Design tokens — "ledger book" system                              */
/* ------------------------------------------------------------------ */
const C = {
  cover: '#1F3D2B',
  coverDeep: '#142A1B',
  coverLine: 'rgba(184,134,59,0.35)',
  paper: '#EFE9D6',
  paperSoft: '#F7F3E7',
  rule: '#B7C4AE',
  red: '#A8433A',
  gold: '#B8863B',
  goldSoft: '#DCC28F',
  ink: '#262A1E',
  inkSoft: '#5C6152',
  white: '#FBFAF3',
};

const fontDisplay = { fontFamily: "'Fraunces', Georgia, serif" };
const fontBody = { fontFamily: "'Inter', system-ui, sans-serif" };
const fontMono = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

/* ------------------------------------------------------------------ */
/*  Seed content — shown the first time the shared ledger is empty    */
/* ------------------------------------------------------------------ */
const SEED_CATEGORIES = [
  { id: 'cat1', name: 'Iqtisodiyot nazariyasi' },
];

const SEED_COURSES = [
  {
    id: 'c1',
    categoryId: 'cat1',
    title: 'Talab va taklif qonuni',
    summary: 'Bozor narxlari qanday shakllanishini tushuntiruvchi asosiy qonuniyat.',
    content:
      'Talab — bu isteʼmolchilarning maʼlum narxda maʼlum tovarni sotib olishga tayyor va qodir boʻlgan miqdori. Narx pasaysa, talab odatda ortadi; narx oshsa, talab kamayadi. Bu bogʻliqlik "talab qonuni" deb ataladi va grafikda pastga qarab tushuvchi egri chiziq bilan ifodalanadi.\n\nTaklif esa — ishlab chiqaruvchilarning maʼlum narxda sotishga tayyor boʻlgan tovar miqdori. Narx oshganda ishlab chiqaruvchilar koʻproq mahsulot taklif qilishga qiziqadi, shuning uchun taklif egri chizigʻi yuqoriga qarab koʻtariladi.\n\nBozor muvozanati talab va taklif egri chiziqlari kesishgan nuqtada yuzaga keladi — bu yerda muvozanat narxi va muvozanat miqdori aniqlanadi. Agar narx muvozanatdan yuqori boʻlsa, ortiqcha taklif yuzaga keladi; past boʻlsa, tanqislik paydo boʻladi.\n\nTalab va taklifga taʼsir qiluvchi omillar: isteʼmolchi daromadi, aholi soni, didlar, oʻrinbosar va toʻldiruvchi tovarlar narxi, ishlab chiqarish xarajatlari, texnologiya, kutilmalar va davlat siyosati.',
  },
  {
    id: 'c2',
    categoryId: 'cat1',
    title: 'YAIM: Yalpi ichki mahsulot nima va qanday hisoblanadi',
    summary: 'Mamlakat iqtisodiy faoliyatini oʻlchashning asosiy koʻrsatkichi.',
    content:
      'Yalpi ichki mahsulot (YAIM) — maʼlum davr ichida mamlakat ichida ishlab chiqarilgan barcha yakuniy tovar va xizmatlarning bozor qiymati. YAIM iqtisodiyot hajmini va uning oʻsish suʼratini baholashda asosiy koʻrsatkich hisoblanadi.\n\nYAIM uchta usulda hisoblanishi mumkin: 1) Xarajatlar usuli — isteʼmol, investitsiya, davlat xarajatlari va sof eksport yigʻindisi; 2) Daromadlar usuli — ish haqi, foyda, renta va foizlar yigʻindisi; 3) Ishlab chiqarish usuli — har bir tarmoqda yaratilgan qoʻshilgan qiymatlar yigʻindisi.\n\nNominal YAIM joriy narxlarda hisoblanadi, real YAIM esa narxlar oʻzgarishi taʼsirini hisobga olgan holda bazaviy yil narxlarida hisoblanadi. Real YAIM iqtisodiy oʻsishni solishtirish uchun koʻproq foydalidir.\n\nYAIM aholi jon boshiga boʻlinganda, mamlakatlar turmush darajasini taxminiy solishtirish imkonini beradi, biroq daromad taqsimotidagi notenglikni koʻrsatmaydi.',
  },
  {
    id: 'c3',
    categoryId: 'cat1',
    title: 'Inflyatsiya: turlari va sabablari',
    summary: 'Narxlar umumiy darajasining oshishi va uni keltirib chiqaruvchi omillar.',
    content:
      'Inflyatsiya — iqtisodiyotdagi tovar va xizmatlar narxlari umumiy darajasining vaqt oʻtishi bilan barqaror oshib borishi boʻlib, natijada pulning sotib olish qobiliyati pasayadi. Inflyatsiya darajasi odatda isteʼmol narxlari indeksi (CPI) orqali oʻlchanadi.\n\nInflyatsiyaning ikki asosiy turi mavjud: talab tortishi inflyatsiyasi — jami talab jami taklifdan tezroq oʻsganda yuzaga keladi; va xarajat turtkisi inflyatsiyasi — ishlab chiqarish xarajatlari oshishi natijasida narxlar koʻtarilganda kuzatiladi.\n\nMoʻʼtadil inflyatsiya iqtisodiyot uchun odatiy hisoblanadi, biroq giperinflyatsiya pulga boʻlgan ishonchni yoʻqotadi va iqtisodiy beqarorlikka olib keladi. Aksincha, deflyatsiya ham isteʼmol va investitsiyalarni kechiktirib, iqtisodiyotga salbiy taʼsir koʻrsatishi mumkin.\n\nMarkaziy banklar odatda pul-kredit siyosati orqali inflyatsiyani nazorat qilishga harakat qiladi.',
  },
];

const SEED_TESTS = [
  {
    id: 't1',
    categoryId: 'cat1',
    title: 'Talab va taklif — bilim testi',
    description: 'Talab va taklif qonuni boʻyicha asosiy tushunchalarni tekshiring.',
    questions: [
      { id: 'q1', text: 'Narx oshganda, talab qonuniga koʻra nima yuz beradi?', options: ['Talab miqdori ortadi', 'Talab miqdori kamayadi', 'Talab oʻzgarmaydi', 'Taklif kamayadi'], correct: 1 },
      { id: 'q2', text: 'Bozor muvozanati qachon yuzaga keladi?', options: ['Talab taklifdan koʻp boʻlganda', 'Taklif talabdan koʻp boʻlganda', 'Talab va taklif egri chiziqlari kesishganda', 'Davlat narxni belgilaganda'], correct: 2 },
      { id: 'q3', text: 'Narx muvozanat darajasidan yuqori boʻlsa, bozorda nima kuzatiladi?', options: ['Tanqislik', 'Ortiqcha taklif', 'Muvozanat saqlanadi', 'Talab ortadi'], correct: 1 },
      { id: 'q4', text: 'Quyidagilardan qaysi biri taklifga taʼsir qiluvchi omil emas?', options: ['Ishlab chiqarish texnologiyasi', 'Xomashyo narxi', 'Isteʼmolchining sevimli rangi', 'Soliqlar'], correct: 2 },
      { id: 'q5', text: 'Taklif egri chizigʻi odatda qanday koʻrinishga ega?', options: ['Pastga qarab tushuvchi', 'Yuqoriga qarab koʻtariluvchi', 'Gorizontal', 'Vertikal'], correct: 1 },
    ],
  },
];

const SEED_NEWS = [
  { id: 'n1', title: '"UpCourse Uz"ga xush kelibsiz', date: '2026-08-16', content: 'Ushbu platforma iqtisodiyotni oʻrganuvchilar uchun ochiq va bepul manba sifatida yaratildi. Kurslar boʻlimida mavzularni oʻqing, Testlar boʻlimida bilimingizni sinab koʻring. Roʻyxatdan oʻtish shart emas — barcha material hammaga ochiq.' },
  { id: 'n2', title: 'Yangi mavzu va testlar muntazam qoʻshib boriladi', date: '2026-08-16', content: 'Platforma tarkibi vaqt oʻtishi bilan kengaytiriladi: yangi mavzular, testlar va yangiliklar muntazam ravishda qoʻshib boriladi. Yangilanishlarni kuzatib boring.' },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  } catch (e) {
    return iso;
  }
}

/* Simple in-app password gate: typing the correct password confirms the
   action. Not real security (the password lives in the page code), just a
   filter against casual visitors. Uses an on-page modal instead of
   window.prompt/confirm/alert, since native browser dialogs don't reliably
   work inside the sandboxed artifact preview. */
const ADMIN_PASSWORD = 'admin2026';

/* ------------------------------------------------------------------ */
/*  Supabase connection                                                */
/*                                                                      */
/*  1. Create a free project at https://supabase.com                   */
/*  2. Open the SQL Editor and run the supabase-setup.sql file         */
/*  3. Project Settings → API → copy "Project URL" and "anon public"   */
/*     key, and paste them below.                                      */
/*                                                                      */
/*  NOTE: this talks to Supabase over plain network requests (fetch),  */
/*  which the Claude.ai artifact preview does not allow to reach       */
/*  outside domains — so this tab will show a setup message until the  */
/*  file is deployed to real hosting (Vercel, Netlify, etc.).          */
/* ------------------------------------------------------------------ */
const SUPABASE_URL = 'https://cuubcnnzjlmvcbgnctvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dWJjbm56amxtdmNiZ25jdHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkzMTAsImV4cCI6MjEwMjQ0NTMxMH0.x-b1KKEtjh928Ae2LXoyYPNK5Ov1rE5tv8nUJk-4Kn0';

function isSupabaseConfigured() {
  return (
    SUPABASE_URL && !SUPABASE_URL.includes('YOUR-PROJECT') &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR-ANON')
  );
}

async function sbRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${path} — ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const sbSelect = (table) => sbRequest(`${table}?select=*&order=created_at.asc`);
const sbInsert = (table, row) => sbRequest(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
const sbDelete = (table, id) => sbRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });

/* Row (snake_case, matches SQL columns) <-> app object (camelCase) */
const categoryToRow = (c) => ({ id: c.id, name: c.name });
const categoryFromRow = (r) => ({ id: r.id, name: r.name });
const courseToRow = (c) => ({ id: c.id, category_id: c.categoryId || null, title: c.title, summary: c.summary || '', content: c.content });
const courseFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, summary: r.summary || '', content: r.content });
const testToRow = (t) => ({ id: t.id, category_id: t.categoryId || null, title: t.title, description: t.description || '', questions: t.questions });
const testFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, description: r.description || '', questions: r.questions });
const newsToRow = (n) => ({ id: n.id, title: n.title, content: n.content, date: n.date });
const newsFromRow = (r) => ({ id: r.id, title: r.title, content: r.content, date: r.date });


/* ------------------------------------------------------------------ */
/*  Small shared UI bits                                              */
/* ------------------------------------------------------------------ */

function EntryNumber({ n }) {
  return (
    <span
      className="inline-block flex-shrink-0 text-xs px-2 py-1 mr-3 rounded-sm"
      style={{ ...fontMono, color: C.gold, background: 'rgba(184,134,59,0.12)', border: `1px solid ${C.coverLine}` }}
    >
      №{String(n).padStart(2, '0')}
    </span>
  );
}

function IconButtonDelete({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label || 'Oʻchirish'}
      className="flex-shrink-0 p-2 rounded-full transition-colors"
      style={{ color: C.inkSoft }}
      onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.inkSoft)}
    >
      <Trash2 size={16} />
    </button>
  );
}

function PaperPanel({ children }) {
  return (
    <div
      className="relative rounded-sm overflow-hidden"
      style={{
        background: C.paperSoft,
        backgroundImage:
          `repeating-linear-gradient(to bottom, transparent, transparent 2.6em, ${C.rule}55 2.6em, ${C.rule}55 calc(2.6em + 1px))`,
        border: `1px solid ${C.rule}`,
        boxShadow: '0 8px 24px rgba(31,61,43,0.10)',
      }}
    >
      <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: '2.75rem', background: C.red, opacity: 0.55 }} />
      <div className="pl-14 pr-5 py-6 sm:pl-16 sm:pr-8 sm:py-8">{children}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-6">
      <div className="text-xs tracking-[0.2em] uppercase mb-1" style={{ ...fontMono, color: C.gold }}>{eyebrow}</div>
      <h2 className="text-2xl sm:text-3xl" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{title}</h2>
    </div>
  );
}

function EmptyState({ text, cta }) {
  return (
    <div className="py-10 text-center border border-dashed rounded-sm" style={{ borderColor: C.rule, color: C.inkSoft }}>
      <p style={{ ...fontBody }} className="mb-1">{text}</p>
      {cta && <p className="text-sm" style={{ ...fontBody }}>{cta}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, textarea, rows }) {
  const common = {
    value,
    onChange: (e) => onChange(e.target.value),
    placeholder,
    className: 'w-full bg-transparent outline-none py-2 text-[15px]',
    style: { ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` },
  };
  return (
    <label className="block mb-4">
      <span className="block text-xs mb-1 tracking-wide uppercase" style={{ ...fontMono, color: C.inkSoft }}>{label}</span>
      {textarea ? <textarea rows={rows || 4} {...common} /> : <input type="text" {...common} />}
    </label>
  );
}

function GhostButton({ children, onClick, icon: Icon, type }) {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors focus-visible:outline focus-visible:outline-2"
      style={{ ...fontBody, color: C.cover, border: `1px solid ${C.cover}`, outlineColor: C.gold }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function SolidButton({ children, onClick, icon: Icon, type, disabled }) {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-opacity focus-visible:outline focus-visible:outline-2 disabled:opacity-40"
      style={{ ...fontBody, color: C.white, background: C.cover, outlineColor: C.gold }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Sohalar (Categories) — shared between Kurslar and Testlar          */
/* ------------------------------------------------------------------ */

function AddCategoryForm({ onAdd, onDone }) {
  const [name, setName] = useState('');

  async function submit() {
    if (!name.trim()) return;
    const ok = await onAdd({ name: name.trim() });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Soha nomi" value={name} onChange={setName} placeholder="Masalan: Marketing, Huquqshunoslik, Dasturlash" />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Sohani saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function CategoryGrid({ categories, itemsByCategory, itemLabel, onSelect, addCategory, deleteCategory }) {
  const [formOpen, setFormOpen] = useState(false);
  return (
    <div>
      {categories.length === 0 ? (
        <EmptyState text="Hozircha soha qoʻshilmagan." cta="Quyidagi tugma orqali birinchi sohani qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {categories.map((cat, i) => {
            const count = itemsByCategory[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{ background: C.white, border: `1px solid ${C.rule}` }}
                onClick={() => onSelect(cat.id)}
              >
                <div className="flex items-start min-w-0">
                  <EntryNumber n={i + 1} />
                  <div className="min-w-0">
                    <div className="font-medium text-[15px] truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                    <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta {itemLabel}</div>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButtonDelete onClick={() => deleteCategory(cat.id, cat.name)} />
                  <ChevronRight size={16} style={{ color: C.gold }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <AddCategoryForm onAdd={addCategory} onDone={() => setFormOpen(false)} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={() => setFormOpen(true)} icon={Plus}>Yangi soha qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kurslar (Courses)                                                  */
/* ------------------------------------------------------------------ */

function AddCourseForm({ categoryId, onAdd, onDone }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    const ok = await onAdd({ categoryId, title: title.trim(), summary: summary.trim(), content: content.trim() });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Mavzu nomi" value={title} onChange={setTitle} placeholder="Masalan: Bozor muvozanati" />
      <TextField label="Qisqacha taʼrif (ixtiyoriy)" value={summary} onChange={setSummary} placeholder="Bir jumlada mavzu haqida" />
      <TextField label="Dars matni" value={content} onChange={setContent} placeholder="Mavzu matnini shu yerga yozing..." textarea rows={7} />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Mavzuni saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function CoursesView({ courses, categories, addCourse, deleteCourse, addCategory, deleteCategory }) {
  const [categoryId, setCategoryId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const active = courses.find((c) => c.id === openId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = courses.filter((c) => c.categoryId === categoryId);

  if (active) {
    return (
      <div>
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1 text-sm mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {activeCategory ? activeCategory.name : 'Barcha mavzular'}
        </button>
        <h3 className="text-2xl sm:text-3xl mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
        <div className="space-y-4 max-w-2xl">
          {active.content.split('\n\n').map((p, i) => (
            <p key={i} className="text-[15px] leading-7" style={{ ...fontBody, color: C.ink }}>{p}</p>
          ))}
        </div>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <SectionHeading eyebrow={`${categories.length} ta soha`} title="Kurslar" />
        <CategoryGrid
          categories={categories}
          itemsByCategory={courses.reduce((acc, c) => { acc[c.categoryId] = (acc[c.categoryId] || 0) + 1; return acc; }, {})}
          itemLabel="mavzu"
          onSelect={setCategoryId}
          addCategory={addCategory}
          deleteCategory={deleteCategory}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-sm mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta mavzu`} title={activeCategory ? activeCategory.name : 'Kurslar'} />
      {inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha mavzu qoʻshilmagan." cta="Quyidagi tugma orqali birinchi mavzuni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((c, i) => (
            <div
              key={c.id}
              className="group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: C.white, border: `1px solid ${C.rule}` }}
              onClick={() => setOpenId(c.id)}
            >
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-[15px] truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                  {c.summary && <div className="text-sm mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                </div>
              </div>
              <div className="flex items-center flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <IconButtonDelete onClick={() => deleteCourse(c.id, c.title)} />
                <ChevronRight size={16} style={{ color: C.gold }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <AddCourseForm categoryId={categoryId} onAdd={addCourse} onDone={() => setFormOpen(false)} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={() => setFormOpen(true)} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Testlar (Tests / Quizzes)                                          */
/* ------------------------------------------------------------------ */

function AddTestForm({ categoryId, onAdd, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [qText, setQText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);

  function addQuestion() {
    if (!qText.trim() || opts.some((o) => !o.trim())) return;
    setQuestions([...questions, { id: uid(), text: qText.trim(), options: opts.map((o) => o.trim()), correct }]);
    setQText('');
    setOpts(['', '', '', '']);
    setCorrect(0);
  }

  function removeQuestion(id) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onAdd({ categoryId, title: title.trim(), description: description.trim(), questions });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Test nomi" value={title} onChange={setTitle} placeholder="Masalan: Inflyatsiya boʻyicha test" />
      <TextField label="Tavsif (ixtiyoriy)" value={description} onChange={setDescription} placeholder="Test haqida qisqacha" />

      {questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between p-3 rounded-sm" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
              <div className="text-sm min-w-0" style={{ ...fontBody, color: C.ink }}>
                <span style={{ ...fontMono, color: C.gold }}>{i + 1}.</span> {q.text}
              </div>
              <button onClick={() => removeQuestion(q.id)} className="flex-shrink-0 ml-3" style={{ color: C.inkSoft }}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-sm mb-4" style={{ background: C.paperSoft, border: `1px dashed ${C.rule}` }}>
        <div className="text-xs mb-3 tracking-wide uppercase" style={{ ...fontMono, color: C.inkSoft }}>Savol qoʻshish</div>
        <TextField label="Savol matni" value={qText} onChange={setQText} placeholder="Savolni yozing" />
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="correct-opt"
              checked={correct === i}
              onChange={() => setCorrect(i)}
              className="flex-shrink-0"
              title="Toʻgʻri javob"
            />
            <input
              type="text"
              value={o}
              onChange={(e) => { const next = [...opts]; next[i] = e.target.value; setOpts(next); }}
              placeholder={`Variant ${String.fromCharCode(65 + i)}`}
              className="w-full bg-transparent outline-none py-1.5 text-sm"
              style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
            />
          </div>
        ))}
        <div className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javobni radio tugma bilan belgilang.</div>
        <GhostButton onClick={addQuestion} icon={Plus}>Savolni testga qoʻshish</GhostButton>
      </div>

      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={questions.length === 0 || !title.trim()}>Testni saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function QuizView({ test, onExit }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = test.questions.every((q) => answers[q.id] !== undefined);
  const score = test.questions.reduce((s, q) => s + (answers[q.id] === q.correct ? 1 : 0), 0);

  function select(qid, idx) {
    if (submitted) return;
    setAnswers({ ...answers, [qid]: idx });
  }

  function restart() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div>
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1 text-sm mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha testlar
      </button>

      <h3 className="text-2xl sm:text-3xl mb-1" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-sm mb-6" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}

      {submitted && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-sm" style={{ background: C.cover }}>
          <Award size={22} style={{ color: C.gold }} />
          <div style={{ ...fontMono, color: C.white }}>
            Natija: {score}/{test.questions.length} ({Math.round((score / test.questions.length) * 100)}%)
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {test.questions.map((q, qi) => (
          <div key={q.id}>
            <div className="text-[15px] mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
              <span style={{ ...fontMono, color: C.gold }}>{qi + 1}.</span> {q.text}
            </div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = answers[q.id] === oi;
                let bg = C.white, border = C.rule, textColor = C.ink;
                if (submitted) {
                  if (oi === q.correct) { bg = 'rgba(31,61,43,0.10)'; border = C.cover; }
                  else if (isSelected && oi !== q.correct) { bg = 'rgba(168,67,58,0.10)'; border = C.red; }
                } else if (isSelected) {
                  border = C.gold; bg = 'rgba(184,134,59,0.08)';
                }
                return (
                  <button
                    key={oi}
                    onClick={() => select(q.id, oi)}
                    disabled={submitted}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors focus-visible:outline focus-visible:outline-2"
                    style={{ ...fontBody, background: bg, border: `1px solid ${border}`, color: textColor, outlineColor: C.gold }}
                  >
                    <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                    <span>{opt}</span>
                    {submitted && oi === q.correct && <Check size={15} className="ml-auto flex-shrink-0" style={{ color: C.cover }} />}
                    {submitted && isSelected && oi !== q.correct && <X size={15} className="ml-auto flex-shrink-0" style={{ color: C.red }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        {!submitted ? (
          <SolidButton onClick={() => setSubmitted(true)} icon={Check} disabled={!allAnswered}>Javoblarni tekshirish</SolidButton>
        ) : (
          <GhostButton onClick={restart} icon={RotateCcw}>Qayta urinish</GhostButton>
        )}
      </div>
    </div>
  );
}

function TestsView({ tests, categories, addTest, deleteTest, addCategory, deleteCategory }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const active = tests.find((t) => t.id === activeId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = tests.filter((t) => t.categoryId === categoryId);

  if (active) return <QuizView test={active} onExit={() => setActiveId(null)} />;

  if (!categoryId) {
    return (
      <div>
        <SectionHeading eyebrow={`${categories.length} ta soha`} title="Testlar" />
        <CategoryGrid
          categories={categories}
          itemsByCategory={tests.reduce((acc, t) => { acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
          itemLabel="test"
          onSelect={setCategoryId}
          addCategory={addCategory}
          deleteCategory={deleteCategory}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-sm mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta test`} title={activeCategory ? activeCategory.name : 'Testlar'} />
      {inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha test qoʻshilmagan." cta="Quyidagi tugma orqali birinchi testni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((t, i) => (
            <div key={t.id} className="flex items-start justify-between p-4 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-[15px]" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                  {t.description && <div className="text-sm mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                  <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questions.length} ta savol</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <IconButtonDelete onClick={() => deleteTest(t.id, t.title)} />
                <button
                  onClick={() => setActiveId(t.id)}
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

      {formOpen ? (
        <AddTestForm categoryId={categoryId} onAdd={addTest} onDone={() => setFormOpen(false)} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={() => setFormOpen(true)} icon={Plus}>Yangi test qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Yangiliklar (News)                                                  */
/* ------------------------------------------------------------------ */

function AddNewsForm({ onAdd, onDone }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    const ok = await onAdd({ title: title.trim(), content: content.trim(), date: new Date().toISOString().slice(0, 10) });
    if (ok) onDone();
  }

  return (
    <div className="mb-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Sarlavha" value={title} onChange={setTitle} placeholder="Yangilik sarlavhasi" />
      <TextField label="Matn" value={content} onChange={setContent} placeholder="Yangilik matni..." textarea rows={5} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check}>Yangilikni eʼlon qilish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function NewsView({ news, addNews, deleteNews }) {
  const [formOpen, setFormOpen] = useState(false);
  const sorted = [...news].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <SectionHeading eyebrow={`${news.length} ta yangilik`} title="Yangiliklar" />

      {formOpen ? (
        <AddNewsForm onAdd={addNews} onDone={() => setFormOpen(false)} />
      ) : (
        <div className="mb-6">
          <GhostButton onClick={() => setFormOpen(true)} icon={Plus}>Yangi yangilik qoʻshish</GhostButton>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState text="Hozircha yangilik yoʻq." />
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sorted.map((n) => (
            <div key={n.id} className="p-4 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs mb-1" style={{ ...fontMono, color: C.gold }}>{formatDate(n.date)}</div>
                  <div className="font-medium text-[15px] mb-1" style={{ ...fontBody, color: C.ink }}>{n.title}</div>
                  <p className="text-sm leading-6" style={{ ...fontBody, color: C.inkSoft }}>{n.content}</p>
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

/* ------------------------------------------------------------------ */
/*  Biz haqimizda (About)                                               */
/* ------------------------------------------------------------------ */

function AboutView() {
  return (
    <div>
      <SectionHeading eyebrow="Platforma haqida" title="Biz haqimizda" />
      <div className="space-y-4 max-w-2xl text-[15px] leading-7" style={{ ...fontBody, color: C.ink }}>
        <p>"UpCourse Uz" — iqtisodiyot fanini oʻrganuvchilar uchun yaratilgan ochiq taʼlim platformasi. Maqsadimiz — iqtisodiy bilimlarni sodda, tizimli va hammabop shaklda taqdim etish.</p>
        <p>Platformada roʻyxatdan oʻtish yoki profil yaratish shart emas: barcha kurslar, testlar va yangiliklar istalgan foydalanuvchi uchun istalgan paytda ochiq.</p>
        <p>Kontent doimiy ravishda yangilanib boriladi — yangi mavzular, testlar va eʼlonlar muntazam qoʻshiladi.</p>
      </div>
    </div>
  );
}

function PasswordModal({ label, onConfirm, onCancel }) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState(false);

  function handleSubmit() {
    if (value === ADMIN_PASSWORD) {
      onConfirm();
    } else {
      setErr(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,30,20,0.55)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm p-6 rounded-sm"
        style={{ background: C.white, border: `1px solid ${C.rule}`, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}
      >
        <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.gold }}>Tasdiqlash</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.ink }}>{label} uchun parolni kiriting:</div>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setErr(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          className="w-full bg-transparent outline-none py-2 mb-1 text-[15px]"
          style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${err ? C.red : C.rule}` }}
          placeholder="Parol"
        />
        {err && <div className="text-xs mb-2" style={{ ...fontBody, color: C.red }}>Parol notoʻgʻri.</div>}
        <div className="flex gap-3 mt-4">
          <SolidButton onClick={handleSubmit} icon={Check}>Tasdiqlash</SolidButton>
          <GhostButton onClick={onCancel} icon={X}>Bekor qilish</GhostButton>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App shell                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'kurslar', label: 'Kurslar', icon: BookOpen },
  { id: 'testlar', label: 'Testlar', icon: ListChecks },
  { id: 'yangiliklar', label: 'Yangiliklar', icon: Newspaper },
  { id: 'about', label: 'Biz haqimizda', icon: Info },
];

export default function App() {
  const [tab, setTab] = useState('kurslar');
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const requestAdmin = useCallback((label) => {
    return new Promise((resolve) => {
      setPendingConfirm({ label, resolve });
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured()) {
        setError('Supabase ulanish maʼlumotlari hali kiritilmagan. Kod faylining yuqori qismidagi SUPABASE_URL va SUPABASE_ANON_KEY qatorlarini toʻldiring.');
        setLoading(false);
        return;
      }
      try {
        let [catRows, courseRows, testRows, newsRows] = await Promise.all([
          sbSelect('categories'), sbSelect('courses'), sbSelect('tests'), sbSelect('news'),
        ]);

        if (catRows.length === 0 && courseRows.length === 0 && testRows.length === 0 && newsRows.length === 0) {
          // Baza boʻsh — birinchi marta ochilganda namuna kontent bilan toʻldiramiz.
          await Promise.all(SEED_CATEGORIES.map((c) => sbInsert('categories', categoryToRow(c))));
          await Promise.all(SEED_COURSES.map((c) => sbInsert('courses', courseToRow(c))));
          await Promise.all(SEED_TESTS.map((t) => sbInsert('tests', testToRow(t))));
          await Promise.all(SEED_NEWS.map((n) => sbInsert('news', newsToRow(n))));
          [catRows, courseRows, testRows, newsRows] = await Promise.all([
            sbSelect('categories'), sbSelect('courses'), sbSelect('tests'), sbSelect('news'),
          ]);
        }

        setCategories(catRows.map(categoryFromRow));
        setCourses(courseRows.map(courseFromRow));
        setTests(testRows.map(testFromRow));
        setNews(newsRows.map(newsFromRow));
      } catch (e) {
        setError('Maʼlumotlarni yuklashda xatolik yuz berdi. Supabase loyihangiz manzili/kaliti va SQL jadvallar toʻgʻri sozlanganini tekshiring.');
      }
      setLoading(false);
    })();
  }, []);

  async function addCategory(data) {
    if (!(await requestAdmin('Yangi soha qoʻshish'))) return false;
    const row = { id: uid(), name: data.name };
    try {
      await sbInsert('categories', categoryToRow(row));
      setCategories([...categories, row]);
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Sohani saqlashda xatolik yuz berdi. Internetni va Supabase sozlamalarini tekshiring.');
      return false;
    }
  }
  async function deleteCategory(id, name) {
    if (!(await requestAdmin(`"${name}" sohasini oʻchirish`))) return false;
    try {
      await sbDelete('categories', id);
      setCategories(categories.filter((c) => c.id !== id));
      setCourses(courses.filter((c) => c.categoryId !== id));
      setTests(tests.filter((t) => t.categoryId !== id));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Sohani oʻchirishda xatolik yuz berdi.');
      return false;
    }
  }

  async function addCourse(data) {
    if (!(await requestAdmin('Yangi mavzu qoʻshish'))) return false;
    const row = { ...data, id: uid() };
    try {
      await sbInsert('courses', courseToRow(row));
      setCourses([row, ...courses]);
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Mavzuni saqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function deleteCourse(id, title) {
    if (!(await requestAdmin(`"${title}" mavzusini oʻchirish`))) return false;
    try {
      await sbDelete('courses', id);
      setCourses(courses.filter((c) => c.id !== id));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Mavzuni oʻchirishda xatolik yuz berdi.');
      return false;
    }
  }

  async function addTest(data) {
    if (!(await requestAdmin('Yangi test qoʻshish'))) return false;
    const row = { ...data, id: uid() };
    try {
      await sbInsert('tests', testToRow(row));
      setTests([row, ...tests]);
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Testni saqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function deleteTest(id, title) {
    if (!(await requestAdmin(`"${title}" testini oʻchirish`))) return false;
    try {
      await sbDelete('tests', id);
      setTests(tests.filter((t) => t.id !== id));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Testni oʻchirishda xatolik yuz berdi.');
      return false;
    }
  }

  async function addNews(data) {
    if (!(await requestAdmin('Yangi yangilik eʼlon qilish'))) return false;
    const row = { ...data, id: uid() };
    try {
      await sbInsert('news', newsToRow(row));
      setNews([row, ...news]);
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Yangilikni saqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function deleteNews(id, title) {
    if (!(await requestAdmin(`"${title}" yangiligini oʻchirish`))) return false;
    try {
      await sbDelete('news', id);
      setNews(news.filter((n) => n.id !== id));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Yangilikni oʻchirishda xatolik yuz berdi.');
      return false;
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline-offset: 2px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Masthead */}
      <header style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={20} style={{ color: C.gold }} />
            <span className="text-xs tracking-[0.25em] uppercase" style={{ ...fontMono, color: C.goldSoft }}>Ochiq taʼlim platformasi</span>
          </div>
          <h1 className="text-4xl sm:text-5xl mb-3" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>UpCourse Uz</h1>
          <p className="text-sm sm:text-base max-w-xl mb-6" style={{ ...fontBody, color: 'rgba(251,250,243,0.75)' }}>
            Iqtisodiyot boʻyicha mavzular, testlar va yangiliklar — hammaga ochiq, roʻyxatdan oʻtishsiz.
          </p>
          <div className="flex gap-6 pt-4" style={{ borderTop: `1px solid ${C.coverLine}` }}>
            {[['Mavzular', courses.length], ['Testlar', tests.length], ['Yangiliklar', news.length]].map(([label, val]) => (
              <div key={label}>
                <div className="text-xl" style={{ ...fontMono, color: C.gold }}>{String(val).padStart(2, '0')}</div>
                <div className="text-xs uppercase tracking-wide" style={{ ...fontBody, color: 'rgba(251,250,243,0.55)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="max-w-5xl mx-auto px-5 sm:px-8 -mt-5 relative z-10">
        <div className="flex gap-1 p-1.5 rounded-sm overflow-x-auto" style={{ background: C.white, border: `1px solid ${C.rule}`, boxShadow: '0 6px 16px rgba(31,61,43,0.12)' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-sm text-sm whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2"
                style={{
                  ...fontBody,
                  color: activeTab ? C.white : C.inkSoft,
                  background: activeTab ? C.cover : 'transparent',
                  outlineColor: C.gold,
                  fontWeight: activeTab ? 600 : 400,
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: C.inkSoft }}>
            <Loader2 className="animate-spin mr-2" size={20} />
            <span style={fontBody}>Yuklanmoqda...</span>
          </div>
        ) : error ? (
          <div className="p-5 rounded-sm text-sm" style={{ ...fontBody, background: 'rgba(168,67,58,0.08)', border: `1px solid ${C.red}`, color: C.red }}>
            {error}
          </div>
        ) : (
          <>
            {actionError && (
              <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-sm text-sm" style={{ ...fontBody, background: 'rgba(168,67,58,0.08)', border: `1px solid ${C.red}`, color: C.red }}>
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)}><X size={15} /></button>
              </div>
            )}
            <PaperPanel>
              {tab === 'kurslar' && <CoursesView courses={courses} categories={categories} addCourse={addCourse} deleteCourse={deleteCourse} addCategory={addCategory} deleteCategory={deleteCategory} />}
              {tab === 'testlar' && <TestsView tests={tests} categories={categories} addTest={addTest} deleteTest={deleteTest} addCategory={addCategory} deleteCategory={deleteCategory} />}
              {tab === 'yangiliklar' && <NewsView news={news} addNews={addNews} deleteNews={deleteNews} />}
              {tab === 'about' && <AboutView />}
            </PaperPanel>
          </>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-5 sm:px-8 pb-10 pt-2">
        <div className="flex items-center gap-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>
          <Paperclip size={12} />
          <span>UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()}</span>
        </div>
      </footer>

      {pendingConfirm && (
        <PasswordModal
          label={pendingConfirm.label}
          onConfirm={() => { pendingConfirm.resolve(true); setPendingConfirm(null); }}
          onCancel={() => { pendingConfirm.resolve(false); setPendingConfirm(null); }}
        />
      )}
    </div>
  );
}
