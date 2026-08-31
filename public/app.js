let games = [];

async function load(){
  const res = await fetch('/api/games'); games = await res.json();
  renderGames('');
  document.getElementById('game-search-input').addEventListener('input', event => renderGames(event.target.value));
}

function renderGames(query){
  const list = document.getElementById('list');
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
  const filteredGames = games
    .filter(game => `${game.title} ${game.category || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    .sort((first, second) => first.title.localeCompare(second.title, 'tr', {sensitivity:'base'}));

  list.innerHTML = filteredGames.length ? '' : `<p class="empty-state">${normalizedQuery ? 'Aramanızla eşleşen oyun bulunamadı.' : 'Henüz oyun eklenmemiş.'}</p>`;
  filteredGames.forEach(g=>{
    const el = document.createElement('a'); el.className='card'; el.href=`game.html?id=${encodeURIComponent(g.id)}`;
    const image = g.image || fallbackImage(g.category);
    el.innerHTML = `<img class="game-card-image" src="${escapeHtml(image)}" alt="${escapeHtml(g.title)}"><span class="game-card-body"><strong>${escapeHtml(g.title)}</strong><span class="game-category">${escapeHtml(g.category||'Oyun')}</span></span>`;
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
