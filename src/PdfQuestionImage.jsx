import { useContext, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import { NavContext } from './App.jsx';

export default function PdfQuestionImage({ src, alt = 'Savol rasmi' }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1.25);
  const { pushNav, back } = useContext(NavContext);

  function openImage() {
    setOpen(true);
    pushNav(() => setOpen(false));
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); back(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, back]);

  if (!src) return null;

  const imageWidth = typeof window === 'undefined'
    ? 900
    : Math.min(Math.round(window.innerWidth * zoom), 1200);

  return (
    <>
      <div className="relative mb-3 min-w-0">
        <button type="button" onClick={openImage} aria-label="Savol rasmini kattalashtirish" className="block w-full min-w-0 cursor-zoom-in overflow-hidden rounded-xl border border-[#d9d2bd] bg-white text-left">
          <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full max-w-none rounded-xl object-contain object-left" />
        </button>
        <button type="button" onClick={openImage} className="absolute bottom-2 right-2 inline-flex min-h-8 items-center gap-1 rounded-full border border-[#d9d2bd] bg-[#fffdf7] px-2.5 text-xs font-medium text-[#263b30] shadow-sm">
          <ZoomIn size={14} /> Kattalashtirish
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="PDF savol rasmi" className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'rgba(13, 24, 19, 0.96)' }}>
          <div className="flex min-h-14 items-center justify-between gap-3 px-3" style={{ borderBottom: '1px solid rgba(255,255,255,.14)' }}>
            <div className="text-xs font-mono text-white/75">Savol rasmi · {Math.round(zoom * 100)}%</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))} aria-label="Kichraytirish" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffdf7] text-[#263b30]"><ZoomOut size={17} /></button>
              <button type="button" onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.25) * 100) / 100))} aria-label="Kattalashtirish" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffdf7] text-[#263b30]"><ZoomIn size={17} /></button>
              <button type="button" onClick={back} aria-label="Yopish" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffdf7] text-[#263b30]"><X size={17} /></button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
            <img src={src} alt={alt} decoding="async" className="mx-auto h-auto rounded-sm" style={{ width: imageWidth, maxWidth: 'none', background: '#fff' }} />
          </div>
        </div>
      )}
    </>
  );
}
