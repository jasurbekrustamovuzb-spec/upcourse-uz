Warning: truncated output (original token count: 64349)
Total output lines: 5032

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useContext, useMemo, lazy, Suspense } from 'react';
import {
  BookOpen, ListChecks, MessageCircle, Info, Plus, X, Check,
  ChevronRight, ArrowLeft, Trash2, Award, Loader2,
  Paperclip, RotateCcw, MoreVertical, Pencil, CheckCircle2, Users, Search,
  Sun, Moon, LogIn, LogOut, UserCircle2, ShieldCheck, Lock, Clock3, Home, Settings, Share2,
  Trophy, Medal, Coins, ShoppingBag, Tag, Image as ImageIcon, Calculator, FileText, Compass, Maximize2, Zap, Gift, Star, Gem, Crown, Repeat2
} from 'lucide-react';
import { supabase, signInWithGoogle, switchGoogleAccount, signOut as sbSignOut } from './supabaseClient';

const PausedTestsPanel = lazy(() => import('./PausedTestsPanel.jsx'));

/* ------------------------------------------------------------------ */
/*  Admin panel faqat "Admin panel" boʻlimiga kirilganda yuklanadi     */
/*  (React.lazy) — bu boshlang'ich yuklanish hajmini kamaytiradi.      */
/* ------------------------------------------------------------------ */
const AdminPanelView = lazy(() => import('./AdminPanel.jsx'));
export const LiveQuizHub = lazy(() => import('./LiveQuiz.jsx'));
const MatchingTestForm = lazy(() => import('./MatchingTestForm.jsx'));
const MatchingTestInteraction = lazy(() => import('./MatchingTestInteraction.jsx'));
export const TeamBattleHub = lazy(() => import('./TeamBattle.jsx'));
const DailyArenaView = lazy(() => import('./DailyArena.jsx'));
const GlobalSearchView = lazy(() => import('./GlobalSearch.jsx'));
export const ProfileFollowView = lazy(() => import('./ProfileFollow.jsx'));
const DeferredSharedResourcesPanel = lazy(() => import('./DeferredSharedResources.jsx').then((module) => ({ default: module.SharedResourcesPanel })));
const DeferredFollowerShareDialog = lazy(() => import('./DeferredSharedResources.jsx').then((module) => ({ default: module.FollowerShareDialog })));
export const PublicCollectionsView = lazy(() => import('./PublicCollections.jsx'));
const CourseLinkedTestsView = lazy(() => import('./CourseLinkedTests.jsx'));
const LearningTasksModal = lazy(() => import('./LearningTasks.jsx'));
const DeferredTestsView = lazy(() => import('./DeferredTestsView.jsx').then((module) => ({ default: module.TestsView })));
const DeferredCourseBody = lazy(() => import('./DeferredCourseContent.jsx').then((module) => ({ default: module.CourseBody })));
const DeferredProfileView = lazy(() => import('./DeferredProfileViews.jsx').then((module) => ({ default: module.ProfileView })));
const DeferredPublicProfileView = lazy(() => import('./DeferredProfileViews.jsx').then((module) => ({ default: module.PublicProfileView })));
const DeferredGiftModal = lazy(() => import('./DeferredProfileViews.jsx').then((module) => ({ default: module.GiftModal })));

// A shared live-room link has a narrow first screen (join by code). Warm its
// two route chunks together so it does not wait for TestsView, then LiveQuiz.
const isLiveRoomEntry = (() => {
  try { return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('live'); }
  catch { return false; }
})();
if (isLiveRoomEntry) {
  void import('./DeferredTestsView.jsx').catch(() => {});
  void import('./LiveQuiz.jsx').catch(() => {});
}

// A direct shared-test URL should render its test without waiting for the
// full catalog. Warm only the lazy test-view chunk on that route.
const isSharedTestEntry = (() => {
  try { return typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('test')); }
  catch { return false; }
})();
if (isSharedTestEntry) void import('./DeferredTestsView.jsx').catch(() => {});

function LiveEntryLoading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '24px 12px' }}>
      <div style={{ width: 'min(100%, 380px)', padding: '28px 24px', borderRadius: 22, textAlign: 'center', background: '#FBFAF3', border: '1px solid #B7C4AE', boxShadow: '0 16px 44px rgba(31,61,43,.08)' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 16, display: 'grid', placeItems: 'center', color: '#1F3D2B', background: '#DCC28F', fontSize: 23 }} aria-hidden="true">◉</div>
        <div style={{ font: "700 20px Georgia, 'Times New Roman', serif", color: '#1F3D2B' }}>Jonli testga ulanish</div>
        <div style={{ marginTop: 8, color: '#5C6152', font: '14px/1.5 system-ui, sans-serif' }}>Xona tayyorlanmoqda. Bir oz kuting.</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shriftlarni erta va bloklamaydigan holda yuklash.                  */
