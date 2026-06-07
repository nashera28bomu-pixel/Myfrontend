/* ============================================================
   CYMOR MOVIE HUB — app.js v2
   Backend : https://cymor-movie-hub-api-3n1z.onrender.com
   Streaming: WebTorrent.js (in-browser, zero ads)
   By Legendary Smiley Cymor | Always a winner.
   ============================================================ */

const API = 'https://cymor-movie-hub-api-3n1z.onrender.com';

/* ─────────────────────────────────────────
   API — all backend calls in one place
───────────────────────────────────────── */
const cymor = {
  async get(path) {
    const res = await fetch(API + path);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
  },

  // Search
  searchMovies : (q, page = 1) => cymor.get(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),
  searchSeries : (q, page = 1) => cymor.get(`/api/series/search?q=${encodeURIComponent(q)}&page=${page}`),

  // Details  (tmdb_id is now a plain number)
  movieDetails  : (id)         => cymor.get(`/api/movies/${id}`),
  seriesDetails : (id)         => cymor.get(`/api/series/${id}`),
  seasonEpisodes: (id, season) => cymor.get(`/api/series/${id}/season/${season}`),

  // Sources — returns YTS magnets (movies) or EZTV magnets (TV)
  movieSources  : (id)             => cymor.get(`/api/movies/${id}/sources`),
  episodeSources: (id, s, e)       => cymor.get(`/api/series/${id}/sources?season=${s}&episode=${e}`),

  // Trending / discovery
  trending        : ()             => cymor.get('/api/trending'),
  trendingMovies  : ()             => cymor.get('/api/trending/movies'),
  trendingSeries  : ()             => cymor.get('/api/trending/series'),
  popularMovies   : ()             => cymor.get('/api/trending/popular/movies'),
  popularSeries   : ()             => cymor.get('/api/trending/popular/series'),
  topRatedMovies  : ()             => cymor.get('/api/trending/top-rated/movies'),
  topRatedSeries  : ()             => cymor.get('/api/trending/top-rated/series'),
  byGenre         : (gid, page=1)  => cymor.get(`/api/trending/genres/movies?genre_id=${gid}&page=${page}`),

  // Downloads proxy
  torrentProxy: (url, name) =>
    `${API}/api/downloads/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`,
  checkUrl: (url) => cymor.get(`/api/downloads/check?url=${encodeURIComponent(url)}`),
};

/* ─────────────────────────────────────────
   LOCAL STORAGE — history, watchlist, downloads
───────────────────────────────────────── */
const store = {
  get   : (k, fb = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set   : (k, v)         => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  push  : (k, item, max = 50) => {
    let arr = store.get(k, []).filter(i => String(i.id) !== String(item.id));
    arr.unshift(item);
    store.set(k, arr.slice(0, max));
  },
  remove: (k, id) => store.set(k, store.get(k, []).filter(i => String(i.id) !== String(id))),
};

/* ─────────────────────────────────────────
   WEBTORRENT — in-browser streaming engine
   Loaded from CDN, used by watch.html
───────────────────────────────────────── */
let _wtClient = null;

function getWebTorrentClient() {
  if (_wtClient) return _wtClient;
  if (typeof WebTorrent === 'undefined') {
    console.warn('WebTorrent not loaded yet');
    return null;
  }
  _wtClient = new WebTorrent();
  _wtClient.on('error', err => console.error('WebTorrent error:', err));
  return _wtClient;
}

/**
 * Stream a magnet link into a <video> element.
 * @param {string}   magnet     - magnet:? URI from YTS/EZTV
 * @param {string}   videoElId  - id of the <video> element
 * @param {Function} onProgress - called with { downloaded, total, progress, downloadSpeed, uploadSpeed }
 * @param {Function} onReady    - called when video is ready to play
 * @param {Function} onError    - called on error
 * @returns {Function} destroy() — call to stop and clean up
 */
function streamMagnet(magnet, videoElId, onProgress, onReady, onError) {
  const client = getWebTorrentClient();
  if (!client) { onError?.('WebTorrent not available'); return () => {}; }

  const videoEl = document.getElementById(videoElId);
  if (!videoEl) { onError?.('Video element not found'); return () => {}; }

  let torrent = null;

  try {
    torrent = client.add(magnet, (t) => {
      // Pick the largest video file (main movie file)
      const file = t.files.reduce((best, f) => {
        const isVideo = /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name);
        return isVideo && f.length > (best?.length || 0) ? f : best;
      }, null);

      if (!file) { onError?.('No video file found in torrent'); return; }

      file.renderTo(videoEl, { autoplay: false }, (err) => {
        if (err) { onError?.(err.message); return; }
        onReady?.(file.name);
      });

      // Progress updates
      const progressTimer = setInterval(() => {
        if (!torrent) { clearInterval(progressTimer); return; }
        onProgress?.({
          downloaded   : torrent.downloaded,
          total        : torrent.length,
          progress     : Math.round(torrent.progress * 100),
          downloadSpeed: torrent.downloadSpeed,
          uploadSpeed  : torrent.uploadSpeed,
          peers        : torrent.numPeers,
        });
        if (torrent.progress >= 1) clearInterval(progressTimer);
      }, 1000);
    });

    torrent.on('error', err => onError?.(err.message || String(err)));

  } catch (err) {
    onError?.(err.message);
  }

  return () => {
    try { if (torrent) client.remove(torrent); } catch {}
  };
}

