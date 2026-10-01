import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  BookOpen, ListChecks, Info, Plus, X, Check, ChevronRight, ArrowLeft, Trash2, Award, Loader2,
  Paperclip, RotateCcw, MoreVertical, Pencil, CheckCircle2, Users, Search, Sun, Moon,
  LogIn, LogOut, UserCircle2, ShieldCheck, Lock, Clock3, Home, Settings, Share2,
  Trophy, Medal, Image as ImageIcon, Calculator, FileText, Pause, Play as Play2, Compass
} from 'lucide-react';
import { signInWithGoogle } from './supabaseClient';
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
      className="aspect-square min-w-0 rounded-lg flex flex-col items-center justify-center gap-2 p-2.5 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2"
      style={{ background: C.surface, border: `1px solid ${C.rule}`, outlineColor: C.gold }}
    >
      {kind === 'kurslar' ? <BookOpen size={20} style={{ color: C.gold, flexShrink: 0 }} /> : <ListChecks size={20} style={{ color: C.gold, flexShrink: 0 }} />}
      <div
        className="text-[12px] leading-tight w-full"
        style={{ ...fontBody, color: C.ink, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {item.title}
      </div>
    </button>
  );

  return (
    <div>
      {backButton}

      <div className="rounded-lg overflow-hidden mb-6" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <div className="h-24 sm:h-28" style={{ background: bannerGradient(row.bannerKey) }} />
        <div className="px-5 pb-5 -mt-12 relative">
          <div className="flex items-end justify-between gap-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: C.surface, border: `3px solid ${C.surface}`, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: bannerGradient(row.bannerKey) }}>
                <span className="text-xl" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>
                  {(row.firstName || '?').slice(0, 1).toUpperCase()}{(row.lastName || '').slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>
            {/* Kelajakda shu joyga "Kuzatish" (Follow) tugmasi qo'shiladi — 
                layout shunga tayyor turibdi. */}
          </div>

          <div className="mt-3 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-medium text-lg truncate" style={{ ...fontDisplay, color: C.ink, fontWeight: 700 }}>{fullName || `@${row.username}`}</span>
              {badge && <CollectibleThumb collectibleId={badge} size={20} />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-[13px]" style={{ ...fontMono, color: C.gold }}>@{row.username}</div>
              <ShareButton url={buildShareUrl({ u: row.username })} title={fullName || row.username} small />
            </div>
            {row.bio && <p className="text-[14px] mt-2 max-w-md" style={{ ...fontBody, color: C.inkSoft }}>{row.bio}</p>}
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

      {/* Instagram uslubidagi bo'lim almashtirgich. Kelajakda yana bo'lim
          (masalan "Kolleksiyalar") qo'shilsa, shu qatorga yana bitta
          tugma qo'shish kifoya. */}
      <div className="flex" style={{ borderTop: `1px solid ${C.rule}` }}>
        <button
          onClick={() => setSection('kurslar')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px]"
          style={{ ...fontMono, letterSpacing: '0.04em', color: section === 'kurslar' ? C.ink : C.inkSoft, borderTop: `2px solid ${section === 'kurslar' ? C.ink : 'transparent'}`, marginTop: '-1px' }}
        >
          <BookOpen size={15} /> MAVZULAR
        </button>
        <button
          onClick={() => setSection('testlar')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px]"
          style={{ ...fontMono, letterSpacing: '0.04em', color: section === 'testlar' ? C.ink : C.inkSoft, borderTop: `2px solid ${section === 'testlar' ? C.ink : 'transparent'}`, marginTop: '-1px' }}
        >
          <ListChecks size={15} /> TESTLAR
        </button>
      </div>

      {contentLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Materiallar yuklanmoqda...
        </div>
      ) : contentError ? (
        <div className="py-10 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          Materiallarni yuklab boʻlmadi. Sahifani yangilab qayta urinib koʻring.
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>
            {section === 'kurslar' ? 'Hozircha ommaviy mavzu yoʻq.' : 'Hozircha ommaviy test yoʻq.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3">
          {items.map((item) => (
            <Tile key={item.id} item={item} kind={section} />
          ))}
        </div>
      )}
    </div>
  );
}



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

export function ProfileView({ session, profile, authLoading, onSaveProfile, onSignOut, courses, tests, categories, submitCourse, approveCourse, deleteCourse, submitTest, approveTest, deleteTest, target, onConsumeTarget, isAdmin, ensureCourseContent, ensureTestContent, onGoToAbout }) {
  const [subTab, setSubTab] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState('');
  const [testFormMode, setTestFormMode] = useState(null);
  const myBadge = useAuthorBadge(session?.user?.id);
  const [ownContent, setOwnContent] = useState({ userId: null, courses: [], tests: [], loading: false });
  const { pushNav } = useContext(NavContext);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setOwnContent({ userId: null, courses: [], tests: [], loading: false });
      return undefined;
    }
    let cancelled = false;
    setOwnContent((previous) => ({ ...previous, userId, loading: true }));
    Promise.all([
      sbSelectAuthorContent('courses', userId),
      sbSelectAuthorContent('tests', userId),
    ]).then(([ownCourses, ownTests]) => {
      if (!cancelled) setOwnContent({ userId, courses: ownCourses, tests: ownTests, loading: false });
    }).catch((error) => {
      console.error('Muallif materiallarini profil uchun yuklab bo‘lmadi:', error);
      if (!cancelled) setOwnContent({ userId, courses: [], tests: [], loading: false });
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);
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


  const ownCourses = ownContent.userId === session.user.id ? ownContent.courses : [];
  const ownTests = ownContent.userId === session.user.id ? ownContent.tests : [];
  // Yangi qo'shilgan yoki boshqa ekran orqali yangilangan qatorlar darhol ko'rinsin.
  const myCourses = Array.from(new Map([
    ...ownCourses.map((item) => [item.id, item]),
    ...courses.filter((item) => item.authorId === session.user.id).map((item) => [item.id, item]),
  ]).values());
  const myTests = Array.from(new Map([
    ...ownTests.map((item) => [item.id, item]),
    ...tests.filter((item) => item.authorId === session.user.id).map((item) => [item.id, item]),
  ]).values());

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

      <div className="mt-8 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>
        UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()} ·{' '}
        <button onClick={onGoToAbout} className="underline underline-offset-2">Biz haqimizda</button>
      </div>
    </div>
  );
}


