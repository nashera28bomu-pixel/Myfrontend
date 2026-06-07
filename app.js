/* ============================================================
   CYMOR MOVIE HUB — app.js v3 FIXED
============================================================ */

const API = 'https://cymor-movie-hub-api-3n1z.onrender.com';

/* ─────────────────────────────────────────
   API LAYER (CLEAN + SAFE)
───────────────────────────────────────── */
const cymor = {
  async get(path) {
    const res = await fetch(API + path);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
  },

  // Search
  searchMovies: (q, page = 1) =>
    cymor.get(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),

  searchSeries: (q, page = 1) =>
    cymor.get(`/api/series/search?q=${encodeURIComponent(q)}&page=${page}`),

  // Details (IMPORTANT FIX: always use id consistently)
  movieDetails: (id) =>
    cymor.get(`/api/movies/${id}`),

  seriesDetails: (id) =>
    cymor.get(`/api/series/${id}`),

  // Sources
  movieSources: (id) =>
    cymor.get(`/api/movies/${id}/sources`),

  episodeSources: (id, s, e) =>
    cymor.get(`/api/series/${id}/sources?season=${s}&episode=${e}`),

  // Trending
  trending: () => cymor.get('/api/trending'),
  trendingMovies: () => cymor.get('/api/trending/movies'),
  trendingSeries: () => cymor.get('/api/trending/series'),

  // Downloads proxy
  proxyUrl: (url, name) =>
    `${API}/api/downloads/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`,
};

/* ─────────────────────────────────────────
   STORAGE
───────────────────────────────────────── */
const store = {
  get: (k, fb = []) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fb; }
    catch { return fb; }
  },

  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),

  push: (k, item, max = 50) => {
    let arr = store.get(k, []);
    arr = arr.filter(i => String(i.id) !== String(item.id));
    arr.unshift(item);
    store.set(k, arr.slice(0, max));
  },

  remove: (k, id) => {
    store.set(k, store.get(k, []).filter(i => String(i.id) !== String(id)));
  }
};

/* ─────────────────────────────────────────
   NAVIGATION FIX (🔥 IMPORTANT FIX)
───────────────────────────────────────── */
function goToDetail(item) {
  const id = item.tmdb_id || item.id;

  if (!id) {
    console.error("Missing ID in item:", item);
    return;
  }

  store.push('cymor_history', {
    id,
    tmdb_id: id,
    title: item.title,
    poster: item.poster,
    year: item.year,
    rating: item.rating,
    type: item.type || 'movie',
    ts: Date.now()
  });

  const params = new URLSearchParams({
    id,
    type: item.type || 'movie'
  });

  window.location.href = `watch.html?${params.toString()}`;
}

/* ─────────────────────────────────────────
   CARD RENDER FIX
───────────────────────────────────────── */
function movieCardHTML(item, wide = false) {
  const cls = wide ? 'movie-card movie-card-wide' : 'movie-card';

  const poster = item.poster
    ? `<img src="${item.poster}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬</div>'">`
    : `<div class="poster-fallback">🎬</div>`;

  const isSeries = item.type === 'tv' || item.type === 'series';

  return `
    <div class="${cls}" onclick='goToDetail(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
      <div class="movie-card-poster">
        ${poster}
        ${item.rating ? `<div class="card-rating">⭐ ${Number(item.rating).toFixed(1)}</div>` : ''}
        ${isSeries ? `<div class="card-type-badge">Series</div>` : ''}
      </div>
      <div class="movie-card-title">${item.title || 'Unknown'}</div>
      ${item.year ? `<div class="movie-card-year">${item.year}</div>` : ''}
    </div>
  `;
}

/* ─────────────────────────────────────────
   WATCHLIST FIX
───────────────────────────────────────── */
function isInWatchlist(id) {
  return store.get('cymor_watchlist').some(i => String(i.id) === String(id));
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
   TOAST
───────────────────────────────────────── */
function toast(msg, type = '') {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;

  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ─────────────────────────────────────────
   SPLASH
───────────────────────────────────────── */
function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  if (sessionStorage.getItem('cymor_splash')) {
    splash.style.display = 'none';
    return;
  }

  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.style.display = 'none', 600);
    sessionStorage.setItem('cymor_splash', '1');
  }, 1500);
}

/* ─────────────────────────────────────────
   GLOBAL INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSplash();

  const navSearch = document.querySelector('.nav-search input');
  if (navSearch) {
    navSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter' && navSearch.value.trim()) {
        window.location.href =
          `search.html?q=${encodeURIComponent(navSearch.value.trim())}`;
      }
    });
  }
});
