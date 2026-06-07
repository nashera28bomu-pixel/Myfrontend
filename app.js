/* ============================================
   CYMOR MOVIE HUB — Shared App JS
   Backend: https://cymor-movie-hub-api-3n1z.onrender.com
   ============================================ */

const API = 'https://cymor-movie-hub-api-3n1z.onrender.com';

/* ── API Helper ── */
const cymor = {
  async get(path) {
    const res = await fetch(API + path);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  searchMovies: (q, page = 1)     => cymor.get(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),
  searchSeries: (q, page = 1)     => cymor.get(`/api/series/search?q=${encodeURIComponent(q)}&page=${page}`),
  movieDetails: (pageUrl)         => cymor.get(`/api/movies/${encodeURIComponent(pageUrl)}`),
  seriesDetails: (pageUrl)        => cymor.get(`/api/series/${encodeURIComponent(pageUrl)}`),
  movieDownloads: (pageUrl)       => cymor.get(`/api/movies/${encodeURIComponent(pageUrl)}/downloads`),
  episodeDownloads: (pageUrl, s, e) => cymor.get(`/api/series/${encodeURIComponent(pageUrl)}/downloads?season=${s}&episode=${e}`),
  trending: ()                    => cymor.get('/api/trending'),
  trendingMovies: ()              => cymor.get('/api/trending/movies'),
  trendingSeries: ()              => cymor.get('/api/trending/series'),
  proxyUrl: (url, filename)       => `${API}/api/downloads/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`,
};

/* ── Storage ── */
const store = {
  get: (k, fallback = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  push: (k, item, max = 50) => {
    let arr = store.get(k, []);
    arr = arr.filter(i => i.id !== item.id);
    arr.unshift(item);
    if (arr.length > max) arr = arr.slice(0, max);
    store.set(k, arr);
  },
  remove: (k, id) => { const arr = store.get(k, []).filter(i => i.id !== id); store.set(k, arr); },
};

/* ── Toast ── */
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

/* ── Splash ── */
function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const shown = sessionStorage.getItem('cymor_splash');
  if (shown) { splash.style.display = 'none'; return; }
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => { splash.style.display = 'none'; }, 700);
    sessionStorage.setItem('cymor_splash', '1');
  }, 2000);
}

/* ── Active Tab ── */
function setActiveTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
}

/* ── Navigate to detail page ── */
function goToDetail(item) {
  // Save to history
  store.push('cymor_history', {
    id: item.page_url || item.id,
    title: item.title,
    poster: item.poster,
    year: item.year,
    rating: item.rating,
    type: item.type,
    page_url: item.page_url,
    ts: Date.now(),
  });
  const params = new URLSearchParams({
    url: item.page_url || item.id,
    type: item.type || 'movie',
    title: item.title || '',
    poster: item.poster || '',
    year: item.year || '',
    rating: item.rating || '',
  });
  window.location.href = `watch.html?${params}`;
}

/* ── Render movie card ── */
function movieCardHTML(item, wide = false) {
  const cls = wide ? 'movie-card movie-card-wide' : 'movie-card';
  const ps  = wide ? '' : '';
  const poster = item.poster
    ? `<img src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬</div>'">`
    : `<div class="poster-fallback">🎬</div>`;
  return `
    <div class="${cls}" onclick='goToDetail(${JSON.stringify(item)})'>
      <div class="movie-card-poster">
        ${poster}
        ${item.rating ? `<div class="card-rating">⭐ ${parseFloat(item.rating).toFixed(1)}</div>` : ''}
        ${item.type === 'tv' || item.type === 'series' ? `<div class="card-type-badge">Series</div>` : ''}
      </div>
      <div class="movie-card-title">${item.title || 'Unknown'}</div>
      ${item.year ? `<div class="movie-card-year">${item.year}</div>` : ''}
    </div>`;
}

/* ── Render skeleton row ── */
function skeletonRow(count = 6) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-poster"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-year"></div>
    </div>`).join('');
}

/* ── Watchlist helpers ── */
function isInWatchlist(pageUrl) {
  return store.get('cymor_watchlist', []).some(i => i.page_url === pageUrl || i.id === pageUrl);
}
function toggleWatchlist(item) {
  const key = 'cymor_watchlist';
  if (isInWatchlist(item.page_url || item.id)) {
    store.remove(key, item.page_url || item.id);
    toast('Removed from watchlist');
    return false;
  } else {
    store.push(key, item);
    toast('Added to watchlist ✓', 'success');
    return true;
  }
}

/* ── Format download size ── */
function fmtSize(bytes) {
  if (!bytes) return '';
  const b = parseInt(bytes);
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return b + ' B';
}

/* ── Init shared stuff ── */
document.addEventListener('DOMContentLoaded', () => {
  initSplash();

  // Nav search — redirect to search page
  const navSearch = document.querySelector('.nav-search input');
  if (navSearch) {
    navSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter' && navSearch.value.trim()) {
        window.location.href = `search.html?q=${encodeURIComponent(navSearch.value.trim())}`;
      }
    });
  }
});