/*  Bu kod modul yuklanishi bilanoq (React render boshlanishidan       */
/*  oldin) ishga tushadi va shrift so'rovini fon rejimida boshlaydi —  */
/*  sahifa render qilinishini kutib turmaydi, "Yuklanmoqda" jarayonini */
/*  tezlashtiradi.                                                     */
/* ------------------------------------------------------------------ */
// Tizim shriftlari ishlatiladi — tashqi shrift so‘rovi va yuklanishdagi kutish yo‘q.

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
  coverDeep: '#17271C',
  coverLine: 'rgba(184,134,59,0.35)',
  paper: '#20241F',
  paperSoft: '#262B25',
  rule: '#485047',
  red: '#E08A7D',
  gold: '#D4AC6E',
  goldSoft: '#E4CC9C',
  ink: '#E5E1D7',
  inkSoft: '#B9BBB2',
  white: '#F0EDE4',
  surface: '#2A3029',
  successTint: 'rgba(94,168,118,0.17)',
  dangerTint: 'rgba(224,138,125,0.17)',
  selectedTint: 'rgba(212,172,110,0.13)',
  dangerBannerTint: 'rgba(224,138,125,0.12)',
  accent: '#A7C9AA',
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
  mathTint: 'rgba(111,168,204,0.13)',
};

export const C = { ...LIGHT_PALETTE };

// Catalog API is still loading, show one tiny built-in recommendation so
// the homepage has useful content immediately. Once the public catalog
// arrives, CoursesView replaces this fallback with the current course row.
const FEATURED_COURSE_FALLBACK = {
  id: 'mtfm92fnml9sf',
  title: '1. "To Be" feʼli nima va qanday qoʻllanilishi',
  category: 'Ingliz tili grammatikasi',
};

function BrandMark({ size = 28 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-grid',
        placeItems: 'center',
        position: 'relative',
        border: `2px solid ${C.goldSoft}`,
        borderRadius: `${Math.round(size * 0.28)}px ${Math.round(size * 0.28)}px ${Math.round(size * 0.34)}px ${Math.round(size * 0.34)}px`,
        color: C.goldSoft,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: Math.round(size * 0.68),
        fontWeight: 700,
        lineHeight: 1,
        paddingBottom: Math.round(size * 0.09),
      }}
    >
      U
      <span
        style={{
          position: 'absolute',
          bottom: Math.max(3, Math.round(size * 0.15)),
          left: '25%',
          right: '25%',
          height: 1.5,
          borderRadius: 2,
          background: C.goldSoft,
        }}
      />
    </span>
  );
}

