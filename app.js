/* ============================================================
   CYMOR MOVIE HUB — app.js v3.1 FIXED & STABILIZED
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

  // Details
  movieDetails: (id) => cymor.get(`/api/movies/${id}`),
  seriesDetails: (id) => cymor.get(`/api/series/${id}`),

  // Sources
  movieSources: (id) => cymor.get(`/api/movies/${id}/sources`),
  episodeSources: (id, s, e) =>
    cymor.get(`/api/series/${id}/sources?season=${s}&episode=${e}`),

  // NEW: Recommendations (Matches your watch.html call)
  getRecommendations: async (id) => {
    try {
      return await cymor.get(`/api/movies/${id}/recommendations`);
    } catch (e) {
      console.warn("Recommendations failed, returning empty list:", e);
      return [];
    }
  },

  // Trending
  trending: () => cymor.get('/api/trending'),
  trendingMovies: () => cymor.get('/api/trending/movies'),
  trendingSeries: () => cymor.get('/api/trending/series'),

  // Downloads proxy
  proxyUrl: (url, name) =>
    `${API}/api/downloads/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`,
    
  // Torrent Proxy helper for watch.html compatibility
  torrentProxy: (url, name) => 
    `${API}/api/downloads/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`
};

/* ─────────────────────────────────────────
   STORAGE, NAVIGATION, RENDERING
   (Your existing stable logic preserved below)
───────────────────────────────────────── */

const store = {
  get: (k, fb = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  push: (k, item, max = 50) => {
    let arr = store.get(k, []);
    arr = arr.filter(i => String(i.id) !== String(item.id));
    arr.unshift(item);
    store.set(k, arr.slice(0, max));
  },
  remove: (k, id) => { store.set(k, store.get(k, []).filter(i => String(i.id) !== String(id))); }
};

function goToDetail(item) {
  const id = item.tmdb_id || item.id;
  if (!id) return;

  store.push('cymor_history', {
    id, tmdb_id: id, title: item.title, poster: item.poster,
    year: item.year, type: item.type || 'movie', ts: Date.now()
  });

  window.location.href = `watch.html?id=${id}&type=${item.type || 'movie'}`;
}

function movieCardHTML(item, wide = false) {
  const cls = wide ? 'movie-card movie-card-wide' : 'movie-card';
  const poster = item.poster ? `<img src="${item.poster}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬</div>'">` : `<div class="poster-fallback">🎬</div>`;
  const isSeries = item.type === 'tv' || item.type === 'series';

  return `
    <div class="${cls}" onclick='goToDetail(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
      <div class="movie-card-poster">${poster} ${item.rating ? `<div class="card-rating">⭐ ${Number(item.rating).toFixed(1)}</div>` : ''} ${isSeries ? `<div class="card-type-badge">Series</div>` : ''}</div>
      <div class="movie-card-title">${item.title || 'Unknown'}</div>
      ${item.year ? `<div class="movie-card-year">${item.year}</div>` : ''}
    </div>
  `;
}

function toast(msg, type = '') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3000);
}

function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash || sessionStorage.getItem('cymor_splash')) return;
  setTimeout(() => { splash.classList.add('hide'); setTimeout(() => splash.style.display = 'none', 600); sessionStorage.setItem('cymor_splash', '1'); }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  const navSearch = document.querySelector('.nav-search input');
  if (navSearch) {
    navSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter' && navSearch.value.trim()) window.location.href = `search.html?q=${encodeURIComponent(navSearch.value.trim())}`;
    });
  }
});
