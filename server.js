const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
app.use(express.json({limit:'5mb'}));

const DB_PATH = path.join(__dirname, 'db.json');
const ADMIN_EMAIL = 'furkan1905soymaz57@gmail.com';
const ADMIN_PASSWORD = '6216501560';
const ADMIN_PATH = '/adminfako57';
const adminSessions = new Map();

function getCookieValue(req, cookieName) {
  const rawCookies = req.headers.cookie || '';
  const cookies = rawCookies.split(';').map(cookie => cookie.trim());
  const cookie = cookies.find(item => item.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  const value = cookie.substring(cookieName.length + 1);
  return decodeURIComponent(value);
}

function isAdminAuthenticated(req) {
  const sessionToken = getCookieValue(req, 'admin_session');
  if (!sessionToken) return false;
  const session = adminSessions.get(sessionToken);
  return Boolean(session && session.email === ADMIN_EMAIL);
}

function readDB(){
  try{const raw = fs.readFileSync(DB_PATH,'utf8'); return JSON.parse(raw)}catch(e){return {games:[]}}
}
function writeDB(data){
  if(Array.isArray(data.games)) data.games = sortGames(data.games);
  fs.writeFileSync(DB_PATH, JSON.stringify(data,null,2))
}
function sortGames(games){
  return [...games].sort((first, second) =>
    String(first.title || '').localeCompare(String(second.title || ''), 'tr', {sensitivity:'base'})
  )
}

app.get('/api/games',(req,res)=>{
  const db = readDB(); res.json(sortGames(db.games || []))
})

app.get('/api/games/:id',(req,res)=>{
  const db=readDB(); const g = (db.games||[]).find(x=>x.id===req.params.id);
  if(!g) return res.status(404).json({error:'Not found'});
  res.json(g);
})

app.post('/api/games',(req,res)=>{
  const db = readDB(); const body = req.body||{};
  const game = { id: nanoid(), title: body.title||'Untitled', category: body.category||'general', content: body.content||'', image: body.image||'' };
  db.games = db.games || [];
  db.games.push(game); writeDB(db); res.json(game);
})

app.put('/api/games/:id',(req,res)=>{
  const db = readDB(); db.games = db.games || [];
  const idx = db.games.findIndex(x=>x.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  db.games[idx] = Object.assign(db.games[idx], req.body);
  writeDB(db); res.json(db.games.find(game => game.id === req.params.id));
})

app.delete('/api/games/:id',(req,res)=>{
  const db = readDB(); db.games = db.games || [];
  const idx = db.games.findIndex(x=>x.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  const removed = db.games.splice(idx,1)[0]; writeDB(db); res.json(removed);
})

app.post('/api/admin/login',(req,res)=>{
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL.toLowerCase() || String(password || '') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'E-posta veya şifre yanlış.' });
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  adminSessions.set(sessionToken, { email: ADMIN_EMAIL, createdAt: Date.now() });

  res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return res.json({ ok: true, redirect: '/admin.html' });
});

app.get('/api/admin/session',(req,res)=>{
  const loggedIn = isAdminAuthenticated(req);
  res.json({ loggedIn, email: loggedIn ? ADMIN_EMAIL : null });
});

app.post('/api/admin/logout',(req,res)=>{
  const sessionToken = getCookieValue(req, 'admin_session');
  if (sessionToken) adminSessions.delete(sessionToken);
  res.clearCookie('admin_session', { path: '/' });
  res.json({ ok: true });
});

app.get(ADMIN_PATH,(req,res)=>{
  if (isAdminAuthenticated(req)) {
    return res.redirect('/admin.html');
  }
  return res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin.html',(req,res)=>{
  if (!isAdminAuthenticated(req)) {
    return res.redirect(`${ADMIN_PATH}?unauthorized=1`);
  }
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname,'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Server listening on http://localhost:${PORT}`));
