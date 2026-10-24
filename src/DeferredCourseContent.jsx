import { Fragment, useState, useEffect, useRef } from 'react';

import { Loader2, Maximize2 } from 'lucide-react';

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

let youtubeIframeApiPromise = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    let script;
    const finish = (error) => {
      clearTimeout(timeoutId);
      if (error) {
        script?.remove();
        reject(error);
      }
      else if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player is unavailable'));
    };
    let timeoutId;
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { previousCallback?.(); } catch { /* boshqa embed callback'i ixtiyoriy */ }
      finish();
    };
    timeoutId = window.setTimeout(() => finish(new Error('YouTube player timed out')), 15000);
    script = document.createElement('script');
    script.dataset.upcourseYouTubeApi = 'true';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => finish(new Error('YouTube player failed to load'));
    document.head.appendChild(script);
  }).catch((error) => {
    youtubeIframeApiPromise = null;
    throw error;
  });

  return youtubeIframeApiPromise;
}

function YouTubeEmbed({ url }) {
  const [playerState, setPlayerState] = useState('poster');
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef(null);
  const playerMountRef = useRef(null);
  const playerRef = useRef(null);
  const mountedRef = useRef(true);
  const playRequestedRef = useRef(false);
  const videoId = extractYouTubeId(typeof url === 'string' ? url : '');

  useEffect(() => {
    if (!videoId) return undefined;
    mountedRef.current = true;
    const updateFullscreen = () => {
      setFullscreen(document.fullscreenElement === shellRef.current || document.webkitFullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen);
    // Lesson content is already open at this point, so warm up the player
    // behind its poster. Clicking Play can then start playback immediately.
    loadYouTubeIframeApi().then(initializePlayer).catch(() => {});
    return () => {
      mountedRef.current = false;
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen);
      try { playerRef.current?.destroy(); } catch { /* player allaqachon yopilgan bo‘lishi mumkin */ }
      playerRef.current = null;
    };
  }, [videoId]);

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

  function initializePlayer(YT) {
    if (!mountedRef.current || !playerMountRef.current || playerRef.current) return;
    playerRef.current = new YT.Player(playerMountRef.current, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: { autoplay: 0, playsinline: 1, fs: 0, origin: window.location.origin, rel: 0 },
      events: {
        onReady: (event) => {
          if (playRequestedRef.current) event.target.playVideo();
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING && mountedRef.current) setPlayerState('playing');
        },
        onError: (event) => {
          try { event.target.destroy(); } catch { /* player allaqachon yopilgan bo‘lishi mumkin */ }
          playerRef.current = null;
          if (mountedRef.current && playRequestedRef.current) {
            playRequestedRef.current = false;
            setPlayerState('error');
          }
        },
      },
    });
  }

  function startVideo() {
    if (playerState === 'loading') return;
    playRequestedRef.current = true;
    setPlayerState('loading');
    if (playerRef.current) {
      // Keep the call inside the click gesture so browser autoplay policy
      // does not block the first frame after the user presses Play.
      playerRef.current.playVideo();
      return;
    }
    loadYouTubeIframeApi()
      .then(initializePlayer)
      .catch(() => { if (mountedRef.current) setPlayerState('error'); });
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
        <div
          className="youtube-embed-frame absolute inset-0 w-full h-full transition-opacity duration-200"
          style={{ opacity: playerState === 'playing' ? 1 : 0, pointerEvents: playerState === 'playing' ? 'auto' : 'none' }}
        >
          <div ref={playerMountRef} className="w-full h-full" />
        </div>
        {playerState !== 'playing' && (
          <button
            type="button"
            onClick={startVideo}
            disabled={playerState === 'loading'}
            className="absolute inset-0 w-full h-full group focus-visible:outline focus-visible:outline-2 disabled:cursor-wait"
            style={{ outlineColor: C.gold }}
            aria-label={playerState === 'error' ? 'Videoni qayta yuklash' : playerState === 'loading' ? 'Video yuklanmoqda' : 'Videoni ishga tushirish'}
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
            <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(20,30,20,0.25)' }}>
              <span
                className="flex items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{ width: 62, height: 62, background: 'rgba(20,30,20,0.72)', border: `2px solid ${C.goldSoft}` }}
              >
                {playerState === 'loading' ? <Loader2 size={24} className="animate-spin" style={{ color: C.goldSoft }} /> : <PlayIcon />}
              </span>
            </span>
          </button>
        )}
      </div>
      {playerState === 'playing' && !fullscreen && (
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
  const safeContent = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((line) => typeof line === 'string' ? line : JSON.stringify(line)).join('\n')
      : content && typeof content === 'object'
        ? String(content.text ?? content.content ?? JSON.stringify(content))
        : '';
  const safeVideoUrl = typeof videoUrl === 'string' ? videoUrl : '';
  const lines = safeContent.split('\n');
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
  if (safeVideoUrl && !videoInserted) blocks.push({ type: 'video' });

  return (
    <div className="space-y-4 max-w-2xl">
      {blocks.map((b, i) =>
        b.type === 'video' ? (
          safeVideoUrl ? <YouTubeEmbed key={i} url={safeVideoUrl} /> : null
        ) : (
          <p key={i} className="text-base leading-7" style={{ ...fontBody, color: C.ink }}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {l}
                {j < b.lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

