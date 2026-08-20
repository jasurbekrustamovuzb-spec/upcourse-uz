import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, ListChecks, Newspaper, Info, Plus, X, Check,
  ChevronRight, ArrowLeft, Trash2, Award, Loader2, GraduationCap,
  Paperclip, RotateCcw, MoreVertical, Pencil, CheckCircle2, Users, Search
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
const sbUpdate = (table, id, patch) => sbRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
const sbDelete = (table, id) => sbRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });

/* Row (snake_case, matches SQL columns) <-> app object (camelCase) */
const categoryToRow = (c) => ({ id: c.id, name: c.name, author: c.author || '' });
const categoryFromRow = (r) => ({ id: r.id, name: r.name, author: r.author || '' });
const courseToRow = (c) => ({ id: c.id, category_id: c.categoryId || null, title: c.title, summary: c.summary || '', content: c.content, video_url: c.videoUrl || null, author: c.author || '', status: c.status || 'approved' });
const courseFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, summary: r.summary || '', content: r.content, videoUrl: r.video_url || '', author: r.author || '', status: r.status || 'approved' });
const testToRow = (t) => ({ id: t.id, category_id: t.categoryId || null, title: t.title, description: t.description || '', questions: t.questions, author: t.author || '', status: t.status || 'approved' });
const testFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, description: r.description || '', questions: r.questions, author: r.author || '', status: r.status || 'approved' });
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

function ItemMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full transition-colors"
        style={{ color: C.inkSoft }}
        title="Amallar"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 rounded-sm overflow-hidden"
          style={{ background: C.white, border: `1px solid ${C.rule}`, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', minWidth: '150px' }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); a.onClick(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[15px] text-left transition-colors"
              style={{ ...fontBody, color: a.danger ? C.red : C.ink, background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.paperSoft)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <a.icon size={14} /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
      className="rounded-lg"
      style={{
        background: C.paperSoft,
        border: `1px solid ${C.rule}`,
        boxShadow: '0 8px 24px rgba(31,61,43,0.08)',
      }}
    >
      <div className="px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-5">
      <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3.5" style={{ color: C.inkSoft }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-sm text-base outline-none focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.ink, background: C.white, border: `1px solid ${C.rule}`, outlineColor: C.gold }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute top-1/2 -translate-y-1/2 right-3.5 p-1 rounded-full"
          style={{ color: C.inkSoft }}
          aria-label="Tozalash"
        >
          <X size={16} />
        </button>
      )}
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
      {cta && <p className="text-[15px]" style={{ ...fontBody }}>{cta}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  YouTube video — embedded only after the user clicks play, so it    */
/*  never affects page-load speed. Uses YouTube's own embedded player, */
/*  which already has fullscreen, a scrub bar, and play/pause built in. */
/* ------------------------------------------------------------------ */

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch (e) {
    // not a valid URL
  }
  return null;
}

function YouTubeEmbed({ url }) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <div className="max-w-2xl mx-auto my-5">
      <div
        className="relative w-full overflow-hidden rounded-sm"
        style={{ aspectRatio: '16 / 9', background: '#000', border: `1px solid ${C.rule}` }}
      >
        {playing ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group focus-visible:outline focus-visible:outline-2"
            style={{ outlineColor: C.gold }}
            aria-label="Videoni ishga tushirish"
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(20,30,20,0.25)' }}>
              <span
                className="flex items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{ width: 62, height: 62, background: 'rgba(20,30,20,0.72)', border: `2px solid ${C.goldSoft}` }}
              >
                <PlayIcon />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#FBFAF3" />
    </svg>
  );
}

/* Renders course text line-by-line: a blank line starts a new paragraph,
   consecutive lines within a paragraph keep their line breaks (so numbered
   lists like "1." / "2." stay on separate lines), and a line that's just
   "{{video}}" is replaced with the video player exactly where it was typed —
   whether it's separated by one Enter or a blank line. */
