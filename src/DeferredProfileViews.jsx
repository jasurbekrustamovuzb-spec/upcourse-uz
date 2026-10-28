import { useState, useEffect, useContext, useRef, Suspense } from 'react';
import { ArrowLeft, Award, BookOpen, Check, CheckCircle2, ChevronRight, Coins, Gift, ListChecks, Loader2, Lock, LogIn, LogOut, Medal, Settings, ShieldCheck, ShoppingBag, Tag, UserCircle2, Users, X } from 'lucide-react';
import { BANNER_PRESETS, C, CollectibleThumb, EmptyState, GhostButton, LinkedUsernameText, ProfileFollowView, PublicCollectionsView, RatingBadgeCollection, SectionLoading, SectionHeading, ShareButton, SolidButton, TextField, bannerGradient, buildShareUrl, checkUsernameAvailable, collectibleFromRow, fontBody, fontDisplay, fontMono, GIFT_CONTENT, GIFT_ID, isReservedUsername, isValidUsername, normalizeUsername, profileFromRow, sbInsert, sbSelect, sbSelectAuthorContent, sbUpdate, setAuthorBadgeCache, suggestAvailableUsername, unequipOtherCollectibles, useAuthorBadge, userCollectibleFromRow, usernameChangeDaysLeft, NavContext } from './App.jsx';
import { supabase } from './supabaseClient.js';
import { signInWithGoogle, switchGoogleAccount } from './supabaseClient.js';
import TeamBattleLibrary from './TeamBattleLibrary.jsx';

