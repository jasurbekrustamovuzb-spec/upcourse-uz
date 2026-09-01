import React, { useState, useContext } from 'react';
import {
  BookOpen, ListChecks, Newspaper, Plus, ChevronRight, ArrowLeft, Trash2,
  Pencil, ShieldCheck, Lock, Clock3,
} from 'lucide-react';
import {
  C, fontBody, fontMono, NavContext, formatDate,
  SectionHeading, EmptyState, EntryNumber, ItemMenu, GhostButton, IconButtonDelete,
  RenameCategoryModal, AddNewsForm, CommunityCoursesView, CommunityTestsView,
} from './App';

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

export default function AdminPanelView({ courses, tests, categories, news, submitCourse, approveCourse, deleteCourse, submitTest, approveTest, deleteTest, renameCategory, deleteCategory, addNews, deleteNews, ensureCourseContent, ensureTestContent }) {
  const [subTab, setSubTab] = useState(null);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);
  const { pushNav } = useContext(NavContext);
  const goSubTab = (id) => { setSubTab(id); pushNav(() => setSubTab(null)); };

  const pendingCourses = courses.filter((c) => c.status === 'pending');
  const pendingTests = tests.filter((t) => t.status === 'pending');
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
        formOpen={false}
        onOpenForm={() => {}}
        onCloseForm={() => {}}
        prefillCategory=""
        ensureTestContent={ensureTestContent}
      />
    );
  }
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
      </div>
    </div>
  );
}