export const fontDisplay = { fontFamily: "Georgia, 'Times New Roman', serif" };
export const fontBody = { fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
export const fontMono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

const SectionLoadingContext = React.createContext(null);
let sectionLoadingSequence = 0;

function SectionLoadingProvider({ children }) {
  const [activeId, setActiveId] = useState(null);
  const queue = useRef([]);
  const register = useCallback((id) => {
    if (!queue.current.includes(id)) queue.current.push(id);
    setActiveId(queue.current[0] || null);
    return () => {
      queue.current = queue.current.filter((queuedId) => queuedId !== id);
      setActiveId(queue.current[0] || null);
    };
  }, []);
  const value = useMemo(() => ({ activeId, register }), [activeId, register]);
  return <SectionLoadingContext.Provider value={value}>{children}</SectionLoadingContext.Provider>;
}

export function SectionLoading() {
  const registry = useContext(SectionLoadingContext);
  const register = registry?.register;
  const id = useRef(null);
  if (id.current === null) id.current = ++sectionLoadingSequence;
  useEffect(() => register?.(id.current), [register]);
  if (registry && registry.activeId !== id.current) return null;
  return (
    <div role="status" aria-live="polite" aria-label="Yuklanmoqda" className="flex min-h-[72px] w-full items-center justify-center gap-2 py-5" style={{ ...fontBody, color: C.inkSoft }}>
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      <span className="text-[13px]">Yuklanmoqda</span>
    </div>
  );
}

export function GoogleBrandMark() {
  return (
    <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border" style={{ borderColor: C.rule, background: C.white }}>
      <svg viewBox="0 0 48 48" className="h-[17px] w-[17px]" focusable="false">
        <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2l6.6 5.1c3.9-3.6 6.1-8.9 6.1-15z" />
        <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4l-6.8 5.2A20 20 0 0 0 24 44z" />
        <path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7l-6.8-5.2a20 20 0 0 0 0 17.4z" />
        <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.8 15.3l6.8 5.2C14.2 15.6 18.7 12 24 12z" />
      </svg>
    </span>
  );
}

function TestAccountPrompt({ loading, busy, error, onSignIn, onBrowse, modal = false }) {
  const card = (
    <section className="w-full max-w-md rounded-2xl p-5 sm:p-6" style={{ background: C.surface, border: `1px solid ${C.rule}`, boxShadow: '0 18px 50px rgba(15,27,18,.18)' }} aria-labelledby="test-account-title">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl" style={{ color: C.cover, background: C.goldSoft }}><ShieldCheck size={25} /></div>
      <h2 id="test-account-title" className="text-center text-2xl" style={{ ...fontDisplay, color: C.ink, fontWeight: 700 }}>Test ishlash uchun akkauntga kiring</h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6" style={{ ...fontBody, color: C.inkSoft }}>Ommaviy va maxfiy testlarni ishlash, natijalarni saqlash uchun akkaunt kerak. Birinchi marta kirsangiz, Google akkauntingiz UpCourse profiliga ulanadi.</p>
      <button type="button" disabled={loading || busy} onClick={onSignIn} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60" style={{ ...fontBody, color: C.ink, background: C.white, borderColor: C.rule }}>
        {loading || busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleBrandMark />}
        {loading ? 'Akkaunt tekshirilmoqda…' : busy ? 'Google ochilmoqda…' : 'Google orqali davom etish'}
      </button>
      {error && <p role="alert" className="mt-3 text-center text-sm" style={{ ...fontBody, color: C.red }}>{error}</p>}
      {onBrowse && <button type="button" onClick={onBrowse} className="mt-4 w-full rounded-lg py-2 text-sm font-medium" style={{ ...fontBody, color: C.inkSoft }}>Testlar ro‘yxatiga qaytish</button>}
      <a href="/privacy-policy.html" className="mt-3 inline-block text-xs underline underline-offset-2" style={{ ...fontBody, color: C.inkSoft }}>Maxfiylik siyosati</a>
    </section>
  );
  if (!modal) return <div className="grid min-h-[55vh] place-items-center px-3 py-8">{card}</div>;
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/55 p-3 sm:p-5" role="presentation">{card}</div>;
}

function CourseContentLoadError({ onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Mavzuni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-10 items-center gap-2 rounded-sm px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2"
        style={{ ...fontBody, color: C.white, background: C.cover, outlineColor: C.gold }}
      >
        <RotateCcw size={15} /> Qayta urinish
      </button>
    </div>
  );
}

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

export function uid() {
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
    if (p.get('verifyCertificate')) return { type: 'certificate', value: p.get('verifyCertificate') };
    if (p.get('course')) return { type: 'course', value: p.get('course') };
    if (p.get('test')) return { type: 'test', value: p.get('test') };
    if (p.get('courseCategory')) return { type: 'courseCategory', value: p.get('courseCategory') };
    if (p.get('testCategory')) return { type: 'testCategory', value: p.get('testCategory') };
    if (p.get('live')) return { type: 'live', value: p.get('live').toUpperCase() };
    if (p.get('battle')) return { type: 'battle', value: p.get('battle') };
    if (p.get('teamBattle') === '1') return { type: 'teamBattle' };
    if (p.get('u')) return { type: 'profile', value: p.get('u') };
  } catch (e) { /* URL o'qib bo'lmasa, oddiy holatda ochiladi */ }
  return null;
}

const PENDING_TEST_AUTH_KEY = 'upcourse-pending-test-auth';
function readPendingTestAuthIntent() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_TEST_AUTH_KEY) || 'null');
    return value && typeof value.testId === 'string' && value.testId
      ? { testId: value.testId, action: value.action === 'start' ? 'start' : 'open', ...(value.startConfig && typeof value.startConfig === 'object' ? { startConfig: value.startConfig } : {}) }
      : null;
  } catch { return null; }
}

/* ------------------------------------------------------------------ */
/*  "Qayerda edim?" — sahifa yangilanganda (refresh) foydalanuvchini    */
/*  Bosh sahifaga emas, oxirgi turgan joyiga qaytarish uchun.           */
/*                                                                      */
/*  sessionStorage ishlatiladi: refreshda davom etadi, tab muddati       */
/*  tugagach eski jarayon tiklanmaydi. Live sessiya 24 soatdan keyin    */
/*  eskirgan hisoblanadi; oldingi localStorage nusxalari o'chadi.       */
/*  Hech qanday tarmoq so'rovi yubormaydi, shuning uchun yuklanish      */
/*  jarayoniga umuman ta'sir qilmaydi.                                  */
const POSITION_KEY = 'upcourse_last_position';

