import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  BookOpen, ListChecks, Info, Plus, X, Check, ChevronRight, ArrowLeft, Trash2, Award, Loader2,
  Paperclip, RotateCcw, MoreVertical, Pencil, CheckCircle2, Users, Search, Sun, Moon,
  LogIn, LogOut, UserCircle2, ShieldCheck, Lock, Clock3, Home, Settings, Share2,
  Trophy, Medal, Image as ImageIcon, Calculator, FileText, Pause, Play as Play2, Compass
} from 'lucide-react';
import { signInWithGoogle, supabase } from './supabaseClient';
import {
  C, fontBody, fontDisplay, fontMono, NavContext, SectionHeading, EmptyState, ShareButton,
  buildShareUrl, sbSelect, sbSelectAuthorContent, profileFromRow, useAuthorBadge, bannerGradient, BANNER_PRESETS,
  normalizeUsername, isValidUsername, isReservedUsername, checkUsernameAvailable,
  usernameChangeDaysLeft, suggestAvailableUsername, TextField, GhostButton, SolidButton,
  CommunityCoursesView, CommunityTestsView, CollectionsView, CollectibleThumb,
} from './App';

export function PublicProfileView({ username, courses, tests, onBack, onOpenItem }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState(false);
  const [authorCourses, setAuthorCourses] = useState([]);
  const [authorTests, setAuthorTests] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [section, setSection] = useState('kurslar'); // kurslar | testlar — kelajakda yana tab qo'shsa bo'ladi
  const badge = useAuthorBadge(row?.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContentLoading(true);
    setErr(false);
    setContentError(false);
    setRow(null);
    setAuthorCourses([]);
    setAuthorTests([]);
    (async () => {
      try {
        const rows = await sbSelect('profiles', `username=eq.${encodeURIComponent(username)}`);
        const profileRow = rows[0] ? profileFromRow(rows[0]) : null;
        if (cancelled) return;
        setRow(profileRow);
        if (!profileRow) return;

        // Reytingdan ochilganda ilova kurs/test ro'yxatlarini hali yuklamagan bo'lishi mumkin.
        // Faqat shu muallifning tasdiqlangan metadata qatorlari so'raladi.
        const [courseRows, testRows] = await Promise.all([
          sbSelectAuthorContent('courses', profileRow.id, true),
          sbSelectAuthorContent('tests', profileRow.id, true),
        ]);
        if (!cancelled) {
          setAuthorCourses(courseRows);
          setAuthorTests(testRows);
        }
      } catch (e) {
        if (!cancelled) setContentError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setContentLoading(false);
        }
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
  const myCourses = authorCourses;
  const myTests = authorTests;
  const items = section === 'kurslar' ? myCourses : myTests;

  /* Instagram uslubidagi kvadrat "plitka" — kurs/test kartochkasi.
     Kelajakda shu funksiyaga (masalan kolleksiya belgisi, ball, yoqtirish
     soni) qo'shimcha kichik elementlar qo'shish oson bo'lishi uchun
     alohida, mustaqil komponent qilib chiqarildi. */
  const Tile = ({ item, kind }) => (
    <button
      onClick={() => onOpenItem(kind, item.id)}
      className="aspect-square min-w-0 rounded-lg flex flex-col items-center justify-center gap-2 p-2.5 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visibo�w��$z{-���jם/>
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

      <SectionHeading eyebrow="Yangi kontent" title="Yaratish" />
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => {
            setSubTab('kurslar');
            setPrefillCategory('');
            setCourseFormOpen(true);
            pushNav(() => { setSubTab(null); setCourseFormOpen(false); });
          }}
          className="flex items-center gap-3 p-4 rounded-sm text-left transition-transform hover:-translate-y-0.5"
          style={{ background: C.goldSoft, border: `1px solid ${C.gold}` }}
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.surface, color: C.gold }}><Plus size={19} /></span>
          <span>
            <span className="block font-medium text-[15px]" style={{ ...fontBody, color: C.ink }}>Mavzu yaratish</span>
            <span className="block text-xs mt-0.5" style={{ ...fontBody, color: C.inkSoft }}>Yangi kurs yoki mavzu qoʻshing</span>
          </span>
        </button>
        <button
          onClick={() => {
            setSubTab('testlar');
            setPrefillCategory('');
            setTestFormMode(null);
            setTestFormOpen(true);
            pushNav(() => { setSubTab(null); setTestFormOpen(false); });
          }}
          className="flex items-center gap-3 p-4 rounded-sm text-left transition-transform hover:-translate-y-0.5"
          style={{ background: C.goldSoft, border: `1px solid ${C.gold}` }}
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.surface, color: C.gold }}><Plus size={19} /></span>
          <span>
            <span className="block font-medium text-[15px]" style={{ ...fontBody, color: C.ink }}>Test yaratish</span>
            <span className="block text-xs mt-0.5" style={{ ...fontBody, color: C.inkSoft }}>Yangi test tuzing va ulashing</span>
          </span>
        </button>
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
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>Yigʻgan nishonlaringiz</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>
      </div>

      <section className="mt-6 rounded-sm p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Milliy mock sertifikatlarim</div><div className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Yakunlangan milliy mock testlar natijalari va sertifikat ID’lari.</div></div><span className="rounded-full px-2.5 py-1 text-xs" style={{ ...fontMono, color: C.cover, background: C.goldSoft }}>{mockCertificates.length} ta</span></div>
        {mockCertificates.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{mockCertificates.map((item) => <div key={item.id} className="rounded-xl p-3" style={{ background: C.paper }}><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{item.exam.subject} · {item.grade}</div><div className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{item.exam.title} · {Number(item.score).toFixed(1)} ball</div><div className="mt-1 text-[11px]" style={{ ...fontMono, color: C.inkSoft }}>{item.certificate_id}</div></div><FileText size={18} style={{ color: C.gold }} /></div><a className="mt-2 inline-flex text-xs font-semibold underline" style={{ color: C.cover }} target="_blank" rel="noreferrer" href={`/?verifyCertificate=${encodeURIComponent(item.certificate_id)}`}>Haqiqiyligini tekshirish</a></div>)}</div> : <p className="mt-3 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Hozircha mock sertifikat yo‘q. Milliy sertifikat markazidagi testni yakunlaganingizdan keyin shu yerda ko‘rinadi.</p>}
      </section>

      <div className="mt-8 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>
        UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()} ·{' '}
        <button onClick={onGoToAbout} className="underline underline-offset-2">Biz haqimizda</button>
      </div>
    </div>
  );
}


