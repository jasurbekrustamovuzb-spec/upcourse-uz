import { useState, useEffect, useRef } from 'react';

import { Maximize2 } from 'lucide-react';

import { C, fontBody } from './App.jsx';

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch (e) {
    // not a valid URL
  }
  return null;
}

function YouTubeEmbed({ url }) {
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef(null);
  const videoId = extractYouTubeId(url);

  useEffect(() => {
    const updateFullscreen = () => {
      setFullscreen(document.fullscreenElement === shellRef.current || document.webkitFullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen);
    };
  }, []);

  if (!videoId) return null;

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }
      if (shell.requestFullscreen) await shell.requestFullscreen();
      else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
    } catch (e) {
      // Fullscreen can be blocked by the browser; inline playback remains available.
    }
  }

  return (
    <div className="max-w-2xl mx-auto my-5">
      <style>{`
        .youtube-embed-shell:fullscreen,
        .youtube-embed-shell:-webkit-full-screen {
          position: fixed !important;
          inset: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          transform: none !important;
          background: #000 !important;
        }
        .youtube-embed-shell:fullscreen .youtube-embed-frame,
        .youtube-embed-shell:-webkit-full-screen .youtube-embed-frame {
          position: relative !important;
          inset: auto !important;
          display: block !important;
          width: min(100vw, 177.7778dvh) !important;
          height: min(100dvh, 56.25vw) !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          aspect-ratio: 16 / 9 !important;
          flex: none !important;
        }
      `}</style>
      <div
        className="youtube-embed-shell relative w-full overflow-hidden rounded-sm"
        ref={shellRef}
        style={{ aspectRatio: '16 / 9', background: '#000', border: `1px solid ${C.rule}` }}
      >
        {playing ? (
          <iframe
            className="youtube-embed-frame absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&fs=0`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group focus-visible:outline focus-visible:outline-2"
            style={{ outlineColor: C.gold }}
            aria-label="Videoni ishga tushirish"
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(20,30,20,0.25)' }}>
              <span
                className="flex items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{ width: 62, height: 62, background: 'rgba(20,30,20,0.72)', border: `2px solid ${C.goldSoft}` }}
              >
                <PlayIcon />
              </span>
            </span>
          </button>
        )}
      </div>
      {playing && !fullscreen && (
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs focus-visible:outline focus-visible:outline-2"
            style={{ color: C.inkSoft, background: C.surface, border: `1px solid ${C.rule}`, outlineColor: C.gold }}
            aria-label="To‘liq ekranda ko‘rish"
            title="To‘liq ekranda ko‘rish"
          >
            <Maximize2 size={14} /> To‘liq ekran
          </button>
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#FBFAF3" />
    </svg>
  );
}

export function CourseBody({ content, videoUrl }) {
  const marker = '{{video}}';
  const lines = (content || '').split('\n');
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) { blocks.push({ type: 'text', lines: buffer }); buffer = []; }
  };
  let videoInserted = false;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === marker) {
      flush();
      blocks.push({ type: 'video' });
      videoInserted = true;
    } else if (trimmed === '') {
      flush();
    } else {
      buffer.push(line);
    }
  });
  flush();
  if (videoUrl && !videoInserted) blocks.push({ type: 'video' });

  return (
    <div className="space-y-4 max-w-2xl">
      {blocks.map((b, i) =>
        b.type === 'video' ? (
          videoUrl ? <YouTubeEmbed key={i} url={videoUrl} /> : null
        ) : (
          <p key={i} className="text-base leading-7" style={{ ...fontBody, color: C.ink }}>
            {b.lines.map((l, j) => (
              <React.Fragment key={j}>
                {l}
                {j < b.lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

