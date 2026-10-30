import { useState, useContext } from 'react';
import { ArrowLeft, Award, CheckCircle2, ChevronRight, Clock3, Lock, Pencil, Plus, Share2, Trash2, Users } from 'lucide-react';
import { AddCourseForm, AuthorLine, C, EditCourseForm, EmptyState, EntryNumber, GhostButton, ItemMenu, NavContext, PreviousItemsDisclosure, RenameCategoryModal, SectionHeading, SectionLoading, buildShareUrl, fontBody, fontDisplay, fontMono, shareItem } from './App.jsx';
import { QuizView } from './DeferredTestsView.jsx';
export function CommunityCoursesView({ courses, categories, openId, setOpenId, onBack, submitCourse, approveCourse, deleteCourse, updateCourse, renameCategory, ownerId, formOpen, onOpenForm, onCloseForm, prefillCategory, mode = 'admin', ensureCourseContent, onShareToFollowers }) {
  const [categoryId, setCategoryId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goOpen = (id) => { if (ensureCourseContent) ensureCourseContent(id); setOpenId(id); pushNav(() => setOpenId(null)); };
  const goEdit = (id) => { if (ensureCourseContent) ensureCourseContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const active = courses.find((c) => c.id === openId);
  const editing = courses.find((c) => c.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = courses.filter((c) => c.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => courses.some((c) => c.categoryId === cat.id));
  const isMine = mode === 'mine';
  const backLabel = isMine ? 'Profil' : 'Admin panel';
  const heading = isMine ? 'Mening mavzularim' : 'Hamjamiyat — Kurslar';
  const countLabel = isMine ? `${courses.length} ta` : `${courses.length} ta kutilmoqda`;
  const categoryContent = categoriesWithPending.length === 0 ? (
    <EmptyState text={isMine ? 'Hozircha mavzu qoʻshmagansiz.' : 'Hozircha foydalanuvchilar mavzu qoʻshmagan.'} cta="Quyidagi tugma orqali birinchi mavzuni qoʻshing." />
  ) : (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
      {categoriesWithPending.map((cat, i) => {
        const count = courses.filter((c) => c.categoryId === cat.id).length;
        return (
          <div key={cat.id} className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }} onClick={() => goCategory(cat.id)}>
            <div className="flex items-start min-w-0">
              <EntryNumber n={i + 1} />
              <div className="min-w-0">
                <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div>
                <div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta</div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
              {isMine && cat.authorId === ownerId && renameCategory && <ItemMenu actions={[{ label: 'Nomini oʻzgartirish', icon: Pencil, onClick: () => setRenaming(cat) }]} />}
              <ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} />
            </div>
          </div>
        );
      })}
    </div>
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
        {editing.content === undefined ? (
          <SectionLoading label="Mavzu yuklanmoqda…" compact />
        ) : (
          <EditCourseForm course={editing?.pendingEdit ? { ...editing, ...editing.pendingEdit } : editing} onSave={(data) => updateCourse(editing.id, data, editing.title, editing)} onDone={back} />
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
          <ArrowLeft size={15} /> {heading}
        </button>
        {active.status === 'pending' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Clock3 size={13} /> Tekshirilmoqda
          </div>
        )}
        {mode === 'admin' && active.pendingRevision && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Clock3 size={13} /> Muallif tahriri — tasdiqlansa saytdagi amaldagi nusxa yangilanadi
          </div>
        )}
        {isMine && active.pendingEdit && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Clock3 size={13} /> Tahrir tasdiq kutilmoqda — ommaviy nusxa hozircha o‘zgarishsiz
          </div>
        )}
        {active.status === 'private' && (
          <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-sm" style={{ ...fontMono, color: C.gold, background: C.cover, width: 'fit-content' }}>
            <Lock size={13} /> Maxfiy
          </div>
        )}
        <h3 className="text-2xl sm:text-3xl mb-4" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{active.title}</h3>
        <AuthorLine authorId={active.authorId} authorName={active.author} className="text-xs mb-4" />
        {active.content === undefined ? (
          <SectionLoading label="Mavzu yuklanmoqda…" compact />
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
        {formOpen ? (
          <>
            <AddCourseForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitCourse} onDone={back} onView={goOpen} />
            {categoriesWithPending.length > 0 && <PreviousItemsDisclosure label={isMine ? 'Avval yaratgan mavzularim' : 'Oldingi mavzular'} count={courses.length}>{categoryContent}</PreviousItemsDisclosure>}
          </>
        ) : categoryContent}

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

        {!formOpen && (
          <div className="mt-6">
            <GhostButton onClick={onOpenForm} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
          </div>
        )}
      </div>
    );
  }

  const topicCards = (
    <div className="grid sm:grid-cols-2 gap-4">
      {inCategory.map((c, i) => (
        <div key={c.id} className="min-w-0 group flex items-start justify-between p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }} onClick={() => goOpen(c.id)}>
          <div className="flex items-start min-w-0">
            <EntryNumber n={i + 1} />
            <div className="min-w-0">
              <div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{c.title}</div>
              {c.summary && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{c.summary}</div>}
              <AuthorLine authorId={c.authorId} authorName={c.author} className="text-xs mt-1.5" />
              {isMine && <div className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ ...fontMono, color: c.status === 'pending' ? C.gold : c.status === 'private' ? C.inkSoft : C.accent }}>{c.status === 'pending' ? <><Clock3 size={12} /> Tekshirilmoqda</> : c.status === 'private' ? <><Lock size={12} /> Maxfiy</> : <><CheckCircle2 size={12} /> Tasdiqlangan</>}</div>}
            </div>
          </div>
          <div className="flex items-center flex-shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
            <ItemMenu actions={[
              { label: 'Ulashish', icon: Share2, onClick: () => shareItem(buildShareUrl({ course: c.id }), c.title) },
              ...(isMine && onShareToFollowers ? [{ label: 'Kuzatuvchilarga yuborish', icon: Users, onClick: () => onShareToFollowers('course', c) }] : []),
              ...(updateCourse ? [{ label: 'Tahrirlash', icon: Pencil, onClick: () => goEdit(c.id) }] : []),
              ...(approveCourse && c.status === 'pending' ? [{ label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveCourse(c.id, c.title) }] : []),
              ...(!isMine || c.status === 'pending' || c.status === 'private' ? [{ label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteCourse(c.id, c.title) }] : []),
            ]} />
          </div>
        </div>
      ))}
    </div>
  );

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
      {formOpen ? (
        <>
          <AddCourseForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitCourse} onDone={back} onView={goOpen} />
          {inCategory.length > 0 && <PreviousItemsDisclosure label={isMine ? 'Shu kursdagi avvalgi mavzular' : 'Kursdagi avvalgi mavzular'} count={inCategory.length}>{topicCards}</PreviousItemsDisclosure>}
        </>
      ) : (
        <>
          {topicCards}
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi mavzu qoʻshish</GhostButton>
        </div>
        </>
      )}
    </div>
  );
}
export function CommunityTestsView({ tests, categories, openId, setOpenId, onBack, submitTest, approveTest, deleteTest, updateTest, renameCategory, ownerId, formOpen, onOpenForm, onCloseForm, prefillCategory, mode = 'admin', formMode, ensureTestContent, session, onShareToFollowers, effectivePrefs, onSavePrefs, onPauseAttempt, onClearPaused, onRequireAccount, onTestComplete, onBadgeClaim, badgeClaimBusy, badgeClaimError }) {
  const [categoryId, setCategoryId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const { pushNav, back } = useContext(NavContext);
  const goCategory = (id) => { setCategoryId(id); pushNav(() => setCategoryId(null)); };
  const goOpen = (id) => { if (ensureTestContent) ensureTestContent(id); setOpenId(id); pushNav(() => setOpenId(null)); };
  const goEdit = (id) => { if (ensureTestContent) ensureTestContent(id); setEditId(id); pushNav(() => setEditId(null)); };
  const active = tests.find((t) => t.id === openId);
  const editing = tests.find((t) => t.id === editId);
  const activeCategory = categories.find((c) => c.id === categoryId);
  const inCategory = tests.filter((t) => t.categoryId === categoryId);
  const categoriesWithPending = categories.filter((cat) => tests.some((t) => t.categoryId === cat.id));
  const isMine = mode === 'mine';
  const backLabel = isMine ? 'Profil' : 'Admin panel';
  const heading = isMine ? 'Mening testlarim' : 'Hamjamiyat — Testlar';
  const countLabel = isMine ? `${tests.length} ta` : `${tests.length} ta kutilmoqda`;
  const categoryContent = categoriesWithPending.length === 0 ? (
    <EmptyState text={isMine ? 'Hozircha test qoʻshmagansiz.' : 'Hozircha foydalanuvchilar test qoʻshmagan.'} cta="Quyidagi tugma orqali birinchi testni qoʻshing." />
  ) : (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
      {categoriesWithPending.map((cat, i) => {
        const count = tests.filter((t) => t.categoryId === cat.id).length;
        return <div key={cat.id} className="min-w-0 group flex items-start justify-between gap-2 p-3 sm:p-4 rounded-sm cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }} onClick={() => goCategory(cat.id)}>
          <div className="flex items-start min-w-0"><EntryNumber n={i + 1} /><div className="min-w-0"><div className="font-medium text-base truncate" style={{ ...fontBody, color: C.ink }}>{cat.name}</div><div className="text-xs mt-1" style={{ ...fontMono, color: C.gold }}>{count} ta</div></div></div>
          <div className="flex items-center gap-1 flex-shrink-0">{isMine && cat.authorId === ownerId && renameCategory && <ItemMenu actions={[{ label: 'Nomini oʻzgartirish', icon: Pencil, onClick: () => setRenaming(cat) }]} />}<ChevronRight size={16} style={{ color: C.gold, flexShrink: 0 }} /></div>
        </div>;
      })}
    </div>
  );
  const testCards = (
    <div className="grid sm:grid-cols-2 gap-4">
      {inCategory.map((t, i) => (
        <div key={t.id} className="min-w-0 flex items-start justify-between p-4 rounded-sm" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="flex items-start min-w-0"><EntryNumber n={i + 1} /><div className="min-w-0">
            <div className="font-medium text-base" style={{ ...fontBody, color: C.ink }}>{t.title}</div>
            {t.description && <div className="text-[15px] mt-1 line-clamp-2" style={{ ...fontBody, color: C.inkSoft }}>{t.description}</div>}
            <div className="text-xs mt-2" style={{ ...fontMono, color: C.gold }}>{t.questionCount ?? t.questions?.length ?? 0} ta savol</div>
            <AuthorLine authorId={t.authorId} authorName={t.author} className="text-xs mt-1.5" />
            {isMine && <div className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ ...fontMono, color: t.status === 'pending' ? C.gold : t.status === 'private' ? C.inkSoft : C.accent }}>{t.status === 'pending' ? <><Clock3 size={12} /> Tekshirilmoqda</> : t.status === 'private' ? <><Lock size={12} /> Maxfiy</> : <><CheckCircle2 size={12} /> Tasdiqlangan</>}</div>}
          </div></div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0"><ItemMenu actions={[
            { label: 'Ulashish', icon: Share2, onClick: () => shareItem(buildShareUrl({ test: t.id }), t.title) },
            ...(isMine && onShareToFollowers ? [{ label: 'Kuzatuvchilarga yuborish', icon: Users, onClick: () => onShareToFollowers('test', t) }] : []),
            ...(updateTest ? [{ label: 'Tahrirlash', icon: Pencil, onClick: () => goEdit(t.id) }] : []),
            ...(approveTest && t.status === 'pending' ? [{ label: 'Tasdiqlash', icon: CheckCircle2, onClick: () => approveTest(t.id, t.title) }] : []),
            ...(!isMine || t.status === 'pending' || t.status === 'private' ? [{ label: 'Oʻchirish', icon: Trash2, danger: true, onClick: () => deleteTest(t.id, t.title) }] : []),
          ]} /><button onClick={() => goOpen(t.id)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm" style={{ ...fontBody, color: C.white, background: C.cover }}><Award size={13} /> Boshlash</button></div>
        </div>
      ))}
    </div>
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
          <SectionLoading label="Test ma’lumotlari yuklanmoqda…" compact />
        ) : (
          <EditTestForm test={editing?.pendingEdit ? { ...editing, ...editing.pendingEdit } : editing} onSave={(data) => updateTest(editing.id, data, editing.title, editing)} onDone={back} />
        )}
      </div>
    );
  }

  if (active) {
    if (active.questions === undefined) {
      return (
        <SectionLoading label="Test yuklanmoqda…" compact />
      );
    }
    return <QuizView test={active} onExit={back} session={session} effectivePrefs={effectivePrefs} onSavePrefs={onSavePrefs} onPauseAttempt={onPauseAttempt} onClearPaused={onClearPaused} onRequireAccount={onRequireAccount} onTestComplete={onTestComplete} onBadgeClaim={onBadgeClaim} badgeClaimBusy={badgeClaimBusy} badgeClaimError={badgeClaimError} />;
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
        {formOpen ? <>
          <AddTestForm categories={categories} initialCategoryName={prefillCategory} onSubmit={submitTest} onDone={back} onView={goOpen} formMode={formMode} />
          {categoriesWithPending.length > 0 && <PreviousItemsDisclosure label={isMine ? 'Avval yaratgan testlarim' : 'Oldingi testlar'} count={tests.length}>{categoryContent}</PreviousItemsDisclosure>}
        </> : categoryContent}

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

        {!formOpen && (
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
      {formOpen ? (
        <>
          <AddTestForm categories={categories} initialCategoryName={activeCategory ? activeCategory.name : prefillCategory} onSubmit={submitTest} onDone={back} onView={goOpen} formMode={formMode} />
          {inCategory.length > 0 && <PreviousItemsDisclosure label={isMine ? 'Shu kursdagi avvalgi testlar' : 'Kursdagi avvalgi testlar'} count={inCategory.length}>{testCards}</PreviousItemsDisclosure>}
        </>
      ) : (
        <>
          {testCards}
        <div className="mt-6">
          <GhostButton onClick={onOpenForm} icon={Plus}>Yangi test qoʻshish</GhostButton>
        </div>
        </>
      )}
    </div>
  );
}

import { CourseBody } from './DeferredCourseContent.jsx';
import { AddTestForm, EditTestForm } from './DeferredTestForms.jsx';
