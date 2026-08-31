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

async function refresh(){
  const res = await fetch('/api/games'); const games = await res.json();
  const query = (searchInput?.value || '').trim().toLocaleLowerCase('tr-TR');
  const filteredGames = [...games]
    .filter(game => {
      if (!query) return true;
      const haystack = `${game.title || ''} ${game.category || ''}`.toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    })
    .sort((first, second) => first.title.localeCompare(second.title, 'tr', { sensitivity: 'base' }));

  const items = document.getElementById('items'); items.innerHTML='';
  filteredGames.forEach(g=>{
    const el = document.createElement('div'); el.className='card';
    const image = g.image ? `<img class="admin-game-image" src="${escapeHtml(g.image)}" alt="${escapeHtml(g.title)}">` : '';
    el.innerHTML = `<div class="admin-game-info">${image}<span><strong>${escapeHtml(g.title)}</strong><small>${escapeHtml(g.category||'')}</small></span></div>`;
    const actions = document.createElement('div'); actions.className='item-actions';
    const edit = document.createElement('button'); edit.textContent='Düzenle'; edit.className='small-btn';
    edit.onclick = ()=>populate(g);
    const del = document.createElement('button'); del.textContent='Sil'; del.className='small-btn danger';
    del.onclick = async ()=>{ if(!confirm('Silinsin mi?')) return; await fetch('/api/games/'+g.id,{method:'DELETE'}); refresh(); }
    actions.appendChild(edit); actions.appendChild(del); el.appendChild(actions); items.appendChild(el);
  })
}

function escapeHtml(s){if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

const form = document.getElementById('form'); let editId = null;
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const status = document.getElementById('form-status');
  status.textContent = 'Kaydediliyor...';
  try{
    const title=document.getElementById('title').value; const category=document.getElementById('category').value; const content=document.getElementById('content').value;
    const imageFile = document.getElementById('image').files[0];
    const image = imageFile ? await readImage(imageFile) : undefined;
    const payload = {title,category,content};
    if(image) payload.image = image;
    const response = await fetch(editId ? '/api/games/'+editId : '/api/games', {method:editId ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!response.ok) throw new Error(`Sunucu hatası: ${response.status}`);
    editId=null;
    form.reset();
    status.textContent = 'Oyun başarıyla kaydedildi.';
    await refresh();
  }catch(error){
    status.textContent = `Kayıt başarısız: ${error.message}`;
  }
})

function readImage(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function populate(g){ editId=g.id; document.getElementById('title').value=g.title||''; document.getElementById('category').value=g.category||''; document.getElementById('content').value=g.content||'' }

refresh()
