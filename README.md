# 🎬 Cymor Movie Hub — Frontend

> By **Legendary Smiley Cymor** | Cymor Tech Services | *Always a winner.*

## Pages

| File | Description |
|------|-------------|
| `index.html` | Home — rotating hero (5s), trending movies & series, genres, history, watchlist preview |
| `search.html` | Search — live search, movie/series filter, popular suggestions |
| `watch.html` | Detail — poster, info, quality download links, episode picker (series), subtitles, watchlist |
| `downloads.html` | Downloads — history of started downloads, re-download links |
| `watchlist.html` | Watchlist — saved titles, remove, clear |
| `settings.html` | Settings — preferences, data clear, live server ping |

## Files

| File | Purpose |
|------|---------|
| `style.css` | Shared styles — dark luxury cinema theme, gold accents |
| `app.js` | Shared JS — API connector, storage, splash, toast, nav |
| `manifest.json` | PWA manifest — installable on Android/iOS |

## Backend

Connected to: `https://cymor-movie-hub-api-3n1z.onrender.com`

## Deploy to Vercel / Netlify

**Vercel:**
```
npx vercel --prod
```

**Netlify:**
Drag & drop the entire folder into netlify.com/drop

**GitHub Pages:**
Push to a repo → Settings → Pages → Deploy from main branch root

## ⚡ Free Tier Note

The Render backend sleeps after 15 minutes. First load may take 30 seconds.
The home page shows a friendly message when this happens.
Add an UptimeRobot ping at `https://cymor-movie-hub-api-3n1z.onrender.com/health` every 14 minutes to keep it awake.

---
*Cymor Tech Services — Always a winner.* 🏆
