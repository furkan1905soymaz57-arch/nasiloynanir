require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DB_PATH = path.join(process.cwd(), 'db.json');
const ADMIN_EMAIL = 'furkan1905soymaz57@gmail.com';
const ADMIN_PASSWORD = '6216501560';
const ADMIN_PATH = '/adminfako57';
const adminSessions = new Map();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInRefresh: false,
      },
    })
  : null;

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

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { games: [] };
  }
}

function writeDB(data) {
  if (Array.isArray(data.games)) data.games = sortGames(data.games);

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Database write failed:', error.message);
  }
}

function sortGames(games) {
  return [...games].sort((first, second) =>
    String(first.title || '').localeCompare(String(second.title || ''), 'tr', { sensitivity: 'base' })
  );
}

async function listGames() {
  if (supabase) {
    const { data, error } = await supabase.from('games').select('*').order('title', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return sortGames(data || []);
  }

  const db = readDB();
  return sortGames(db.games || []);
}

async function getGameById(id) {
  if (supabase) {
    const { data, error } = await supabase.from('games').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  const db = readDB();
  return (db.games || []).find(game => game.id === id) || null;
}

async function createGame(payload) {
  const game = {
    id: payload.id || crypto.randomUUID(),
    title: payload.title || 'Untitled',
    category: payload.category || 'general',
    content: payload.content || '',
    image: payload.image || '',
  };

  if (supabase) {
    const { data, error } = await supabase.from('games').insert([game]).select().single();
    if (error) throw error;
    return data;
  }

  const db = readDB();
  db.games = db.games || [];
  db.games.push(game);
  writeDB(db);
  return game;
}

async function updateGame(id, payload) {
  if (supabase) {
    const { data, error } = await supabase.from('games').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const db = readDB();
  db.games = db.games || [];
  const index = db.games.findIndex(game => game.id === id);
  if (index === -1) return null;

  db.games[index] = Object.assign(db.games[index], payload);
  writeDB(db);
  return db.games[index];
}

async function deleteGame(id) {
  if (supabase) {
    const { data, error } = await supabase.from('games').delete().eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const db = readDB();
  db.games = db.games || [];
  const index = db.games.findIndex(game => game.id === id);
  if (index === -1) return null;

  const removed = db.games.splice(index, 1)[0];
  writeDB(db);
  return removed;
}

app.get('/api/games', async (req, res) => {
  try {
    res.json(await listGames());
  } catch (error) {
    console.error('LOAD_GAMES_ERROR', error);
    res.status(500).json({ error: 'Failed to load games' });
  }
});

app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await getGameById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Not found' });
    res.json(game);
  } catch (error) {
    console.error('GET_GAME_ERROR', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

app.post('/api/games', async (req, res) => {
  try {
    const game = await createGame(req.body || {});
    res.json(game);
  } catch (error) {
    console.error('CREATE_GAME_ERROR', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

app.put('/api/games/:id', async (req, res) => {
  try {
    const game = await updateGame(req.params.id, req.body || {});
    if (!game) return res.status(404).json({ error: 'Not found' });
    res.json(game);
  } catch (error) {
    console.error('UPDATE_GAME_ERROR', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    const removed = await deleteGame(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json(removed);
  } catch (error) {
    console.error('DELETE_GAME_ERROR', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

app.post('/api/admin/login', (req, res) => {
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

app.get('/api/admin/session', (req, res) => {
  const loggedIn = isAdminAuthenticated(req);
  res.json({ loggedIn, email: loggedIn ? ADMIN_EMAIL : null });
});

app.post('/api/admin/logout', (req, res) => {
  const sessionToken = getCookieValue(req, 'admin_session');
  if (sessionToken) adminSessions.delete(sessionToken);
  res.clearCookie('admin_session', { path: '/' });
  res.json({ ok: true });
});

app.get(ADMIN_PATH, (req, res) => {
  if (isAdminAuthenticated(req)) {
    return res.redirect('/admin.html');
  }
  return res.sendFile(path.join(process.cwd(), 'public', 'admin-login.html'));
});

app.get('/admin.html', (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.redirect(`${ADMIN_PATH}?unauthorized=1`);
  }
  return res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.use(express.static(path.join(process.cwd(), 'public')));

module.exports = app;
