let games = [];
const STORAGE_KEY = 'furkan-games-cache';
const LEGACY_STORAGE_KEYS = ['furkan-games-cache-v1', 'furkan-games-cache-v2'];
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" fill="#f5f2ea"/><circle cx="300" cy="160" r="110" fill="#e5dcc0"/><rect x="120" y="280" width="360" height="20" rx="10" fill="#d8d0bd"/><rect x="160" y="315" width="280" height="16" rx="8" fill="#ddd5c3"/></svg>');

function normalizeGames(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter(game => {
    if (!game || !game.id) return true;
    const key = String(game.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clearLegacyCaches() {
  LEGACY_STORAGE_KEYS.forEach(key => {
    try { localStorage.removeItem(key); } catch (error) {}
  });
}

function readGamesCache() {
  clearLegacyCaches();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const normalized = normalizeGames(parsed);
    if (normalized.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (removeError) {}
    return null;
  }
}

function writeGamesCache(data) {
  try {
    const normalized = normalizeGames(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // ignore
  }
}

async function load(){
  const list = document.getElementById('list');
  const searchInput = document.getElementById('game-search-input');
  list.innerHTML = '<p class="empty-state">Oyunlar yükleniyor...</p>';

  const cachedGames = readGamesCache();
  if (cachedGames && cachedGames.length) {
    games = cachedGames;
    renderGames(searchInput ? searchInput.value : '');
    searchInput?.addEventListener('input', event => renderGames(event.target.value));
    return;
  }

  try {
    const res = await fetch('/api/games?summary=1&images=0', { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Geçersiz API yanıtı');

    games = normalizeGames(data);
    writeGamesCache(games);
    renderGames(searchInput ? searchInput.value : '');
    searchInput?.addEventListener('input', event => renderGames(event.target.value));
  } catch (error) {
    console.error('Oyunlar yüklenemedi:', error);
    list.innerHTML = '<p class="empty-state">Oyunlar yüklenemedi. Lütfen sayfayı yenileyin.</p>';
  }
}

function getInitialPriorityCount(totalCount) {
  const viewportEstimate = Math.max(8, Math.ceil(window.innerHeight / 210));
  return Math.min(totalCount, Math.max(12, viewportEstimate * 2));
}

function loadImageElement(image) {
  if (!image || image.dataset.loaded === '1') return;
  const realSrc = image.dataset.realSrc || image.src;
  if (!realSrc || realSrc === PLACEHOLDER_IMAGE) return;
  image.src = realSrc;
  image.dataset.loaded = '1';
}

function scheduleBackgroundImageLoads(images) {
  images.forEach((image, index) => {
    const delay = 120 + (index % 8) * 140;
    setTimeout(() => {
      loadImageElement(image);
    }, delay);
  });
}

function renderGames(query){
  games = normalizeGames(games);
  const list = document.getElementById('list');
  const normalizedQuery = (query || '').trim().toLocaleLowerCase('tr-TR');
  const filteredGames = games
    .filter(game => `${game.title} ${game.category || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    .sort((first, second) => first.title.localeCompare(second.title, 'tr', {sensitivity:'base'}));

  list.innerHTML = filteredGames.length ? '' : `<p class="empty-state">${normalizedQuery ? 'Aramanızla eşleşen oyun bulunamadı.' : 'Henüz oyun eklenmemiş.'}</p>`;

  const priorityLimit = getInitialPriorityCount(filteredGames.length);
  const backgroundImages = [];

  filteredGames.forEach((g, index) => {
    const el = document.createElement('a');
    el.className = 'card';
    el.href = `game.html?id=${encodeURIComponent(g.id)}`;
    el.addEventListener('click', () => {
      try {
        sessionStorage.setItem('furkan-game-preview', JSON.stringify({
          id: g.id,
          title: g.title || 'Oyun',
          category: g.category || 'Oyun',
          image: g.image || fallbackImage(g.category),
          content: g.content || '',
        }));
      } catch (error) {
        // ignore
      }
    });

    const image = document.createElement('img');
    image.className = 'game-card-image';
    image.src = PLACEHOLDER_IMAGE;
    image.dataset.realSrc = g.image || `/api/games/${encodeURIComponent(g.id)}/image`;
    image.dataset.fallback = fallbackImage(g.category);
    image.loading = index < priorityLimit ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.alt = g.title || 'Oyun görseli';
    image.addEventListener('error', () => {
      image.src = image.dataset.fallback || fallbackImage(g.category);
    });

    if (index < priorityLimit) {
      loadImageElement(image);
    } else {
      backgroundImages.push(image);
    }

    const body = document.createElement('span');
    body.className = 'game-card-body';
    body.innerHTML = `<strong>${escapeHtml(g.title)}</strong><span class="game-card-category">${escapeHtml(g.category || 'Oyun')}</span>`;

    el.appendChild(image);
    el.appendChild(body);
    list.appendChild(el);
  });

  if (backgroundImages.length) {
    setTimeout(() => {
      scheduleBackgroundImageLoads(backgroundImages);
    }, 150);
  }
}

function fallbackImage(category){
  const images = {
    tavla:'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=1200&q=80',
    kart:'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80'
  };
  return images[(category || '').toLowerCase()] || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80';
}

function escapeHtml(s){if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}

load()
