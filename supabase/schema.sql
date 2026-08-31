create table if not exists public.games (
  id text primary key,
  title text,
  category text,
  content text,
  image text
);

create index if not exists idx_games_title
  on public.games (title);
