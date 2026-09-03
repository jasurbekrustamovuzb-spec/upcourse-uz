import React, { useState, useEffect, useCallback, useRef, useContext, lazy, Suspense } from 'react';
import {
  BookOpen, ListChecks, Newspaper, Info, Plus, X, Check,
  ChevronRight, ArrowLeft, Trash2, Award, Loader2, GraduationCap,
  Paperclip, RotateCcw, MoreVertical, Pencil, CheckCircle2, Users, Search,
  Sun, Moon, LogIn, LogOut, UserCircle2, ShieldCheck, Lock, Clock3, Home, Settings, Share2,
  Trophy, Medal, Image as ImageIcon, Calculator, FileText, Pause, Play as Play2
} from 'lucide-react';
import { supabase, signInWithGoogle, signOut as sbSignOut } from './supabaseClient';

/* ------------------------------------------------------------------ */
/*  Admin panel faqat "Admin panel" boʻlimiga kirilganda yuklanadi     */
/*  (React.lazy) — bu boshlang'ich yuklanish hajmini kamaytiradi.      */
/* ------------------------------------------------------------------ */
const AdminPanelView = lazy(() => import('./AdminPanel.jsx'));
const LiveQuizHub = lazy(() => import('./LiveQuiz.jsx'));

/* ------------------------------------------------------------------ */
/*  Shriftlarni erta va bloklamaydigan holda yuklash.                  */
/*  Bu kod modul yuklanishi bilanoq (React render boshlanishidan       */
/*  oldin) ishga tushadi va shrift so'rovini fon rejimida boshlaydi —  */
/*  sahifa render qilinishini kutib turmaydi, "Yuklanmoqda" jarayonini */
/*  tezlashtiradi.                                                     */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined' && !document.getElementById('upcourse-fonts')) {
  const fontLink = document.createElement('link');
  fontLink.id = 'upcourse-fonts';
  fontLink.rel = 'stylesheet';
  fontLink.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
  document.head.appendChild(fontLink);
}

/* ------------------------------------------------------------------ */
/*  Design tokens — "ledger book" system                              */
/*  C obyekti mutatsiya qilinadi (theme almashganda) — shu sababli    */
/*  butun ilova bo'ylab bitta manba orqali kunduzgi/tungi rejim       */
/*  qo'llaniladi.                                                     */
/* ------------------------------------------------------------------ */
const LIGHT_PALETTE = {
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
  surface: '#FBFAF3',
  successTint: 'rgba(31,61,43,0.10)',
  dangerTint: 'rgba(168,67,58,0.10)',
  selectedTint: 'rgba(184,134,59,0.08)',
  dangerBannerTint: 'rgba(168,67,58,0.08)',
  accent: '#1F3D2B',
  /* Faqat "Jonli test" bo'limi uchun — iliq, quvnoq aksent */
  live: '#C9622A',
  liveSoft: '#E8A874',
  liveDeep: '#7A3A16',
  liveTint: 'rgba(201,98,42,0.10)',
  silver: '#8B8F86',
  bronze: '#A9713F',
  /* Faqat "Matematik test" yaratish tugmasi uchun — aniq, "ilmiy" aksent */
  math: '#2C5F7C',
  mathSoft: '#5C90AC',
  mathDeep: '#173544',
  mathTint: 'rgba(44,95,124,0.08)',
};

const DARK_PALETTE = {
  cover: '#1F3D2B',
  coverDeep: '#0F1B12',
  coverLine: 'rgba(184,134,59,0.35)',
  paper: '#141815',
  paperSoft: '#1A1F1B',
  rule: '#3D453D',
  red: '#E08A7D',
  gold: '#D4AC6E',
  goldSoft: '#E4CC9C',
  ink: '#F0EBDD',
  inkSoft: '#B7BEB2',
  white: '#FBFAF3',
  surface: '#232A22',
  successTint: 'rgba(94,168,118,0.22)',
  dangerTint: 'rgba(224,138,125,0.22)',
  selectedTint: 'rgba(212,172,110,0.18)',
  dangerBannerTint: 'rgba(224,138,125,0.14)',
  accent: '#8FCB9E',
  /* Faqat "Jonli test" bo'limi uchun — iliq, quvnoq aksent */
  live: '#E8965A',
  liveSoft: '#F0B888',
  liveDeep: '#3D2411',
  liveTint: 'rgba(232,150,90,0.18)',
  silver: '#AEB3A8',
  bronze: '#C89566',
  /* Faqat "Matematik test" yaratish tugmasi uchun — aniq, "ilmiy" aksent */
  math: '#6FA8CC',
  mathSoft: '#9CC5E0',
  mathDeep: '#12222C',
  mathTint: 'rgba(111,168,204,0.16)',
};

export const C = { ...LIGHT_PALETTE };

export const fontDisplay = { fontFamily: "'Fraunces', Georgia, serif" };
export const fontBody = { fontFamily: "'Inter', system-ui, sans-serif" };
export const fontMono = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

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

/* --- Ulashish havolalari (kurs/test/profil/jonli xona) --- */
export function buildShareUrl(params) {
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  } catch (e) {
    return '';
  }
}
/* Sahifa ochilgandayoq URL'dagi ?course=/?test=/?live=/?u= parametrlarini o'qiydi.
   Faqat bir marta, ilova ilk yuklanganda chaqiriladi. */
function parseDeepLink() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('course')) return { type: 'course', value: p.get('course') };
    if (p.get('test')) return { type: 'test', value: p.get('test') };
    if (p.get('live')) return { type: 'live', value: p.get('live').toUpperCase() };
    if (p.get('u')) return { type: 'profile', value: p.get('u') };
  } catch (e) { /* URL o'qib bo'lmasa, oddiy holatda ochiladi */ }
  return null;
}

