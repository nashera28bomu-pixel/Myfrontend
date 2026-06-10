/* ============================================================
   CYMOR MOVIE HUB — app.js v4.1
   Backend: https://cymor-movie-hub-api-3n1z.onrender.com
============================================================ */

const API = 'https://cymor-movie-hub-api-3n1z.onrender.com';

/* ─────────────────────────────────────────
   API LAYER
───────────────────────────────────────── */
const cymor = {

  async get(path) {
    const res = await fetch(API + path);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
  },

  searchMovies:  (q, page = 1) => cymor.get(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),
  searchSeries:  (q, page = 1) => cymor.get(`/api/series/search?q=${encodeURIComponent(q)}&page=${page}`),

  movieDetails:  (id)          => cymor.get(`/api/movies/${id}`),
  seriesDetails: (id)          => cymor.get(`/api/series/${id}`),
  seriesSeasons: (id, season)  => cymor.get(`/api/series/${id}/seasons?season=${season}`),

  movieSources:   (id)         => cymor.get(`/api/sources/movie/${id}`),
  episodeSources: (id, s, e)   => cymor.get(`/api/sources/episode/${id}?season=${s}&episode=${e}`),

  movieDownloads:  (id)        => cymor.get(`/api/downloads/movie/${id}`),
  seriesDownloads: (id, s, e)  => cymor.get(`/api/downloads/series/${id}?season=${s}&episode=${e}`),

  trending:        ()          => cymor.get('/api/trending'),
  trendingMovies:  ()          => cymor.get('/api/trending/movies'),
  trendingSeries:  ()          => cymor.get('/api/trending/series'),

  getRecommendations: async (id, type = 'movie') => {
    try {
      return await cymor.get(`/api/${type === 'series' ? 'series' : 'movies'}/${id}/recommendations`);
    } catch (e) {
      console.warn('[Cymor] Recommendations failed:', e.message);
      return { results: [] };
    }
  },
};

/* ─────────────────────────────────────────
   STORAGE
───────────────────────────────────────── */
const store = {
  get: (k, fb = []) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; }
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
  },
};

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
function goToDetail(item) {
  const id   = item.tmdb_id || item.id;
  const type = item.type === 'series' || item.type === 'tv' ? 'series' : 'movie';
  if (!id) return;

  store.push('cymor_history', {
    id, tmdb_id: id,
    title: item.title,
    poster: item.poster,
    year: item.year,
    type, ts: Date.now(),
  });

  window.location.href = `watch.html?id=${id}&type=${type}`;
}

/* ─────────────────────────────────────────
   CARD RENDERING
───────────────────────────────────────── */
function movieCardHTML(item, wide = false) {
  const cls       = wide ? 'movie-card movie-card-wide' : 'movie-card';
  const isSeries  = item.type === 'series' || item.type === 'tv';
  const posterSrc = item.poster || item.image || '';
  const poster    = posterSrc
    ? `<img src="${posterSrc}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬</div>'">`
    : `<div class="poster-fallback">🎬</div>`;
  const rating    = item.rating || item.vote_average || null;
  const itemJson  = JSON.stringify(item).replace(/'/g, '&#39;');

  return `
    <div class="${cls}" onclick='goToDetail(${itemJson})'>
      <div class="movie-card-poster">
        ${poster}
        ${rating ? `<div class="card-rating">⭐ ${Number(rating).toFixed(1)}</div>` : ''}
        ${isSeries ? `<div class="card-type-badge">Series</div>` : ''}
      </div>
      <div class="movie-card-title">${item.title || item.name || 'Unknown'}</div>
      ${item.year ? `<div class="movie-card-year">${item.year}</div>` : ''}
    </div>
  `;
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
   SPLASH — only runs on index/home page
───────────────────────────────────────── */
function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return; // not on a page with splash — do nothing

  // Already shown this session — hide immediately without animation
  if (sessionStorage.getItem('cymor_splash_done')) {
    splash.style.display = 'none';
    return;
  }

  // First visit this session — show then hide
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => {
      splash.style.display = 'none';
      sessionStorage.setItem('cymor_splash_done', '1');
    }, 600);
  }, 1500);
}

/* ─────────────────────────────────────────
   NAV SEARCH — works on all pages
───────────────────────────────────────── */
function initNavSearch() {
  const navSearch = document.querySelector('.nav-search input');
  if (!navSearch) return;

  // Submit on Enter
  navSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = navSearch.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
  });

  // Submit on search icon/button click if present
  const searchBtn = document.querySelector('.nav-search button, .nav-search .search-icon');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = navSearch.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Pre-fill search input if already on search page
  if (window.location.pathname.includes('search')) {
    const q = new URLSearchParams(window.location.search).get('q') || '';
    if (q) navSearch.value = q;
  }
}

/* ─────────────────────────────────────────
   DOM READY
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initNavSearch();
});
