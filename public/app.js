let games = [];
const GAMES_CACHE_KEY = 'furkan-games-cache-v1';
const GAMES_CACHE_TTL = 10 * 60 * 1000;

function readGamesCache() {
  try {
    const raw = sessionStorage.getItem(GAMES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.games) || !Number.isFinite(parsed.savedAt)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function writeGamesCache(data) {
  try {
    sessionStorage.setItem(GAMES_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      games: data,
    }));
  } catch (error) {
    // Session storage may be unavailable; ignore silently.
  }
}

async function load(){
  const list = document.getElementById('list');
  const searchInput = document.getElementById('game-search-input');
  list.innerHTML = '<p class="empty-state">Oyunlar yükleniyor...</p>';

  const cached = readGamesCache();
  if (cached && Date.now() - cached.savedAt < GAMES_CACHE_TTL) {
    games = cached.games;
    renderGames(searchInput ? searchInput.value : '');
  }

  searchInput?.addEventListener('input', event => renderGames(event.target.value));

  try {
    const res = await fetch('/api/games?summary=1&images=1', { cache: 'default' });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Geçersiz API yanıtı');

    games = data;
    writeGamesCache(data);
    renderGames(searchInput ? searchInput.value : '');
  } catch (error) {
    console.error('Oyunlar yüklenemedi:', error);
    if (games.length === 0) {
      list.innerHTML = '<p class="empty-state">Oyunlar yüklenemedi. Lütfen sayfayı yenileyin.</p>';
    }
  }
}

function renderGames(query){
  const list = document.getElementById('list');
  const normalizedQuery = (query || '').trim().toLocaleLowerCase('tr-TR');
  const filteredGames = games
    .filter(game => `${game.title} ${game.category || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    .sort((first, second) => first.title.localeCompare(second.title, 'tr', {sensitivity:'base'}));

  list.innerHTML = filteredGames.length ? '' : `<p class="empty-state">${normalizedQuery ? 'Aramanızla eşleşen oyun bulunamadı.' : 'Henüz oyun eklenmemiş.'}</p>`;
  filteredGames.forEach(g=>{
    const el = document.createElement('a'); el.className='card'; el.href=`game.html?id=${encodeURIComponent(g.id)}`;
    const image = g.image || fallbackImage(g.category);
    el.innerHTML = `<img class="game-card-image" src="${escapeHtml(image)}" data-fallback="${escapeHtml(fallbackImage(g.category))}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" alt="${escapeHtml(g.title)}"><span class="game-card-body"><strong>${escapeHtml(g.title)}</strong><span class="game-card-category">${escapeHtml(g.category||'Oyun')}</span></span>`;
    const imageElement = el.querySelector('.game-card-image');
    imageElement.addEventListener('error', () => {
      if (imageElement.dataset.fallback) {
        imageElement.src = imageElement.dataset.fallback;
        delete imageElement.dataset.fallback;
      }
    });
    list.appendChild(el);
  })
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
