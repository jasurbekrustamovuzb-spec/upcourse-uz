import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
const shuffle = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export default function MatchingTestInteraction({ question, answer = {}, onChange, disabled, showResult, accent, colors: c, fonts }) {
  const pairs = question.pairs || [{ id: question.id, text: question.text, correct: question.correct }], options = question.options || [];
  const order = useMemo(() => shuffle(options.length), [question.id, options.length]);
  const leftOrder = useMemo(() => shuffle(pairs.length), [question.id, pairs.length]);
  const root = useRef(null), wideRoot = useRef(null), refs = useRef({ left: {}, right: {} }), pointerUsed = useRef(false), selectedDrag = useRef(null), boardScroller = useRef(null), dragFrame = useRef(0), pointer = useRef(null);
  const [solved, setSolved] = useState(() => new Set(pairs.filter(p => answer?.[p.id] === p.correct).map(p => p.id)));
  const [selected, setSelected] = useState(null), [drag, setDrag] = useState(null), [flash, setFlash] = useState(null);
  const [streak, setStreak] = useState(0), [wrong, setWrong] = useState(null), [wideMode, setWideMode] = useState(false), [streakToast, setStreakToast] = useState(null);
  const streakTimer = useRef(null);
  const color = accent === 'live' ? c.live : c.gold, used = new Set([...solved].map(id => pairs.find(p => p.id === id)?.correct));
  const left = showResult ? pairs : leftOrder.map(i => pairs[i]).filter(p => !solved.has(p.id)), right = showResult ? order : order.filter(i => !used.has(i));
  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === wideRoot.current || document.webkitFullscreenElement === wideRoot.current;
      setWideMode(active);
      if (!active) { try { screen.orientation?.unlock?.(); } catch { /* ayrim mobil brauzerlar unlock'ni qo'llamaydi */ } }
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);
  async function toggleWideMode() {
    try {
      if (document.fullscreenElement === wideRoot.current || document.webkitFullscreenElement === wideRoot.current) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen?.();
        try { screen.orientation?.unlock?.(); } catch { /* ixtiyoriy imkoniyat */ }
        return;
      }
      const node = wideRoot.current;
      if (node?.requestFullscreen) await node.requestFullscreen();
      else if (node?.webkitRequestFullscreen) node.webkitRequestFullscreen();
      if (matchMedia('(pointer: coarse)').matches && screen.orientation?.lock) {
        try { await screen.orientation.lock('landscape'); } catch { /* lock qo'llanmasa, foydalanuvchi telefonni o'zi aylantirishi mumkin */ }
      }
    } catch { /* fullscreen bloklansa, odatiy sahifa ishlashda davom etadi */ }
  }
  function center(side, id) { const n = refs.current[side][id], f = root.current; if (!n || !f) return null; const r = n.getBoundingClientRect(), b = f.getBoundingClientRect(); return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top }; }
  function connect(id, ix) {
    if (!id || disabled || showResult || solved.has(id)) return;
    const p = pairs.find(x => x.id === id); if (!p) return;
    const ok = p.correct === ix; setFlash({ id, ix, ok, a: center('left', id), b: center('right', ix) }); selectedDrag.current = null; setSelected(null); setDrag(null); onChange?.(id, ix);
    if (ok) {
      const nextStreak = streak + 1;
      setStreak(nextStreak); setStreakToast(nextStreak > 1 ? '🔥 ' + nextStreak : '✓');
      clearTimeout(streakTimer.current); streakTimer.current = setTimeout(() => setStreakToast(null), 850);
      setSolved(old => new Set(old).add(id)); setTimeout(() => setFlash(x => x?.id === id ? null : x), 280);
    } else {
      setStreak(0); setStreakToast(null); clearTimeout(streakTimer.current);
      setWrong(id); setTimeout(() => { setWrong(x => x === id ? null : x); setFlash(x => x?.id === id ? null : x); }, 520);
    }
  }
  function point(e) { const r = root.current?.getBoundingClientRect(); return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null; }
  function stopAutoScroll() { if (dragFrame.current) cancelAnimationFrame(dragFrame.current); dragFrame.current = 0; }
  function autoScroll() {
    if (!selectedDrag.current || !pointer.current) { stopAutoScroll(); return; }
    const { x, y } = pointer.current, edge = 54;
    const pageStep = y < edge ? -Math.ceil((edge - y) / 7) : y > window.innerHeight - edge ? Math.ceil((y - (window.innerHeight - edge)) / 7) : 0;
    if (pageStep) {
      let node = root.current?.parentElement, scrolled = false;
      while (node && node !== boardScroller.current && node !== document.body && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) { node.scrollTop += pageStep; scrolled = true; break; }
        node = node.parentElement;
      }
      if (!scrolled) window.scrollBy(0, pageStep);
    }
    const lane = boardScroller.current, rect = lane?.getBoundingClientRect();
    if (lane && rect && x >= rect.left && x <= rect.right) {
      const laneEdge = Math.min(52, rect.height * .22);
      if (y < rect.top + laneEdge) lane.scrollTop -= Math.max(2, Math.ceil((rect.top + laneEdge - y) / 5));
      else if (y > rect.bottom - laneEdge) lane.scrollTop += Math.max(2, Math.ceil((y - (rect.bottom - laneEdge)) / 5));
    }
    setDrag(point({ clientX: x, clientY: y }));
    dragFrame.current = requestAnimationFrame(autoScroll);
  }
  useEffect(() => () => { stopAutoScroll(); clearTimeout(streakTimer.current); }, []);
  function startAutoScroll() { if (!dragFrame.current) dragFrame.current = requestAnimationFrame(autoScroll); }
  function down(e) { pointerUsed.current = true; const n = e.target.closest?.('[data-left]'); if (!n || disabled || showResult) return; e.currentTarget.setPointerCapture?.(e.pointerId); pointer.current = { x: e.clientX, y: e.clientY }; selectedDrag.current = n.dataset.left; setSelected(n.dataset.left); setDrag(point(e)); if (e.pointerType === 'touch') e.preventDefault(); startAutoScroll(); }
  function move(e) { if (selectedDrag.current) { pointer.current = { x: e.clientX, y: e.clientY }; setDrag(point(e)); startAutoScroll(); } }
  function up(e) { stopAutoScroll(); pointer.current = null; if (selectedDrag.current) { const selectedId = selectedDrag.current; const hit = document.elementFromPoint(e.clientX, e.clientY); const n = hit?.closest?.('[data-right]'); if (n && root.current?.contains(n)) connect(selectedId, Number(n.dataset.right)); else { selectedDrag.current = null; setSelected(null); setDrag(null); } } selectedDrag.current = null; setTimeout(() => { pointerUsed.current = false; }, 0); }
  function cancelDrag() { stopAutoScroll(); pointer.current = null; selectedDrag.current = null; setSelected(null); setDrag(null); }
  function chooseLeft(id) { if (disabled || showResult || solved.has(id)) return; setSelected(id); setDrag(center('left', id)); }
  const pct = pairs.length ? Math.round(solved.size / pairs.length * 100) : 0;
  return <div ref={wideRoot} className="matching-test-wide relative select-none">
    <style>{`.matching-test-wide:fullscreen,.matching-test-wide:-webkit-full-screen{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;overflow:auto!important;box-sizing:border-box!important;padding:8px!important;border-radius:0!important;background:#F6F1E1!important;color:#193A2A!important;color-scheme:light!important;z-index:9999!important}.matching-test-wide:fullscreen .matching-board,.matching-test-wide:-webkit-full-screen .matching-board{max-height:calc(100dvh - 104px)!important}.matching-test-wide:fullscreen button[data-left],.matching-test-wide:fullscreen button[data-right],.matching-test-wide:-webkit-full-screen button[data-left],.matching-test-wide:-webkit-full-screen button[data-right]{color:#193A2A!important;background:#FBFAF3!important;border-color:#B7C6A9!important}.matching-test-wide:fullscreen button[data-wrong=true],.matching-test-wide:-webkit-full-screen button[data-wrong=true]{color:#5A2420!important;background:#FCE8E5!important;border-color:#B94135!important}.matching-test-wide:fullscreen button[data-selected=true],.matching-test-wide:-webkit-full-screen button[data-selected=true]{background:#F5E7C5!important;border-color:#B8873E!important}`+ '@keyframes mp{55%{opacity:.55;transform:scale(1.04)}100%{opacity:0;transform:scale(.82) translateY(-5px)}}@keyframes mw{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}@keyframes streakToast{0%{opacity:0;transform:translateY(5px) scale(.94)}20%,75%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-7px) scale(.96)}}'}</style>
    <div className="relative mb-1.5 flex min-h-7 items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wide" style={{ ...fonts.fontMono, color }}>{showResult ? 'MOSLIK' : solved.size + '/' + pairs.length}</span><div className="flex items-center gap-1.5">{streakToast && !showResult && <span key={streakToast + streak} aria-live="polite" className="pointer-events-none absolute right-10 top-0 rounded-full px-2 py-1 text-[11px] font-bold shadow-sm" style={{ ...fonts.fontBody, color: c.cover, background: '#E7C477', animation: 'streakToast .85s ease both' }}>{streakToast}</span>}<button type="button" onClick={toggleWideMode} className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2" style={{ color: c.inkSoft, background: 'transparent', border: '1px solid ' + c.rule }} aria-label={wideMode ? 'Asliga qaytarish' : 'Keng ekranda ochish'} title={wideMode ? 'Asliga qaytarish' : 'Keng ekranda ochish'}>{wideMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button></div></div>
    {!showResult && <div className="mb-3 h-1.5 overflow-hidden rounded-full" style={{ background: c.paperSoft }}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: pct + '%', background: color }} /></div>}
    <div ref={boardScroller} className="matching-board max-h-[min(68vh,620px)] overflow-y-auto overscroll-contain rounded-2xl px-3 py-1" style={{ scrollbarGutter: 'stable both-edges' }}>
    <div ref={root} className="relative select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancelDrag}>
    <div className="relative z-[1] grid grid-cols-2 gap-2 px-1 sm:gap-4 sm:px-2">{[['left', 'Chap tomon'], ['right', 'Oʻng tomon']].map(([side, title]) => <section key={side} className="min-w-0"><div className="mb-2 px-1 text-[10px] uppercase tracking-wide sm:text-xs" style={{ ...fonts.fontMono, color: c.inkSoft }}>{title}</div><div className="space-y-2">{(side === 'left' ? left : right).map(item => {
      const isLeft = side === 'left', id = isLeft ? item.id : null, ix = isLeft ? null : item, label = isLeft ? item.text : options[ix];
      const correct = isLeft && answer?.[id] === item.correct, isWrong = isLeft && answer?.[id] !== undefined && !correct;
      const done = isLeft ? solved.has(id) : used.has(ix), fading = isLeft ? flash?.id === id && flash.ok : flash?.ix === ix && flash.ok;
      return <button key={isLeft ? id : ix} ref={n => { if (isLeft) refs.current.left[id] = n; else refs.current.right[ix] = n; }} type="button" data-left={isLeft ? id : undefined} data-right={!isLeft ? ix : undefined} data-wrong={isWrong || wrong === id ? 'true' : undefined} data-selected={selected === id && isLeft ? 'true' : undefined} onClick={() => { if (pointerUsed.current) { pointerUsed.current = false; return; } isLeft ? chooseLeft(id) : selected && connect(selected, ix); }} disabled={disabled || showResult || done} aria-pressed={isLeft && selected === id} className="relative min-h-[46px] w-full rounded-xl px-2 py-1.5 text-left text-xs leading-snug transition-[opacity,transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 sm:min-h-[54px] sm:px-2.5 sm:py-2 sm:text-sm" style={{ ...fonts.fontBody, color: isWrong || wrong === id ? '#5A2420' : c.ink, background: isWrong ? '#FCE8E5' : selected === id && isLeft ? '#F5E7C5' : isLeft ? c.surface : c.paper, border: '1px solid ' + (isWrong || wrong === id ? c.red : selected === id && isLeft ? color : c.rule), boxShadow: selected === id && isLeft ? '0 0 0 2px ' + color + '33' : '0 2px 5px rgba(25,45,31,.05)', animation: fading ? 'mp .28s ease forwards' : wrong === id ? 'mw .24s ease' : undefined, opacity: correct ? .48 : 1, touchAction: isLeft ? 'none' : 'pan-y' }}>
        <span className={'absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 ' + (isLeft ? '-right-1.5' : '-left-1.5')} style={{ background: selected === id && isLeft ? color : isLeft ? c.surface : c.paper, borderColor: color }} /><span className="block break-words">{label}</span>
        {showResult && isLeft && <span className="mt-1 block text-[10px]" style={{ color: correct ? color : c.red }}>{correct ? '✓ Mos keldi' : '→ ' + (options[item.correct] || '')}</span>}
        {showResult && !isLeft && [...solved].map(sid => pairs.find(p => p.id === sid)).filter(p => p?.correct === ix).map(p => <span key={p.id} className="mt-1 block text-[10px]" style={{ color }}>✓ {p.text}</span>)}
      </button>;
    })}</div></section>)}</div>
    <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible" aria-hidden="true">
      {flash?.a && flash?.b && <path d={'M' + flash.a.x + ' ' + flash.a.y + ' C' + (flash.a.x + 32) + ' ' + flash.a.y + ',' + (flash.b.x - 32) + ' ' + flash.b.y + ',' + flash.b.x + ' ' + flash.b.y} fill="none" stroke={flash.ok ? color : c.red} strokeWidth="3" strokeLinecap="round" strokeDasharray={flash.ok ? undefined : '6 5'} opacity=".85" />}
      {selected && drag && <path d={'M' + (center('left', selected)?.x ?? drag.x) + ' ' + (center('left', selected)?.y ?? drag.y) + ' C' + (drag.x + 30) + ' ' + drag.y + ',' + (drag.x - 30) + ' ' + drag.y + ',' + drag.x + ' ' + drag.y} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity=".75" />}
    </svg>
    </div></div>
    {selected && <div className="mt-2 text-center text-[11px] sm:hidden" style={{ ...fonts.fontBody, color: c.inkSoft }}>Mos javobga chizing yoki tegining</div>}
    {!showResult && pairs.length > 0 && solved.size === pairs.length && <div role="status" className="mt-3 rounded-xl px-3 py-2 text-center text-sm font-semibold" style={{ ...fonts.fontBody, color: c.cover, background: c.successTint }}>Ajoyib! Barcha juftliklar topildi ✨</div>}
  </div>;
}