export function formatDate(iso) {
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

/* Har bir so'rovga joriy foydalanuvchining login tokenini (bo'lsa) yoki
   aks holda umumiy "anon" kalitni qo'shadi. Supabase'dagi RLS (Row Level
   Security) qoidalari aynan shu token orqali "bu odam kim, admin yoki
   yo'q, o'ziniki qaysi qatorlar" ekanini biladi. */
/* Qurilma soati bilan Supabase server soati orasidagi farqni kuzatib
   boradi. Har bir HTTP javobida server "Date" sarlavhasini yuboradi —
   shundan foydalanib, "agar bu qurilma soati X soniya noto'g'ri
   bo'lsa ham, haqiqiy (server) vaqt shu" deb hisoblashimiz mumkin.
   Jonli test taymeri shu tuzatilgan vaqtdan foydalanadi — shu bilan
   barcha qurilmalar (soati notoʻgʻri sozlanganlari ham) bitta xil
   "haqiqiy" vaqtni koʻradi. */
let serverClockOffsetMs = 0;
export function estimatedServerNow() {
  return Date.now() + serverClockOffsetMs;
}

/* Ilgari har bir sbRequest() chaqirig'i supabase.auth.getSession()ni
   qayta-qayta so'rar edi. Supabase kutubxonasi ichki tarzda bu
   chaqiruvlarni bitta "qulf" (lock) orqali navbatga qo'yadi — natijada
   bir vaqtning o'zida yuborilgan bir nechta so'rov (masalan turli
   mualliflarning profil/nishonini yuklashda) parallel emas, ketma-ket
   ~500ms-1s kechikish bilan bajarilardi (sahifa ochilishini sekinlashtirib
   yuborardi). Endi token faqat BIR MARTA — ilova ochilganda — so'raladi
   va xotirada saqlanadi; onAuthStateChange orqali kirish holati
   o'zgarganda kesh darhol yangilanadi. Shu bilan barcha so'rovlar
   haqiqatan parallel yuborila oladi. */
let cachedAccessToken; // undefined = hali aniqlanmagan, null = kirish qilinmagan
let sessionReadyPromise = null;
function setCachedAccessToken(token) {
  cachedAccessToken = token || null;
}
async function getAccessToken() {
  if (cachedAccessToken !== undefined) return cachedAccessToken;
  if (!sessionReadyPromise) {
    sessionReadyPromise = supabase.auth.getSession()
      .then(({ data }) => { cachedAccessToken = data?.session?.access_token || null; return cachedAccessToken; })
      .catch(() => { cachedAccessToken = null; return null; });
  }
  return sessionReadyPromise;
}

async function sbRequest(path, options = {}) {
  const token = (await getAccessToken()) || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  try {
    const serverDate = res.headers.get('date');
    if (serverDate) {
      const serverMs = new Date(serverDate).getTime();
      if (!Number.isNaN(serverMs)) serverClockOffsetMs = serverMs - Date.now();
    }
  } catch (e) { /* soat farqini o'lchay olmasak, oldingi qiymat qoladi */ }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${path} — ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const sbSelect = (table, filter, orderColumn = 'created_at') => sbRequest(`${table}?select=*&order=${orderColumn}.asc${filter ? `&${filter}` : ''}`);

/* Tasdiqlanmagan (pending) yozuvlarni faqat administrator (hammasini,
   tekshirish uchun) yoki muallifning o'zi (o'z holatini ko'rishi uchun)
   so'raydi. Boshqa barcha holatlarda serverdan faqat tasdiqlangan
   (approved) qatorlar so'raladi — shu tufayli tasdiqlanmagan kontent
   endi hamma foydalanuvchining bosh yuklanishiga behuda tushmaydi. */
function visibilityFilter(myId, isAdminFlag) {
  if (isAdminFlag) return '';
  if (myId) return `or=(status.eq.approved,author_id.eq.${myId})`;
  return 'status=eq.approved';
}
export const sbInsert = (table, row) => sbRequest(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
export const sbUpdate = (table, id, patch) => sbRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
export const sbDelete = (table, id) => sbRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
const sbUpsert = (table, row) => sbRequest(`${table}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(row) });

/* Savol rasmlari (geometriya chizmalari va h.k.) shu omborga yuklanadi. */
const IMAGE_BUCKET = 'question-images';
async function sbUploadImage(file) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || SUPABASE_ANON_KEY;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Rasm yuklashda xatolik — ${res.status}: ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

/* Test o'chirilganda unga tegishli savol rasmlari ombordan (Storage)
   ham o'chirilishi uchun — aks holda fayllar "egasiz" holda saqlanaverib,
   ombor hajmini behuda band qilib turadi. Xatolik bo'lsa (masalan fayl
   allaqachon yo'q) jim tarzda o'tkazib yuboriladi — bu asosiy
   o'chirish amalini to'xtatmasligi kerak. */
async function sbDeleteImage(url) {
  if (!url || !url.includes(`/${IMAGE_BUCKET}/`)) return;
  try {
    const path = url.split(`/${IMAGE_BUCKET}/`)[1];
    if (!path) return;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || SUPABASE_ANON_KEY;
    await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    // Jim tarzda o'tkazib yuborish.
  }
}

/* --- Jonli test rejimi uchun yordamchi funksiyalar --- */
export function randomRoomCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
}
export function getDeviceKey() {
  try {
    let k = localStorage.getItem('upcourse_device_key');
    if (!k) { k = uid() + uid(); localStorage.setItem('upcourse_device_key', k); }
    return k;
  } catch (e) {
    return uid() + uid();
  }
}
export const liveRoomFromRow = (r) => ({
  id: r.id, code: r.code, testId: r.test_id, hostId: r.host_id, hostName: r.host_name || '',
  status: r.status, durationSeconds: r.duration_seconds, startsAt: r.starts_at, createdAt: r.created_at,
  mode: r.mode || 'free', perQuestionSeconds: r.per_question_seconds || 20, phase: r.phase || 'lobby',
  currentIndex: r.current_index || 0, phaseStartedAt: r.phase_started_at, questionOrder: r.question_order || null,
});
export const liveParticipantFromRow = (r) => ({ id: r.id, roomId: r.room_id, name: r.name, deviceKey: r.device_key, score: r.score, total: r.total, submittedAt: r.submitted_at, joinedAt: r.joined_at, answers: r.answers || {} });
export async function sbFindRoomByCode(code) {
  const rows = await sbRequest(`live_rooms?select=*&code=eq.${encodeURIComponent(code)}`);
  return rows.length ? liveRoomFromRow(rows[0]) : null;
}
export async function sbGetRoom(id) {
  const rows = await sbRequest(`live_rooms?select=*&id=eq.${encodeURIComponent(id)}`);
  return rows.length ? liveRoomFromRow(rows[0]) : null;
}
export async function sbSelectParticipants(roomId) {
  const rows = await sbRequest(`live_participants?select=*&room_id=eq.${encodeURIComponent(roomId)}&order=joined_at.asc`);
  return rows.map(liveParticipantFromRow);
}

/* Jonli test xonasini kuzatish — WebSocket (Realtime) orqali.
   Oldin: har bir qurilma xona holatini "so'rab turardi" (REST so'rov,
   har 1.5-3 soniyada). Endi: server o'zgarishni o'zi "itarib" yuboradi,
   brauzer so'ramaydi. 50-200+ kishi bir xonada bo'lganda ham server
   ortiqcha yuklanmaydi.
   Xavfsizlik/pastga moslik: agar WebSocket biror sababdan ishlamasa
   (masalan tarmoq uni bloklasa) — avtomatik ravishda eski "so'rab
   turish" usuliga qaytadi, shu bilan ekran hech qachon "qotib"
   qolmaydi. Ulanish tiklansa, zaxira rejim o'zi o'chadi.
   FAQAT shu xonaga ('id=eq.<roomId>' / 'room_id=eq.<roomId>' filtri
   bilan) tegishli o'zgarishlarni oladi — boshqa xonalarning trafigini
   olmaydi. Qaytaradi: tozalash (unsubscribe) funksiyasi — komponent
   yopilganda albatta shuni chaqirish kerak. */
export function subscribeToLiveRoom(roomId, { onRoom, onParticipants, pollFallbackMs = 2000 } = {}) {
  let closed = false;
  let fallbackTimer = null;
  let fallbackActive = false;

  function startFallbackPolling() {
    if (fallbackActive || closed) return;
    fallbackActive = true;
    async function poll() {
      if (closed) return;
      try {
        const [freshRoom, list] = await Promise.all([sbGetRoom(roomId), sbSelectParticipants(roomId)]);
        if (closed) return;
        if (freshRoom && onRoom) onRoom(freshRoom);
        if (onParticipants) onParticipants(() => list);
      } catch (e) { /* keyingi urinishda qayta tekshiriladi */ }
    }
    poll();
    fallbackTimer = setInterval(poll, pollFallbackMs);
  }
  function stopFallbackPolling() {
    fallbackActive = false;
    if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
  }

  const channel = supabase
    .channel(`live-room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'live_rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        stopFallbackPolling();
        if (onRoom && payload.new) onRoom(liveRoomFromRow(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'live_participants', filter: `room_id=eq.${roomId}` },
      (payload) => {
        stopFallbackPolling();
        if (!onParticipants) return;
        if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          onParticipants((prev) => prev.filter((p) => p.id !== deletedId));
          return;
        }
        const row = liveParticipantFromRow(payload.new);
        onParticipants((prev) => {
          const exists = prev.some((p) => p.id === row.id);
          return exists ? prev.map((p) => (p.id === row.id ? row : p)) : [...prev, row];
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') stopFallbackPolling();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startFallbackPolling();
    });

  /* Bir necha soniya ichida ulanish tasdiqlanmasa (masalan sekin
     tarmoq) — ehtiyot uchun zaxira rejimni yoqamiz. Ulanish keyin
     tiklansa, u avtomatik o'chadi (yuqoridagi 'SUBSCRIBED' shoxobchasi). */
  const safetyTimer = setTimeout(() => { if (!closed) startFallbackPolling(); }, 4000);

  return function unsubscribe() {
    closed = true;
    clearTimeout(safetyTimer);
    stopFallbackPolling();
    try { supabase.removeChannel(channel); } catch (e) { /* allaqachon yopilgan bo'lishi mumkin */ }
  };
}

/* "Barchaga bir xil" (Kahoot) rejimida bosqichni (savol -> natija -> keyingi
   savol) oldinga suradi. Bu funksiyani tuzuvchi HAM, istalgan ishtirokchi
   HAM chaqira oladi — kimning brauzeri shu payt faol boʻlsa, oʻsha ishni
   bajaradi, shu bilan "faqat tuzuvchi tabini yopib qoʻysa hamma qotib
   qoladi" degan muammo yoʻqoladi.
   Xavfsizlik: PATCH soʻrovi "hozir ham aynan shu bosqich va shu savolda
   turibdimi" degan shartni oʻz ichiga oladi (phase=eq...&current_index=eq...).
   Agar boshqa qurilma allaqachon oldinga surib ulgurgan boʻlsa, bu soʻrov
   hech qanday qatorga tegmaydi va xatosiz, shunchaki boʻsh natija bilan
   qaytadi — ikki marta oldinga surilib ketish (savol talvasa oʻtkazib
   yuborish) imkonsiz boʻladi. */
export async function advanceSyncPhase(room, totalQuestions) {
  try {
    if (room.phase === 'question') {
      const filter = `id=eq.${encodeURIComponent(room.id)}&phase=eq.question&current_index=eq.${room.currentIndex}`;
      const rows = await sbRequest(`live_rooms?${filter}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ phase: 'intermission' }),
      });
      return rows && rows[0] ? liveRoomFromRow(rows[0]) : null;
    }
    if (room.phase === 'intermission') {
      const nextIndex = Math.min(room.currentIndex + 1, totalQuestions);
      const isLast = room.currentIndex >= totalQuestions - 1 || nextIndex >= totalQuestions;
      const patch = isLast ? { phase: 'finished', status: 'finished' } : { phase: 'question', current_index: nextIndex };
      const filter = `id=eq.${encodeURIComponent(room.id)}&phase=eq.intermission&current_index=eq.${room.currentIndex}`;
      const rows = await sbRequest(`live_rooms?${filter}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      return rows && rows[0] ? liveRoomFromRow(rows[0]) : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}


/* Row (snake_case, matches SQL columns) <-> app object (camelCase) */
const categoryToRow = (c) => ({ id: c.id, name: c.name, author: c.author || '', author_id: c.authorId || null, status: c.status || 'approved' });
const categoryFromRow = (r) => ({ id: r.id, name: r.name, author: r.author || '', authorId: r.author_id || null, status: r.status || 'approved' });
const courseToRow = (c) => ({ id: c.id, category_id: c.categoryId || null, title: c.title, summary: c.summary || '', content: c.content, video_url: c.videoUrl || null, author: c.author || '', author_id: c.authorId || null, status: c.status || 'approved' });
const courseFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, summary: r.summary || '', content: r.content, videoUrl: r.video_url || '', author: r.author || '', authorId: r.author_id || null, status: r.status || 'approved' });
const testToRow = (t) => ({ id: t.id, category_id: t.categoryId || null, title: t.title, description: t.description || '', questions: t.questions, author: t.author || '', author_id: t.authorId || null, status: t.status || 'approved' });
const testFromRow = (r) => ({ id: r.id, categoryId: r.category_id, title: r.title, description: r.description || '', questions: r.questions, author: r.author || '', authorId: r.author_id || null, status: r.status || 'approved', questionCount: r.question_count ?? undefined });
const newsToRow = (n) => ({ id: n.id, title: n.title, content: n.content, date: n.date });
const newsFromRow = (r) => ({ id: r.id, title: r.title, content: r.content, date: r.date });
const profileFromRow = (r) => ({ id: r.id, firstName: r.first_name || '', lastName: r.last_name || '', email: r.email || '', isAdmin: !!r.is_admin, username: r.username || '', bio: r.bio || '', bannerKey: r.banner_key || 'green', usernameChangedAt: r.username_changed_at || null });

/* Instagram uslubidagi profil banneri uchun tayyor rang to'plami —
   hozircha rasm yuklash tizimi yo'q, shuning uchun foydalanuvchi
   shu tayyor ranglardan birini tanlaydi. */
const BANNER_PRESETS = {
  green: { from: '#1F3D2B', to: '#3C6B4A', label: 'Yashil' },
  gold: { from: '#8A611E', to: '#D4AC6E', label: 'Oltin' },
  maroon: { from: '#5A2320', to: '#A8433A', label: 'Malla-qizil' },
  navy: { from: '#16283D', to: '#2E4E73', label: 'Ko\u2018k' },
};
function bannerGradient(key) {
  const b = BANNER_PRESETS[key] || BANNER_PRESETS.green;
  return `linear-gradient(120deg, ${b.from}, ${b.to})`;
}

/* username: kichik lotin harflari, raqam, pastik chiziq, 5-20 belgi */
function normalizeUsername(v) {
  return (v || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}
function isValidUsername(v) {
  return /^[a-z0-9_]{5,20}$/.test(v || '');
}
/* Rasmiy/chalkashlik tug'diradigan nomlar — oddiy foydalanuvchi ololmaydi. */
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'upcourse', 'upcourseuz', 'support', 'help',
  'root', 'moderator', 'moder', 'official', 'system', 'staff', 'team',
  'test', 'null', 'undefined', 'settings', 'profile', 'user', 'users',
]);
function isReservedUsername(v) {
  return RESERVED_USERNAMES.has((v || '').toLowerCase());
}
/* Username band emasligini tekshiradi (o'zining joriy username'idan tashqari),
   rasmiy nomlarni ham "band" deb hisoblaydi. */
async function checkUsernameAvailable(username, currentUserId) {
  if (isReservedUsername(username)) return false;
  const rows = await sbSelect('profiles', `username=eq.${encodeURIComponent(username)}`);
  return !rows.some((r) => r.id !== currentUserId);
}

/* Username o'zgartirish oralig'i — Instagram uslubida, boshqa birovning
   bo'shab qolgan nomini "o'g'irlab" olish yoki tez-tez almashtirib
   chalkashlik tug'dirishning oldini olish uchun. */
const USERNAME_CHANGE_COOLDOWN_DAYS = 14;
function usernameChangeDaysLeft(usernameChangedAt) {
  if (!usernameChangedAt) return 0;
  const elapsedDays = (Date.now() - new Date(usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(USERNAME_CHANGE_COOLDOWN_DAYS - elapsedDays));
}

/* Ism (va bor bo'lsa familiya) asosida Instagram uslubida username taklif
   qiladi — band bo'lsa, tasodifiy raqamlar bilan bo'sh variant topguncha
   qidiradi. */
async function suggestAvailableUsername(firstName, lastName, currentUserId) {
  const base = normalizeUsername(`${firstName || ''}${lastName ? `_${lastName}` : ''}`) || 'talaba';
  const root = base.length >= 5 ? base : `${base}user`.slice(0, 20);
  const candidates = [root];
  for (let i = 0; i < 4; i++) {
    const suffix = String(Math.floor(10 + Math.random() * 90));
    candidates.push(normalizeUsername(root.slice(0, 20 - suffix.length) + suffix));
  }
  for (const candidate of candidates) {
    if (!isValidUsername(candidate)) continue;
    try {
      const available = await checkUsernameAvailable(candidate, currentUserId);
      if (available) return candidate;
    } catch (e) {
      return candidate; // internet uzilsa ham foydalanuvchi bloklanib qolmasin
    }
  }
  return normalizeUsername(root.slice(0, 15) + Math.floor(1000 + Math.random() * 9000));
}

/* Mualliflarning username'ini authorId bo'yicha keshlab oladi — bir xil
   muallifning kartochkasi ko'p marta chiqsa ham, faqat bir marta so'raladi. */
const _authorUsernameCache = {};
function useAuthorUsername(authorId) {
  const [username, setUsername] = useState(() => (authorId ? _authorUsernameCache[authorId] : undefined));
  useEffect(() => {
    if (!authorId) { setUsername(undefined); return; }
    if (_authorUsernameCache[authorId] !== undefined) { setUsername(_authorUsernameCache[authorId]); return; }
    let cancelled = false;
    (async () => {
      try {
        const rows = await sbSelect('profiles', `id=eq.${authorId}`);
        const uname = rows[0]?.username || null;
        _authorUsernameCache[authorId] = uname;
        if (!cancelled) setUsername(uname);
      } catch (e) {
        if (!cancelled) setUsername(null);
      }
    })();
    return () => { cancelled = true; };
  }, [authorId]);
  return username;
}

/* Mualliflarning "ishlatilayotgan" bayram nishonini ham xuddi shu tarzda
   — authorId bo'yicha keshlab, faqat kerak bo'lganda (kartochka
   ko'ringanda) so'raymiz. Sahifa yuklanishiga umuman ta'sir qilmaydi.
   Nishon o'zgartirilganda (GiftModal orqali) setAuthorBadgeCache chaqirilib,
   ochiq turgan barcha shu foydalanuvchiga tegishli ko'rinishlar darhol
   yangilanadi. */
const _authorBadgeCache = {};
const _authorBadgeListeners = {};
function setAuthorBadgeCache(authorId, collectibleId) {
  if (!authorId) return;
  _authorBadgeCache[authorId] = collectibleId || null;
  (_authorBadgeListeners[authorId] || []).forEach((fn) => fn(collectibleId || null));
}
function useAuthorBadge(authorId) {
  const [badge, setBadge] = useState(() => (authorId ? _authorBadgeCache[authorId] : undefined));
  useEffect(() => {
    if (!authorId) { setBadge(undefined); return; }
    if (!_authorBadgeListeners[authorId]) _authorBadgeListeners[authorId] = new Set();
    _authorBadgeListeners[authorId].add(setBadge);
    let cancelled = false;
    if (_authorBadgeCache[authorId] !== undefined) {
      setBadge(_authorBadgeCache[authorId]);
    } else {
      (async () => {
        try {
          const rows = await sbSelect('user_collectibles', `user_id=eq.${authorId}&equipped=eq.true`, 'collected_at');
          const badgeId = rows[0]?.collectible_id || null;
          _authorBadgeCache[authorId] = badgeId;
          if (!cancelled) setBadge(badgeId);
        } catch (e) {
          if (!cancelled) setBadge(null);
        }
      })();
    }
    return () => { cancelled = true; _authorBadgeListeners[authorId]?.delete(setBadge); };
  }, [authorId]);
  return badge;
}

/* Boshqa foydalanuvchining ommaviy profiliga o'tish — komponentlar
   orasida prop uzatib yurmaslik uchun App darajasida ro'yxatdan
   o'tkaziladigan yagona "ko'prik". */
let _goToPublicProfile = null;

/* Kurs/test kartochkalarida "Tuzuvchi: ..." qatori. Agar muallifning
   username'i topilsa, ko'k rangdagi bosiladigan @username sifatida,
   aks holda oddiy matn sifatida ko'rsatadi. */
function AuthorLine({ authorId, authorName, className, style }) {
  const username = useAuthorUsername(authorId);
  const badge = useAuthorBadge(authorId);
  if (!authorName && !username) return null;
  return (
    <div className={className || 'text-xs mt-1.5'} style={{ ...fontBody, color: C.inkSoft, ...style }}>
      Tuzuvchi:{' '}
      {username ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (_goToPublicProfile) _goToPublicProfile(username); }}
          className="hover:underline focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.math, outlineColor: C.mathSoft }}
        >
          @{username}
        </button>
      ) : (
        authorName
      )}
      {badge && <CollectibleThumb collectibleId={badge} size={14} inline />}
    </div>
  );
}

/* Boshqa foydalanuvchining ommaviy profili — ismi, @username'i, bio'si
   va tasdiqlangan mavzu/testlari ko'rsatiladi (tahrirlash imkonisiz). */
function PublicProfileView({ username, courses, tests, onBack }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState(false);
  const badge = useAuthorBadge(row?.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(false);
    (async () => {
      try {
        const rows = await sbSelect('profiles', `username=eq.${encodeURIComponent(username)}`);
        if (!cancelled) setRow(rows[0] ? profileFromRow(rows[0]) : null);
      } catch (e) {
        if (!cancelled) setErr(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const backButton = (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
      style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
    >
      <ArrowLeft size={15} /> Ortga
    </button>
  );

  if (loading) {
    return (
      <div>
        {backButton}
        <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      </div>
    );
  }

  if (err || !row) {
    return (
      <div>
        {backButton}
        <EmptyState text="Foydalanuvchi topilmadi." cta="Ehtimol, u hisobini o'chirgan yoki username o'zgargan." />
      </div>
    );
  }

  const fullName = `${row.firstName} ${row.lastName}`.trim();
  const myCourses = courses.filter((c) => c.authorId === row.id && c.status === 'approved');
  const myTests = tests.filter((t) => t.authorId === row.id && t.status === 'approved');

  return (
    <div>
      {backButton}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: bannerGradient(row.bannerKey) }}
        >
          <span style={{ ...fontDisplay, color: C.white, fontWeight: 700, fontSize: '20px' }}>
            {(row.firstName || '?').slice(0, 1).toUpperCase()}{(row.lastName || '').slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="text-xl truncate" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{fullName || `@${row.username}`}</div>
            {badge && <CollectibleThumb collectibleId={badge} size={20} />}
          </div>
          <div className="text-sm" style={{ ...fontMono, color: C.math }}>@{row.username}</div>
        </div>
      </div>
      {row.bio && <p className="text-[15px] mb-6 max-w-xl" style={{ ...fontBody, color: C.ink }}>{row.bio}</p>}

      <SectionHeading eyebrow={`${myCourses.length} ta`} title="Mavzular" />
      {myCourses.length === 0 ? (
        <div className="text-sm mb-8" style={{ ...fontBody, color: C.inkSoft }}>Hozircha ommaviy mavzu yoʻq.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {myCourses.map((c) => (
            <div key={c.id} className="p-3.5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="text-[15px] truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
            </div>
          ))}
        </div>
      )}

      <SectionHeading eyebrow={`${myTests.length} ta`} title="Testlar" />
      {myTests.length === 0 ? (
        <div className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Hozircha ommaviy test yoʻq.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {myTests.map((t) => (
            <div key={t.id} className="p-3.5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="text-[15px] truncate" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Small shared UI bits                                              */
/* ------------------------------------------------------------------ */

export function EntryNumber({ n }) {
  return (
    <span
      className="inline-block flex-shrink-0 text-xs px-2 py-1 mr-3 rounded-sm"
      style={{ ...fontMono, color: C.gold, background: 'rgba(184,134,59,0.12)', border: `1px solid ${C.coverLine}` }}
    >
      №{String(n).padStart(2, '0')}
    </span>
  );
}

function InfoHint({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 focus-visible:outline focus-visible:outline-2"
        style={{ background: C.mathTint, color: C.mathDeep, outlineColor: C.mathSoft }}
        aria-label="Qoʻshimcha maʼlumot"
      >
        <Info size={11} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 text-xs p-2.5 rounded-lg"
          style={{ ...fontBody, color: C.mathDeep, background: C.mathTint, width: '230px', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

export function ItemMenu({ actions }) {
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
          style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', minWidth: '150px' }}
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

export function IconButtonDelete({ onClick, label }) {
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

/* ------------------------------------------------------------------ */
/*  Bayram sovg'alari (kolleksiya) tizimi                              */
/*  — 1-bosqich: banner + qabul qilish + saqlash.                      */
/*  Bu tizim kelajakdagi har bir bayram uchun qayta ishlatiladi:       */
/*  collectibles jadvaliga yangi qator qo'shilsa, yangi sovg'a paydo   */
/*  bo'ladi. Hech narsa sahifa ochilganda avtomatik so'ralmaydi —      */
/*  faqat banner bosilgandagina bitta yengil so'rov ketadi.            */
/* ------------------------------------------------------------------ */

const collectibleFromRow = (r) => ({ id: r.id, title: r.title, subtitle: r.subtitle || '' });
const userCollectibleFromRow = (r) => ({ id: r.id, userId: r.user_id, collectibleId: r.collectible_id, equipped: !!r.equipped, collectedAt: r.collected_at });

/* Davlat bayrog'ining rasmiy ko'rinishiga mos: ko'k-oq-yashil teng
   chiziqlar, orasida ingichka qizil chiziqlar, ko'k qismda yarim oy va
   o'ng tomoni tekis, 3-4-5 tartibida zinapoya shaklida joylashgan
   (jami 12 ta) yulduz — nisbat va joylashuv aniq. */
function UzbekFlagRibbon({ width = 92 }) {
  const h = Math.round((width / 2) * 1); // ixcham lenta uchun balandligi
  return (
    <svg width={width} height={h} viewBox="0 0 184 92" xmlns="http://www.w3.org/2000/svg">
      <rect width="184" height="92" fill="#0099B5" />
      <rect y="30.6" width="184" height="30.8" fill="#FFFFFF" />
      <rect y="61.4" width="184" height="30.6" fill="#1EB53A" />
      <rect y="29" width="184" height="3.6" fill="#CE1126" />
      <rect y="59.4" width="184" height="3.6" fill="#CE1126" />
      <circle cx="30" cy="16" r="9" fill="#FFFFFF" />
      <circle cx="34" cy="16" r="7.4" fill="#0099B5" />
      {[
        { y: 9, xs: [70, 81, 92] },
        { y: 19, xs: [59, 70, 81, 92] },
        { y: 29, xs: [48, 59, 70, 81, 92] },
      ].map((row, ri) =>
        row.xs.map((x, ci) => (
          <text
            key={`${ri}-${ci}`}
            x={x}
            y={row.y}
            fontSize="6"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            ★
          </text>
        ))
      )}
    </svg>
  );
}

/* Bayram nishoni — oltin medal uslubida, pastida bayroq lentasi bilan.
   Sof SVG/CSS, tashqi rasm yuklanmaydi — yuklanish tezligiga ta'sir yo'q. */
function IndependenceBadge({ size = 168 }) {
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="badgeGold" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#F3D999" />
            <stop offset="55%" stopColor="#D4AC6E" />
            <stop offset="100%" stopColor="#9C7530" />
          </radialGradient>
          <radialGradient id="badgeCenter" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#245A38" />
            <stop offset="100%" stopColor="#143621" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#badgeGold)" />
        <circle cx="100" cy="100" r="82" fill="url(#badgeCenter)" stroke="#F3D999" strokeWidth="2" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#D4AC6E" strokeWidth="1" opacity="0.6" />
        <text x="100" y="62" textAnchor="middle" fontSize="12" letterSpacing="2" fill="#D4AC6E" fontFamily="'IBM Plex Mono', monospace">MUSTAQILLIK</text>
        <text x="100" y="118" textAnchor="middle" fontSize="52" fontWeight="700" fill="#FBFAF3" fontFamily="'Fraunces', serif">35</text>
        <text x="100" y="140" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#D4AC6E" fontFamily="'IBM Plex Mono', monospace">YIL</text>
      </svg>
      <div className="-mt-1 rounded-sm overflow-hidden" style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.25)' }}>
        <UzbekFlagRibbon width={Math.round(size * 0.42)} />
      </div>
    </div>
  );
}

/* Ixcham versiya — profilda ism yonida, "@username" yonida ko'rinadigan
   kichik nishon (rozetka). */
function MiniIndependenceBadge({ size = 18, title }) {
  return (
    <span title={title || "Mustaqillik bayrami — 35 yil"} className="inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="19" fill="#D4AC6E" />
        <circle cx="20" cy="20" r="15.5" fill="#1F3D2B" />
        <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#FBFAF3" fontFamily="'Fraunces', serif">35</text>
      </svg>
    </span>
  );
}

const GIFT_ID = 'mustaqillik-35';

function GiftModal({ session, onRequireLogin, onClose, collectibleId, onChange }) {
  const targetId = collectibleId || GIFT_ID;
  const [phase, setPhase] = useState('loading'); // loading | offer | owned | busy | error
  const [equipped, setEquipped] = useState(false);
  const [rowId, setRowId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) { setPhase('offer'); return; }
      try {
        const rows = await sbSelect('user_collectibles', `user_id=eq.${session.user.id}&collectible_id=eq.${targetId}`, 'collected_at');
        if (cancelled) return;
        if (rows[0]) {
          const uc = userCollectibleFromRow(rows[0]);
          setRowId(uc.id);
          setEquipped(uc.equipped);
          setPhase('owned');
        } else {
          setPhase('offer');
        }
      } catch (e) {
        if (!cancelled) setPhase('offer');
      }
    })();
    return () => { cancelled = true; };
  }, [session, targetId]);

  async function accept() {
    if (!session) { onRequireLogin(); return; }
    setPhase('busy');
    try {
      const [created] = await sbInsert('user_collectibles', { user_id: session.user.id, collectible_id: targetId, equipped: true });
      setRowId(created.id);
      setEquipped(true);
      setPhase('owned');
      setAuthorBadgeCache(session.user.id, targetId);
      if (onChange) onChange(true);
    } catch (e) {
      setPhase('error');
    }
  }

  async function toggleEquip() {
    if (!rowId) return;
    const next = !equipped;
    setEquipped(next); // darhol ko'rsatamiz, orqa fonda saqlaymiz
    setAuthorBadgeCache(session.user.id, next ? targetId : null);
    if (onChange) onChange(next);
    try {
      await sbUpdate('user_collectibles', rowId, { equipped: next });
    } catch (e) {
      setEquipped(!next); // saqlanmasa — orqaga qaytaramiz
      setAuthorBadgeCache(session.user.id, !next ? targetId : null);
      if (onChange) onChange(!next);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,27,18,0.62)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg overflow-hidden text-center"
        style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}
      >
        <div className="pt-8 pb-6 px-6" style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}>
          <IndependenceBadge />
          <div className="mt-4 text-lg" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>Mustaqillik bayrami — 35 yil!</div>
          <div className="text-[13px] mt-1" style={{ ...fontBody, color: 'rgba(251,250,243,0.75)' }}>Sizga ushbu esdalik nishonini sovg'a qilamiz</div>
        </div>
        <div className="p-6">
          {phase === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-2" style={{ color: C.inkSoft }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[14px]" style={fontBody}>Tekshirilmoqda...</span>
            </div>
          )}

          {phase === 'offer' && (
            <>
              <p className="text-[14px] mb-5" style={{ ...fontBody, color: C.inkSoft }}>
                Mustaqil O'zbekistonimizning 35 yilligi sharafiga — barcha foydalanuvchilarimizga chin qalbdan tabriklar va shu esdalik nishoni!
              </p>
              <SolidButton onClick={accept} icon={Award}>Qabul qilish</SolidButton>
            </>
          )}

          {phase === 'busy' && (
            <div className="flex items-center justify-center gap-2 py-2" style={{ color: C.inkSoft }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[14px]" style={fontBody}>Saqlanmoqda...</span>
            </div>
          )}

          {phase === 'owned' && (
            <>
              <div className="flex items-center justify-center gap-1.5 text-[14px] mb-5" style={{ ...fontBody, color: C.accent }}>
                <CheckCircle2 size={16} /> Bu nishon sizning kolleksiyangizda
              </div>
              <div className="flex gap-3 justify-center">
                <SolidButton onClick={toggleEquip} icon={equipped ? X : Award}>
                  {equipped ? "Olib tashlash" : "Ishlatish"}
                </SolidButton>
                <GhostButton onClick={onClose} icon={X}>Yopish</GhostButton>
              </div>
            </>
          )}

          {phase === 'error' && (
            <div className="text-[14px]" style={{ ...fontBody, color: C.red }}>Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.</div>
          )}

          {phase !== 'owned' && phase !== 'loading' && phase !== 'busy' && (
            <button onClick={onClose} className="mt-4 text-[13px]" style={{ ...fontBody, color: C.inkSoft }}>Yopish</button>
          )}
        </div>
      </div>
    </div>
  );
}

function GiftBanner({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 p-3.5 mb-5 rounded-lg text-left transition-transform hover:-translate-y-0.5"
      style={{ background: `linear-gradient(120deg, ${C.cover}, ${C.coverDeep})`, border: `1px solid ${C.coverLine}` }}
    >
      <MiniIndependenceBadge size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] truncate" style={{ ...fontBody, color: C.white, fontWeight: 600 }}>🎉 Mustaqillik bayrami sovg'asini oling</div>
        <div className="text-[12px] truncate" style={{ ...fontBody, color: 'rgba(251,250,243,0.7)' }}>35 yillik esdalik nishoni — sizni kutmoqda</div>
      </div>
      <ChevronRight size={18} style={{ color: C.gold, flexShrink: 0 }} />
    </button>
  );
}

/* Ixcham nishon — hozircha faqat bitta kolleksiya bor (Mustaqillik-35),
   shuning uchun vizual to'g'ridan-to'g'ri shu. Kelajakda yangi bayram
   qo'shilsa, shu yerga collectibleId bo'yicha yangi "case" qo'shiladi. */
function CollectibleThumb({ collectibleId, size = 40, inline }) {
  const content = collectibleId === GIFT_ID
    ? <MiniIndependenceBadge size={size} />
    : (
      <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ width: size, height: size, background: C.goldSoft }}>
        <Award size={Math.round(size * 0.5)} style={{ color: C.gold }} />
      </span>
    );
  if (inline) return <span className="inline-flex align-middle ml-1.5" style={{ verticalAlign: 'middle' }}>{content}</span>;
  return content;
}

/* Profildagi "Kolleksiyalar" bo'limi — foydalanuvchi to'plagan barcha
   bayram sovg'alarini ko'rsatadi. Faqat shu bo'lim ochilganda (Profil
   ichidan qo'lda bosilganda) ikkita yengil so'rov ketadi — sahifa
   yuklanganda yoki Profilga kirilganda avtomatik ishlamaydi. */
function CollectionsView({ session, onBack }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRows, ownedRows] = await Promise.all([
          sbSelect('collectibles'),
          sbSelect('user_collectibles', `user_id=eq.${session.user.id}`, 'collected_at'),
        ]);
        if (cancelled) return;
        setCatalog(catRows.map(collectibleFromRow));
        setOwned(ownedRows.map(userCollectibleFromRow));
        setState('ready');
      } catch (e) {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [session.user.id]);

  function handleEquipChange(collectibleId, next) {
    setOwned((prev) => prev.map((o) => (o.collectibleId === collectibleId ? { ...o, equipped: next } : o)));
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm mb-4 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}>
        <ArrowLeft size={15} /> Profil
      </button>
      <SectionHeading eyebrow="Mening hisobim" title="Kolleksiyalar" />

      {state === 'loading' && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: C.gold }} />
        </div>
      )}

      {state === 'error' && (
        <div className="text-[14px]" style={{ ...fontBody, color: C.red }}>Yuklab boʻlmadi. Birozdan keyin qayta urinib koʻring.</div>
      )}

      {state === 'ready' && (
        owned.length === 0 ? (
          <EmptyState text="Hozircha kolleksiyangizda hech narsa yoʻq. Bayram sovgʻalarini yigʻib boring!" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {owned.map((uc) => {
              const meta = catalog.find((c) => c.id === uc.collectibleId);
              return (
                <button
                  key={uc.id}
                  onClick={() => setOpenId(uc.collectibleId)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg text-center transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2"
                  style={{ background: C.surface, border: `1px solid ${uc.equipped ? C.gold : C.rule}`, outlineColor: C.gold }}
                >
                  <CollectibleThumb collectibleId={uc.collectibleId} size={44} />
                  <div className="text-[13px]" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>{meta?.title || 'Sovgʻa'}</div>
                  {uc.equipped && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}>Ishlatilmoqda</span>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {openId && (
        <GiftModal
          session={session}
          collectibleId={openId}
          onRequireLogin={() => {}}
          onClose={() => setOpenId(null)}
          onChange={(next) => handleEquipChange(openId, next)}
        />
      )}
    </div>
  );
}

function PaperPanel({ children, className }) {
  return (
    <div className={className}>{children}</div>
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
        style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outlineColor: C.gold }}
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

export function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-6">
      <div className="text-xs tracking-[0.2em] uppercase mb-1" style={{ ...fontMono, color: C.gold }}>{eyebrow}</div>
      <h2 className="text-2xl sm:text-3xl" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{title}</h2>
    </div>
  );
}

/* Kurs/test/profil/jonli xona uchun universal "Ulashish" tugmasi.
   Qurilmada Web Share qo'llab-quvvatlansa (mobil brauzerlarning
   aksariyati) — tizim ulashish oynasini ochadi (Telegram, WhatsApp va h.k.
   to'g'ridan-to'g'ri chiqadi). Aks holda havola clipboard'ga nusxalanadi. */
export function ShareButton({ url, title, small }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: title || 'UpCourse Uz' });
        return;
      } catch (e) { /* foydalanuvchi ulashish oynasini bekor qilgan bo'lishi mumkin */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard mavjud bo'lmasa e'tiborsiz qoldiriladi */ }
  }

  return (
    <button
      onClick={share}
      aria-label="Havolani ulashish"
      className={`inline-flex items-center gap-1.5 rounded-full focus-visible:outline focus-visible:outline-2 ${small ? 'text-xs px-2.5 py-1.5' : 'text-[13px] px-3 py-1.5'}`}
      style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}`, outlineColor: C.gold }}
    >
      <Share2 size={small ? 12 : 13} />
      {copied ? 'Nusxalandi ✓' : 'Ulashish'}
    </button>
  );
}


export function EmptyState({ text, cta }) {
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

export function TextField({ label, value, onChange, placeholder, textarea, rows }) {
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

export function GhostButton({ children, onClick, icon: Icon, type, disabled }) {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ ...fontBody, color: C.accent, border: `1px solid ${C.accent}`, outlineColor: C.gold }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function SolidButton({ children, onClick, icon: Icon, type, disabled }) {
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
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <TextField label="Soha nomi" value={name} onChange={setName} placeholder="Masalan: Marketing, Huquqshunoslik, Dasturlash" />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Sohani saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

export function RenameCategoryModal({ category, onSave, onCancel }) {
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
        style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}
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

function CategoryGrid({ categories, itemsByCategory, itemLabel, onSelect, renameCategory, deleteCategory, onGoToCommunity, isAdmin }) {
  const [renaming, setRenaming] = useState(null);

  return (
    <div>
      {categories.length === 0 ? (
        <EmptyState text="Hozircha soha qoʻshilmagan." cta="Quyidagi tugma orqali birinchi sohani qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat, i) => {
            const count = itemsByCategory[cat.id] || 0;
            return (
              <div
                key={cat.id}
                className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                onClick={() => onSelect(cat.id)}
              >
                <div className="flex items-start min-w-0">
                  <EntryNumber n={i + 1} />
                  <div className="min-w-0">
                    <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                    <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta {itemLabel}</div>
                    <AuthorLine authorId={cat.authorId} authorName={cat.author} className="text-xs mt-1" />
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 gap-1">
                  {isAdmin && (
                    <ItemMenu actions={[
                      { label: 'Nomini oʻzgartirish', icon: Pencil, onClick: () => setRenaming(cat) },
                      { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCategory(cat.id, cat.name) },
                    ]} />
                  )}
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
    <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
      <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [newId, setNewId] = useState(null);

  if (newId) {
    return (
      <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
        <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
        <div className="text-base mb-1" style={{ ...fontBody, color: C.ink }}>Mavzungiz yuborildi!</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.inkSoft }}>
          {visibility === 'private'
            ? 'Xususiy sifatida saqlandi — tasdiqlash shart emas. Faqat siz va havola orqali ulashganlaringiz koʻra oladi.'
            : 'Hozircha faqat sizga koʻrinadi. Administrator tekshirib tasdiqlagach, u hammaga ochiq boʻladi.'}
        </div>
        <div className="flex gap-3 justify-center">
          <SolidButton onClick={() => onView(newId)} icon={ChevronRight}>Koʻrish</SolidButton>
          <GhostButton onClick={onDone} icon={X}>Yopish</GhostButton>
        </div>
      </div>
    );
  }

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    if (!lockedCategoryId && !categoryName.trim()) return;
    const payload = lockedCategoryId
      ? { categoryId: lockedCategoryId, title: title.trim(), summary: '', content: content.trim(), videoUrl: videoUrl.trim(), visibility }
      : { categoryName: categoryName.trim(), title: title.trim(), summary: '', content: content.trim(), videoUrl: videoUrl.trim(), visibility };
    const id = await onSubmit(payload);
    if (id) setNewId(id);
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Sohaga nom bering" />
      )}
      <TextField label="Mavzu nomi" value={title} onChange={setTitle} placeholder="Mavzuga nom bering" />
      <TextField label="Dars matni" value={content} onChange={setContent} placeholder="Matn kiriting" textarea rows={7} />
      <TextField label="YouTube video havolasi (ixtiyoriy)" value={videoUrl} onChange={setVideoUrl} placeholder="https://www.youtube.com/watch?v=..." />
      <VisibilityToggle value={visibility} onChange={setVisibility} />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Yuborish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function VisibilityToggle({ value, onChange }) {
  return (
    <div className="mb-3">
      <div className="text-xs mb-1.5 uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Koʻrinishi</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('public')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm text-[14px] transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            ...fontBody,
            color: value === 'public' ? C.white : C.ink,
            background: value === 'public' ? C.cover : C.surface,
            border: `1px solid ${value === 'public' ? C.cover : C.rule}`,
            outlineColor: C.gold,
            fontWeight: value === 'public' ? 600 : 400,
          }}
        >
          <Users size={15} /> Ommaviy
        </button>
        <button
          type="button"
          onClick={() => onChange('private')}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm text-[14px] transition-colors focus-visible:outline focus-visible:outline-2"
          style={{
            ...fontBody,
            color: value === 'private' ? C.white : C.ink,
            background: value === 'private' ? C.cover : C.surface,
            border: `1px solid ${value === 'private' ? C.cover : C.rule}`,
            outlineColor: C.gold,
            fontWeight: value === 'private' ? 600 : 400,
          }}
        >
          <Lock size={15} /> Xususiy
        </button>
      </div>
      <div className="text-xs mt-1.5" style={{ ...fontBody, color: C.inkSoft }}>
        {value === 'private'
          ? 'Tasdiqlash shart emas. Faqat siz va havola orqali ulashganlaringiz koʻra oladi.'
          : 'Administrator tasdiqlagach, hammaga ochiq boʻladi.'}
      </div>
    </div>
  );
}

function EditCourseForm({ course, onSave, onDone }) {
  const [title, setTitle] = useState(course.title);
  const [content, setContent] = useState(course.content);
  const [videoUrl, setVideoUrl] = useState(course.videoUrl || '');

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    const ok = await onSave({ categoryId: course.categoryId, title: title.trim(), summary: course.summary || '', content: content.trim(), videoUrl: videoUrl.trim() });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <TextField label="Mavzu nomi" value={title} onChange={setTitle} />
      <TextField label="Dars matni" value={content} onChange={setContent} placeholder="Matn kiriting" textarea rows={7} />
      <TextField label="YouTube video havolasi (ixtiyoriy)" value={videoUrl} onChange={setVideoUrl} placeholder="https://www.youtube.com/watch?v=..." />
      <div className="flex gap-3 mt-2">
        <SolidButton onClick={submit} icon={Check}>Saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function CoursesView({ courses, categories, updateCourse, deleteCourse, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, initialOpenId, ensureCourseContent }) {
  const [categoryId, setCategoryId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goCourse = (id) => { if (ensureCourseContent) ensureCourseContent(id); setOpenId(id); pushNav(() => setOpenId(null)); };
  const goEdit = (id) => { if (ensureCourseContent) ensureCourseContent(id); setEditId(id); pushNav(() => setEditId(null)); };

  const myId = session?.user?.id;
  const approvedCategories = categories.filter((c) => c.status !== 'pending');
  const approved = courses.filter((c) => c.status === 'approved');
  const viewable = isAdmin ? courses : courses.filter((c) => c.status === 'approved' || c.authorId === myId);
  const active = viewable.find((c) => c.id === openId);
  const editing = approved.find((c) => c.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((c) => c.categoryId === categoryId);
  const q = query.trim().toLowerCase();

  /* Ulashilgan havola orqali kirilgan bo'lsa (?course=ID), shu kursni
     avtomatik ochamiz — faqat ilk yuklanganda, bitta marta. */
  useEffect(() => {
    if (initialOpenId && viewable.some((c) => c.id === initialOpenId)) goCourse(initialOpenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const matchedCategories = q ? approvedCategories.filter((cat) => cat.name.toLowerCase().includes(q) && approved.some((c) => c.categoryId === cat.id)) : [];
  const matchedCourses = q ? approved.filter((c) => c.title.toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q)) : [];
  const isSearching = q.length > 0;
  const noSearchResults = isSearching && matchedCategories.length === 0 && matchedCourses.length === 0;

  useEffect(() => {
    if (onReadingChange) onReadingChange(!!active);
    return () => { if (onReadingChange) onReadingChange(false); };
  }, [active, onReadingChange]);

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
        {editing.content === undefined ? (
          <div className="flex items-center gap-2 text-sm mt-4" style={{ ...fontBody, color: C.inkSoft }}>
            <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
          </div>
        ) : (
          <EditCourseForm course={editing} onSave={(data) => updateCourse(editing.id, data, editing.title)} onDone={back} />
        )}
      </div>
    );
  }

  if (active) {
    return (
      <div>
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {activeCategory ? activeCategory.name : 'Barcha mavzular'}
        </button>
        {active.status === 'pending' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Clock3 size={13} /> Tekshirilmoqda — hozircha faqat sizga koʻrinadi
          </div>
        )}
        {active.status === 'private' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Lock size={13} /> Xususiy — faqat siz va havola orqali ulashganlaringiz koʻradi
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-2xl sm:text-3xl min-w-0" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
          <div className="flex-shrink-0 mt-1">
            <ShareButton url={buildShareUrl({ course: active.id })} title={active.title} />
          </div>
        </div>
        {active.content === undefined ? (
          <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
            <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
          </div>
        ) : (
          <CourseBody content={active.content} videoUrl={active.videoUrl} />
        )}
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <SectionHeading eyebrow={`${approvedCategories.filter((cat) => approved.some((c) => c.categoryId === cat.id)).length} ta soha`} title="Kurslar" />
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
                          style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                          onClick={() => goCategory(cat.id)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                            <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta mavzu</div>
                            <AuthorLine authorId={cat.authorId} authorName={cat.author} className="text-xs mt-1" />
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
                        style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                        onClick={() => goCourse(c.id)}
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
            categories={approvedCategories.filter((cat) => approved.some((c) => c.categoryId === cat.id))}
            itemsByCategory={approved.reduce((acc, c) => { acc[c.categoryId] = (acc[c.categoryId] || 0) + 1; return acc; }, {})}
            itemLabel="mavzu"
            onSelect={goCategory}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
            onGoToCommunity={() => onGoToCommunity('kurslar')}
            isAdmin={isAdmin}
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
      <SectionHeading eyebrow={`${inCategory.length} ta mavzu`} title={activeCategory ? activeCategory.name : 'Kurslar'} />
      {inCategory.length === 0 ? (
        <EmptyState text="Bu sohada hozircha mavzu qoʻshilmagan." cta="Quyidagi tugma orqali birinchi mavzuni qoʻshing." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {inCategory.map((c, i) => (
            <div
              key={c.id}
              className="min-w-0 group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: C.surface, border: `1px solid ${C.rule}` }}
              onClick={() => goCourse(c.id)}
            >
              <div className="flex items-start min-w-0">
                <EntryNumber n={i + 1} />
                <div className="min-w-0">
                  <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                  {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                </div>
              </div>
              <div className="flex items-center flex-shrink-0 gap-1">
                {isAdmin && (
                  <ItemMenu actions={[
                    { label: 'Tahrirlash', icon: Pencil, onClick: () => goEdit(c.id) },
                    { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCourse(c.id, c.title) },
                  ]} />
                )}
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

/* Yozma javobni raqam sifatida o'qishga urinadi (kasr "1/2" yoki
   o'nlik "0.5"/"0,5" — hammasini bir xil songa aylantiradi). Raqam
   bo'lmasa null qaytaradi (harf/so'z javoblari uchun). */
function parseMathAnswer(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return null;
  const fracMatch = s.match(/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/);
  if (fracMatch) {
    const [num, den] = s.split('/').map(Number);
    if (den === 0 || isNaN(num) || isNaN(den)) return null;
    return num / den;
  }
  const num = Number(s);
  return isNaN(num) ? null : num;
}

/* Yozma javobni to'g'ri javoblar ro'yxati bilan solishtiradi.
   Kasr va o'nli kasr avtomatik songa aylantirilib solishtiriladi
   (1/2 va 0,5 — ikkalasi ham to'g'ri deb topiladi). Raqam bo'lmasa
   (masalan so'z yoki "2√3" kabi), harf-baharf (katta-kichik harfga
   sezgir emas) solishtiriladi. */
function isOpenAnswerCorrect(question, userAnswer) {
  if (!userAnswer || !userAnswer.trim()) return false;
  const accepted = question.answers || [];
  const userNum = parseMathAnswer(userAnswer);
  const userText = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
  for (const acc of accepted) {
    const accNum = parseMathAnswer(acc);
    if (userNum !== null && accNum !== null) {
      if (Math.abs(userNum - accNum) < 1e-9) return true;
    }
    if (String(acc).trim().toLowerCase().replace(/\s+/g, '') === userText) return true;
  }
  return false;
}

/* Har ikki savol turi (variantli / yozma) uchun umumiy tekshiruv */
export function isQuestionCorrect(q, userAnswer) {
  if (q.type === 'open') return isOpenAnswerCorrect(q, userAnswer);
  return userAnswer === q.correct;
}

/* "Barchaga bir xil" (Kahoot) rejimida vaqtga proporsional ball:
   to'g'ri javob kamida 50, zudlik bilan javob bersa 100 gacha boradi. */
export function computeSyncScore(correct, timeTakenMs, limitMs) {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, 1 - timeTakenMs / Math.max(1, limitMs)));
  return Math.round(50 + 50 * frac);
}

/* TXT fayldan variantli savollarni o'qish. Kutilgan format:
   Savol matni? (raqami bo'lsa ham, bo'lmasa ham farqi yo'q)
   A) variant
   B) variant
   C) variant
   D) variant
   ANSWER: A
   Har bir savol "ANSWER:" qatoridan keyin tugagan deb hisoblanadi —
   shu sababli keyingi savol qatori raqamlangan ("1.") yoki
   raqamsiz ("Savol matni?") bo'lishidan qat'iy nazar to'g'ri
   aniqlanadi. */
function parseTxtQuestions(rawText) {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const questions = [];
  let cur = null;

  function pushCurrent() {
    if (cur && cur.text && cur.options.length >= 2 && cur.correct !== null) {
      questions.push({ id: uid(), type: 'mcq', text: cur.text, options: cur.options, correct: cur.correct });
    }
    cur = null;
  }

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const optMatch = line.match(/^([A-DА-Г])[).]\s*(.+)$/i);
    const ansMatch = line.match(/^ANSWER[:\s]+([A-DА-Г])/i);

    if (ansMatch && cur) {
      const letter = ansMatch[1].toUpperCase();
      const idx = 'ABCD'.indexOf(letter);
      if (idx !== -1) cur.correct = idx;
      // Savol "ANSWER:" bilan tugadi — uni saqlab, keyingi qatorni
      // (raqamli yoki raqamsiz) yangi savol boshlanishi deb qabul qilamiz.
      pushCurrent();
      continue;
    }
    if (optMatch && cur && cur.correct === null) {
      cur.options.push(optMatch[2].trim());
      continue;
    }
    // Variant yoki ANSWER qatori emas — demak bu savol matni.
    // Boshida "1." yoki "12)" kabi raqam bo'lsa, shunchaki matn deb
    // qabul qilib, raqamni olib tashlaymiz (bor-yo'qligi farq qilmaydi).
    const stripped = line.replace(/^\d+[.)]\s*/, '');
    if (!cur) {
      cur = { text: stripped, options: [], correct: null };
    } else if (cur.options.length === 0) {
      // Savol matni bir necha qatorga bo'lingan bo'lishi mumkin.
      cur.text += ' ' + stripped;
    } else {
      // Variantlar allaqachon boshlangan, lekin ANSWER qatori kelmasdan
      // yangi savol matni chiqdi — demak oldingi savol "ANSWER:"siz
      // qolib ketgan. Uni tashlab, yangi savolni shu yerdan boshlaymiz.
      pushCurrent();
      cur = { text: stripped, options: [], correct: null };
    }
  }
  pushCurrent();
  return questions;
}

function QuestionBuilder({ questions, setQuestions, mode = 'manual' }) {
  const [qType, setQType] = useState(mode === 'math' ? 'open' : 'mcq');
  const [qText, setQText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [answersText, setAnswersText] = useState('');
  const [importError, setImportError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  function addQuestion() {
    if (!qText.trim()) return;
    if (qType === 'mcq') {
      if (opts.some((o) => !o.trim())) return;
      setQuestions([...questions, { id: uid(), type: 'mcq', text: qText.trim(), options: opts.map((o) => o.trim()), correct, imageUrl: imageUrl || undefined }]);
      setOpts(['', '', '', '']);
      setCorrect(0);
    } else {
      const answers = answersText.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      if (answers.length === 0) return;
      setQuestions([...questions, { id: uid(), type: 'open', text: qText.trim(), answers, imageUrl: imageUrl || undefined }]);
      setAnswersText('');
    }
    setQText('');
    setImageUrl('');
  }

  function removeQuestion(id) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  async function handleImageFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const url = await sbUploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setImageError('Rasm yuklashda xatolik yuz berdi. Qaytadan urinib koʻring.');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  }

  function handleTxtFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseTxtQuestions(String(reader.result));
        if (parsed.length === 0) {
          setImportError('Faylda savol topilmadi. Format toʻgʻriligini tekshiring: savol matni, keyin "A) variant" qatorlari, oxirida "ANSWER: A".');
          return;
        }
        setQuestions([...questions, ...parsed]);
      } catch (err) {
        setImportError('Faylni oʻqishda xatolik yuz berdi.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  const isTxtMode = mode === 'txt';
  const isMathMode = mode === 'math';

  return (
    <>
      {questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between p-3 rounded-sm" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
              <div className="flex items-start gap-2 min-w-0">
                {q.imageUrl && (
                  <img src={q.imageUrl} alt="" className="w-10 h-10 object-cover rounded-sm flex-shrink-0" style={{ border: `1px solid ${C.rule}` }} />
                )}
                <div className="text-[15px] min-w-0" style={{ ...fontBody, color: C.ink }}>
                  <span style={{ ...fontMono, color: C.gold }}>{i + 1}.</span> {q.text}
                  {q.type === 'open' && (
                    <span className="ml-2 text-xs" style={{ ...fontMono, color: C.inkSoft }}>(yozma javob)</span>
                  )}
                </div>
              </div>
              <button onClick={() => removeQuestion(q.id)} className="flex-shrink-0 ml-3" style={{ color: C.inkSoft }}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".txt" onChange={handleTxtFile} className="hidden" />

      {isTxtMode ? (
        <div className="p-6 rounded-2xl mb-4 text-center" style={{ background: C.mathTint, border: `1px solid ${C.math}` }}>
          <FileText size={22} style={{ color: C.math }} className="mx-auto mb-2" />
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <div className="text-[15px]" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>TXT fayldan savollarni yuklang</div>
            <InfoHint text={'Har bir savol alohida qatorda (raqami bo\u2018lsa ham, bo\u2018lmasa ham farqi yo\u2018q), keyin "A)", "B)", "C)", "D)" variantlari, oxirida "ANSWER: A" (yoki B, C, D) yozilgan bo\u2018lishi kerak.'} />
          </div>
          <SolidButton onClick={() => fileInputRef.current && fileInputRef.current.click()} icon={Paperclip}>TXT faylni tanlash</SolidButton>
          {importError && <div className="text-xs mt-3" style={{ ...fontBody, color: C.red }}>{importError}</div>}
        </div>
      ) : (
        <div className="p-4 rounded-sm mb-4" style={{ background: C.paperSoft, border: `1px dashed ${C.rule}` }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs tracking-wide uppercase" style={{ ...fontMono, color: C.inkSoft }}>Savol qoʻshish</div>
            {!isMathMode && (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 focus-visible:outline focus-visible:outline-2"
                style={{ background: C.mathTint, color: C.mathDeep, outlineColor: C.mathSoft }}
                aria-label="TXT fayldan yuklash"
                title="TXT fayldan yuklash"
              >
                <FileText size={13} />
              </button>
            )}
          </div>
          {importError && <div className="text-xs mb-3" style={{ ...fontBody, color: C.red }}>{importError}</div>}

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setQType('mcq')}
              className="px-3 py-1.5 rounded-sm text-sm"
              style={{ ...fontBody, background: qType === 'mcq' ? C.cover : 'transparent', color: qType === 'mcq' ? C.white : C.inkSoft, border: `1px solid ${qType === 'mcq' ? C.cover : C.rule}` }}
            >
              Variantli
            </button>
            <button
              onClick={() => setQType('open')}
              className="px-3 py-1.5 rounded-sm text-sm"
              style={{ ...fontBody, background: qType === 'open' ? C.cover : 'transparent', color: qType === 'open' ? C.white : C.inkSoft, border: `1px solid ${qType === 'open' ? C.cover : C.rule}` }}
            >
              Yozma javob
            </button>
            {isMathMode && qType === 'open' && (
              <InfoHint text={'Bir nechta toʻgʻri koʻrinishni kiritishingiz mumkin — masalan "1/2" va "0,5" ikkalasi ham toʻgʻri hisoblanadi, chunki javob son sifatida solishtiriladi.'} />
            )}
          </div>

          <TextField label="Savol matni" value={qText} onChange={setQText} placeholder="Savolni yozing" />

          <div className="mb-3">
            <div className="text-xs mb-1.5 uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Rasm / chizma (ixtiyoriy)</div>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded-sm" style={{ border: `1px solid ${C.rule}` }} />
                <button onClick={() => setImageUrl('')} className="text-xs inline-flex items-center gap-1" style={{ ...fontBody, color: C.red }}>
                  <X size={13} /> Rasmni olib tashlash
                </button>
              </div>
            ) : (
              <>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                <button
                  onClick={() => imageInputRef.current && imageInputRef.current.click()}
                  disabled={imageUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs focus-visible:outline focus-visible:outline-2"
                  style={{ ...fontBody, color: C.ink, background: 'transparent', border: `1px solid ${C.rule}`, outlineColor: C.gold }}
                >
                  <ImageIcon size={13} /> {imageUploading ? 'Yuklanmoqda...' : 'Rasm qoʻshish'}
                </button>
              </>
            )}
            {imageError && <div className="text-xs mt-2" style={{ ...fontBody, color: C.red }}>{imageError}</div>}
          </div>

          {qType === 'mcq' ? (
            <>
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
            </>
          ) : (
            <>
              <TextField
                label="Toʻgʻri javob(lar)"
                value={answersText}
                onChange={setAnswersText}
                placeholder="Masalan: 1/2, 0.5, 0,5 (vergul yoki yangi qator bilan ajrating)"
                textarea
                rows={2}
              />
            </>
          )}

          <GhostButton onClick={addQuestion} icon={Plus} disabled={imageUploading}>Savolni testga qoʻshish</GhostButton>
        </div>
      )}
    </>
  );
}

function AddTestForm({ categories, lockedCategoryId, initialCategoryName, onSubmit, onDone, onView, formMode }) {
  const [categoryName, setCategoryName] = useState(initialCategoryName || '');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [newId, setNewId] = useState(null);

  if (newId) {
    return (
      <div className="mt-6 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.accent}` }}>
        <Check size={22} style={{ color: C.accent }} className="mx-auto mb-2" />
        <div className="text-base mb-1" style={{ ...fontBody, color: C.ink }}>Testingiz yuborildi!</div>
        <div className="text-[15px] mb-4" style={{ ...fontBody, color: C.inkSoft }}>
          {visibility === 'private'
            ? 'Xususiy sifatida saqlandi — tasdiqlash shart emas. Faqat siz va havola orqali ulashganlaringiz koʻra oladi.'
            : 'Hozircha faqat sizga koʻrinadi. Administrator tekshirib tasdiqlagach, u hammaga ochiq boʻladi.'}
        </div>
        <div className="flex gap-3 justify-center">
          <SolidButton onClick={() => onView(newId)} icon={ChevronRight}>Koʻrish</SolidButton>
          <GhostButton onClick={onDone} icon={X}>Yopish</GhostButton>
        </div>
      </div>
    );
  }

  const canSubmit = title.trim() && questions.length > 0 && (lockedCategoryId || categoryName.trim());

  async function submit() {
    if (!canSubmit) return;
    const payload = lockedCategoryId
      ? { categoryId: lockedCategoryId, title: title.trim(), description: '', questions, visibility }
      : { categoryName: categoryName.trim(), title: title.trim(), description: '', questions, visibility };
    const id = await onSubmit(payload);
    if (id) setNewId(id);
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      {formMode === 'txt' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[13px]" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>
          <FileText size={14} style={{ flexShrink: 0 }} /> TXT fayldan test yaratish — savollarni qoʻlda yozish shart emas.
        </div>
      )}
      {formMode === 'math' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[13px]" style={{ ...fontBody, color: C.mathDeep, background: C.mathTint }}>
          <Calculator size={14} style={{ flexShrink: 0 }} /> Matematik test — savollarga rasm/chizma qoʻshishingiz va yozma javob (kasr, ildiz, daraja) qabul qilishingiz mumkin.
        </div>
      )}
      {!lockedCategoryId && (
        <TextField label="Soha nomi" value={categoryName} onChange={setCategoryName} placeholder="Sohaga nom bering" />
      )}
      <TextField label="Test nomi" value={title} onChange={setTitle} placeholder="Masalan: Inflyatsiya boʻyicha test" />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} mode={formMode || 'manual'} />
      <VisibilityToggle value={visibility} onChange={setVisibility} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={!canSubmit}>Yuborish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function EditTestForm({ test, onSave, onDone }) {
  const [title, setTitle] = useState(test.title);
  const [questions, setQuestions] = useState(test.questions);

  async function submit() {
    if (!title.trim() || questions.length === 0) return;
    const ok = await onSave({ categoryId: test.categoryId, title: title.trim(), description: test.description || '', questions });
    if (ok) onDone();
  }

  return (
    <div className="mt-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <TextField label="Test nomi" value={title} onChange={setTitle} />
      <QuestionBuilder questions={questions} setQuestions={setQuestions} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check} disabled={questions.length === 0 || !title.trim()}>Saqlash</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Testni boshlashdan oldingi ixcham sozlamalar paneli                */
/* ------------------------------------------------------------------ */

function SettingChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-colors flex-shrink-0"
      style={{
        ...fontBody,
        color: active ? C.white : C.ink,
        background: active ? C.accent : C.surface,
        border: `1px solid ${active ? C.accent : C.rule}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: 7, height: 7, background: active ? C.white : C.rule }}
      />
      {children}
    </button>
  );
}

function QuizSetupPanel({ test, onExit, onStart }) {
  const total = test.questions.length;
  const [immediate, setImmediate] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [mode, setMode] = useState('all'); // all | random | first | split
  const [count, setCount] = useState(Math.min(5, total));
  const [partsTotal, setPartsTotal] = useState(2);
  const [partIndex, setPartIndex] = useState(1);

  function computeQuestions() {
    let base = test.questions;
    if (mode === 'random') {
      base = shuffleArray(test.questions).slice(0, Math.max(1, Math.min(count, total)));
    } else if (mode === 'first') {
      base = test.questions.slice(0, Math.max(1, Math.min(count, total)));
    } else if (mode === 'split') {
      const parts = Math.max(2, Math.min(partsTotal, total));
      const size = Math.ceil(total / parts);
      const start = (Math.max(1, Math.min(partIndex, parts)) - 1) * size;
      base = test.questions.slice(start, start + size);
      if (base.length === 0) base = test.questions.slice(0, size);
    }
    if (shuffle) base = shuffleArray(base);
    return base;
  }

  function start() {
    const questions = computeQuestions();
    if (questions.length === 0) return;
    onStart({ immediate, autoScroll, questions });
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
      <div className="text-xs mb-6" style={{ ...fontMono, color: C.gold }}>{total} ta savol mavjud</div>

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

function QuizPlayer({ test, config, onExit, onRestart }) {
  const questions = config.questions;
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const questionRefs = useRef({});

  useEffect(() => {
    if (finished || paused) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished, paused]);

  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    return q.type === 'open' ? (typeof a === 'string' && a.trim().length > 0) : a !== undefined;
  });

  /* "Keyingi savolga avtomatik oʻtish" yoqilgan boʻlsa — foydalanuvchi
     javob belgilagach, qoʻlda pastga qorishtirmasdan, ekranni keyingi
     javob berilmagan savol markazga kelguncha silliq skroll qilamiz. */
  function scrollToNextUnanswered(fromQid, latestAnswers) {
    if (!config.autoScroll) return;
    const fromIndex = questions.findIndex((q) => q.id === fromQid);
    const next = questions.slice(fromIndex + 1).find((q) => {
      const a = latestAnswers[q.id];
      return q.type === 'open' ? !(typeof a === 'string' && a.trim().length > 0) : a === undefined;
    });
    if (next) {
      const el = questionRefs.current[next.id];
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
    }
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
    setRevealed(Object.fromEntries(questions.map((q) => [q.id, true])));
    setFinished(true);
  }

  if (finished) {
    const correctCount = questions.reduce((s, qq) => s + (isQuestionCorrect(qq, answers[qq.id]) ? 1 : 0), 0);
    const incorrectCount = questions.length - correctCount;
    const percent = Math.round((correctCount / questions.length) * 100);
    return (
      <div>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> Barcha testlar
        </button>
        <h3 className="text-2xl sm:text-3xl mb-5" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title} — yakunlandi</h3>
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
        <div className="flex gap-3">
          <GhostButton onClick={onRestart} icon={RotateCcw}>Sozlamalarni oʻzgartirish</GhostButton>
        </div>
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
          <div className="space-y-6 max-w-2xl">
            {questions.map((q, qi) => {
              const showResult = config.immediate ? !!revealed[q.id] : finished;
              return (
                <div key={q.id} ref={(el) => { questionRefs.current[q.id] = el; }}>
                  <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
                    <span style={{ ...fontMono, color: C.gold }}>{qi + 1}.</span> {q.text}
                  </div>
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-sm mb-3" style={{ border: `1px solid ${C.rule}` }} />
                  )}
                  {q.type === 'open' ? (
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
                    <div className="space-y-2">
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
                </div>
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

function QuizView({ test, onExit }) {
  const [config, setConfig] = useState(null);
  if (!config) {
    return <QuizSetupPanel test={test} onExit={onExit} onStart={setConfig} />;
  }
  return <QuizPlayer test={test} config={config} onExit={onExit} onRestart={() => setConfig(null)} />;
}

/* ------------------------------------------------------------------ */
/*  Jonli test rejimi — endi ./LiveQuiz.jsx faylida (lazy-load)        */
/* ------------------------------------------------------------------ */

function TestsView({ tests, categories, updateTest, deleteTest, renameCategory, deleteCategory, onGoToCommunity, onReadingChange, isAdmin, session, initialOpenId, initialLiveCode, ensureTestContent }) {
  const [categoryId, setCategoryId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(!!initialLiveCode);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goTest = (id) => { if (ensureTestContent) ensureTestContent(id); setActiveId(id); pushNav(() => setActiveId(null)); };
  const goEdit = (id) => { if (ensureTestContent) ensureTestContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const goLive = () => { setLiveOpen(true); pushNav(() => setLiveOpen(false)); };
  const goTxtImport = () => onGoToCommunity('testlar', '', 'txt');
  const goMathTest = () => onGoToCommunity('testlar', '', 'math');

  const myId = session?.user?.id;
  const approvedCategories = categories.filter((c) => c.status !== 'pending');
  const approved = tests.filter((t) => t.status === 'approved');
  const viewable = isAdmin ? tests : tests.filter((t) => t.status === 'approved' || t.authorId === myId);
  const active = viewable.find((t) => t.id === activeId);
  const editing = approved.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = approved.filter((t) => t.categoryId === categoryId);
  const q = query.trim().toLowerCase();

  /* Ulashilgan havola orqali kirilgan bo'lsa (?test=ID), shu testni
     avtomatik ochamiz — faqat ilk yuklanganda, bitta marta. */
  useEffect(() => {
    if (initialOpenId && viewable.some((t) => t.id === initialOpenId)) goTest(initialOpenId);
    if (initialLiveCode) pushNav(() => setLiveOpen(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      return (
        <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      );
    }
    return <QuizView test={active} onExit={back} />;
  }

  if (liveOpen) return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin" style={{ color: C.gold }} />
      </div>
    }>
      <LiveQuizHub tests={viewable} session={session} onExit={back} initialCode={initialLiveCode} ensureTestContent={ensureTestContent} />
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
          <div className="flex items-center gap-2 text-sm mt-4" style={{ ...fontBody, color: C.inkSoft }}>
            <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
          </div>
        ) : (
          <EditTestForm test={editing} onSave={(data) => updateTest(editing.id, data, editing.title)} onDone={back} />
        )}
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <SectionHeading eyebrow={`${approvedCategories.filter((cat) => approved.some((t) => t.categoryId === cat.id)).length} ta soha`} title="Testlar" />
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
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={goTxtImport}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-[13px] focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.ink, background: 'transparent', border: `1px solid ${C.rule}`, outlineColor: C.gold }}
          >
            <FileText size={13} /> TXT fayldan
          </button>
          <button
            onClick={goMathTest}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-[13px] focus-visible:outline focus-visible:outline-2"
            style={{ ...fontBody, color: C.white, background: C.math, outlineColor: C.mathSoft, fontWeight: 500 }}
          >
            <Calculator size={13} /> Matematik test
          </button>
        </div>
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
      {inCategory.length === 0 ? (
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
                {isAdmin && (
                  <ItemMenu actions={[
                    { label: 'Tahrirlash', icon: Pencil, onClick: () => goEdit(t.id) },
                    { label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) },
                  ]} />
                )}
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

export function CommunityCoursesView({ courses, categories, openId, setOpenId, onBack, submitCourse, approveCourse, deleteCourse, formOpen, onOpenForm, onCloseForm, prefillCategory, mode = 'admin', ensureCourseContent }) {
  const [categoryId, setCategoryId] = useState(null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goOpen = (id) => { if (ensureCourseContent) ensureCourseContent(id); setOpenId(id); pushNav(() => setOpenId(null)); };
  const active = courses.find((c) => c.id === openId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = courses.filter((c) => c.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => courses.some((c) => c.categoryId === cat.id));
  const isMine = mode === 'mine';
  const backLabel = isMine ? 'Profil' : 'Admin panel';
  const heading = isMine ? 'Mening mavzularim' : 'Hamjamiyat — Kurslar';
  const countLabel = isMine ? `${courses.length} ta` : `${courses.length} ta kutilmoqda`;

  if (active) {
    return (
      <div>
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {heading}
        </button>
        {active.status === 'pending' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Clock3 size={13} /> Tekshirilmoqda
          </div>
        )}
        {active.status === 'private' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Lock size={13} /> Xususiy
          </div>
        )}
        <h3 className="text-2xl sm:text-3xl mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
        <AuthorLine authorId={active.authorId} authorName={active.author} className="text-xs mb-4" />
        {active.content === undefined ? (
          <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
            <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
          </div>
        ) : (
          <CourseBody content={active.content} videoUrl={active.videoUrl} />
        )}
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div>
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {backLabel}
        </button>
        <SectionHeading eyebrow={countLabel} title={heading} />
        {categoriesWithPending.length === 0 ? (
          <EmptyState text={isMine ? 'Hozircha mavzu qoʻshmagansiz.' : 'Hozircha foydalanuvchilar mavzu qoʻshmagan.'} cta="Quyidagi tugma orqali birinchi mavzuni qoʻshing." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {categoriesWithPending.map((cat, i) => {
              const count = courses.filter((c) => c.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                  style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                  onClick={() => goCategory(cat.id)}
                >
                  <div className="flex items-start min-w-0">
                    <EntryNumber n={i + 1} />
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                      <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}

        {formOpen ? (
          <AddCourseForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitCourse} onDone={back} onView={goOpen} />
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
        onClick={back}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> {heading} — barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta`} title={activeCategory ? activeCategory.name : 'Kurslar'} />
      <div className="grid sm:grid-cols-2 gap-4">
        {inCategory.map((c, i) => (
          <div
            key={c.id}
            className="min-w-0 group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{ background: C.surface, border: `1px solid ${C.rule}` }}
            onClick={() => goOpen(c.id)}
          >
            <div className="flex items-start min-w-0">
              <EntryNumber n={i + 1} />
              <div className="min-w-0">
                <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
                {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
                <AuthorLine authorId={c.authorId} authorName={c.author} className="text-xs mt-1.5" />
                {isMine && (
                  <div className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ ...fontMono, color: c.status === 'pending' ? C.gold : c.status === 'private' ? C.inkSoft : C.accent }}>
                    {c.status === 'pending' ? <><Clock3 size={12} /> Tekshirilmoqda</> : c.status === 'private' ? <><Lock size={12} /> Xususiy</> : <><CheckCircle2 size={12} /> Tasdiqlangan</>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center flex-shrink-0 gap-1">
              <ItemMenu actions={[
                ...(approveCourse && c.status === 'pending' ? [{ label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveCourse(c.id, c.title) }] : []),
                ...(!isMine || c.status === 'pending' || c.status === 'private' ? [{ label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCourse(c.id, c.title) }] : []),
              ]} />
            </div>
          </div>
        ))}
      </div>

      {formOpen ? (
        <AddCourseForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitCourse} onDone={back} onView={goOpen} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}

export function CommunityTestsView({ tests, categories, openId, setOpenId, onBack, submitTest, approveTest, deleteTest, formOpen, onOpenForm, onCloseForm, prefillCategory, mode = 'admin', formMode, ensureTestContent }) {
  const [categoryId, setCategoryId] = useState(null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goOpen = (id) => { if (ensureTestContent) ensureTestContent(id); setOpenId(id); pushNav(() => setOpenId(null)); };
  const active = tests.find((t) => t.id === openId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = tests.filter((t) => t.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => tests.some((t) => t.categoryId === cat.id));
  const isMine = mode === 'mine';
  const backLabel = isMine ? 'Profil' : 'Admin panel';
  const heading = isMine ? 'Mening testlarim' : 'Hamjamiyat — Testlar';
  const countLabel = isMine ? `${tests.length} ta` : `${tests.length} ta kutilmoqda`;

  if (active) {
    if (active.questions === undefined) {
      return (
        <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      );
    }
    return <QuizView test={active} onExit={back} />;
  }

  if (!categoryId) {
    return (
      <div>
        <button
          onClick={back}
          className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
          style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
        >
          <ArrowLeft size={15} /> {backLabel}
        </button>
        <SectionHeading eyebrow={countLabel} title={heading} />
        {categoriesWithPending.length === 0 ? (
          <EmptyState text={isMine ? 'Hozircha test qoʻshmagansiz.' : 'Hozircha foydalanuvchilar test qoʻshmagan.'} cta="Quyidagi tugma orqali birinchi testni qoʻshing." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {categoriesWithPending.map((cat, i) => {
              const count = tests.filter((t) => t.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5"
                  style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                  onClick={() => goCategory(cat.id)}
                >
                  <div className="flex items-start min-w-0">
                    <EntryNumber n={i + 1} />
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                      <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta</div>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}

        {formOpen ? (
          <AddTestForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitTest} onDone={back} onView={goOpen} formMode={formMode} />
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
        onClick={back}
        className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}
      >
        <ArrowLeft size={15} /> {heading} — barcha sohalar
      </button>
      <SectionHeading eyebrow={`${inCategory.length} ta`} title={activeCategory ? activeCategory.name : 'Testlar'} />
      <div className="grid sm:grid-cols-2 gap-4">
        {inCategory.map((t, i) => (
          <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <div className="flex items-start min-w-0">
              <EntryNumber n={i + 1} />
              <div className="min-w-0">
                <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
                {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
                <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questionCount ?? t.questions?.length ?? 0} ta savol</div>
                <AuthorLine authorId={t.authorId} authorName={t.author} className="text-xs mt-1.5" />
                {isMine && (
                  <div className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ ...fontMono, color: t.status === 'pending' ? C.gold : t.status === 'private' ? C.inkSoft : C.accent }}>
                    {t.status === 'pending' ? <><Clock3 size={12} /> Tekshirilmoqda</> : t.status === 'private' ? <><Lock size={12} /> Xususiy</> : <><CheckCircle2 size={12} /> Tasdiqlangan</>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <ItemMenu actions={[
                ...(approveTest && t.status === 'pending' ? [{ label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveTest(t.id, t.title) }] : []),
                ...(!isMine || t.status === 'pending' || t.status === 'private' ? [{ label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) }] : []),
              ]} />
              <button
                onClick={() => goOpen(t.id)}
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
        <AddTestForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitTest} onDone={back} onView={goOpen} formMode={formMode} />
      ) : (
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi test qoʻshish</GhostButton>
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Profil — login (Google), roʻyxatdan oʻtish, "Mening kurslarim"      */
/* ------------------------------------------------------------------ */

function BannerPicker({ value, onChange }) {
  return (
    <div className="mb-4 text-left">
      <label className="block text-xs mb-2" style={{ ...fontMono, color: C.inkSoft }}>Banner rangi</label>
      <div className="flex gap-2">
        {Object.entries(BANNER_PRESETS).map(([key, b]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={b.label}
            className="w-9 h-9 rounded-full flex-shrink-0 transition-transform"
            style={{
              background: bannerGradient(key),
              border: value === key ? `2px solid ${C.gold}` : `2px solid transparent`,
              outline: value === key ? `1px solid ${C.gold}` : 'none',
              outlineOffset: '2px',
              transform: value === key ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function UsernameField({ value, onChange, currentUserId, locked, lockedDaysLeft }) {
  const [status, setStatus] = useState('idle'); // idle | checking | ok | taken | invalid | reserved
  const timerRef = useRef(null);

  useEffect(() => {
    if (locked) return;
    if (!value) { setStatus('idle'); return; }
    if (!isValidUsername(value)) { setStatus('invalid'); return; }
    if (isReservedUsername(value)) { setStatus('reserved'); return; }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(value, currentUserId);
        setStatus(available ? 'ok' : 'taken');
      } catch (e) {
        setStatus('idle');
      }
    }, 450);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locked]);

  const helper = locked
    ? `Username'ni ${lockedDaysLeft} kundan keyin qayta o'zgartira olasiz`
    : {
        idle: 'Kamida 5 ta belgi: kichik lotin harflari, raqam, pastki chiziq (_)',
        invalid: 'Notoʻgʻri format — faqat a-z, 0-9 va _ (5-20 belgi)',
        checking: 'Tekshirilmoqda...',
        ok: 'Bu username boʻsh ✓',
        taken: 'Bu username band, boshqasini tanlang',
        reserved: 'Bu nom band (rasmiy nom sifatida saqlangan)',
      }[status];
  const helperColor = locked ? C.inkSoft : status === 'ok' ? C.gold : (status === 'taken' || status === 'invalid' || status === 'reserved') ? C.red : C.inkSoft;

  return (
    <div className="mb-1 text-left">
      <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Username</label>
      <div className="flex items-center rounded-sm overflow-hidden" style={{ border: `1px solid ${C.rule}`, background: locked ? C.paper : C.paperSoft, opacity: locked ? 0.7 : 1 }}>
        <span className="pl-3 pr-1 text-[15px]" style={{ ...fontBody, color: C.inkSoft }}>@</span>
        <input
          value={value}
          onChange={(e) => onChange(normalizeUsername(e.target.value))}
          placeholder="username"
          disabled={locked}
          className="flex-1 py-2.5 pr-3 text-[15px] bg-transparent outline-none"
          style={{ ...fontBody, color: C.ink }}
        />
        {locked && <Lock size={14} style={{ color: C.inkSoft, marginRight: 10, flexShrink: 0 }} />}
      </div>
      <div className="text-xs mt-1 mb-4" style={{ ...fontMono, color: helperColor }}>{helper}</div>
    </div>
  );
}

function ProfileSetupForm({ defaultFirstName, defaultLastName, defaultBio, defaultBannerKey, currentUserId, onSave }) {
  const [firstName, setFirstName] = useState(defaultFirstName || '');
  const [lastName, setLastName] = useState(defaultLastName || '');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [bio, setBio] = useState(defaultBio || '');
  const [bannerKey, setBannerKey] = useState(defaultBannerKey || 'green');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  /* Instagram uslubida: ism (va familiya, bo'lsa) o'zgargan sayin, agar
     foydalanuvchi username'ni o'zi qo'lda tahrirlamagan bo'lsa, avtomatik
     bo'sh nom taklif qilib beriladi. */
  useEffect(() => {
    if (usernameTouched) return;
    if (!firstName.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const suggested = await suggestAvailableUsername(firstName.trim(), lastName.trim(), currentUserId);
      if (!cancelled && !usernameTouched) setUsername(suggested);
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, usernameTouched]);

  const canSubmit = firstName.trim() && isValidUsername(username);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setFormError(null);
    const res = await onSave(firstName.trim(), lastName.trim(), username, bio.trim(), bannerKey);
    setBusy(false);
    if (res && res.ok === false) setFormError(res.error);
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <UserCircle2 size={28} style={{ color: C.gold }} className="mx-auto mb-2" />
      <div className="text-lg mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Profilni tugating</div>
      <div className="text-left">
        <TextField label="Ism" value={firstName} onChange={setFirstName} placeholder="Ismingiz" />
        <TextField label="Familiya (ixtiyoriy)" value={lastName} onChange={setLastName} placeholder="Familiyangiz" />
        <UsernameField value={username} onChange={(v) => { setUsernameTouched(true); setUsername(v); }} currentUserId={currentUserId} />
        <TextField label="Bio (ixtiyoriy)" value={bio} onChange={setBio} placeholder="O'zingiz haqingizda qisqacha..." textarea rows={2} />
        <BannerPicker value={bannerKey} onChange={setBannerKey} />
      </div>
      {formError && (
        <div className="text-xs mb-3 text-left" style={{ ...fontBody, color: C.red }}>{formError}</div>
      )}
      <SolidButton onClick={submit} icon={Check} disabled={busy || !canSubmit}>
        {busy ? 'Saqlanmoqda...' : 'Davom etish'}
      </SolidButton>
    </div>
  );
}

function ProfileSettingsPanel({ profile, currentUserId, onSave, onSignOut, onClose }) {
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [bannerKey, setBannerKey] = useState(profile.bannerKey || 'green');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const daysLeft = usernameChangeDaysLeft(profile.usernameChangedAt);
  const usernameLocked = daysLeft > 0 && username !== profile.username;
  const canSubmit = firstName.trim() && (username === profile.username ? true : isValidUsername(username)) && !usernameLocked;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setFormError(null);
    const res = await onSave(firstName.trim(), lastName.trim(), username, bio.trim(), bannerKey);
    setBusy(false);
    if (res && res.ok === false) setFormError(res.error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-sm p-6 my-8"
        style={{ background: C.surface, border: `1px solid ${C.rule}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: C.gold }} />
            <span className="text-base" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Sozlamalar</span>
          </div>
          <button onClick={onClose} aria-label="Yopish" style={{ color: C.inkSoft }}><X size={18} /></button>
        </div>

        <div className="text-left">
          <TextField label="Ism" value={firstName} onChange={setFirstName} placeholder="Ismingiz" />
          <TextField label="Familiya (ixtiyoriy)" value={lastName} onChange={setLastName} placeholder="Familiyangiz" />
          <UsernameField
            value={username}
            onChange={setUsername}
            currentUserId={currentUserId}
            locked={daysLeft > 0}
            lockedDaysLeft={daysLeft}
          />
          <TextField label="Bio" value={bio} onChange={setBio} placeholder="O'zingiz haqingizda qisqacha..." textarea rows={2} />
          <BannerPicker value={bannerKey} onChange={setBannerKey} />
        </div>
        {formError && (
          <div className="text-xs mb-3 text-left" style={{ ...fontBody, color: C.red }}>{formError}</div>
        )}
        <SolidButton onClick={submit} icon={Check} disabled={busy || !canSubmit}>
          {busy ? 'Saqlanmoqda...' : 'Saqlash'}
        </SolidButton>

        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.rule}` }}>
          {!confirmSignOut ? (
            <button
              onClick={() => setConfirmSignOut(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-sm"
              style={{ ...fontBody, color: C.red, border: `1px solid ${C.red}` }}
            >
              <LogOut size={14} /> Hisobdan chiqish
            </button>
          ) : (
            <div className="text-center">
              <p className="text-xs mb-2" style={{ ...fontBody, color: C.inkSoft }}>Hisobdan chiqishni tasdiqlaysizmi?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 text-[13px] px-3 py-2 rounded-sm"
                  style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}` }}
                >
                  Bekor qilish
                </button>
                <button
                  onClick={onSignOut}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-sm"
                  style={{ ...fontBody, color: C.white, background: C.red }}
                >
                  <LogOut size={14} /> Ha, chiqish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ session, profile, authLoading, onSaveProfile, onSignOut, courses, tests, categories, submitCourse, approveCourse, deleteCourse, submitTest, approveTest, deleteTest, target, onConsumeTarget, isAdmin, ensureCourseContent, ensureTestContent, onGoToAbout }) {
  const [subTab, setSubTab] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState('');
  const [testFormMode, setTestFormMode] = useState(null);
  const myBadge = useAuthorBadge(session?.user?.id);
  const { pushNav } = useContext(NavContext);
  const goSubTab = (id) => { setSubTab(id); pushNav(() => setSubTab(null)); };

  useEffect(() => {
    if (target) {
      setSubTab(target.type);
      pushNav(() => setSubTab(null));
      if (target.action === 'add') {
        setOpenCourseId(null);
        setOpenTestId(null);
        setPrefillCategory(target.prefillCategory || '');
        setTestFormMode(target.formMode || null);
        if (target.type === 'kurslar') { setCourseFormOpen(true); pushNav(() => setCourseFormOpen(false)); }
        if (target.type === 'testlar') { setTestFormOpen(true); pushNav(() => setTestFormOpen(false)); }
      } else {
        if (target.type === 'kurslar') { setOpenCourseId(target.id); pushNav(() => setOpenCourseId(null)); }
        if (target.type === 'testlar') { setOpenTestId(target.id); pushNav(() => setOpenTestId(null)); }
      }
      onConsumeTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin" style={{ color: C.gold }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-sm mx-auto mt-10 p-6 rounded-sm text-center" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <UserCircle2 size={28} style={{ color: C.gold }} className="mx-auto mb-2" />
        <div className="text-lg mb-2" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Profil</div>
        <p className="text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}>
          Oʻz kursingizni yaratish, testlar tuzish va ularni kuzatib borish uchun hisob yarating. Kurslarni oʻrganish va testlarni ishlash uchun ro'yxatdan o'tish shart emas.
        </p>
        <SolidButton onClick={signInWithGoogle} icon={LogIn}>Google orqali kirish</SolidButton>
        <div className="mt-6 text-xs" style={{ ...fontBody, color: C.inkSoft }}>
          UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()} ·{' '}
          <button onClick={onGoToAbout} className="underline underline-offset-2">Biz haqimizda</button>
        </div>
      </div>
    );
  }

  if (!profile || !profile.username) {
    const meta = session.user?.user_metadata || {};
    const guessFirst = profile?.firstName || (meta.given_name || (meta.full_name || meta.name || '').split(' ')[0] || '');
    const guessLast = profile?.lastName || (meta.family_name || (meta.full_name || meta.name || '').split(' ').slice(1).join(' ') || '');
    return (
      <ProfileSetupForm
        defaultFirstName={guessFirst}
        defaultLastName={guessLast}
        defaultBio={profile?.bio || ''}
        defaultBannerKey={profile?.bannerKey || 'green'}
        currentUserId={session.user.id}
        onSave={onSaveProfile}
      />
    );
  }


  const myCourses = courses.filter((c) => c.authorId === session.user.id);
  const myTests = tests.filter((t) => t.authorId === session.user.id);

  if (subTab === 'kurslar') {
    return (
      <CommunityCoursesView
        mode="mine"
        courses={myCourses}
        categories={categories}
        openId={openCourseId}
        setOpenId={setOpenCourseId}
        onBack={() => setSubTab(null)}
        submitCourse={submitCourse}
        approveCourse={null}
        deleteCourse={deleteCourse}
        formOpen={courseFormOpen}
        onOpenForm={() => { setPrefillCategory(''); setCourseFormOpen(true); pushNav(() => setCourseFormOpen(false)); }}
        onCloseForm={() => setCourseFormOpen(false)}
        prefillCategory={prefillCategory}
        ensureCourseContent={ensureCourseContent}
      />
    );
  }
  if (subTab === 'testlar') {
    return (
      <CommunityTestsView
        mode="mine"
        tests={myTests}
        categories={categories}
        openId={openTestId}
        setOpenId={setOpenTestId}
        onBack={() => setSubTab(null)}
        submitTest={submitTest}
        approveTest={null}
        deleteTest={deleteTest}
        formOpen={testFormOpen}
        onOpenForm={() => { setPrefillCategory(''); setTestFormMode(null); setTestFormOpen(true); pushNav(() => setTestFormOpen(false)); }}
        onCloseForm={() => setTestFormOpen(false)}
        prefillCategory={prefillCategory}
        formMode={testFormMode}
        ensureTestContent={ensureTestContent}
      />
    );
  }

  if (subTab === 'kolleksiya') {
    return <CollectionsView session={session} onBack={() => setSubTab(null)} />;
  }

  return (
    <div>
      <div className="rounded-sm overflow-hidden mb-6" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <div className="h-28 sm:h-32" style={{ background: bannerGradient(profile.bannerKey) }} />
        <div className="px-5 pb-5 -mt-12 relative">
          <div className="flex items-end justify-between gap-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: C.surface, border: `3px solid ${C.surface}`, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: bannerGradient(profile.bannerKey) }}>
                <span className="text-xl" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>
                  {(profile.firstName[0] || '').toUpperCase()}{(profile.lastName[0] || '').toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Sozlamalar"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 mb-1"
              style={{ color: C.inkSoft, border: `1px solid ${C.rule}`, background: C.surface }}
            >
              <Settings size={16} />
            </button>
          </div>

          {settingsOpen && (
            <ProfileSettingsPanel
              profile={profile}
              currentUserId={session.user.id}
              onSave={onSaveProfile}
              onSignOut={onSignOut}
              onClose={() => setSettingsOpen(false)}
            />
          )}

          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-lg" style={{ ...fontDisplay, color: C.ink, fontWeight: 700 }}>{`${profile.firstName} ${profile.lastName}`.trim()}</span>
              {myBadge && <CollectibleThumb collectibleId={myBadge} size={20} />}
              {isAdmin && (
                <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}><ShieldCheck size={11} /> Admin</span>
              )}
            </div>
            {profile.username && (
              <div className="flex items-center gap-2">
                <div className="text-[13px]" style={{ ...fontMono, color: C.gold }}>@{profile.username}</div>
                <ShareButton url={buildShareUrl({ u: profile.username })} title={`${profile.firstName} ${profile.lastName}`.trim()} small />
              </div>
            )}
            {profile.bio && (
              <p className="text-[14px] mt-2 max-w-md" style={{ ...fontBody, color: C.inkSoft }}>{profile.bio}</p>
            )}
          </div>

          <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${C.rule}` }}>
            <div>
              <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{myCourses.length}</div>
              <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Mavzular</div>
            </div>
            <div>
              <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{myTests.length}</div>
              <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Testlar</div>
            </div>
            <div title="Tez orada">
              <div className="text-base font-medium" style={{ ...fontMono, color: C.rule }}>—</div>
              <div className="text-xs" style={{ ...fontBody, color: C.rule }}>Followers</div>
            </div>
            <div title="Tez orada">
              <div className="text-base font-medium" style={{ ...fontMono, color: C.rule }}>—</div>
              <div className="text-xs" style={{ ...fontBody, color: C.rule }}>Following</div>
            </div>
          </div>
        </div>
      </div>

      <SectionHeading eyebrow="Mening hisobim" title="Mening kurs va testlarim" />
      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={() => goSubTab('kurslar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <BookOpen size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Mening mavzularim</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{myCourses.length} ta</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('testlar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <ListChecks size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Mening testlarim</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>{myTests.length} ta</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
        <button onClick={() => goSubTab('kolleksiya')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Award size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Kolleksiyalar</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>Bayram sovgʻalaringiz</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
      </div>

      <div className="mt-8 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>
        UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()} ·{' '}
        <button onClick={onGoToAbout} className="underline underline-offset-2">Biz haqimizda</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Yangiliklar (News)                                                  */
/* ------------------------------------------------------------------ */

export function AddNewsForm({ onAdd, onDone }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    const ok = await onAdd({ title: title.trim(), content: content.trim(), date: new Date().toISOString().slice(0, 10) });
    if (ok) onDone();
  }

  return (
    <div className="mb-6 p-5 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <TextField label="Sarlavha" value={title} onChange={setTitle} placeholder="Yangilik sarlavhasi" />
      <TextField label="Matn" value={content} onChange={setContent} placeholder="Yangilik matni..." textarea rows={5} />
      <div className="flex gap-3">
        <SolidButton onClick={submit} icon={Check}>Yangilikni eʼlon qilish</SolidButton>
        <GhostButton onClick={onDone} icon={X}>Bekor qilish</GhostButton>
      </div>
    </div>
  );
}

function NewsView({ news }) {
  const sorted = [...news].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      <SectionHeading eyebrow={`${news.length} ta yangilik`} title="Yangiliklar" />

      {sorted.length === 0 ? (
        <EmptyState text="Hozircha yangilik yoʻq." />
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sorted.map((n) => (
            <div key={n.id} className="p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="min-w-0">
                <div className="text-xs mb-1" style={{ ...fontMono, color: C.gold }}>{formatDate(n.date)}</div>
                <div className="font-medium text-base mb-1" style={{ ...fontBody, color: C.ink }}>{n.title}</div>
                <p className="text-[15px] leading-6" style={{ ...fontBody, color: C.inkSoft }}>{n.content}</p>
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

/* ------------------------------------------------------------------ */
/*  App shell                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Telefon/brauzerning "orqaga" tugmasi saytning ichki "Ortga"          */
/*  tugmalari bilan bir xil ishlashi uchun: har safar chuqurroq          */
/*  bo'limga o'tilganda (mavzu ochilganda, kategoriya tanlanganda va     */
/*  hokazo) tarixga bitta "belgi" qo'shiladi. Qurilma orqaga tugmasi     */
/*  bosilganda o'sha belgi "yechiladi" va aynan shu joyning ichki        */
/*  "ortga" funksiyasi chaqiriladi — sahifadan yoki hisobdan chiqib      */
/*  ketish o'rniga.                                                      */
export const NavContext = React.createContext({ pushNav: () => {}, back: () => {} });

function useNavStack() {
  const stackRef = useRef([]);

  useEffect(() => {
    function onPopState() {
      const undo = stackRef.current.pop();
      if (undo) undo();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const pushNav = useCallback((undoFn) => {
    stackRef.current.push(undoFn);
    try { window.history.pushState({ upcourseNav: true }, ''); } catch {}
  }, []);

  const back = useCallback(() => {
    if (stackRef.current.length > 0) {
      window.history.back();
    }
  }, []);

  return { pushNav, back };
}

/* ------------------------------------------------------------------ */

/* Asosiy navigatsiya — mobil pastki panel va desktop yon panelda ishlatiladi.
   "Kurs yaratish" markaziy tugmasi alohida, TABS ichida emas.
   "Biz haqimizda" va "Admin panel" ushbu asosiy 4 ta band ichiga kirmaydi —
   ular sarlavha/footer orqali ochiladi (pastga qarang). */
const TABS = [
  { id: 'kurslar', label: 'Bosh sahifa', icon: Home },
  { id: 'testlar', label: 'Testlar', icon: ListChecks },
  { id: 'yangiliklar', label: 'Yangiliklar', icon: Newspaper },
  { id: 'profil', label: 'Profil', icon: UserCircle2 },
];
const ABOUT_TAB = { id: 'about', label: 'Biz haqimizda', icon: Info };
const ADMIN_TAB = { id: 'admin', label: 'Admin panel', icon: ShieldCheck };
const ALL_TABS_META = [...TABS, ABOUT_TAB, ADMIN_TAB];
function getTabMeta(id) {
  return ALL_TABS_META.find((t) => t.id === id) || TABS[0];
}

export default function App() {
  /* Havola orqali kirilgan bo'lsa (?course=/?test=/?live=/?u=), qaysi
     bo'limdan boshlash kerakligini shu yerda hal qilamiz — faqat
     sahifa birinchi ochilgan paytdagi URL'ga qarab, bitta marta. */
  const initialDeepLinkRef = useRef(parseDeepLink());
  const initialDeepLink = initialDeepLinkRef.current;
  const initialTab = (() => {
    if (!initialDeepLink) return 'kurslar';
    if (initialDeepLink.type === 'course') return 'kurslar';
    if (initialDeepLink.type === 'test' || initialDeepLink.type === 'live') return 'testlar';
    if (initialDeepLink.type === 'profile') return 'profil';
    return 'kurslar';
  })();

  const [tab, setTab] = useState(initialTab);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [communityTarget, setCommunityTarget] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('upcourse-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [readingActive, setReadingActive] = useState(false);
  const [viewingUsername, setViewingUsername] = useState(null);
  const [giftOpen, setGiftOpen] = useState(false);
  /* Kontent so'rovini (loadAppData) kirish holatidan mustaqil, tezroq
     ishga tushirish uchun ikkita "faqat bir marta" bayrog'i — pastdagi
     ikkita alohida useEffect shularga tayanadi (LCP tezlashtirish). */
  const initialFetchRef = useRef(false);
  const authAwareRefetchRef = useRef(false);

  useEffect(() => {
    _goToPublicProfile = (username) => setViewingUsername(username);
    return () => { _goToPublicProfile = null; };
  }, []);

  const isAdmin = !!profile?.isAdmin;
  const nav = useNavStack();

  Object.assign(C, theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE);

  useEffect(() => {
    try { localStorage.setItem('upcourse-theme', theme); } catch {}
  }, [theme]);

  /* Google orqali kirish holatini kuzatish + profil qatorini yuklash.
     Eslatma: avval bu yerda ikkita mustaqil manba bor edi — getSession()
     va onAuthStateChange — ular deyarli bir vaqtda ishga tushib,
     "isAdmin" qiymati ikki bosqichda (avval false, keyin true) o'zgarib
     ketardi. Bosh ma'lumot yuklovchisi shu o'zgarishga qarab ishlaydi
     (pastda), shuning uchun categories/courses/tests/news IKKI MARTA
     so'ralib ketardi. Endi faqat BITTA manba — onAuthStateChange —
     ishlatiladi (u o'zi ulanganda joriy sessiyani ham avtomatik beradi),
     shu bilan poyga (race) yo'qoladi. */
  useEffect(() => {
    let cancelled = false;
    let lastLoadedUid = null;
    async function loadProfile(uid) {
      if (uid === lastLoadedUid) return;
      lastLoadedUid = uid;
      try {
        const rows = await sbSelect('profiles', `id=eq.${uid}`);
        if (!cancelled) setProfile(rows[0] ? profileFromRow(rows[0]) : null);
      } catch (e) {
        if (!cancelled) setProfile(null);
        lastLoadedUid = null; // xatolik bo'lsa keyinroq qayta urinib ko'rish imkoni qolsin
      }
    }
    async function applySession(newSession) {
      if (cancelled) return;
      setSession(newSession || null);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        lastLoadedUid = null;
      }
      if (!cancelled) setAuthLoading(false);
    }
    // Google orqali kirishdan qaytgach, URL'dagi token qoldig'ini tozalab,
    // tarixni "toza" holatga keltiramiz — orqaga tugmasi Google sahifasiga
    // emas, saytning o'zida ishlashi uchun.
    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
      try { window.history.replaceState({}, '', window.location.pathname); } catch {}
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setCachedAccessToken(newSession?.access_token);
      applySession(newSession);
    });
    // Telefon brauzerlari sahifani "bfcache"dan tiklaganda (masalan orqaga
    // tugmasi bosilganda) React holati eskirgan bo'lishi mumkin — shu payt
    // login holatini qayta tekshiramiz.
    function onPageShow(e) {
      if (e.persisted) supabase.auth.getSession().then(({ data }) => {
        setCachedAccessToken(data.session?.access_token);
        applySession(data.session || null);
      });
    }
    window.addEventListener('pageshow', onPageShow);
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); window.removeEventListener('pageshow', onPageShow); };
  }, []);

  async function saveProfile(firstName, lastName, username, bio, bannerKey) {
    if (!session) return { ok: false, error: 'Sessiya topilmadi.' };
    if (!isValidUsername(username)) {
      return { ok: false, error: 'Username 5-20 belgidan iborat bo\u2018lishi, faqat kichik lotin harflari, raqam va pastki chiziqdan tashkil topishi kerak.' };
    }
    const usernameChanged = !profile || profile.username !== username;
    if (usernameChanged && profile) {
      const daysLeft = usernameChangeDaysLeft(profile.usernameChangedAt);
      if (daysLeft > 0) {
        return { ok: false, error: `Username'ni ${daysLeft} kundan keyin qayta o'zgartira olasiz.` };
      }
    }
    if (usernameChanged) {
      try {
        const available = await checkUsernameAvailable(username, session.user.id);
        if (!available) return { ok: false, error: 'Bu username band. Boshqasini tanlang.' };
      } catch (e) {
        return { ok: false, error: 'Username tekshirishda xatolik yuz berdi. Internetni tekshiring.' };
      }
    }
    const row = {
      id: session.user.id,
      first_name: firstName,
      last_name: lastName || '',
      email: session.user.email || '',
      username,
      bio: bio || '',
      banner_key: bannerKey || 'green',
      ...(usernameChanged ? { username_changed_at: new Date().toISOString() } : {}),
    };
    try {
      await sbUpsert('profiles', row);
      setProfile((prev) => profileFromRow({ ...(prev ? { username_changed_at: prev.usernameChangedAt } : {}), ...row }));
      return { ok: true };
    } catch (e) {
      setActionError('Profilni saqlashda xatolik yuz berdi.');
      return { ok: false, error: 'Profilni saqlashda xatolik yuz berdi.' };
    }
  }

  async function handleSignOut() {
    await sbSignOut();
    setSession(null);
    setProfile(null);
    setTab('kurslar');
  }

  function goToCommunity(kind, prefillCategory, formMode) { setTab('profil'); setCommunityTarget({ type: kind, action: 'add', prefillCategory: prefillCategory || '', formMode: formMode || null }); }

  const handleReadingChange = useCallback((v) => setReadingActive(v), []);

  /* Mavzu ro'yxati boshida faqat sarlavha/qisqacha ta'rif yuklanadi (tez).
     Dars matni (content) og'ir bo'lgani uchun faqat shu mavzu ochilganda
     yoki tahrirlash uchun kerak bo'lganda alohida so'raladi. */
  const ensureCourseContent = useCallback(async (id) => {
    try {
      const rows = await sbRequest(`courses?select=content,video_url&id=eq.${encodeURIComponent(id)}`);
      if (rows[0]) {
        setCourses((prev) => prev.map((c) => (c.id === id && c.content === undefined
          ? { ...c, content: rows[0].content, videoUrl: rows[0].video_url || c.videoUrl || '' }
          : c)));
      }
    } catch (e) {
      // Jim tarzda o'tkazib yuborish — mavzu ochilganda "Yuklanmoqda..." holatida qoladi,
      // foydalanuvchi qayta urinib ko'rishi mumkin.
    }
  }, []);

  /* Testlar ro'yxati boshida faqat sarlavha/soha/muallif kabi yengil
     ma'lumot yuklanadi (tez). Savollar (questions) og'ir bo'lgani uchun
     faqat aynan shu test ochilganda (yechish, tahrirlash, jonli test
     uchun tanlashda) alohida so'raladi — courses uchun ishlatilgan
     naqshning aynan o'zi. */
  const ensureTestContent = useCallback(async (id) => {
    const existing = tests.find((t) => t.id === id);
    if (existing && existing.questions !== undefined) return existing.questions;
    try {
      if (existing) {
        // Test ro'yxatda bor, faqat savollari hali yuklanmagan —
        // faqat shu maydonni so'raymiz (yengil so'rov).
        const rows = await sbRequest(`tests?select=id,questions&id=eq.${encodeURIComponent(id)}`);
        if (rows[0]) {
          setTests((prev) => prev.map((t) => (t.id === id ? { ...t, questions: rows[0].questions } : t)));
          return rows[0].questions;
        }
      } else {
        // Test ro'yxatda UMUMAN yo'q (masalan "Jonli test"ga xona kodi
        // orqali qo'shilgan ishtirokchida hali to'liq ro'yxat ulgurmagan
        // bo'lishi mumkin) — to'liq qatorni so'rab, ro'yxatga YANGI
        // element sifatida qo'shamiz (avvalgi .map() bu holatda hech
        // narsa qilmasdi, chunki mos keladigan element yo'q edi).
        const rows = await sbRequest(`tests?select=*&id=eq.${encodeURIComponent(id)}`);
        if (rows[0]) {
          const full = testFromRow(rows[0]);
          setTests((prev) => (prev.some((t) => t.id === id) ? prev.map((t) => (t.id === id ? full : t)) : [...prev, full]));
          return full.questions;
        }
      }
    } catch (e) {
      // Jim tarzda o'tkazib yuborish — keyingi urinishda qayta so'raladi.
    }
    return existing?.questions;
  }, [tests]);

  const loadAppData = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError('Supabase ulanish maʼlumotlari hali kiritilmagan. Kod faylining yuqori qismidagi SUPABASE_URL va SUPABASE_ANON_KEY qatorlarini toʻldiring.');
      if (!silent) setLoading(false);
      return;
    }
    try {
      const myId = session?.user?.id;
      const vis = visibilityFilter(myId, isAdmin);
      const visQ = vis ? `&${vis}` : '';
      const courseListCols = 'id,category_id,title,summary,video_url,author,author_id,status,created_at';
      const testListCols = 'id,category_id,title,description,author,author_id,status,created_at,question_count';
      const [catRows, courseRows, testRows, newsRows] = await Promise.all([
        sbSelect('categories', vis),
        sbRequest(`courses?select=${courseListCols}&order=created_at.asc${visQ}`),
        sbRequest(`tests?select=${testListCols}&order=created_at.asc${visQ}`), sbSelect('news'),
      ]);

      setCategories(catRows.map(categoryFromRow));
      setCourses(courseRows.map(courseFromRow));
      setTests(testRows.map(testFromRow));
      setNews(newsRows.map(newsFromRow));
    } catch (e) {
      // Ko'pincha bu vaqtinchalik tarmoq uzilishi bo'ladi (qayta urinilsa
      // odatda ishlab ketadi) — shuning uchun foydalanuvchiga texnik
      // tafsilotlar emas, sodda va tinch xabar ko'rsatamiz.
      // "Jim" (silent) qayta yuklashda esa ekranda allaqachon ma'lumot
      // turibdi — shu xabarni ko'rsatib, uni bekorga "yuklab bo'lmadi"
      // holatiga o'tkazib yubormaymiz, faqat konsolga yozib qo'yamiz.
      if (!silent) setError('Ma\u02bblumotlarni yuklab bo\u02bblmadi. Internetni tekshirib, qayta urinib ko\u02bbring.');
      else console.error('Fon rejimida qayta yuklashda xatolik:', e);
    }
    if (!silent) setLoading(false);
  }, [isAdmin, session?.user?.id]);

  /* 1) Kontentni (kurslar/testlar/kategoriyalar) DARHOL, kirish holatini
     kutmasdan so'raymiz — sahifa ochilgan zahoti, bir marta. Bu payt
     session/isAdmin hali aniqlanmagan bo'lishi mumkin, lekin bu muammo
     emas: visibilityFilter bo'sh/false qiymatlar bilan chaqirilganda
     avtomatik "faqat ommaviy (approved) kontent" so'raydi — bu
     aksariyat (login qilmagan yoki oddiy) foydalanuvchi uchun to'g'ri
     va yetarli. Shu tufayli LCP (birinchi mazmunli chizilish) endi
     autentifikatsiya zanjirini kutib turmaydi. */
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    loadAppData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2) Kirish holati keyinroq aniqlanganda — FAQAT agar foydalanuvchi
     haqiqatan tizimga kirgan yoki administrator bo'lsa, bitta qo'shimcha,
     FON REJIMIDAGI (jim, spinner qaytarmaydigan) qayta yuklashni
     bajaramiz — chunki faqat shu holatlarda ko'rinadigan qatorlar
     to'plami birinchi (ommaviy) so'rovdan farq qilishi mumkin (masalan
     o'zining tasdiqlanmagan kontenti, yoki administratorning hammasini
     ko'rish huquqi). Login qilmagan foydalanuvchi uchun natija baribir
     bir xil bo'lgani sababli — bu holatda qo'shimcha so'rov yuborilmaydi.
     Bu effekt ham faqat bir marta ishlaydi (authAwareRefetchRef). */
  useEffect(() => {
    if (authLoading) return;
    if (authAwareRefetchRef.current) return;
    authAwareRefetchRef.current = true;
    if (session?.user?.id || isAdmin) {
      loadAppData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, isAdmin]);

  /* Ulashilgan havola orqali kirilganda (?course=ID yoki ?test=ID),
     lekin o'sha narsa "xususiy" bo'lgani uchun oddiy ro'yxatga
     yuklanmagan bo'lsa — shu bitta elementni alohida, ID boʻyicha soʻrab
     olamiz. Faqat "xususiy" yoki "tasdiqlangan" holatdagilar shu yoʻl
     bilan koʻrsatiladi — hali tasdiqlanmagan (pending) begona kontent
     bu orqali chetlab oʻtilmaydi. Faqat havola bilan kirganda ishga
     tushadi — umumiy yuklanish tezligiga taʼsir qilmaydi. */
  useEffect(() => {
    if (loading || authLoading || !initialDeepLink) return;
    let cancelled = false;
    (async () => {
      try {
        if (initialDeepLink.type === 'course') {
          const rows = await sbSelect('courses', `id=eq.${initialDeepLink.value}`);
          const row = rows[0];
          if (!cancelled && row && (row.status === 'private' || row.status === 'approved')) {
            setCourses((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, courseFromRow(row)]));
          }
        } else if (initialDeepLink.type === 'test') {
          const rows = await sbSelect('tests', `id=eq.${initialDeepLink.value}`);
          const row = rows[0];
          if (!cancelled && row && (row.status === 'private' || row.status === 'approved')) {
            setTests((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, testFromRow(row)]));
          }
        }
      } catch (e) {
        // Havola noto'g'ri yoki narsa o'chirilgan bo'lishi mumkin — jim o'tkaziladi.
      }
    })();
    return () => { cancelled = true; };
  }, [loading, authLoading, initialDeepLink]);

  async function addCategory(data) {
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    const row = { id: uid(), name: data.name, authorId: session?.user?.id };
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
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    try {
      await sbUpdate('categories', id, { name: newName.trim() });
      setCategories(categories.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c)));
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Soha nomini oʻzgartirishda xatolik yuz berdi.');
      return false;
    }
  }
  async function deleteCategory(id, name) {
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    try {
      // Shu sohaga tegishli barcha mavzu va testlarni ham bazadan o'chiramiz —
      // aks holda ular "egasiz" (orphan) qatorlar sifatida bazada qolib,
      // hajmni bekorga band qilib turaveradi.
      const relatedCourses = courses.filter((c) => c.categoryId === id);
      const relatedTests = tests.filter((t) => t.categoryId === id);
      await Promise.all([
        ...relatedCourses.map((c) => sbDelete('courses', c.id)),
        ...relatedTests.map((t) => sbDelete('tests', t.id)),
      ]);
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

  /* Kurs/test qoʻshilganda erkin "soha nomi"ni mavjud sohaga bogʻlaydi
     yoki (topilmasa) admin tekshiruvi kutilayotgan yangi soha yaratadi. */
  async function resolveCategoryId(name, authorId, authorName) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const row = { id: uid(), name: trimmed, author: authorName || '', authorId, status: 'pending' };
    await sbInsert('categories', categoryToRow(row));
    setCategories((prev) => [...prev, row]);
    return row.id;
  }

  async function submitCourse(data) {
    if (!session) { setActionError('Mavzu qoʻshish uchun avval Google orqali kiring.'); return null; }
    const authorName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      try {
        categoryId = await resolveCategoryId(data.categoryName, session.user.id, authorName);
      } catch (e) {
        setActionError('Sohani yaratishda xatolik yuz berdi.');
        return null;
      }
    }
    const row = { id: uid(), categoryId, title: data.title, summary: data.summary, content: data.content, videoUrl: data.videoUrl || '', author: authorName, authorId: session.user.id, status: data.visibility === 'private' ? 'private' : 'pending' };
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
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    try {
      await sbUpdate('courses', id, { status: 'approved' });
      setCourses(courses.map((c) => (c.id === id ? { ...c, status: 'approved' } : c)));
      const course = courses.find((c) => c.id === id);
      const cat = course && categories.find((c) => c.id === course.categoryId && c.status === 'pending');
      if (cat) {
        await sbUpdate('categories', cat.id, { status: 'approved' });
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: 'approved' } : c)));
      }
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tasdiqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function updateCourse(id, data, title) {
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
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
    const mine = courses.find((c) => c.id === id)?.authorId === session?.user?.id;
    if (!isAdmin && !mine) { setActionError('Bu amal faqat administrator uchun.'); return false; }
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
    if (!session) { setActionError('Test qoʻshish uchun avval Google orqali kiring.'); return null; }
    const authorName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      try {
        categoryId = await resolveCategoryId(data.categoryName, session.user.id, authorName);
      } catch (e) {
        setActionError('Sohani yaratishda xatolik yuz berdi.');
        return null;
      }
    }
    const row = { id: uid(), categoryId, title: data.title, description: data.description, questions: data.questions, author: authorName, authorId: session.user.id, status: data.visibility === 'private' ? 'private' : 'pending' };
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
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    try {
      await sbUpdate('tests', id, { status: 'approved' });
      setTests(tests.map((t) => (t.id === id ? { ...t, status: 'approved' } : t)));
      const test = tests.find((t) => t.id === id);
      const cat = test && categories.find((c) => c.id === test.categoryId && c.status === 'pending');
      if (cat) {
        await sbUpdate('categories', cat.id, { status: 'approved' });
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: 'approved' } : c)));
      }
      setActionError(null);
      return true;
    } catch (e) {
      setActionError('Tasdiqlashda xatolik yuz berdi.');
      return false;
    }
  }
  async function updateTest(id, data, title) {
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
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
    const target = tests.find((t) => t.id === id);
    const mine = target?.authorId === session?.user?.id;
    if (!isAdmin && !mine) { setActionError('Bu amal faqat administrator uchun.'); return false; }
    try {
      await sbDelete('tests', id);
      setTests(tests.filter((t) => t.id !== id));
      setActionError(null);
      // Testga tegishli savol rasmlarini ombordan ham tozalaymiz (fon rejimida,
      // natijasini kutmasdan — foydalanuvchi ekranida darhol o'chgandek ko'rinsin).
      const imageUrls = (target?.questions || []).map((q) => q.imageUrl).filter(Boolean);
      imageUrls.forEach((url) => { sbDeleteImage(url); });
      return true;
    } catch (e) {
      setActionError('Testni oʻchirishda xatolik yuz berdi.');
      return false;
    }
  }

  async function addNews(data) {
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
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
    if (!isAdmin) { setActionError('Bu amal faqat administrator uchun.'); return false; }
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

  function goTo(id) {
    const prevTab = tab;
    setViewingUsername(null);
    setTab(id);
    if (id !== prevTab) nav.pushNav(() => setTab(prevTab));
  }

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuDeskRef = useRef(null);
  const createMenuMobileRef = useRef(null);
  useEffect(() => {
    if (!createMenuOpen) return;
    function handler(e) {
      const insideDesk = createMenuDeskRef.current && createMenuDeskRef.current.contains(e.target);
      const insideMobile = createMenuMobileRef.current && createMenuMobileRef.current.contains(e.target);
      if (!insideDesk && !insideMobile) setCreateMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [createMenuOpen]);

  function pickCreate(kind) {
    setCreateMenuOpen(false);
    goToCommunity(kind);
  }

  return (
    <NavContext.Provider value={nav}>
    <div className="min-h-screen w-full overflow-x-hidden md:flex" style={{ background: C.paper }}>
      <style>{`
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline-offset: 2px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Bo'lim almashganda yumshoq, sezilar-sezilmas animatsiya (faqat CSS,
           tarmoq so'roviga aloqasi yo'q, tezlikka ta'sir qilmaydi) */
        @keyframes appFadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .app-fade-slide { animation: appFadeSlide 220ms ease; }
        @media (prefers-reduced-motion: reduce) {
          .app-fade-slide { animation: none; }
        }

        /* Jonli test — taymer oxirgi soniyalarda sekin "nafas olish" effekti
           (diqqat tortish uchun, konfetti emas) */
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .live-pulse { animation: livePulse 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .live-pulse { animation: none; }
        }

        /* Navigatsiya tugmalari — faol holat va bosilish silliq o'tishi */
        .nav-btn {
          transition: background-color 200ms ease, color 200ms ease, transform 150ms ease;
        }
        .nav-btn:active { transform: scale(0.94); }
      `}</style>

      {/* Desktop yon navigatsiya paneli — mobil ekranlarda yashirin */}
      {!readingActive && (
        <aside
          className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen px-4 py-6"
          style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}
        >
          <div className="flex items-center gap-2 px-2 mb-8">
            <GraduationCap size={20} style={{ color: C.gold }} />
            <span className="text-[15px]" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>UpCourse Uz</span>
          </div>
          <div className="flex flex-col gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const activeTab = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => goTo(t.id)}
                  className="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] focus-visible:outline focus-visible:outline-2"
                  style={{
                    ...fontBody,
                    color: activeTab ? C.cover : 'rgba(251,250,243,0.8)',
                    background: activeTab ? C.gold : 'transparent',
                    outlineColor: C.gold,
                    fontWeight: activeTab ? 600 : 400,
                  }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
            <div className="relative" ref={createMenuDeskRef}>
              <button
                onClick={() => setCreateMenuOpen((v) => !v)}
                className="nav-btn flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-[14px] focus-visible:outline focus-visible:outline-2 w-full"
                style={{ ...fontBody, color: C.cover, background: C.goldSoft, outlineColor: C.gold, fontWeight: 600 }}
              >
                <Plus size={16} />
                Yaratish
              </button>
              {createMenuOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl overflow-hidden"
                  style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}
                >
                  <button
                    onClick={() => pickCreate('kurslar')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-left transition-colors"
                    style={{ ...fontBody, color: C.ink }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.paperSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <BookOpen size={15} style={{ color: C.gold }} /> Mavzu yaratish
                  </button>
                  <button
                    onClick={() => pickCreate('testlar')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-left transition-colors"
                    style={{ ...fontBody, color: C.ink, borderTop: `1px solid ${C.rule}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.paperSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <ListChecks size={15} style={{ color: C.gold }} /> Test yaratish
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-1 pt-3" style={{ borderTop: `1px solid ${C.coverLine}` }}>
            {isAdmin && (
              <button
                onClick={() => goTo('admin')}
                className="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px]"
                style={{
                  ...fontBody,
                  color: tab === 'admin' ? C.cover : 'rgba(251,250,243,0.8)',
                  background: tab === 'admin' ? C.gold : 'transparent',
                  fontWeight: tab === 'admin' ? 600 : 400,
                }}
              >
                <ShieldCheck size={16} />
                Admin panel
              </button>
            )}
            <button
              onClick={() => goTo('about')}
              className="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px]"
              style={{
                ...fontBody,
                color: tab === 'about' ? C.cover : 'rgba(251,250,243,0.8)',
                background: tab === 'about' ? C.gold : 'transparent',
                fontWeight: tab === 'about' ? 600 : 400,
              }}
            >
              <Info size={16} />
              Biz haqimizda
            </button>
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px]"
              style={{ ...fontBody, color: 'rgba(251,250,243,0.8)' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 pb-24 md:pb-0 min-h-screen flex flex-col">

      {/* Ixcham top-bar (Instagram/Telegram uslubida) — bosh sahifada brend, boshqa bo'limlarda o'sha bo'lim nomi */}
      <header className="sticky top-0 z-30 md:hidden" style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          {tab === 'kurslar' ? (
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap size={22} style={{ color: C.gold, flexShrink: 0 }} />
              <span className="text-lg truncate" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>UpCourse Uz</span>
            </div>
          ) : (
            (() => {
              const meta = getTabMeta(tab);
              const Icon = meta.icon;
              return (
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={18} style={{ color: C.gold, flexShrink: 0 }} />
                  <span className="text-base truncate" style={{ ...fontDisplay, color: C.white, fontWeight: 600 }}>{meta.label}</span>
                </div>
              );
            })()
          )}
          {!readingActive && (
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Kunduzgi rejimga oʻtish' : 'Tungi rejimga oʻtish'}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 flex-shrink-0"
              style={{ border: `1px solid ${C.coverLine}`, color: C.goldSoft, outlineColor: C.gold }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 pt-4 pb-8 w-full">
        {loading ? (
          <div aria-busy="true" aria-label="Yuklanmoqda">
            {/* Sarlavha (masalan "6 ta soha" / "Kurslar") oʻrnidagi skelet */}
            <div className="mb-6">
              <div className="h-3 rounded-sm animate-pulse mb-2" style={{ background: C.rule, width: '80px', opacity: 0.55 }} />
              <div className="h-7 rounded-sm animate-pulse" style={{ background: C.rule, width: '150px', opacity: 0.45 }} />
            </div>

            {/* Qidiruv maydoni oʻrnidagi skelet */}
            <div
              className="h-[50px] rounded-sm animate-pulse mb-5 flex items-center px-3.5"
              style={{ background: C.surface, border: `1px solid ${C.rule}` }}
            >
              <Search size={18} style={{ color: C.rule }} />
            </div>

            {/* Kartochkalar oʻrnidagi skelet — haqiqiy soha/mavzu kartochkasi bilan bir xil shakl */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm animate-pulse"
                  style={{ background: C.surface, border: `1px solid ${C.rule}` }}
                >
                  <div className="flex items-start min-w-0 flex-1">
                    <div className="flex-shrink-0 w-9 h-6 rounded-sm mr-3" style={{ background: C.rule, opacity: 0.45 }} />
                    <div className="min-w-0 flex-1">
                      <div className="h-4 rounded-sm" style={{ background: C.rule, width: `${58 + (i % 3) * 12}%`, opacity: 0.6 }} />
                      <div className="h-3 rounded-sm mt-2.5" style={{ background: C.rule, width: '42%', opacity: 0.45 }} />
                      <div className="h-3 rounded-sm mt-1.5" style={{ background: C.rule, width: '60%', opacity: 0.35 }} />
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0 gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ background: C.rule, opacity: 0.35 }} />
                    <div className="w-3.5 h-3.5 rounded-sm" style={{ background: C.rule, opacity: 0.35 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="text-[15px]" style={{ ...fontBody, color: C.inkSoft }}>{error}</span>
            <button
              onClick={() => loadAppData()}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2"
              style={{ background: C.cover, color: C.white, outlineColor: C.gold }}
              aria-label="Qayta urinib ko'rish"
              title="Qayta urinib ko'rish"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        ) : (
          <>
            {actionError && (
              <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-sm text-[15px]" style={{ ...fontBody, background: C.dangerBannerTint, border: `1px solid ${C.red}`, color: C.red }}>
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)}><X size={15} /></button>
              </div>
            )}
            <PaperPanel key={viewingUsername ? `profile:${viewingUsername}` : tab} className="app-fade-slide">
              {!viewingUsername && tab === 'kurslar' && <GiftBanner onOpen={() => setGiftOpen(true)} />}
              {viewingUsername && (
                <PublicProfileView username={viewingUsername} courses={courses} tests={tests} onBack={() => setViewingUsername(null)} />
              )}
              {!viewingUsername && tab === 'kurslar' && <CoursesView courses={courses} categories={categories} updateCourse={updateCourse} deleteCourse={deleteCourse} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} onReadingChange={handleReadingChange} isAdmin={isAdmin} session={session} initialOpenId={initialDeepLink?.type === 'course' ? initialDeepLink.value : null} ensureCourseContent={ensureCourseContent} />}
              {!viewingUsername && tab === 'testlar' && <TestsView tests={tests} categories={categories} updateTest={updateTest} deleteTest={deleteTest} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} onReadingChange={handleReadingChange} isAdmin={isAdmin} session={session} initialOpenId={initialDeepLink?.type === 'test' ? initialDeepLink.value : null} initialLiveCode={initialDeepLink?.type === 'live' ? initialDeepLink.value : null} ensureTestContent={ensureTestContent} />}
              {!viewingUsername && tab === 'profil' && (
                <ProfileView
                  session={session}
                  profile={profile}
                  authLoading={authLoading}
                  onSaveProfile={saveProfile}
                  onSignOut={handleSignOut}
                  courses={courses}
                  tests={tests}
                  categories={categories}
                  submitCourse={submitCourse}
                  approveCourse={approveCourse}
                  deleteCourse={deleteCourse}
                  submitTest={submitTest}
                  approveTest={approveTest}
                  deleteTest={deleteTest}
                  target={communityTarget}
                  onConsumeTarget={() => setCommunityTarget(null)}
                  isAdmin={isAdmin}
                  ensureCourseContent={ensureCourseContent}
                  ensureTestContent={ensureTestContent}
                  onGoToAbout={() => goTo('about')}
                />
              )}
              {!viewingUsername && tab === 'admin' && isAdmin && (
                <Suspense fallback={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={22} className="animate-spin" style={{ color: C.gold }} />
                  </div>
                }>
                  <AdminPanelView
                    courses={courses}
                    tests={tests}
                    categories={categories}
                    news={news}
                    submitCourse={submitCourse}
                    approveCourse={approveCourse}
                    deleteCourse={deleteCourse}
                    submitTest={submitTest}
                    approveTest={approveTest}
                    deleteTest={deleteTest}
                    renameCategory={renameCategory}
                    deleteCategory={deleteCategory}
                    addNews={addNews}
                    deleteNews={deleteNews}
                    ensureCourseContent={ensureCourseContent}
                    ensureTestContent={ensureTestContent}
                  />
                </Suspense>
              )}
              {!viewingUsername && tab === 'yangiliklar' && <NewsView news={news} />}
              {!viewingUsername && tab === 'about' && <AboutView />}
            </PaperPanel>
          </>
        )}
      </main>

      </div>

      {/* Mobil pastki navigatsiya paneli */}
      {!readingActive && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-2 rounded-t-[28px]"
          style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})`, boxShadow: '0 -6px 20px rgba(15,61,46,0.25)' }}
          aria-label="Asosiy navigatsiya"
        >
          {TABS.slice(0, 2).map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => goTo(t.id)}
                className="nav-btn flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl focus-visible:outline focus-visible:outline-2"
                style={{
                  color: activeTab ? C.cover : 'rgba(251,250,243,0.65)',
                  background: activeTab ? C.gold : 'transparent',
                  outlineColor: C.gold,
                }}
              >
                <Icon size={19} strokeWidth={activeTab ? 2.3 : 1.8} />
                <span className="text-[10px]" style={{ ...fontBody, fontWeight: activeTab ? 600 : 400 }}>{t.label}</span>
              </button>
            );
          })}

          <div className="relative" ref={createMenuMobileRef}>
            <button
              onClick={() => setCreateMenuOpen((v) => !v)}
              aria-label="Yaratish"
              className="nav-btn flex items-center justify-center w-12 h-12 rounded-full -mt-5 shadow-lg focus-visible:outline focus-visible:outline-2"
              style={{ background: C.gold, color: C.cover, outlineColor: C.goldSoft, boxShadow: '0 4px 14px rgba(212,172,110,0.45)' }}
            >
              <Plus size={22} strokeWidth={2.4} style={{ transform: createMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {createMenuOpen && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 rounded-xl overflow-hidden"
                style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 8px 20px rgba(0,0,0,0.22)', minWidth: '180px' }}
              >
                <button
                  onClick={() => pickCreate('kurslar')}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-left"
                  style={{ ...fontBody, color: C.ink }}
                >
                  <BookOpen size={16} style={{ color: C.gold }} /> Mavzu yaratish
                </button>
                <button
                  onClick={() => pickCreate('testlar')}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-left"
                  style={{ ...fontBody, color: C.ink, borderTop: `1px solid ${C.rule}` }}
                >
                  <ListChecks size={16} style={{ color: C.gold }} /> Test yaratish
                </button>
              </div>
            )}
          </div>

          {TABS.slice(2).map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => goTo(t.id)}
                className="nav-btn flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl focus-visible:outline focus-visible:outline-2"
                style={{
                  color: activeTab ? C.cover : 'rgba(251,250,243,0.65)',
                  background: activeTab ? C.gold : 'transparent',
                  outlineColor: C.gold,
                }}
              >
                <Icon size={19} strokeWidth={activeTab ? 2.3 : 1.8} />
                <span className="text-[10px]" style={{ ...fontBody, fontWeight: activeTab ? 600 : 400 }}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {giftOpen && (
        <GiftModal
          session={session}
          onRequireLogin={() => { setGiftOpen(false); setTab('profil'); }}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </div>
    </NavContext.Provider>
  );
}