function readPosition() {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    const position = raw ? JSON.parse(raw) : {};
    // Oldingi build live sessiyani localStorage'da saqlagan; u keyinroq
    // kutilmaganda qaytib kelmasin. Yangi sessiya faqat shu tabda tiklanadi.
    localStorage.removeItem('upcourse_live_session');
    const live = position?.testlar?.live;
    const age = live?.savedAt ? Date.now() - Number(live.savedAt) : Infinity;
    if (live?.code && age >= 0 && age < 24 * 60 * 60 * 1000) return position;
    if (live) {
      const next = { ...position, testlar: { ...(position.testlar || {}) } };
      delete next.testlar.live;
      sessionStorage.setItem(POSITION_KEY, JSON.stringify(next));
      return next;
    }
    return position;
  } catch (e) {
    return {};
  }
}

/* Faqat berilgan kalitlarni yangilaydi, qolganlariga tegmaydi — shu
   tufayli turli bo'limlar (Kurslar, Testlar, Admin panel) bir-birining
   saqlagan holatini o'chirib qo'ymaydi. */
export function writePosition(patch) {
  try {
    const current = readPosition();
    const safePatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(patch.testlar || {}, 'live') && patch.testlar.live?.code) {
      safePatch.testlar = { ...patch.testlar, live: { ...patch.testlar.live, savedAt: Date.now() } };
    }
    const next = { ...current, ...safePatch };
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(next));
    if (Object.prototype.hasOwnProperty.call(patch.testlar || {}, 'live')) localStorage.removeItem('upcourse_live_session');
  } catch (e) { /* xotira yo'q yoki to'lgan bo'lsa e'tiborsiz qoldiriladi */ }
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
  // Guests can use the anon key immediately. Do not wait for Supabase auth
  // initialization before starting public profile lookups on the home page.
  let hasStoredSession = true;
  try {
    const isOAuthCallback = window.location.hash.includes('access_token') || window.location.search.includes('code=');
    if (!isOAuthCallback) hasStoredSession = !!localStorage.getItem('sb-cuubcnnzjlmvcbgnctvb-auth-token');
  } catch { /* If storage is unavailable, keep the regular SDK flow. */ }
  if (!hasStoredSession) {
    cachedAccessToken = null;
    return null;
  }
  if (!sessionReadyPromise) {
    sessionReadyPromise = supabase.auth.getSession()
      .then(({ data }) => { cachedAccessToken = data?.session?.access_token || null; return cachedAccessToken; })
      .catch(() => { cachedAccessToken = null; return null; });
  }
  return sessionReadyPromise;
}

