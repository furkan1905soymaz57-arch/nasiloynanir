const searchInput = document.getElementById('admin-game-search');

async function ensureAdminSession() {
  try {
    const response = await fetch('/api/admin/session');
    if (!response.ok) {
      window.location.href = '/adminfako57';
      return false;
    }

    const data = await response.json();
    if (!data.loggedIn) {
      window.location.href = '/adminfako57';
      return false;
    }

    return true;
  } catch (error) {
    window.location.href = '/adminfako57';
    return false;
  }
}

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/adminfako57';
});

(async () => {
  const permitted = await ensureAdminSession();
  if (!permitted) return;
  searchInput?.addEventListener('input', () => refresh());
  await refresh();
})();

async function refresh() {
  const items = document.getElementById('items');
  items.innerHTML = '<div class="card">Oyunlar yükleniyor...</div>';
  const res = await fetch('/api/games?summary=1&images=0', { cache: 'no-store' });
  if (!res.ok) {
    items.innerHTML = `<div class="card">Oyunlar yüklenemedi (${res.status}).</div>`;
    return;
  }
  const games = await res.json();
  if (!Array.isArray(games)) {
    items.innerHTML = '<div class="card">Geçersiz sunucu yanıtı.</div>';
    return;
  }
  const query = (searchInput?.value || '').trim().toLocaleLowerCase('tr-TR');
  const filteredGames = [...games]
    .filter(game => {
      if (!query) return true;
      const haystack = `${game.title || ''} ${game.category || ''}`.toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    })
    .sort((first, second) => first.title.localeCompare(second.title, 'tr', { sensitivity: 'base' }));

  items.innerHTML = '';
  filteredGames.forEach(g => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div class="admin-game-info"><span><strong>${escapeHtml(g.title)}</strong><small>${escapeHtml(g.category || '')}</small></span></div>`;
    const actions = document.createElement('div'); actions.className = 'item-actions';
    const edit = document.createElement('button'); edit.textContent = 'Düzenle'; edit.className = 'small-btn';
    edit.onclick = async () => {
      const status = document.getElementById('form-status');
      status.textContent = 'Oyun yükleniyor...';
      const response = await fetch('/api/games/' + encodeURIComponent(g.id));
      if (!response.ok) {
        status.textContent = `Oyun yüklenemedi (${response.status}).`;
        return;
      }
      populate(await response.json());
      status.textContent = 'Düzenleme için hazır.';
      document.getElementById('title').focus();
    };
    const del = document.createElement('button'); del.textContent = 'Sil'; del.className = 'small-btn danger';
    del.onclick = async () => {
      if (!confirm('Silinsin mi?')) return;
      const response = await fetch('/api/games/' + encodeURIComponent(g.id), { method: 'DELETE' });
      if (!response.ok) {
        document.getElementById('form-status').textContent = `Silme başarısız (${response.status}).`;
        return;
      }
      await refresh();
    };
    actions.appendChild(edit); actions.appendChild(del); el.appendChild(actions); items.appendChild(el);
  })
}

function escapeHtml(s) { if (!s) return ''; return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') }

const form = document.getElementById('form'); let editId = null;
form.addEventListener('submit', async e => {
  e.preventDefault();
  const status = document.getElementById('form-status');
  status.textContent = 'Kaydediliyor...';
  try {
    const title = document.getElementById('title').value; const category = document.getElementById('category').value; const content = document.getElementById('content').value;
    const imageFile = document.getElementById('image').files[0];
    const image = imageFile ? await readImage(imageFile) : undefined;
    const payload = { title, category, content };
    if (image) payload.image = image;
    const response = await fetch(editId ? '/api/games/' + editId : '/api/games', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Sunucu hatası: ${response.status}`);
    editId = null;
    form.reset();
    status.textContent = 'Oyun başarıyla kaydedildi.';
    await refresh();
  } catch (error) {
    status.textContent = `Kayıt başarısız: ${error.message}`;
  }
})

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function populate(g) { editId = g.id; document.getElementById('title').value = g.title || ''; document.getElementById('category').value = g.category || ''; document.getElementById('content').value = g.content || '' }