/**
 * Pick the best source from a sources array.
 * Prefers 1080p with most seeds, falls back to 720p.
 */
function pickBestSource(sources = []) {
  if (!sources.length) return null;
  const pref = ['1080p', '720p', '2160p', '480p', 'SD'];
  for (const q of pref) {
    const match = sources.filter(s => s.quality === q).sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
    if (match.length) return match[0];
  }
  return sources[0];
}

/** Format bytes → human readable */
function fmtBytes(b) {
  if (!b) return '';
  b = Number(b);
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(0) + ' MB';
  return b + ' B';
}

/** Format download speed → human readable */
function fmtSpeed(bps) {
  if (!bps) return '0 KB/s';
  if (bps > 1e6) return (bps / 1e6).toFixed(1) + ' MB/s';
  return (bps / 1e3).toFixed(0) + ' KB/s';
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────── */
function toast(msg, type = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

/* ─────────────────────────────────────────
   SPLASH SCREEN
───────────────────────────────────────── */
function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  if (sessionStorage.getItem('cymor_splash')) { splash.style.display = 'none'; return; }
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.style.display = 'none', 700);
    sessionStorage.setItem('cymor_splash', '1');
  }, 2000);
}

/* ─────────────────────────────────────────
   NAVIGATION — go to watch.html
   Now uses numeric tmdb_id as the key
───────────────────────────────────────── */
function goToDetail(item) {
  // Normalise id — could be tmdb_id or id
  const id = item.tmdb_id || item.id;

  store.push('cymor_history', {
    id,
    tmdb_id : id,
    title   : item.title,
    poster  : item.poster,
    year    : item.year,
    rating  : item.rating,
    type    : item.type || 'movie',
    page_url: String(id),
    ts      : Date.now(),
  });

  const params = new URLSearchParams({
    id    : id,
    type  : item.type || 'movie',
    title : item.title  || '',
    poster: item.poster || '',
    year  : item.year   || '',
    rating: item.rating || '',
  });
  window.location.href = `watch.html?${params}`;
}

/* ─────────────────────────────────────────
   MOVIE CARD HTML
───────────────────────────────────────── */
function movieCardHTML(item, wide = false) {
  const cls    = wide ? 'movie-card movie-card-wide' : 'movie-card';
  const poster = item.poster
    ? `<img src="${item.poster}" alt="${item.title}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬</div>'">`
    : `<div class="poster-fallback">🎬</div>`;
  const isSeries = item.type === 'tv' || item.type === 'series';
  return `
    <div class="${cls}" onclick='goToDetail(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
      <div class="movie-card-poster">
        ${poster}
        ${item.rating ? `<div class="card-rating">⭐ ${parseFloat(item.rating).toFixed(1)}</div>` : ''}
        ${isSeries ? `<div class="card-type-badge">Series</div>` : ''}
      </div>
      <div class="movie-card-title">${item.title || 'Unknown'}</div>
      ${item.year ? `<div class="movie-card-year">${item.year}</div>` : ''}
    </div>`;
}

/* ─────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────── */
function skeletonRow(count = 6) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-poster"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-year"></div>
    </div>`).join('');
}

/* ─────────────────────────────────────────
   WATCHLIST HELPERS
───────────────────────────────────────── */
function isInWatchlist(id) {
  return store.get('cymor_watchlist', []).some(i => String(i.id) === String(id));
}
function toggleWatchlist(item) {
  const id = item.tmdb_id || item.id;
  if (isInWatchlist(id)) {
    store.remove('cymor_watchlist', id);
    toast('Removed from watchlist');
    return false;
  }
  store.push('cymor_watchlist', { ...item, id });
  toast('Added to watchlist ✓', 'success');
  return true;
}

/* ─────────────────────────────────────────
   SOURCE QUALITY BADGE
───────────────────────────────────────── */
function qualityBadgeHTML(sources = []) {
  if (!sources.length) return '';
  const qualities = [...new Set(sources.map(s => s.quality))];
  return qualities.map(q =>
    `<span class="meta-chip gold">${q}</span>`
  ).join('');
}

/* ─────────────────────────────────────────
   GLOBAL INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSplash();

  // Nav search bar → redirect to search.html
  const navSearch = document.querySelector('.nav-search input');
  if (navSearch) {
    navSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter' && navSearch.value.trim()) {
        window.location.href = `search.html?q=${encodeURIComponent(navSearch.value.trim())}`;
      }
    });
  }
});