function CourseBody({ content, videoUrl }) {
  const marker = '{{video}}';
  const lines = (content || '').split('\n');
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) { blocks.push({ type: 'text', lines: buffer }); buffer = []; }
  };
  let videoInserted = false;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === marker) {
      flush();
      blocks.push({ type: 'video' });
      videoInserted = true;
    } else if (trimmed === '') {
      flush();
    } else {
      buffer.push(line);
    }
  });
  flush();
  if (videoUrl && !videoInserted) blocks.push({ type: 'video' });

  return (
    <div className="space-y-4 max-w-2xl">
      {blocks.map((b, i) =>
        b.type === 'video' ? (
          videoUrl ? <YouTubeEmbed key={i} url={videoUrl} /> : null
        ) : (
          <p key={i} className="text-base leading-7" style={{ ...fontBody, color: C.ink }}>
            {b.lines.map((l, j) => (
              <React.Fragment key={j}>
                {l}
                {j < b.lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, textarea, rows }) {
  const common = {
    value,
    onChange: (e) => onChange(e.target.value),
    placeholder,
    className: 'w-full bg-transparent outline-none py-2 text-base',
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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[15px] font-medium transition-opacity focus-visible:outline focus-visible:outline-2 disabled:opacity-40"
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

function RenameCategoryModal({ category, onSave, onCancel }) {
  const [name, setName] = useState(category.name);
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
        <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.gold }}>Sohani tahrirlash</div>
        <TextField label="Soha nomi" value={name} onChange={setName} />
        <div className="flex gap-3 mt-2">
          <SolidButton onClick={() => onSave(name)} icon={Check}>Saqlash</SolidButton>
          <GhostButton onClick={onCancel} icon={X}>Bekor qilish</GhostButton>
        </div>
      </div>
    </div>
  );
}

function CategoryGrid({ categories, itemsByCategory, itemLabel, onSelect, renameCategory, deleteCategory, onGoToCommunity }) {
  const [renaming, setRenaming] = useState(null);

  return (
    <div>
      {categories.length === 0 ? (
        <EmptyState text="Hozircha soha qoʻshilmagan." cta="Quyidagi tugma orqali Hamjamiyat boʻlimida birinchi sohani qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat, i) => {
            const count = itemsByCategory[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{ background: C.white, border: `1px solid ${C.rule}` }}
                onClick={() => onSelect(cat.id)}
              >
                <div className="flex items-start min-w-0">
                  <EntryNumber n={i + 1} />
                  <div className="min-w-0">
                    <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                    <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta {itemLabel}</div>
                    {cat.author && <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {cat.author}</div>}
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 gap-1">
                  <ItemMenu actions={[
                    { label: 'Nomini oʻzgartirish', icon: Pencil, onClick: () => setRenaming(cat) },
                    { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCategory(cat.id, cat.name) },
                  ]} />
                  <ChevronRight size={16} style={{ color: C.gold }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <GhostButton onClick={onGoToCommunity} icon={Plus}>Yangi soha qoʻshish</GhostButton>
      </div>

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

/* ------------------------------------------------------------------ */
/*  Kurslar (Courses)                                                  */
/* ------------------------------------------------------------------ */

function SuccessPanel({ onView, onDone }) {
  return (
    <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.white, border: `1px solid ${C.cover}` }}>
      <Check size={22} style={{ color: C.cover }} className="mx-auto mb-2" />
      <div className="text-base mb-4" style={{ ...fontBody, color: C.ink }}>Sizning loyihangiz muvaffaqiyatli qoʻshildi!</div>
      <div className="flex gap-3 justify-center">
        <SolidButton onClick={onView} icon={ChevronRight}>Koʻrish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Yopish</GhostButton>
      </div>
    </div>
  );
}

function CategoryPicker({ categories, value, onChange }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs mb-1 tracking-wide uppercase" style={{ ...fontMono, color: C.inkSoft }}>Soha</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none py-2 text-base"
        style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
      >
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

function AddCourseForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [newId, setNewId] = useState(null);

  if (newId) {
    return <SuccessPanel onView={() => onView(newId)} onDone={onDone} />;
  }

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    if (!lockedCategoryId && !categoryName.trim()) return;
    const payload = lockedCategoryId
      ? { categoryId: lockedCategoryId, title: title.trim(), summary: summary.trim(), content: content.trim(), videoUrl: videoUrl.trim() }
      : { categoryName: categoryName.trim(), author: author.trim(), title: title.trim(), summary: summary.trim(), content: content.trim(), videoUrl: videoUrl.trim() };
    const id = await onSubmit(payload);
    if (id) setNewId(id);
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Masalan: Marketing (yangi soha boʻlsa ham yozavering)" />
      )}
      <TextField label="Mavzu nomi" value={title} onChange={setTitle} placeholder="Masalan: Bozor muvozanati" />
      <TextField label="Qisqacha taʼrif (ixtiyoriy)" value={summary} onChange={setSummary} placeholder="Bir jumlada mavzu haqida" />
      <TextField label="Dars matni" value={content} onChange={setContent} placeholder="Mavzu matnini shu yerga yozing... Video matn ichida qayerda chiqishini xohlasangiz, oʻsha joyga alohida qatorga {{video}} deb yozing." textarea rows={7} />
      <TextField label="YouTube video havolasi (ixtiyoriy)" value={videoUrl} onChange={setVideoUrl} placeholder="https://www.youtube.com/watch?v=..." />
      {!lockedCategoryId && (
        <TextField label="Tuzuvchi (ixtiyoriy)" value={author} onChange={setAuthor} placeholder="Ismingiz yoki taxallusingiz" />
      )}
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Yuborish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function EditCourseForm({ course, onSave, onDone }) {
  const [title, setTitle] = useState(course.title);
  const [summary, setSummary] = useState(course.summary || '');
  const [content, setContent] = useState(course.content);
  const [videoUrl, setVideoUrl] = useState(course.videoUrl || '');

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    const ok = await onSave({ categoryId: course.categoryId, title: title.trim(), summary: summary.trim(), content: content.trim(), videoUrl: videoUrl.trim() });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Mavzu nomi" value={title} onChange={setTitle} />
      <TextField label="Qisqacha taʼrif (ixtiyoriy)" value={summary} onChange={setSummary} />
      <TextField label="Dars matni" value={content} onChange={setContent} placeholder="Video matn ichida qayerda chiqishini xohlasangiz, oʻsha joyga alohida qatorga {{video}} deb yozing." textarea rows={7} />
      <TextField label="YouTube video havolasi (ixtiyoriy)" value={videoUrl} onChange={setVideoUrl} placeholder="https://www.youtube.com/watch?v=..." />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function CoursesView({ courses, categories, updateCourse, deleteCourse, renameCategory, deleteCategory, onGoToCommunity }) {
  const [categoryId, setCategoryId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');

  const approved = courses.filter((c) => c.status !== 'pending');
  const active = approved.find((c) => c.id === openId);
  const editing = approved.find((c) => c.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((c) => c.categoryId === categoryId);
  const q = query.trim().toLowerCase();
  const matchedCategories = q ? categories.filter((cat) => cat.name.toLowerCase().includes(q)) : [];
  const matchedCourses = q ? approved.filter((c) => c.title.toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedCourses.length === 0;

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditId(null)}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Ortga
        </button>
        <SectionHeading eyebrow="Tahrirlash" title={editing.title} />
        <EditCourseForm course={editing} onSave={(data) => updateCourse(editing.id, data, editing.title)} onDone={() => setEditId(null)} />
      </div>
    );
  }

  if (active) {
    return (
      <div>
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {activeCategory ? activeCategory.name : 'Barcha mavzular'}
        </button>
        <h3 className="text-2xl sm:text-3xl mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
        <CourseBody content={active.content} videoUrl={active.videoUrl} />
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <SectionHeading eyebrow={`${categories.length} ta soha`} title="Kurslar" />
        <SearchBox value={query} onChange={setQuery} placeholder="Mavzu yoki soha nomi boʻyicha qidirish..." />
        {isSearching ? (
          noSearchResults ? (
            <EmptyState text="Hech narsa topilmadi." cta="Boshqa soʻz bilan qidirib koʻring." />
          ) : (
            <div className="space-y-6">
              {matchedCategories.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Sohalar</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {matchedCategories.map((cat) => {
                      const count = approved.filter((c) => c.categoryId === cat.id).length;
                      return (
                        <div
                          key={cat.id}
                          className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                          style={{ background: C.white, border: `1px solid ${C.rule}` }}
                          onClick={() => setCategoryId(cat.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                            <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta mavzu</div>
                            {cat.author && <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {cat.author}</div>}
                          </div>
                          <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {matchedCourses.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ ...fontMono, color: C.inkSoft }}>Mavzular</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {matchedCourses.map((c) => (
                      <div
                        key={c.id}
                        className="min-w-0 group flex items-start justify-between gap-2 p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                        style={{ background: C.white, border: `1px solid ${C.rule}` }}
                        onClick={() => setOpenId(c.id)}
                      >
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide mb-0.5 truncate" style={{ ...fontMono, color: C.gold }}>
                            {categories.find((cat) => cat.id === c.categoryId)?.name || ''}
                          </div>
                          <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                          {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                        </div>
                        <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <CategoryGrid
            categories={categories}
            itemsByCategory={approved.reduce((acc, c) => { acc[c.categoryId] = (acc[c.categoryId] || 0) + 1; return acc; }, {})}
            itemLabel="mavzu"
            onSelect={setCategoryId}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
            onGoToCommunity={() => onGoToCommunity('kurslar')}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta mavzu`} title={activeCategory ? activeCategory.name : 'Kurslar'} />
      {inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha mavzu qoʻshilmagan." cta="Quyidagi tugma orqali Hamjamiyat boʻlimida birinchi mavzuni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((c, i) => (
            <div
              key={c.id}
              className="min-w-0 group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: C.white, border: `1px solid ${C.rule}` }}
              onClick={() => setOpenId(c.id)}
            >
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                  {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                </div>
              </div>
              <div className="flex items-center flex-shrink-0 gap-1">
                <ItemMenu actions={[
                  { label: 'Tahrirlash', icon: Pencil, onClick: () => setEditId(c.id) },
                  { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCourse(c.id, c.title) },
                ]} />
                <ChevronRight size={16} style={{ color: C.gold }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <GhostButton onClick={() => onGoToCommunity('kurslar', activeCategory ? activeCategory.name : '')} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Testlar (Tests / Quizzes)                                          */
/* ------------------------------------------------------------------ */

function QuestionBuilder({ questions, setQuestions }) {
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

  return (
    <>
      {questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between p-3 rounded-sm" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
              <div className="text-[15px] min-w-0" style={{ ...fontBody, color: C.ink }}>
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
              className="w-full bg-transparent outline-none py-1.5 text-[15px]"
              style={{ ...fontBody, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
            />
          </div>
        ))}
        <div className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javobni radio tugma bilan belgilang.</div>
        <GhostButton onClick={addQuestion} icon={Plus}>Savolni testga qoʻshish</GhostButton>
      </div>
    </>
  );
}

function AddTestForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [newId, setNewId] = useState(null);

  if (newId) {
    return <SuccessPanel onView={() => onView(newId)} onDone={onDone} />;
  }

  const canSubmit = title.trim() && questions.length > 0 && (lockedCategoryId || categoryName.trim());

  async function submit() {
    if (!canSubmit) return;
    const payload = lockedCategoryId
      ? { categoryId: lockedCategoryId, title: title.trim(), description: description.trim(), questions }
      : { categoryName: categoryName.trim(), author: author.trim(), title: title.trim(), description: description.trim(), questions };
    const id = await onSubmit(payload);
    if (id) setNewId(id);
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Masalan: Marketing (yangi soha boʻlsa ham yozavering)" />
      )}
      <TextField label="Test nomi" value={title} onChange={setTitle} placeholder="Masalan: Inflyatsiya boʻyicha test" />
      <TextField label="Tavsif (ixtiyoriy)" value={description} onChange={setDescription} placeholder="Test haqida qisqacha" />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} />
      {!lockedCategoryId && (
        <TextField label="Tuzuvchi (ixtiyoriy)" value={author} onChange={setAuthor} placeholder="Ismingiz yoki taxallusingiz" />
      )}
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={!canSubmit}>Yuborish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function EditTestForm({ test, onSave, onDone }) {
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description || '');
  const [questions, setQuestions] = useState(test.questions);

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onSave({ categoryId: test.categoryId, title: title.trim(), description: description.trim(), questions });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
      <TextField label="Test nomi" value={title} onChange={setTitle} />
      <TextField label="Tavsif (ixtiyoriy)" value={description} onChange={setDescription} />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={questions.length === 0 || !title.trim()}>Saqlash</SolidButton>
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
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha testlar
      </button>

      <h3 className="text-2xl sm:text-3xl mb-1" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
      {test.description && <p className="text-[15px] mb-6" style={{ ...fontBody, color: C.inkSoft }}>{test.description}</p>}

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
            <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
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
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
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

function TestsView({ tests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');

  const approved = tests.filter((t) => t.status !== 'pending');
  const active = approved.find((t) => t.id === activeId);
  const editing = approved.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((t) => t.categoryId === categoryId);
  const q = query.trim().toLowerCase();
  const matchedCategories = q ? categories.filter((cat) => cat.name.toLowerCase().includes(q)) : [];
  const matchedTests = q ? approved.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedTests.length === 0;

  if (active) return <QuizView test={active} onExit={() => setActiveId(null)} />;

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditId(null)}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Ortga
        </button>
        <SectionHeading eyebrow="Tahrirlash" title={editing.title} />
        <EditTestForm test={editing} onSave={(data) => updateTest(editing.id, data, editing.title)} onDone={() => setEditId(null)} />
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <SectionHeading eyebrow={`${categories.length} ta soha`} title="Testlar" />
        <SearchBox value={query} onChange={setQuery} placeholder="Test yoki soha nomi boʻyicha qidirish..." />
        {isSearching ? (
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
                          style={{ background: C.white, border: `1px solid ${C.rule}` }}
                          onClick={() => setCategoryId(cat.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                            <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta test</div>
                            {cat.author && <div className="text-xs mt-1" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {cat.author}</div>}
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
                      <div key={t.id} className="min-w-0 flex items-start justify-between gap-2 p-4 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide mb-0.5 truncate" style={{ ...fontMono, color: C.gold }}>
                            {categories.find((cat) => cat.id === t.categoryId)?.name || ''}
                          </div>
                          <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                          <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{t.questions.length} ta savol</div>
                        </div>
                        <button
                          onClick={() => setActiveId(t.id)}
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
            categories={categories}
            itemsByCategory={approved.reduce((acc, t) => { acc[t.categoryId] = (acc[t.categoryId] || 0) + 1; return acc; }, {})}
            itemLabel="test"
            onSelect={setCategoryId}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
            onGoToCommunity={() => onGoToCommunity('testlar')}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta test`} title={activeCategory ? activeCategory.name : 'Testlar'} />
      {inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha test qoʻshilmagan." cta="Quyidagi tugma orqali Hamjamiyat boʻlimida birinchi testni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((t, i) => (
            <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                  {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                  <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questions.length} ta savol</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <ItemMenu actions={[
                  { label: 'Tahrirlash', icon: Pencil, onClick: () => setEditId(t.id) },
                  { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) },
                ]} />
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

      <div className="mt-6">
        <GhostButton onClick={() => onGoToCommunity('testlar', activeCategory ? activeCategory.name : '')} icon={Plus}>Yangi test qoʻshish</GhostButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hamjamiyat (Community) — user-submitted courses & tests, pending    */
/*  admin approval before they appear in the main Kurslar/Testlar       */
/* ------------------------------------------------------------------ */

function CommunityCoursesView({ courses, categories, openId, setOpenId, onBack, submitCourse, approveCourse, deleteCourse, formOpen, onOpenForm, onCloseForm, prefillCategory }) {
  const [categoryId, setCategoryId] = useState(null);
  const active = courses.find((c) => c.id === openId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = courses.filter((c) => c.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => courses.some((c) => c.categoryId === cat.id));

  if (active) {
    return (
      <div>
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Hamjamiyat mavzulari
        </button>
        <h3 className="text-2xl sm:text-3xl mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
        {active.author && <div className="text-xs mb-4" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {active.author}</div>}
        <CourseBody content={active.content} videoUrl={active.videoUrl} />
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Hamjamiyat
        </button>
        <SectionHeading eyebrow={`${courses.length} ta kutilmoqda`} title="Hamjamiyat — Kurslar" />
        {categoriesWithPending.length === 0 ? (
          <EmptyState text="Hozircha foydalanuvchilar mavzu qoʻshmagan." cta="Quyidagi tugma orqali birinchi mavzuni qoʻshing." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {categoriesWithPending.map((cat, i) => {
              const count = courses.filter((c) => c.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                  style={{ background: C.white, border: `1px solid ${C.rule}` }}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <div className="flex items-start min-w-0">
                    <EntryNumber n={i + 1} />
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                      <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta kutilmoqda</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}

        {formOpen ? (
          <AddCourseForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitCourse} onDone={onCloseForm} onView={setOpenId} />
        ) : (
          <div className="mt-6">
            <GhostButton onClick={onOpenForm} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Hamjamiyat — barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta kutilmoqda`} title={activeCategory ? activeCategory.name : 'Kurslar'} />
      <div className="grid sm:grid-cols-2 gap-4">
        {inCategory.map((c, i) => (
          <div
            key={c.id}
            className="min-w-0 group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{ background: C.white, border: `1px solid ${C.rule}` }}
            onClick={() => setOpenId(c.id)}
          >
            <div className="flex items-start min-w-0">
              <EntryNumber n={i + 1} />
              <div className="min-w-0">
                <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                {c.author && <div className="text-xs mt-1.5" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {c.author}</div>}
              </div>
            </div>
            <div className="flex items-center flex-shrink-0 gap-1">
              <ItemMenu actions={[
                { label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveCourse(c.id, c.title) },
                { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCourse(c.id, c.title) },
              ]} />
            </div>
          </div>
        ))}
      </div>

      {formOpen ? (
        <AddCourseForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitCourse} onDone={onCloseForm} onView={setOpenId} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

function CommunityTestsView({ tests, categories, openId, setOpenId, onBack, submitTest, approveTest, deleteTest, formOpen, onOpenForm, onCloseForm, prefillCategory }) {
  const [categoryId, setCategoryId] = useState(null);
  const active = tests.find((t) => t.id === openId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = tests.filter((t) => t.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => tests.some((t) => t.categoryId === cat.id));

  if (active) return <QuizView test={active} onExit={() => setOpenId(null)} />;

  if (!categoryId) {
    return (
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Hamjamiyat
        </button>
        <SectionHeading eyebrow={`${tests.length} ta kutilmoqda`} title="Hamjamiyat — Testlar" />
        {categoriesWithPending.length === 0 ? (
          <EmptyState text="Hozircha foydalanuvchilar test qoʻshmagan." cta="Quyidagi tugma orqali birinchi testni qoʻshing." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {categoriesWithPending.map((cat, i) => {
              const count = tests.filter((t) => t.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                  style={{ background: C.white, border: `1px solid ${C.rule}` }}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <div className="flex items-start min-w-0">
                    <EntryNumber n={i + 1} />
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                      <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta kutilmoqda</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}

        {formOpen ? (
          <AddTestForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitTest} onDone={onCloseForm} onView={setOpenId} />
        ) : (
          <div className="mt-6">
            <GhostButton onClick={onOpenForm} icon={Plus}>Yangi test qoʻshish</GhostButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCategoryId(null)}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> Hamjamiyat — barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta kutilmoqda`} title={activeCategory ? activeCategory.name : 'Testlar'} />
      <div className="grid sm:grid-cols-2 gap-4">
        {inCategory.map((t, i) => (
          <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-sm" style={{ background: C.white, border: `1px solid ${C.rule}` }}>
            <div className="flex items-start min-w-0">
              <EntryNumber n={i + 1} />
              <div className="min-w-0">
                <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questions.length} ta savol</div>
                {t.author && <div className="text-xs mt-1.5" style={{ ...fontBody, color: C.inkSoft }}>Tuzuvchi: {t.author}</div>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <ItemMenu actions={[
                { label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveTest(t.id, t.title) },
                { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) },
              ]} />
              <button
                onClick={() => setOpenId(t.id)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm"
                style={{ ...fontBody, color: C.white, background: C.cover }}
              >
                <Award size={13} /> Boshlash
              </button>
            </div>
          </div>
        ))}
      </div>

      {formOpen ? (
        <AddTestForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitTest} onDone={onCloseForm} onView={setOpenId} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi test qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

function HamjamiyatView({ courses, tests, categories, target, onConsumeTarget, submitCourse, approveCourse, deleteCourse, submitTest, approveTest, deleteTest }) {
  const [subTab, setSubTab] = useState(null);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState('');

  useEffect(() => {
    if (target) {
      setSubTab(target.type);
      if (target.action === 'add') {
        setOpenCourseId(null);
        setOpenTestId(null);
        setPrefillCategory(target.prefillCategory || '');
        if (target.type === 'kurslar') setCourseFormOpen(true);
        if (target.type === 'testlar') setTestFormOpen(true);
      } else {
        if (target.type === 'kurslar') setOpenCourseId(target.id);
        if (target.type === 'testlar') setOpenTestId(target.id);
      }
      onConsumeTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const pendingCourses = courses.filter((c) => c.status === 'pending');
  const pendingTests = tests.filter((t) => t.status === 'pending');

  if (subTab === 'kurslar') {
    return (
      <CommunityCoursesView
        courses={pendingCourses}
        categories={categories}
        openId={openCourseId}
        setOpenId={setOpenCourseId}
        onBack={() => setSubTab(null)}
        submitCourse={submitCourse}
        approveCourse={approveCourse}
        deleteCourse={deleteCourse}
        formOpen={courseFormOpen}
        onOpenForm={() => { setPrefillCategory(''); setCourseFormOpen(true); }}
        onCloseForm={() => setCourseFormOpen(false)}
        prefillCategory={prefillCategory}
      />
    );
  }
  if (subTab === 'testlar') {
    return (
      <CommunityTestsView
        tests={pendingTests}
        categories={categories}
        openId={openTestId}
        setOpenId={setOpenTestId}
        onBack={() => setSubTab(null)}
        submitTest={submitTest}
        approveTest={approveTest}
        deleteTest={deleteTest}
        formOpen={testFormOpen}
        onOpenForm={() => { setPrefillCategory(''); setTestFormOpen(true); }}
        onCloseForm={() => setTestFormOpen(false)}
        prefillCategory={prefillCategory}
      />
    );
  }

  return (
    <div>
      <SectionHeading eyebrow="Foydalanuvchilar tuzgan" title="Hamjamiyat" />
      <p className="text-[15px] mb-6" style={{ ...fontBody, color: C.inkSoft }}>
        Bu yerda foydalanuvchilar tomonidan yaratilgan mavzu va testlar joylashadi. Tasdiqlangach, ular asosiy Kurslar/Testlar boʻlimiga oʻtadi.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => setSubTab('kurslar')}
          className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5"
          style={{ background: C.white, border: `1px solid ${C.rule}` }}
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Kurslar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{pendingCourses.length} ta kutilmoqda</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button
          onClick={() => setSubTab('testlar')}
          className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5"
          style={{ background: C.white, border: `1px solid ${C.rule}` }}
        >
          <div className="flex items-center gap-3">
            <ListChecks size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Testlar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{pendingTests.length} ta kutilmoqda</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
      </div>
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

/* ------------------------------------------------------------------ */
/*  Biz haqimizda (About)                                               */
/* ------------------------------------------------------------------ */

function AboutView() {
  return (
    <div>
      <SectionHeading eyebrow="Platforma haqida" title="Biz haqimizda" />
      <div className="space-y-4 max-w-2xl text-base leading-7" style={{ ...fontBody, color: C.ink }}>
        <p>"UpCourse Uz" — O'z ustida ishlab rivojlanadiganlar uchun yaratilgan ochiq taʼlim platformasi. Maqsadimiz — jamiyat va ilm-fan taraqqiyoti ravnaqiga o‘z hissamizni qo‘shish. Bilimlarni sodda, tizimli va hammabop shaklda taqdim etish.</p>
        <p>Platformada roʻyxatdan oʻtish yoki profil yaratish shart emas: barcha kurslar, testlar va yangiliklar istalgan foydalanuvchi uchun istalgan paytda ochiq.</p>
        <p>Kontent doimiy ravishda yangilanib boriladi — yangi mavzular, testlar va eʼlonlar muntazam qoʻshiladi.</p> 
        <p>Biz bilan bogʻlanish uchun: <a href="https://t.me/Jasurbek_Rustamov" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>t.me/Jasurbek_Rustamov</a></p>
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
        <div className="text-base mb-4" style={{ ...fontBody, color: C.ink }}>{label} uchun parolni kiriting:</div>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setErr(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          className="w-full bg-transparent outline-none py-2 mb-1 text-base"
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
  { id: 'hamjamiyat', label: 'Hamjamiyat', icon: Users },
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
  const [communityTarget, setCommunityTarget] = useState(null);

  function goToCommunity(kind, prefillCategory) { setTab('hamjamiyat'); setCommunityTarget({ type: kind, action: 'add', prefillCategory: prefillCategory || '' }); }

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
  async function renameCategory(id, oldName, newName) {
    if (!newName.trim() || newName.trim() === oldName) return false;
    if (!(await requestAdmin(`"${oldName}" sohasini "${newName.trim()}" ga oʻzgartirish`))) return false;
    try {
      await sbUpdate('categories', id, categoryToRow({ id, name: newName.trim() }));
      setCategories(categories.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Soha nomini oʻzgartirishda xatolik yuz berdi.');
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

  /* Hamjamiyat orqali kelgan erkin "soha nomi"ni mavjud sohaga bogʻlaydi
     yoki (topilmasa) parolsiz yangi soha yaratadi. Soha birinchi marta
     yaratilganda kim yozgan boʻlsa, shu "tuzuvchi" boʻlib qoladi — keyin
     boshqa odam shu sohaga mavzu qoʻshsa ham, sohaning tuzuvchisi
     oʻzgarmaydi. */
  async function resolveCategoryId(name, author) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const row = { id: uid(), name: trimmed, author: (author || '').trim() };
    await sbInsert('categories', categoryToRow(row));
    setCategories((prev) => [...prev, row]);
    return row.id;
  }

  async function submitCourse(data) {
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      try {
        categoryId = await resolveCategoryId(data.categoryName, data.author);
      } catch (e) {
        setActionError('Sohani yaratishda xatolik yuz berdi.');
        return null;
      }
    }
    const row = { id: uid(), categoryId, title: data.title, summary: data.summary, content: data.content, videoUrl: data.videoUrl || '', author: data.author || '', status: 'pending' };
    try {
      await sbInsert('courses', courseToRow(row));
      setCourses([row, ...courses]);
      setActionError(null);
      return row.id;
    } catch (e) {
      setActionError('Mavzuni saqlashda xatolik yuz berdi.');
      return null;
    }
  }
  async function approveCourse(id, title) {
    if (!(await requestAdmin(`"${title}" mavzusini tasdiqlash`))) return false;
    try {
      await sbUpdate('courses', id, { status: 'approved' });
      setCourses(courses.map((c) => (c.id === id ? { ...c, status: 'approved' } : c)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tasdiqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function updateCourse(id, data, title) {
    if (!(await requestAdmin(`"${title}" mavzusini tahrirlash`))) return false;
    try {
      await sbUpdate('courses', id, courseToRow({ id, status: 'approved', ...data }));
      setCourses(courses.map((c) => (c.id === id ? { ...c, ...data } : c)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tahrirlashda xatolik yuz berdi.');
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

  async function submitTest(data) {
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      try {
        categoryId = await resolveCategoryId(data.categoryName, data.author);
      } catch (e) {
        setActionError('Sohani yaratishda xatolik yuz berdi.');
        return null;
      }
    }
    const row = { id: uid(), categoryId, title: data.title, description: data.description, questions: data.questions, author: data.author || '', status: 'pending' };
    try {
      await sbInsert('tests', testToRow(row));
      setTests([row, ...tests]);
      setActionError(null);
      return row.id;
    } catch (e) {
      setActionError('Testni saqlashda xatolik yuz berdi.');
      return null;
    }
  }
  async function approveTest(id, title) {
    if (!(await requestAdmin(`"${title}" testini tasdiqlash`))) return false;
    try {
      await sbUpdate('tests', id, { status: 'approved' });
      setTests(tests.map((t) => (t.id === id ? { ...t, status: 'approved' } : t)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tasdiqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function updateTest(id, data, title) {
    if (!(await requestAdmin(`"${title}" testini tahrirlash`))) return false;
    try {
      await sbUpdate('tests', id, testToRow({ id, status: 'approved', ...data }));
      setTests(tests.map((t) => (t.id === id ? { ...t, ...data } : t)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tahrirlashda xatolik yuz berdi.');
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
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: C.paper }}>
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
          <p className="text-[15px] sm:text-base max-w-xl mb-6" style={{ ...fontBody, color: 'rgba(251,250,243,0.75)' }}>
            Barcha soha vakillari uchun mos mavzular, testlar va yangiliklar.
          </p>
          <div className="flex gap-6 pt-4" style={{ borderTop: `1px solid ${C.coverLine}` }}>
            {[['Mavzular', courses.filter((c) => c.status !== 'pending').length], ['Testlar', tests.filter((t) => t.status !== 'pending').length], ['Yangiliklar', news.length]].map(([label, val]) => (
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
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-sm text-[15px] whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2"
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
          <div className="p-5 rounded-sm text-[15px]" style={{ ...fontBody, background: 'rgba(168,67,58,0.08)', border: `1px solid ${C.red}`, color: C.red }}>
            {error}
          </div>
        ) : (
          <>
            {actionError && (
              <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-sm text-[15px]" style={{ ...fontBody, background: 'rgba(168,67,58,0.08)', border: `1px solid ${C.red}`, color: C.red }}>
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)}><X size={15} /></button>
              </div>
            )}
            <PaperPanel>
              {tab === 'kurslar' && <CoursesView courses={courses} categories={categories} updateCourse={updateCourse} deleteCourse={deleteCourse} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} />}
              {tab === 'testlar' && <TestsView tests={tests} categories={categories} updateTest={updateTest} deleteTest={deleteTest} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} />}
              {tab === 'hamjamiyat' && (
                <HamjamiyatView
                  courses={courses}
                  tests={tests}
                  categories={categories}
                  target={communityTarget}
                  onConsumeTarget={() => setCommunityTarget(null)}
                  submitCourse={submitCourse}
                  approveCourse={approveCourse}
                  deleteCourse={deleteCourse}
                  submitTest={submitTest}
                  approveTest={approveTest}
                  deleteTest={deleteTest}
                />
              )}
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
