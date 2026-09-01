const detail = document.getElementById('game-detail');
const gameId = new URLSearchParams(window.location.search).get('id');

function readPreviewGame() {
  try {
    const raw = sessionStorage.getItem('furkan-game-preview');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function renderGame(game) {
  const image = game.image || fallbackImage(game.category);
  document.title = `${game.title} - Oyun Kuralları`;
  detail.innerHTML = `<article class="game-detail"><img class="game-detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(game.title)}"><div class="game-detail-content"><div class="meta">${escapeHtml(game.category || 'Oyun')}</div><h2>${escapeHtml(game.title)}</h2><h3>Nasıl oynanır ve kurallar</h3><div class="content">${formatRules(game.content || '')}</div></div></article>`;
}

async function loadGame(){
  if(!gameId){ showError('Oyun bulunamadı.'); return; }

  const previewGame = readPreviewGame();
  if (previewGame && previewGame.id === gameId) {
    renderGame(previewGame);
  }

  try{
    const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`);
    if(!response.ok) throw new Error('Oyun bulunamadı.');
    const game = await response.json();
    sessionStorage.setItem('furkan-game-preview', JSON.stringify({
      id: game.id,
      title: game.title || 'Oyun',
      category: game.category || 'Oyun',
      image: game.image || fallbackImage(game.category),
      content: game.content || '',
    }));
    renderGame(game);
  }catch(error){
    if (!previewGame || previewGame.id !== gameId) showError(error.message);
  }
}

function formatRules(content){
  if(!content) return '<p>Bu oyun için henüz açıklama eklenmemiş.</p>';
  if(/<[^>]+>/.test(content)) return content;
  const rules = String(content).split(/\r?\n/).map(rule=>rule.trim()).filter(Boolean);
  return `<ul class="rules-list">${rules.map(rule=>`<li>${escapeHtml(rule)}</li>`).join('')}</ul>`;
}

function fallbackImage(category){
  const images = {
    tavla:'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=1200&q=80',
    kart:'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80'
  };
  return images[(category || '').toLowerCase()] || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80';
}

function showError(message){ detail.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`; }
function escapeHtml(value){ return String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
loadGame();
