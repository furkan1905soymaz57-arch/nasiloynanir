async function render(){
  const res = await fetch('/api/games');
  const games = await res.json();
  const table = document.getElementById('table');
  if(!games || games.length===0){ table.innerHTML = '<div class="card">Kayıt yok.</div>'; return }
  const rows = games.map(g=>{
    return `<div class="card"><strong>${escapeHtml(g.title)}</strong> <div style="font-size:12px;color:rgba(255,255,255,0.6)">${escapeHtml(g.category||'')}</div><details style="margin-top:8px"><summary>İçerik</summary><div style="padding-top:8px">${g.content||''}</div></details><div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,0.6)">ID: ${g.id}</div></div>`
  }).join('\n');
  table.innerHTML = rows;
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

document.getElementById('refresh').addEventListener('click',render);
render();
