import { Check, Eye, EyeOff, Pause, Play } from 'lucide-react';
import { C, fontBody, fontMono, formatDuration } from './App.jsx';

export default function PausedTestsPanel({ attempts = [], placement = 'home', onResume, onVisibilityChange }) {
  const visibleAttempts = attempts.filter((attempt) => placement === 'profile' || !attempt.hiddenOnHome);
  if (!visibleAttempts.length) return null;

  return (
    <section className="mb-5 rounded-xl p-3 sm:p-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }} aria-label="Tanaffusdagi testlar">
      <div className="mb-2 flex items-center gap-2">
        <Pause size={16} style={{ color: C.gold }} />
        <h3 className="text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Tanaffusdagi testlar</h3>
      </div>
      <div className="space-y-2">
        {visibleAttempts.map((attempt) => (
          <article key={attempt.testId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: C.paper, border: `1px solid ${C.rule}` }}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{attempt.testTitle || 'Saqlangan test'}</div>
              <div className="mt-0.5 text-[11px]" style={{ ...fontMono, color: C.inkSoft }}>{attempt.answeredCount || 0}/{attempt.totalCount || 0} javob · {formatDuration(attempt.seconds || 0)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => onResume?.(attempt, false)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}><Play size={13} /> Davom</button>
              <button type="button" onClick={() => onResume?.(attempt, true)} aria-label="Saqlangan testni yakunlash" title="Yakunlash" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border" style={{ color: C.accent, background: C.surface, borderColor: C.rule }}><Check size={15} /></button>
              <button type="button" onClick={() => onVisibilityChange?.(attempt.testId, placement === 'home' ? true : !attempt.hiddenOnHome)} aria-label={attempt.hiddenOnHome ? 'Bosh sahifada qayta ko‘rsatish' : 'Bosh sahifada berkitish'} title={attempt.hiddenOnHome ? 'Bosh sahifada qayta ko‘rsatish' : 'Bosh sahifada berkitish'} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border" style={{ color: C.inkSoft, background: C.surface, borderColor: C.rule }}>{attempt.hiddenOnHome ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