const PausedTestsPanel = lazy(() => import('./PausedTestsPanel.jsx'));
export function PublicProfileView({ username, courses, tests, onBack, onOpenItem, onOpenProfile, session }) {
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState(false);
  const [section, setSection] = useState('kurslar'); // kurslar | testlar | kolleksiyalar
  const [authorContent, setAuthorContent] = useState({ userId: null, courses: [], tests: [] });
  const [contentError, setContentError] = useState(false);
  const badge = useAuthorBadge(row?.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContentLoading(false);
    setErr(false);
    setContentError(false);
    setRow(null);
    setAuthorContent({ userId: null, courses: [], tests: [] });
    (async () => {
      let profileRow;
      try {
        const rows = await sbSelect('profiles', 'username=eq.' + encodeURIComponent(username));
        profileRow = rows[0] ? profileFromRow(rows[0]) : null;
      } catch (e) {
        if (!cancelled) setErr(true);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;
      setRow(profileRow);
      setLoading(false);
      if (!profileRow) return;

      // Profil kartasi kurs/test so'rovlarini kutmay darhol ko'rinadi.
      // Kontent so'rovlari fon rejimida parallel davom etadi.
      setContentLoading(true);
      try {
        const [courseRows, testRows] = await Promise.all([
          sbSelectAuthorContent('courses', profileRow.id, true, profileRow),
          sbSelectAuthorContent('tests', profileRow.id, true, profileRow),
        ]);
        if (!cancelled) setAuthorContent({ userId: profileRow.id, courses: courseRows, tests: testRows });
      } catch (e) {
        if (!cancelled) setContentError(true);
      } finally {
        if (!cancelled) setContentLoading(false);
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
        <SectionLoading label="Profil ma’lumotlari yuklanmoqda…" compact />
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
  const loadedCourses = authorContent.userId === row.id ? authorContent.courses : [];
  const loadedTests = authorContent.userId === row.id ? authorContent.tests : [];
  const myCourses = Array.from(new Map([
    ...courses.filter((item) => item.authorId === row.id && item.status === 'approved').map((item) => [item.id, item]),
    ...loadedCourses.map((item) => [item.id, item]),
  ]).values());
  const myTests = Array.from(new Map([
    ...tests.filter((item) => item.authorId === row.id && item.status === 'approved').map((item) => [item.id, item]),
    ...loadedTests.map((item) => [item.id, item]),
  ]).values());
  const items = section === 'kurslar' ? myCourses : section === 'testlar' ? myTests : [];

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
            {row.bio && <LinkedUsernameText text={row.bio} className="text-[14px] mt-2 max-w-md" style={{ ...fontBody, color: C.inkSoft }} />}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 pt-4" style={{ borderTop: `1px solid ${C.rule}` }}>
            <div>
              <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{contentLoading ? '…' : myCourses.length}</div>
              <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Mavzular</div>
            </div>
            <div>
              <div className="text-base font-medium" style={{ ...fontMono, color: C.ink }}>{contentLoading ? '…' : myTests.length}</div>
              <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Testlar</div>
            </div>
            <Suspense fallback={<div className="h-9 w-24 rounded-full animate-pulse" style={{ background: C.paper }} />}>
              <ProfileFollowView userId={row.id} session={session} onOpenProfile={onOpenProfile} />
            </Suspense>
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
        <button
          onClick={() => setSection('kolleksiyalar')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] sm:text-[12px]"
          style={{ ...fontMono, letterSpacing: '0.04em', color: section === 'kolleksiyalar' ? C.ink : C.inkSoft, borderTop: `2px solid ${section === 'kolleksiyalar' ? C.ink : 'transparent'}`, marginTop: '-1px' }}
        >
          <Award size={15} /> NISHONLAR
        </button>
      </div>

      {section === 'kolleksiyalar' ? (
        <Suspense fallback={<SectionLoading label="Kolleksiyalar yuklanmoqda…" compact />}>
          <PublicCollectionsView userId={row.id} />
        </Suspense>
      ) : contentError && items.length === 0 ? (
        <div className="py-10 text-center text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          Materiallarni yuklab boʻlmadi. Sahifani yangilab qayta urinib koʻring.
        </div>
      ) : contentLoading && authorContent.userId !== row.id ? (
        <SectionLoading label="Materiallar yuklanmoqda…" compact />
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

export function ProfileView({ session, profile, authLoading, pausedTests, onResumePausedTest, onPausedTestVisibilityChange, onSaveProfile, onSignOut, courses, tests, categories, submitCourse, approveCourse, deleteCourse, updateCourse, submitTest, approveTest, deleteTest, updateTest, renameCategory, target, onConsumeTarget, isAdmin, ensureCourseContent, ensureTestContent, onGoToAbout, onOpenAdmin, onOpenProfile, onOpenArena }) {
  const [subTab, setSubTab] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState('');
  const [testFormMode, setTestFormMode] = useState(null);
  const myBadge = useAuthorBadge(session?.user?.id);
  const [ownContent, setOwnContent] = useState({ userId: null, courses: [], tests: [], loading: false, error: false });
  const { pushNav } = useContext(NavContext);

  // Muallif kontentini faqat profil ochilganda so'raymiz; bosh sahifadagi tez yuklanishga ta'sir qilmaydi.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setOwnContent({ userId: null, courses: [], tests: [], loading: false, error: false });
      return undefined;
    }
    let cancelled = false;
    setOwnContent((previous) => ({ ...previous, userId, loading: true, error: false }));
    Promise.all([
      sbSelectAuthorContent('courses', userId, false, profile),
      sbSelectAuthorContent('tests', userId, false, profile),
    ]).then(([ownCourses, ownTests]) => {
      if (!cancelled) setOwnContent({ userId, courses: ownCourses, tests: ownTests, loading: false, error: false });
    }).catch((error) => {
      console.error('Muallif materiallarini profil uchun yuklab bo‘lmadi:', error);
      if (!cancelled) setOwnContent((previous) => ({ ...previous, userId, loading: false, error: true }));
    });
    return () => { cancelled = true; };
  }, [session?.user?.id, profile?.username, profile?.firstName, profile?.lastName]);
  const saveOwnCourseEdit = async (id, data, title, sourceItem) => {
    const saved = await updateCourse(id, data, title, sourceItem);
    if (saved) setOwnContent((previous) => ({
      ...previous,
      courses: previous.courses.map((item) => item.id !== id ? item : item.status === 'approved'
        ? { ...item, pendingEdit: data, pendingEditUpdatedAt: new Date().toISOString() }
        : { ...item, ...data }),
    }));
    return saved;
  };
  const saveOwnTestEdit = async (id, data, title, sourceItem) => {
    const saved = await updateTest(id, data, title, sourceItem);
    if (saved) setOwnContent((previous) => ({
      ...previous,
      tests: previous.tests.map((item) => item.id !== id ? item : item.status === 'approved'
        ? { ...item, pendingEdit: data, pendingEditUpdatedAt: new Date().toISOString() }
        : { ...item, ...data }),
    }));
    return saved;
  };
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

  if (authLoading) return <SectionLoading label="Profil yuklanmoqda…" />;

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


  const loadedOwnCourses = ownContent.userId === session.user.id ? ownContent.courses : [];
  const loadedOwnTests = ownContent.userId === session.user.id ? ownContent.tests : [];
  const myCourses = Array.from(new Map([
    ...loadedOwnCourses.map((item) => [item.id, item]),
    ...courses.filter((item) => item.authorId === session.user.id).map((item) => [item.id, item]),
  ]).values());
  const myTests = Array.from(new Map([
    ...loadedOwnTests.map((item) => [item.id, item]),
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
        updateCourse={saveOwnCourseEdit}
        renameCategory={renameCategory}
        ownerId={session.user.id}
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
        updateTest={saveOwnTestEdit}
        renameCategory={renameCategory}
        ownerId={session.user.id}
        formOpen={testFormOpen}
        onOpenForm={() => { setPrefillCategory(''); setTestFormMode(null); setTestFormOpen(true); pushNav(() => setTestFormOpen(false)); }}
        onCloseForm={() => setTestFormOpen(false)}
        prefillCategory={prefillCategory}
        formMode={testFormMode}
        ensureTestContent={ensureTestContent}
      />
    );
  }

  if (subTab === 'jamoaviy-savollar') return <TeamBattleLibrary onBack={() => setSubTab(null)} />;

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
            <div className="flex items-center gap-2 mb-1">
              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium"
                  style={{ ...fontBody, color: C.cover, background: C.goldSoft, border: `1px solid ${C.coverLine}` }}
                >
                  <ShieldCheck size={14} /> Admin panel
                </button>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Sozlamalar"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                style={{ color: C.inkSoft, border: `1px solid ${C.rule}`, background: C.surface }}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {settingsOpen && (
            <ProfileSettingsPanel
              profile={profile}
              currentUserId={session.user.id}
              onSave={onSaveProfile}
              onSignOut={onSignOut}
              onSwitchAccount={switchGoogleAccount}
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
              <LinkedUsernameText text={profile.bio} className="text-[14px] mt-2 max-w-md" style={{ ...fontBody, color: C.inkSoft }} />
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
            <Suspense fallback={<span className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Yuklanmoqda…</span>}>
              <ProfileFollowView userId={session.user.id} session={session} onOpenProfile={onOpenProfile} />
            </Suspense>
          </div>
        </div>
      </div>

      {!!pausedTests?.length && <Suspense fallback={null}><PausedTestsPanel attempts={pausedTests} placement="profile" onResume={onResumePausedTest} onVisibilityChange={onPausedTestVisibilityChange} /></Suspense>}
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
        <button onClick={() => goSubTab('jamoaviy-savollar')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: C.gold }} />
            <div>
              <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>Jamoaviy jang savollari</div>
              <div className="text-xs" style={{ ...fontMono, color: C.inkSoft }}>Saqlangan savol-javob toʻplamlari</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: C.gold }} />
        </button>        <button onClick={() => goSubTab('kolleksiya')} className="flex items-center justify-between p-5 rounded-sm text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
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

      <div className="mt-5">
        <ProfileRewardsPanel />
      </div>

      <div className="mt-8 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>
        UpCourse Uz — ochiq taʼlim platformasi, {new Date().getFullYear()} ·{' '}
        <button onClick={onGoToAbout} className="underline underline-offset-2">Biz haqimizda</button>
      </div>
    </div>
  );
}
export function GiftModal({ session, onRequireLogin, onClose, collectibleId, onChange, eligible = false, onAccept, onStartTest }) {
  const targetId = collectibleId || GIFT_ID;
  const meta = GIFT_CONTENT[targetId] || GIFT_CONTENT[GIFT_ID];
  const [phase, setPhase] = useState('loading'); // loading | offer | owned | busy | error
  const [equipped, setEquipped] = useState(false);
  const [rowId, setRowId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) { setPhase(targetId === GIFT_ID && eligible ? 'earned' : 'offer'); return; }
      try {
        const rows = await sbSelect('user_collectibles', `user_id=eq.${session.user.id}&collectible_id=eq.${targetId}`, 'collected_at');
        if (cancelled) return;
        if (rows[0]) {
          const uc = userCollectibleFromRow(rows[0]);
          setRowId(uc.id);
          setEquipped(uc.equipped);
          setPhase('owned');
        } else {
          setPhase(targetId === GIFT_ID && eligible ? 'earned' : 'offer');
        }
      } catch (e) {
        if (!cancelled) setPhase(targetId === GIFT_ID && eligible ? 'earned' : 'offer');
      }
    })();
    return () => { cancelled = true; };
  }, [session, targetId]);

  async function accept() {
    if (!session) { onRequireLogin(); return; }
    setPhase('busy');
    try {
      if (targetId === GIFT_ID && onAccept) {
        const created = await onAccept();
        if (created?.id) setRowId(created.id);
        setEquipped(!!created?.equipped);
        setPhase('owned');
        if (onChange) onChange(!!created?.equipped);
        return;
      }
      const [created] = await sbInsert('user_collectibles', { user_id: session.user.id, collectible_id: targetId, equipped: true });
      setRowId(created.id);
      setEquipped(true);
      setPhase('owned');
      setAuthorBadgeCache(session.user.id, targetId);
      unequipOtherCollectibles(session.user.id, targetId);
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
      if (next) unequipOtherCollectibles(session.user.id, targetId);
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
          <meta.Badge />
          <div className="mt-4 text-lg" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>{meta.title}</div>
          <div className="text-[13px] mt-1" style={{ ...fontBody, color: 'rgba(251,250,243,0.75)' }}>{meta.subtitle}</div>
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
                {meta.offer}
              </p>
              {targetId === GIFT_ID
                ? <SolidButton onClick={onStartTest} icon={BookOpen}>Testni ishlash</SolidButton>
                : <SolidButton onClick={accept} icon={Award}>Qabul qilish</SolidButton>}
            </>
          )}

          {phase === 'earned' && (
            <>
              <div className="mb-4 rounded-lg px-4 py-3 text-left" style={{ background: '#F1EDFF', border: '1px solid #D8CCFF' }}>
                <div className="text-sm font-semibold" style={{ ...fontBody, color: '#44366F' }}>Olish sharti bajarildi</div>
                <div className="mt-1 text-xs" style={{ ...fontBody, color: '#625A78' }}>Istalgan testdan kamida 70% natija</div>
              </div>
              <SolidButton onClick={accept} icon={Award}>Nishonni qabul qilish</SolidButton>
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

export function CollectionsView({ session, onBack }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState([]);
  const [ratingBadges, setRatingBadges] = useState([]);
  const [collectionType, setCollectionType] = useState('gifts');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ownedResult, catalogResult, ratingResult] = await Promise.allSettled([
          sbSelect('user_collectibles', `user_id=eq.${session.user.id}`, 'collected_at'),
          sbSelect('collectibles'),
          supabase.rpc('daily_arena_get_profile', { target_user_id: session.user.id }),
        ]);
        if (cancelled) return;
        if (ownedResult.status === 'rejected') throw ownedResult.reason;
        // Katalog vaqtincha javob bermasa ham, foydalanuvchining saqlangan sovg'alarini yashirmaymiz.
        setOwned(ownedResult.value.map(userCollectibleFromRow));
        setCatalog(catalogResult.status === 'fulfilled' ? catalogResult.value.map(collectibleFromRow) : []);
        setRatingBadges(ratingResult.status === 'fulfilled' && !ratingResult.value.error ? (ratingResult.value.data?.badges || []) : []);
        setState('ready');
      } catch (e) {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [session.user.id]);

  function handleEquipChange(collectibleId, next) {
    setOwned((prev) => prev.map((o) => {
      if (o.collectibleId === collectibleId) return { ...o, equipped: next };
      return next ? { ...o, equipped: false } : o;
    }));
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm mb-4 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}>
        <ArrowLeft size={15} /> Profil
      </button>
      <SectionHeading eyebrow="Mening hisobim" title="Kolleksiyalar" />

      {state === 'ready' && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kolleksiya toifalari">
          <button role="tab" aria-selected={collectionType === 'gifts'} onClick={() => setCollectionType('gifts')} className="shrink-0 rounded-full px-3.5 py-2 text-xs" style={{ ...fontBody, color: collectionType === 'gifts' ? C.white : C.inkSoft, background: collectionType === 'gifts' ? C.cover : C.paper, border: `1px solid ${collectionType === 'gifts' ? C.cover : C.rule}` }}>Sovg‘a va nishonlar · {owned.length}</button>
          <button role="tab" aria-selected={collectionType === 'rating'} onClick={() => setCollectionType('rating')} className="shrink-0 rounded-full px-3.5 py-2 text-xs" style={{ ...fontBody, color: collectionType === 'rating' ? C.white : C.inkSoft, background: collectionType === 'rating' ? C.cover : C.paper, border: `1px solid ${collectionType === 'rating' ? C.cover : C.rule}` }}>Reyting nishonlari · {ratingBadges.length}</button>
        </div>
      )}

      {state === 'loading' && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: C.gold }} />
        </div>
      )}

      {state === 'error' && (
        <div className="text-[14px]" style={{ ...fontBody, color: C.red }}>Yuklab boʻlmadi. Birozdan keyin qayta urinib koʻring.</div>
      )}

      {state === 'ready' && (
        collectionType === 'rating' ? (
          <RatingBadgeCollection badges={ratingBadges} />
        ) : owned.length === 0 ? (
          <EmptyState text="Hozircha kolleksiyangizda hech narsa yoʻq. Nishonlarni yigʻib boring!" />
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

export function BannerPicker({ value, onChange }) {
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

export function UsernameField({ value, onChange, currentUserId, locked, lockedDaysLeft }) {
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

export function ProfileSetupForm({ defaultFirstName, defaultLastName, defaultBio, defaultBannerKey, currentUserId, onSave }) {
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

export function ProfileSettingsPanel({ profile, currentUserId, onSave, onSignOut, onSwitchAccount, onClose }) {
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [bannerKey, setBannerKey] = useState(profile.bannerKey || 'green');
  const [busy, setBusy] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
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

  async function switchAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    setFormError(null);
    try {
      const { error } = await onSwitchAccount();
      if (error) {
        setFormError('Google akkaunt tanlash oynasini ochib boʻlmadi. Qayta urinib koʻring.');
        setSwitchingAccount(false);
      }
    } catch {
      setFormError('Google akkaunt tanlash oynasini ochib boʻlmadi. Qayta urinib koʻring.');
      setSwitchingAccount(false);
    }
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
          <button
            type="button"
            onClick={switchAccount}
            disabled={switchingAccount}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-sm disabled:opacity-60"
            style={{ ...fontBody, color: C.ink, border: `1px solid ${C.gold}`, background: C.surface }}
          >
            <LogIn size={14} /> {switchingAccount ? 'Google ochilmoqda...' : 'Akkauntni almashtirish'}
          </button>
          <p className="text-[11px] mt-1.5 mb-4 text-center" style={{ ...fontBody, color: C.inkSoft }}>
            Boshqa Google akkauntini tanlang.
          </p>
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

export function ProfileRewardsPanel() {
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [coins, setCoins] = useState(null);
  const [code, setCode] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [store, setStore] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeBusy, setStoreBusy] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('daily_arena_wallet').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setCoins(null);
        setMessage('Coin hamyonini yuklab boʻlmadi.');
        setMessageIsError(true);
        return;
      }
      setCoins(Number(data?.coins) || 0);
    });
    return () => { cancelled = true; };
  }, []);

  async function redeem(event) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    const { data, error } = await supabase.rpc('daily_arena_redeem_promo', { p_code: code });
    setBusy(false);
    if (error) {
      setMessage(error.message?.includes('PROMO_USED')
        ? 'Bu promo kod hisobingizda avval ishlatilgan.'
        : 'Kod yaroqsiz, muddati tugagan yoki ishlatish limiti toʻlgan.');
      setMessageIsError(true);
      return;
    }
    setCoins(Number(data?.coins) || 0);
    setCode('');
    setMessage(`Promo kod qabul qilindi: +${Number(data?.earned) || 0} coin.`);
  }

  async function openStore() {
    setStoreOpen(true);
    setStoreLoading(true);
    setMessage('');
    const { data, error } = await supabase.rpc('daily_arena_store_catalog');
    if (error) {
      setStore(null);
      setMessage('Coin do‘konini yuklab bo‘lmadi. Qayta urinib ko‘ring.');
      setMessageIsError(true);
    } else {
      const catalog = data || { coins: 0, items: [] };
      setStore(catalog);
      setCoins(Number(catalog.coins) || 0);
    }
    setStoreLoading(false);
  }

  async function purchase(item) {
    if (storeBusy) return;
    setStoreBusy(item.id);
    setMessage('');
    setMessageIsError(false);
    const { error } = await supabase.rpc('daily_arena_store_purchase', { p_collectible_id: item.id });
    if (error) {
      setMessage(error.message?.includes('NOT_ENOUGH_COINS')
        ? 'Coin yetarli emas. Kunlik Arenada mashqlarni bajaring.'
        : 'Xarid amalga oshmadi. Qayta urinib ko‘ring.');
      setMessageIsError(true);
      setStoreBusy('');
      return;
    }
    const { data, error: catalogError } = await supabase.rpc('daily_arena_store_catalog');
    if (!catalogError) {
      const catalog = data || { coins: 0, items: [] };
      setStore(catalog);
      setCoins(Number(catalog.coins) || 0);
    }
    setMessage('Nishon kolleksiyangizga qo‘shildi.');
    setStoreBusy('');
  }

  return (
    <section className="mb-4">
      <button type="button" onClick={() => setRewardsOpen((open) => !open)} aria-expanded={rewardsOpen} aria-controls="profile-rewards-panel" aria-label="Coin va promo imkoniyatlari" className="inline-flex items-center gap-2 rounded-full px-3 py-2" style={{ ...fontBody, color: C.cover, background: C.goldSoft, border: `1px solid ${C.gold}` }}>
        <Coins size={16} />
        <span className="text-xs font-medium" style={fontMono}>{coins === null ? '…' : coins}</span>
        <ChevronRight size={14} className="transition-transform" style={{ transform: rewardsOpen ? 'rotate(90deg)' : 'none' }} />
      </button>
      {rewardsOpen && <div id="profile-rewards-panel" className="mt-2 rounded-sm p-3 sm:p-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: C.goldSoft, color: C.cover }}><Coins size={20} /></span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Mukofotlar</div>
            <div className="font-medium" style={{ ...fontDisplay, color: C.ink }}>Coin hamyoni <span className="ml-1" style={{ ...fontMono, color: C.cover }}>{coins === null ? '…' : `${coins} coin`}</span></div>
          </div>
        </div>
        <button type="button" onClick={openStore} className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm" style={{ ...fontBody, color: C.white, background: C.cover }}>
          <ShoppingBag size={15} /> Coin do‘koni
        </button>
      </div>
      <div className="mt-3">
        <button type="button" onClick={() => setPromoOpen((open) => !open)} aria-expanded={promoOpen} aria-controls="profile-promo-panel" className="inline-flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm" style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}`, background: C.paper }}>
          <Tag size={15} style={{ color: C.gold }} /> Promo kod
          <ChevronRight size={15} className="transition-transform" style={{ transform: promoOpen ? 'rotate(90deg)' : 'none', color: C.gold }} />
        </button>
        {promoOpen && <div id="profile-promo-panel" className="mt-2 rounded-sm p-3" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
          <form onSubmit={redeem} className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="profile-promo-code">Promo kod</label>
            <input id="profile-promo-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" placeholder="Promo kodni kiriting" className="min-w-0 flex-1 rounded-sm px-3 py-2.5 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }} />
            <button type="submit" disabled={busy || !code.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />} Kodni ishlatish
            </button>
          </form>
          {message && <p role={messageIsError ? 'alert' : 'status'} className="mt-2 text-xs" style={{ ...fontBody, color: messageIsError ? C.red : C.accent }}>{message}</p>}
        </div>}
      </div>
      {message && !promoOpen && <p role={messageIsError ? 'alert' : 'status'} className="mt-2 text-xs" style={{ ...fontBody, color: messageIsError ? C.red : C.accent }}>{message}</p>}

      {storeOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="profile-store-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setStoreOpen(false); }} style={{ background: 'rgba(12,25,18,.62)' }}>
        <div className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl p-4 sm:p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><div className="text-[10px] uppercase tracking-widest" style={{ ...fontMono, color: C.gold }}>Profil mukofotlari</div><h2 id="profile-store-title" className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>Coin do‘koni</h2></div>
            <button type="button" onClick={() => setStoreOpen(false)} aria-label="Do‘konni yopish" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.paper }}><X size={17} /></button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ background: C.paper }}><Coins size={18} style={{ color: C.gold }} /><span className="text-sm" style={{ ...fontBody, color: C.ink }}>Balansingiz</span><b className="ml-auto" style={{ ...fontMono, color: C.cover }}>{coins ?? 0} coin</b></div>
          <p className="text-xs mb-3" style={{ ...fontBody, color: C.inkSoft }}>Coinlaringizni esdalik nishonlariga almashtiring. Yangi coinlarni Kunlik Arenadagi mashqlardan to‘plang.</p>
          {storeLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: C.gold }} /></div> : <>
            {message && <p role={messageIsError ? 'alert' : 'status'} className="text-xs mb-3" style={{ ...fontBody, color: messageIsError ? C.red : C.accent }}>{message}</p>}
            <div className="space-y-2">
              {(store?.items || []).map((item) => <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ color: C.gold, background: C.goldSoft + '77' }}><Medal size={20} /></span>
                <div className="min-w-0 flex-1"><b className="block text-sm" style={{ ...fontBody, color: C.ink }}>{item.title}</b><span className="block text-xs truncate" style={{ ...fontBody, color: C.inkSoft }}>{item.subtitle || 'Kolleksiyaga qo‘shiladigan esdalik nishoni'}</span></div>
                {item.owned ? <span className="text-xs" style={{ ...fontBody, color: C.accent }}>Olingan</span> : <button type="button" disabled={Boolean(storeBusy) || coins === null || coins < item.price} onClick={() => purchase(item)} className="px-3 py-2 rounded-lg text-xs disabled:opacity-45" style={{ ...fontBody, color: C.white, background: C.cover }}>{storeBusy === item.id ? <Loader2 size={14} className="inline animate-spin" /> : `${item.price} coin`}</button>}
              </div>)}
              {store && !store.items?.length && <p className="text-sm py-5 text-center" style={{ ...fontBody, color: C.inkSoft }}>Do‘kon nishonlari hozircha mavjud emas.</p>}
            </div>
          </>}
        </div>
      </div>}
      </div>}
    </section>
  );
}

import { CommunityCoursesView, CommunityTestsView } from './DeferredCommunityViews.jsx';