async function sbRequest(path, options = {}) {
  function doFetch(token) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  }

  const token = (await getAccessToken()) || SUPABASE_ANON_KEY;
  let res = await doFetch(token);

  /* Nozik holat: sahifa endigina ochilganda, keshlangan token hali
     server tomonidan yangilanish jarayonida bo'lishi mumkin — shu payt
     u eskirgan/yaroqsiz bo'lsa, Supabase butun so'rovni 401 bilan rad
     etadi, hatto so'ralayotgan ma'lumot (masalan tasdiqlangan
     kurslar/testlar) hammaga ochiq bo'lsa ham. Bunday holatda — FAQAT
     401 uchun — so'rovni token keshini chetlab o'tib, toʻgʻridan-toʻgʻri
     ommaviy kalit bilan bir marta qayta yuboramiz. Agar resurs
     haqiqatan ham kirish talab qilsa (masalan shaxsiy ma'lumot), bu
     qayta urinish ham 401/403 bilan tugaydi va xato baribir to'g'ri
     ko'rsatiladi — bu faqat "yolg'on signal" holatlarini qutqaradi,
     haqiqiy ruxsat xatolarini yashirmaydi. Token keshlash mexanizmining
     o'ziga tegilmagan, faqat ustiga qo'shilgan zaxira qatlam. */
  if (res.status === 401 && token !== SUPABASE_ANON_KEY) {
    res = await doFetch(SUPABASE_…49349 tokens truncated…   }
    } catch (e) { /* URL holatini yangilab bo‘lmasa, oddiy navigatsiya davom etadi */ }
    if (id !== prevTab) nav.pushNav(() => setTab(prevTab));
  }

  async function openArenaProfile(userId) {
    if (!userId) return;
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!data?.username) {
        setActionError('Bu ishtirokchining profili hali toʻliq sozlanmagan.');
        return;
      }
      setActionError(null);
      openPublicProfile(data.username);
    } catch (e) {
      setActionError('Profilni ochib boʻlmadi. Qayta urinib koʻring.');
    }
  }

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  useEffect(() => {
    function handleSearchShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleSearchShortcut);
    return () => document.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  function openSearchItem(kind, id) {
    setGlobalSearchOpen(false);
    if (kind === 'test') {
      setTestOpenRequest({ id, requestId: ++testOpenRequestSeq.current });
    } else {
      setOpenRequest({ type: kind, id });
    }
    goTo(kind === 'course' ? 'kurslar' : 'testlar');
  }

  function consumeTestOpenRequest(requestId) {
    setTestOpenRequest((request) => request?.requestId === requestId ? null : request);
  }

  function openSharedResource(type, resource) {
    if (!resource?.id) return;
    if (type === 'course') {
      const item = { id: resource.id, categoryId: resource.category_id || null, title: resource.title || 'Mavzu', summary: resource.summary || '', content: resource.content || '', videoUrl: resource.video_url || '', author: resource.author || '', authorId: resource.author_id || null, status: resource.status || 'private', sharedWithMe: true };
      setCourses((current) => [...current.filter((row) => row.id !== item.id), item]);
      openFromProfile('kurslar', item.id);
    } else {
      const item = { id: resource.id, categoryId: resource.category_id || null, title: resource.title || 'Test', description: resource.description || '', questions: Array.isArray(resource.questions) ? resource.questions : [], author: resource.author || '', authorId: resource.author_id || null, status: resource.status || 'private', sharedWithMe: true, questionCount: Array.isArray(resource.questions) ? resource.questions.length : 0 };
      setTests((current) => [...current.filter((row) => row.id !== item.id), item]);
      openFromProfile('testlar', item.id);
    }
  }

  function openSearchProfile(username) {
    openPublicProfile(username, 'kurslar');
  }

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuDeskRef = useRef(null);
  useEffect(() => {
    if (!createMenuOpen) return;
    function handler(e) {
      const insideDesk = createMenuDeskRef.current && createMenuDeskRef.current.contains(e.target);
      if (!insideDesk) setCreateMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [createMenuOpen]);

  function pickCreate(kind) {
    setCreateMenuOpen(false);
    goToCommunity(kind);
  }

  return (
    <SectionLoadingProvider>
    <NavContext.Provider value={nav}>
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
    <div className="min-h-dvh w-full overflow-x-clip md:flex" style={{ background: C.paper }}>
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
          className="hidden md:flex md:w-56 md:shrink-0 md:self-stretch"
          style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}
        >
          <div className="sticky top-0 flex h-screen w-full flex-col px-4 py-6">
          <div className="flex items-center gap-2 px-2 mb-8">
            <BrandMark size={26} />
            <span className="text-[15px]" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>UpCourse Uz</span>
          </div>
          <button type="button" onClick={() => setGlobalSearchOpen(true)} className="nav-btn mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: 'rgba(251,250,243,0.8)', border: `1px solid ${C.coverLine}`, outlineColor: C.gold }}>
            <Search size={16} />
            <span className="flex-1">Qidirish</span>
            <kbd className="text-[10px] opacity-70">Ctrl K</kbd>
          </button>
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
              onClick={toggleTheme}
              className="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px]"
              style={{ ...fontBody, color: 'rgba(251,250,243,0.8)' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
            </button>
          </div>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 pb-24 md:pb-0 min-h-screen flex flex-col">

      {/* Ixcham top-bar (Instagram/Telegram uslubida) — bosh sahifada brend, boshqa bo'limlarda o'sha bo'lim nomi */}
      {!readingActive && <header className="sticky top-0 z-30 md:hidden" style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})` }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          {tab === 'kurslar' ? (
            <div className="flex items-center gap-2 min-w-0">
              <BrandMark size={28} />
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
          <button type="button" onClick={() => setGlobalSearchOpen(true)} aria-label="Kurslar, testlar va profillarni qidirish" className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: C.goldSoft, border: `1px solid ${C.coverLine}` }}>
            <Search size={18} />
          </button>
          {!readingActive && (
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Kunduzgi rejimga oʻtish' : 'Tungi rejimga oʻtish'}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 flex-shrink-0"
              style={{ border: `1px solid ${C.coverLine}`, color: C.goldSoft, outlineColor: C.gold }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>
      </header>}

      {/* Content */}
      <main className={tab === 'arena' ? "flex-1 w-full px-2 sm:px-4 pt-3 pb-6" : readingActive ? "flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-6 w-full" : "flex-1 max-w-5xl mx-auto px-5 sm:px-8 pt-4 pb-8 w-full"}>
        {(loading && !skipMainLoadingGate && tab !== 'kurslar') ? (
          <div aria-busy="true" aria-label="Yuklanmoqda">
            {/* Sarlavha (masalan "6 ta soha" / "Kurslar") oʻrnidagi skelet */}
            <div className="mb-6">
              <div className="h-3 rounded-sm mb-2" style={{ background: C.rule, width: '80px', opacity: 0.55 }} />
              <div className="h-7 rounded-sm" style={{ background: C.rule, width: '150px', opacity: 0.45 }} />
            </div>

            {/* Qidiruv maydoni oʻrnidagi skelet */}
            <div
              className="h-[50px] rounded-sm mb-5 flex items-center px-3.5"
              style={{ background: C.surface, border: `1px solid ${C.rule}` }}
            >
              <Search size={18} style={{ color: C.rule }} />
            </div>

            {/* Kartochkalar oʻrnidagi skelet — haqiqiy soha/mavzu kartochkasi bilan bir xil shakl */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm"
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
        ) : (error && !skipMainLoadingGate) ? (
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
              <RouteErrorBoundary onHome={() => goTo('kurslar')}>
              {viewingUsername && (
                <Suspense fallback={<SectionLoading label="Profil yuklanmoqda…" compact />}><DeferredPublicProfileView username={viewingUsername} courses={courses} tests={tests} onBack={nav.back} onOpenItem={openFromProfile} onOpenProfile={openSearchProfile} session={session} /></Suspense>
              )}
              {!viewingUsername && tab === 'kurslar' && <CoursesView pausedTests={pausedTests} onResumePausedTest={resumePausedTest} onPausedTestVisibilityChange={setPausedTestHomeVisibility} onOpenTasks={() => setLearningTasksOpen(true)} learningTaskComplete={learningTaskComplete} isLoading={loading && !skipMainLoadingGate} courses={courses} categories={categories} updateCourse={updateCourse} deleteCourse={deleteCourse} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} onReadingChange={handleReadingChange} isAdmin={isAdmin} session={session} onShareToFollowers={(type, item) => setFollowerShareResource({ type, id: item.id, title: item.title })} onRequireAccount={() => setTab('profil')} initialOpenId={openRequest?.type === 'course' ? openRequest.id : (initialDeepLink?.type === 'course' ? initialDeepLink.value : (initialPosition.kurslar?.openId || null))} initialCategoryId={initialDeepLink?.type === 'courseCategory' ? initialDeepLink.value : initialDeepLink ? null : (initialPosition.kurslar?.categoryId || null)} ensureCourseContent={ensureCourseContent} onOpenTest={(id) => openSearchItem('test', id)} />}
              {!viewingUsername && tab === 'testlar' && (initialDeepLink?.type === 'test' && sharedTestEntryActive && !session?.user?.id ? (
                authLoading ? <SectionLoading label="Akkaunt tekshirilmoqda…" compact /> : <TestAccountPrompt
                  busy={testAuthBusy}
                  error={testAuthError}
                  onSignIn={() => beginTestAccountSignIn({ testId: initialDeepLink.value, action: 'open' })}
                  onBrowse={() => { setSharedTestEntryActive(false); setReadingActive(false); setTestAuthIntent(null); setTestAuthError(''); }}
                />
              ) : (
                <Suspense fallback={liveEntryActive ? <LiveEntryLoading /> : sharedTestEntryActive ? <SectionLoading label="Test ochilmoqda…" compact /> : <SectionLoading label="Testlar yuklanmoqda…" compact />}>
                  <DeferredTestsView tests={tests} testsLoading={testsLoading} testsLoadError={testsLoadError} onRetryTests={() => loadTests(true)} categories={categories} updateTest={updateTest} deleteTest={deleteTest} renameCategory={renameCategory} deleteCategory={deleteCategory} onGoToCommunity={goToCommunity} onReadingChange={handleReadingChange} isAdmin={isAdmin} session={session} profile={profile} saveTestPrefs={saveTestPrefs} onPauseAttempt={savePausedTest} onClearPaused={clearPausedTest} onRequireAccount={requireAccountForPausedTest} onRequireTestAccount={requireAccountForTest} onExitInitialLive={finishLiveEntry} onExitInitialTest={finishSharedTestEntry} initialCertificateId={initialDeepLink?.type === 'certificate' ? initialDeepLink.value : ''} initialOpenId={testOpenRequest ? null : initialDeepLink?.type === 'test' ? (session?.user?.id ? initialDeepLink.value : null) : (session?.user?.id ? initialPosition.testlar?.openId || null : null)} openRequest={testOpenRequest} onOpenRequestHandled={consumeTestOpenRequest} initialCategoryId={testOpenRequest ? null : initialDeepLink?.type === 'testCategory' ? initialDeepLink.value : initialDeepLink ? null : (initialPosition.testlar?.categoryId || null)} initialLiveCode={testOpenRequest || !liveEntryActive ? null : (initialDeepLink?.type === 'live' ? initialDeepLink.value : null)} initialLiveSession={testOpenRequest || initialDeepLink ? null : (initialPosition.testlar?.live || null)} initialBattleToken={initialDeepLink?.type === 'battle' ? initialDeepLink.value : null} initialTeamBattle={teamBattleRequest} onInitialTeamBattleHandled={() => setTeamBattleRequest(false)} ensureTestContent={ensureTestContent} loadTestForOpening={loadTestForOpening} onTestComplete={handleTestCompletion} onBadgeClaim={claimLearningBadge} badgeClaimBusy={learningBadgeBusy} badgeClaimError={learningBadgeError} />
                </Suspense>
              ))}
              {!viewingUsername && tab === 'arena' && (
                <Suspense fallback={<SectionLoading label="Arena yuklanmoqda…" />}>
                  <DailyArenaView session={session} isAdmin={isAdmin} onOpenProfile={openArenaProfile} onExit={() => goTo('kurslar')} />
                </Suspense>
              )}
              {!viewingUsername && tab === 'profil' && (
                <Suspense fallback={<SectionLoading label="Profil yuklanmoqda…" />}><DeferredProfileView
                  session={session}
                  profile={profile}
                  pausedTests={pausedTests}
                  onResumePausedTest={resumePausedTest}
                  onPausedTestVisibilityChange={setPausedTestHomeVisibility}
                  saveTestPrefs={saveTestPrefs}
                  onPauseAttempt={savePausedTest}
                  onClearPaused={clearPausedTest}
                  onRequireAccount={requireAccountForPausedTest}
                  onTestComplete={handleTestCompletion}
                  onBadgeClaim={claimLearningBadge}
                  badgeClaimBusy={learningBadgeBusy}
                  badgeClaimError={learningBadgeError}
                  authLoading={authLoading}
                  onSaveProfile={saveProfile}
                  onSignOut={handleSignOut}
                  courses={courses}
                  tests={tests}
                  categories={categories}
                  submitCourse={submitCourse}
                  approveCourse={approveCourse}
                  deleteCourse={deleteCourse}
                  updateCourse={updateCourse}
                  submitTest={submitTest}
                  approveTest={approveTest}
                  deleteTest={deleteTest}
                  updateTest={updateTest}
                  renameCategory={renameCategory}
                  target={communityTarget}
                  onConsumeTarget={() => setCommunityTarget(null)}
                  isAdmin={isAdmin}
                  ensureCourseContent={ensureCourseContent}
                  ensureTestContent={ensureTestContent}
                  onGoToAbout={() => goTo('about')}
                  onOpenAdmin={() => goTo('admin')}
                  onOpenProfile={openSearchProfile}
                  onOpenArena={() => goTo('arena')}
                  onShareToFollowers={(type, item) => setFollowerShareResource({ type, id: item.id, title: item.title })}
                  onOpenSharedResource={openSharedResource}
                /></Suspense>
              )}
              {!viewingUsername && tab === 'admin' && isAdmin && (
                <Suspense fallback={<SectionLoading label="Admin panel yuklanmoqda…" />}>
                  <AdminPanelView
                    courses={courses}
                    tests={tests}
                    categories={categories}
                    news={news}
                    submitCourse={submitCourse}
                    approveCourse={approveCourse}
                    deleteCourse={deleteCourse}
                    updateCourse={updateCourse}
                    submitTest={submitTest}
                    approveTest={approveTest}
                    deleteTest={deleteTest}
                    updateTest={updateTest}
                    renameCategory={renameCategory}
                    deleteCategory={deleteCategory}
                    addNews={addNews}
                    deleteNews={deleteNews}
                    ensureCourseContent={ensureCourseContent}
                    ensureTestContent={ensureTestContent}
                    initialSubTab={initialDeepLink ? null : (initialPosition.admin?.subTab || null)}
                  />
                </Suspense>
              )}
              {!viewingUsername && tab === 'yangiliklar' && <NewsView news={news} isLoading={newsLoading} session={session} onOpenSharedResource={openSharedResource} onOpenArena={() => goTo('arena')} onOpenBattle={() => { setTeamBattleRequest(true); goTo('testlar'); }} />}
              {!viewingUsername && tab === 'about' && <AboutView />}
              </RouteErrorBoundary>
            </PaperPanel>
          </>
        )}
      </main>
      {!readingActive && !viewingUsername && (tab === 'kurslar' || tab === 'profil') && (
        <footer className="mt-6 px-4 py-3 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>
          <a href="/privacy-policy.html" className="underline underline-offset-2" style={{ color: C.inkSoft }}>Maxfiylik siyosati</a>
        </footer>
      )}

      </div>

      {/* Mobil pastki navigatsiya paneli: beshta bo‘lim teng kenglikda */}
      {!readingActive && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center px-1.5 pb-[max(6px,env(safe-area-inset-bottom))] pt-2"
          style={{ background: `linear-gradient(180deg, ${C.cover}, ${C.coverDeep})`, boxShadow: '0 -6px 20px rgba(15,61,46,0.25)' }}
          aria-label="Asosiy navigatsiya"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            const label = t.id === 'arena' ? 'Arena' : t.label;
            return (
              <button
                key={t.id}
                onClick={() => goTo(t.id)}
                aria-current={activeTab ? 'page' : undefined}
                className="nav-btn flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-1.5 rounded-2xl focus-visible:outline focus-visible:outline-2"
                style={{
                  color: activeTab ? C.cover : 'rgba(251,250,243,0.72)',
                  background: activeTab ? C.gold : 'transparent',
                  outlineColor: C.gold,
                }}
              >
                <Icon size={19} strokeWidth={activeTab ? 2.3 : 1.8} />
                <span className="text-[10px] leading-tight whitespace-nowrap" style={{ ...fontBody, fontWeight: activeTab ? 600 : 400 }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {followerShareResource && <Suspense fallback={null}><DeferredFollowerShareDialog resource={followerShareResource} session={session} onClose={() => setFollowerShareResource(null)} /></Suspense>}

      {globalSearchOpen && <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(12,24,17,.45)' }}><Loader2 size={22} className="animate-spin" style={{ color: C.goldSoft }} /></div>}>
        <GlobalSearchView onClose={() => setGlobalSearchOpen(false)} onOpenItem={openSearchItem} onOpenProfile={openSearchProfile} categories={categories} registerOverlayBackHandler={nav.registerOverlayBackHandler} />
      </Suspense>}

      {learningTasksOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,27,18,0.58)' }}><Loader2 size={22} className="animate-spin" style={{ color: C.goldSoft }} /></div>}>
          <LearningTasksModal
            session={session}
            eligible={learningBadgeEligible}
            onKnownComplete={markLearningTaskComplete}
            onCheckOwned={checkLearningBadgeOwned}
            C={C}
            fontBody={fontBody}
            fontDisplay={fontDisplay}
            fontMono={fontMono}
            onClose={() => setLearningTasksOpen(false)}
            onStartTest={() => { setLearningTasksOpen(false); setTab('testlar'); }}
            onOpenGift={() => { setLearningTasksOpen(false); setLearningBadgeError(''); setGiftOpen(true); }}
          />
        </Suspense>
      )}
      {giftOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,27,18,0.62)' }}><Loader2 size={22} className="animate-spin" style={{ color: C.goldSoft }} /></div>}>
        <DeferredGiftModal
          session={session}
          eligible={learningBadgeEligible}
          onAccept={claimLearningBadge}
          onStartTest={() => { setGiftOpen(false); setTab('testlar'); }}
          onRequireLogin={() => { setGiftOpen(false); setTab('profil'); }}
          onClose={() => setGiftOpen(false)}
        />
        </Suspense>
      )}
      {testAuthIntent && !authLoading && !session?.user?.id && !(initialDeepLink?.type === 'test' && sharedTestEntryActive) && (
        <TestAccountPrompt
          modal
          loading={authLoading}
          busy={testAuthBusy}
          error={testAuthError}
          onSignIn={() => beginTestAccountSignIn()}
          onBrowse={() => { setTestAuthIntent(null); setTestAuthError(''); }}
        />
      )}
    </div>
    </ThemeContext.Provider>
    </NavContext.Provider>
    </SectionLoadingProvider>
  );
}
