import React, { useMemo, useRef, useState } from 'react';
const shuffle = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export default function MatchingTestInteraction({ question, answer = {}, onChange, disabled, showResult, accent, colors: c, fonts }) {
  const pairs = question.pairs || [{ id: question.id, text: question.text, correct: question.correct }], options = question.options || [];
  const order = useMemo(() => shuffle(options.length), [question.id, options.length]);
  const leftOrder = useMemo(() => shuffle(pairs.length), [question.id, pairs.length]);
  const root = useRef(null), refs = useRef({ left: {}, right: {} }), pointerUsed = useRef(false);
  const [solved, setSolved] = useState(() => new Set(pairs.filter(p => answer?.[p.id] === p.correct).map(p => p.id)));
  const [selected, setSelected] = useState(null), [drag, setDrag] = useState(null), [flash, setFlash] = useState(null);
  const [streak, setStreak] = useState(0), [wrong, setWrong] = useState(null), [rotateHint, setRotateHint] = useState(false);
  const color = accent === 'live' ? c.live : c.gold, used = new Set([...solved].map(id => pairs.find(p => p.id === id)?.correct));
  const left = showResult ? pairs : leftOrder.map(i => pairs[i]).filter(p => !solved.has(p.id)), right = showResult ? order : order.filter(i => !used.has(i));
  function center(side, id) { const n = refs.current[side][id], f = root.current; if (!n || !f) return null; const r = n.getBoundingClientRect(), b = f.getBoundingClientRect(); return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top }; }
  function connect(id, ix) {
    if (!id || disabled || showResult || solved.has(id)) return;
    const p = pairs.find(x => x.id === id); if (!p) return;
    const ok = p.correct === ix; setFlash({ id, ix, ok, a: center('left', id), b: center('right', ix) }); setSelected(null); setDrag(null); onChange?.(id, ix);
    if (ok) { setStreak(n => n + 1); setSolved(old => new Set(old).add(id)); setTimeout(() => setFlash(x => x?.id === id ? null : x), 280); }
    else { setStreak(0); setWrong(id); setTimeout(() => { setWrong(x => x === id ? null : x); setFlash(x => x?.id === id ? null : x); }, 520); }
  }
  function point(e) { const r = root.current?.getBoundingClientRect(); return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null; }
  function down(e) { pointerUsed.current = true; const n = e.target.closest?.('[data-left]'); if (!n || disabled || showResult) return; setSelected(n.dataset.left); setDrag(point(e)); if (e.pointerType === 'touch') e.preventDefault(); }
  function move(e) { if (selected) setDrag(point(e)); }
  function up(e) { if (selected) { const n = e.target.closest?.('[data-right]'); if (n) connect(selected, Number(n.dataset.right)); } setTimeout(() => { pointerUsed.current = false; }, 0); }
  function chooseLeft(id) { if (disabled || showResult || solved.has(id)) return; setSelected(id); setDrag(center('left', id)); }
  async function openWide() { try { if (!root.current?.requestFullscreen) throw new Error('fullscreen unavailable'); await root.current.requestFullscreen(); if (screen.orientation?.lock) await screen.orientation.lock('landscape'); else setRotateHint(true); } catch { setRotateHint(true); } }
  const pct = pairs.length ? Math.round(solved.size / pairs.length * 100) : 0;
  return <div ref={root} className="relative select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
    <style>{'@keyframes mp{55%{opacity:.55;transform:scale(1.04)}100%{opacity:0;transform:scale(.82) translateY(-5px)}}@keyframes mw{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'}</style>
    <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs" style={{ ...fonts.fontMono, color }}>{showResult ? 'MOSLIKLAR' : 'JUFTLIKLARNI BOGʻLANG'}</span>{!showResult && <div className="flex items-center gap-2"><span aria-live="polite" className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...fonts.fontBody, color: streak ? c.cover : c.inkSoft, background: streak ? '#E7C477' : c.paperSoft }}>{streak ? '🔥 ' + streak + ' streak' : solved.size + '/' + pairs.length}</span><button type="button" className="sm:hidden rounded-full px-2 py-1 text-xs" onClick={openWide} aria-label="Yon holatda toʻliq ekranda ochish" style={{ ...fonts.fontBody, color: c.inkSoft, background: c.paperSoft, border: '1px solid ' + c.rule }}>↻</button></div>}</div>
    {rotateHint && <p className="sm:hidden mb-2 rounded-lg px-3 py-2 text-xs" style={{ ...fonts.fontBody, color: c.inkSoft, background: c.paperSoft }}>Telefonni aylantirsangiz, juftliklarga joy kengayadi.</p>}
    {!showResult && <div className="mb-3 h-1.5 overflow-hidden rounded-full" style={{ background: c.paperSoft }}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: pct + '%', background: color }} /></div>}
    <div className="relative z-[1] grid grid-cols-2 gap-2 sm:gap-4">{[['left', 'Chap tomon'], ['right', 'Oʻng tomon']].map(([side, title]) => <section key={side} className="min-w-0"><div className="mb-2 px-1 text-[10px] uppercase tracking-wide sm:text-xs" style={{ ...fonts.fontMono, color: c.inkSoft }}>{title}</div><div className="space-y-2">{(side === 'left' ? left : right).map(item => {
      const isLeft = side === 'left', id = isLeft ? item.id : null, ix = isLeft ? null : item, label = isLeft ? item.text : options[ix];
      const correct = isLeft && answer?.[id] === item.correct, isWrong = isLeft && answer?.[id] !== undefined && !correct;
      const done = isLeft ? solved.has(id) : used.has(ix), fading = isLeft ? flash?.id === id && flash.ok : flash?.ix === ix && flash.ok;
      return <button key={isLeft ? id : ix} ref={n => { if (isLeft) refs.current.left[id] = n; else refs.current.right[ix] = n; }} type="button" data-left={isLeft ? id : undefined} data-right={!isLeft ? ix : undefined} onClick={() => { if (pointerUsed.current) { pointerUsed.current = false; return; } isLeft ? chooseLeft(id) : selected && connect(selected, ix); }} disabled={disabled || showResult || done} aria-pressed={isLeft && selected === id} className="relative min-h-[52px] w-full rounded-xl px-2.5 py-2 text-left text-xs leading-snug transition-[opacity,transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 sm:min-h-[60px] sm:px-3 sm:text-sm" style={{ ...fonts.fontBody, color: c.ink, background: isWrong ? c.dangerTint : selected === id && isLeft ? '#F5E7C5' : isLeft ? c.surface : c.paper, border: '1px solid ' + (isWrong || wrong === id ? c.red : selected === id && isLeft ? color : c.rule), boxShadow: selected === id && isLeft ? '0 0 0 2px ' + color + '33' : '0 2px 5px rgba(25,45,31,.05)', animation: fading ? 'mp .28s ease forwards' : wrong === id ? 'mw .24s ease' : undefined, opacity: correct ? .48 : 1, touchAction: 'none' }}>
        <span className={'absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 ' + (isLeft ? '-right-1.5' : '-left-1.5')} style={{ background: selected === id && isLeft ? color : isLeft ? c.surface : c.paper, borderColor: color }} /><span className="block break-words">{label}</span>
        {showResult && isLeft && <span className="mt-1 block text-[10px]" style={{ color: correct ? color : c.red }}>{correct ? '✓ Mos keldi' : '→ ' + (options[item.correct] || '')}</span>}
        {showResult && !isLeft && [...solved].map(sid => pairs.find(p => p.id === sid)).filter(p => p?.correct === ix).map(p => <span key={p.id} className="mt-1 block text-[10px]" style={{ color }}>✓ {p.text}</span>)}
      </button>;
    })}</div></section>)}</div>
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
      {flash?.a && flash?.b && <path d={'M' + flash.a.x + ' ' + flash.a.y + ' C' + (flash.a.x + 32) + ' ' + flash.a.y + ',' + (flash.b.x - 32) + ' ' + flash.b.y + ',' + flash.b.x + ' ' + flash.b.y} fill="none" stroke={flash.ok ? color : c.red} strokeWidth="3" strokeLinecap="round" strokeDasharray={flash.ok ? undefined : '6 5'} opacity=".85" />}
      {selected && drag && <path d={'M' + (center('left', selected)?.x ?? drag.x) + ' ' + (center('left', selected)?.y ?? drag.y) + ' C' + (drag.x + 30) + ' ' + drag.y + ',' + (drag.x - 30) + ' ' + drag.y + ',' + drag.x + ' ' + drag.y} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity=".75" />}
    </svg>
    {selected && <div className="mt-2 text-center text-[11px] sm:hidden" style={{ ...fonts.fontBody, color: c.inkSoft }}>Mos javobga chizing yoki tegining</div>}
    {!showResult && pairs.length > 0 && solved.size === pairs.length && <div role="status" className="mt-3 rounded-xl px-3 py-2 text-center text-sm font-semibold" style={{ ...fonts.fontBody, color: c.cover, background: c.successTint }}>Ajoyib! Barcha juftliklar topildi ✨</div>}
  </div>;
}