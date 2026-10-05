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
