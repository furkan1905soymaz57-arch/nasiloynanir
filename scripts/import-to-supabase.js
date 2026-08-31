require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Eksik .env: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInRefresh: false,
  },
});

const dbPath = path.join(__dirname, '..', 'db.json');
const raw = fs.readFileSync(dbPath, 'utf8');
const data = JSON.parse(raw);
const games = Array.isArray(data.games) ? data.games : [];
const batchSize = Number(process.env.IMPORT_BATCH_SIZE || 10);

async function ensureGamesTable() {
  const { error } = await supabase.from('games').select('id').limit(1);
  if (!error) return;

  if (error.code === 'PGRST205') {
    console.error('Tablo bulunamadı. Supabase SQL Editor yapısında şu komutu çalıştırın:');
    console.error('create table if not exists public.games (id text primary key, title text, category text, content text, image text);');
    throw new Error('games table missing');
  }

  throw error;
}

async function importGamesInBatches(rows) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('games').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
    console.log(`Aktarıldı: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
}

(async () => {
  try {
    if (!games.length) {
      console.log('Aktarılacak oyun yok.');
      return;
    }

    console.log(`Toplam oyun: ${games.length}. Batch boyutu: ${batchSize}`);
    await ensureGamesTable();
    await importGamesInBatches(games);
    console.log(`${games.length} oyun Supabase'e aktarıldı.`);
  } catch (error) {
    console.error('Supabase aktarım hatası:', error);
    process.exit(1);
  }
})();
