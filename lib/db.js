import { Pool } from 'pg';

const g = globalThis;

export function dbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
}

function getPool() {
  if (!g.__gsPool) {
    const url = dbUrl();
    if (!url) {
      throw new Error(
        'No database URL found. Set DATABASE_URL (or POSTGRES_URL) and redeploy.'
      );
    }
    g.__gsPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10000,
    });
  }
  return g.__gsPool;
}

const SCHEMA = `
create table if not exists users (
  id serial primary key,
  username text not null,
  display_name text not null,
  password_hash text not null,
  role text not null default 'player' check (role in ('dm','player')),
  created_at timestamptz not null default now()
);
create unique index if not exists users_username_lower on users (lower(username));

create table if not exists characters (
  id serial primary key,
  owner_id integer not null unique references users(id) on delete cascade,
  name text not null default '',
  concept text not null default '',
  public_relationships text not null default '',
  inspiration integer not null default 0 check (inspiration between 0 and 3),
  monologue_used boolean not null default false,
  conflict_left text not null default '',
  conflict_right text not null default '',
  marks_left integer not null default 0 check (marks_left between 0 and 5),
  marks_right integer not null default 0 check (marks_right between 0 and 5),
  desire text not null default '',
  private_notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists tags (
  id serial primary key,
  character_id integer not null references characters(id) on delete cascade,
  kind text not null check (kind in ('positive','negative')),
  word text not null,
  skill text not null default '',
  scene text not null default '',
  pips integer not null default 1 check (pips between 1 and 3),
  created_at timestamptz not null default now()
);

create table if not exists npcs (
  id serial primary key,
  author_id integer not null references users(id) on delete cascade,
  target_character_id integer references characters(id) on delete set null,
  name text not null,
  relationship text not null default '',
  opinion text not null default '',
  public_notes text not null default '',
  want text not null default '',
  secret text not null default '',
  leverage integer not null default 2 check (leverage between 0 and 9),
  created_at timestamptz not null default now()
);

create table if not exists rumours (
  id serial primary key,
  text text not null,
  author_id integer references users(id) on delete set null,
  status text not null default 'active' check (status in ('active','spread','used','faded')),
  fading integer not null default 0,
  created_session integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null default ''
);

create table if not exists session_log (
  id serial primary key,
  session_no integer not null default 1,
  text text not null,
  created_at timestamptz not null default now()
);
`;

export async function ensureSchema() {
  if (!g.__gsSchema) {
    g.__gsSchema = getPool()
      .query(SCHEMA)
      .catch((err) => {
        g.__gsSchema = null;
        throw err;
      });
  }
  return g.__gsSchema;
}

export async function q(text, params = []) {
  await ensureSchema();
  const res = await getPool().query(text, params);
  return res.rows;
}

export async function getSetting(key, fallback = '') {
  const rows = await q('select value from settings where key = $1', [key]);
  return rows.length ? rows[0].value : fallback;
}

export async function setSetting(key, value) {
  await q(
    'insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value',
    [key, value]
  );
}

export async function currentSession() {
  return parseInt(await getSetting('session', '1'), 10) || 1;
}
