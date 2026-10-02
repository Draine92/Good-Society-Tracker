'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { q, getSetting, setSetting, currentSession } from '@/lib/db';
import {
  createSession,
  destroySession,
  getUser,
  requireUser,
  requireDM,
  userCount,
} from '@/lib/auth';

/* ---------- helpers ---------- */

function str(fd, key, max = 2000) {
  const v = fd.get(key);
  return (typeof v === 'string' ? v : '').trim().slice(0, max);
}

function int(fd, key, fallback = 0) {
  const n = parseInt(fd.get(key), 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function fail(path, msg) {
  redirect(`${path}${path.includes('?') ? '&' : '?'}err=${encodeURIComponent(msg)}`);
}

function meUrl(user, characterId) {
  return user.role === 'dm' ? `/me?char=${characterId}` : '/me';
}

function validUsername(u) {
  return /^[a-z0-9_.-]{3,30}$/i.test(u);
}

async function canEditCharacter(user, characterId) {
  const rows = await q('select owner_id from characters where id = $1', [characterId]);
  if (!rows.length) return false;
  return user.role === 'dm' || rows[0].owner_id === user.id;
}

/* ---------- login throttle (best effort; resets on cold start) ---------- */

const attempts = globalThis.__gsAttempts || (globalThis.__gsAttempts = new Map());

function throttled(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > 10 * 60 * 1000) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= 8;
}

function recordFailure(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > 10 * 60 * 1000) {
    attempts.set(key, { first: Date.now(), count: 1 });
  } else {
    rec.count += 1;
  }
}

/* ---------- auth ---------- */

export async function login(fd) {
  const username = str(fd, 'username', 60).toLowerCase();
  const password = typeof fd.get('password') === 'string' ? fd.get('password') : '';
  if (throttled(username)) fail('/login', 'Too many attempts. Try again in a few minutes.');
  const rows = await q('select id, password_hash from users where lower(username) = $1', [username]);
  const ok = rows.length && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) {
    recordFailure(username);
    fail('/login', 'Wrong username or password.');
  }
  attempts.delete(username);
  await createSession(rows[0].id);
  redirect('/');
}

export async function logout() {
  destroySession();
  redirect('/login');
}

export async function setupDM(fd) {
  if ((await userCount()) > 0) fail('/login', 'Setup has already been completed.');
  const expected = process.env.SETUP_KEY;
  if (!expected) fail('/setup', 'SETUP_KEY is not set on the server.');
  if (str(fd, 'key', 200) !== expected) fail('/setup', 'Wrong setup key.');
  const username = str(fd, 'username', 30);
  const display = str(fd, 'display_name', 60) || username;
  const password = typeof fd.get('password') === 'string' ? fd.get('password') : '';
  if (!validUsername(username)) fail('/setup', 'Username must be 3-30 letters, numbers, . _ or -.');
  if (password.length < 8) fail('/setup', 'Password must be at least 8 characters.');
  const hash = await bcrypt.hash(password, 10);
  const rows = await q(
    "insert into users (username, display_name, password_hash, role) values ($1,$2,$3,'dm') returning id",
    [username, display, hash]
  );
  await createSession(rows[0].id);
  redirect('/dm');
}

export async function createPlayer(fd) {
  await requireDM();
  const username = str(fd, 'username', 30);
  const display = str(fd, 'display_name', 60) || username;
  const password = typeof fd.get('password') === 'string' ? fd.get('password') : '';
  if (!validUsername(username)) fail('/dm', 'Username must be 3-30 letters, numbers, . _ or -.');
  if (password.length < 8) fail('/dm', 'Password must be at least 8 characters.');
  const exists = await q('select 1 from users where lower(username) = lower($1)', [username]);
  if (exists.length) fail('/dm', 'That username is taken.');
  const hash = await bcrypt.hash(password, 10);
  const rows = await q(
    "insert into users (username, display_name, password_hash, role) values ($1,$2,$3,'player') returning id",
    [username, display, hash]
  );
  await q('insert into characters (owner_id, name) values ($1, $2)', [rows[0].id, display]);
  revalidatePath('/', 'layout');
  redirect('/dm?ok=Player+created');
}

export async function removePlayer(fd) {
  const dm = await requireDM();
  const id = int(fd, 'user_id');
  const rows = await q('select id, role, display_name from users where id = $1', [id]);
  if (!rows.length) fail('/dm', 'That player no longer exists.');
  if (rows[0].role !== 'player' || rows[0].id === dm.id) fail('/dm', 'Only player accounts can be removed.');
  // Their character, tags and the NPCs they wrote go with them; their login stops working at once.
  await q('delete from users where id = $1', [id]);
  revalidatePath('/', 'layout');
  redirect('/dm?ok=' + encodeURIComponent(`${rows[0].display_name} was removed`));
}

export async function resetPassword(fd) {
  await requireDM();
  const id = int(fd, 'user_id');
  const password = typeof fd.get('password') === 'string' ? fd.get('password') : '';
  if (password.length < 8) fail('/dm', 'Password must be at least 8 characters.');
  await q('update users set password_hash = $1 where id = $2', [await bcrypt.hash(password, 10), id]);
  redirect('/dm?ok=Password+updated');
}

export async function changeOwnPassword(fd) {
  const user = await requireUser();
  const current = typeof fd.get('current') === 'string' ? fd.get('current') : '';
  const next = typeof fd.get('next') === 'string' ? fd.get('next') : '';
  const rows = await q('select password_hash from users where id = $1', [user.id]);
  if (!(await bcrypt.compare(current, rows[0].password_hash))) fail('/me', 'Current password is wrong.');
  if (next.length < 8) fail('/me', 'New password must be at least 8 characters.');
  await q('update users set password_hash = $1 where id = $2', [await bcrypt.hash(next, 10), user.id]);
  redirect('/me?ok=Password+changed');
}

/* ---------- characters ---------- */

export async function saveCharacter(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  if (!(await canEditCharacter(user, id))) fail('/', 'Not allowed.');
  await q(
    `update characters set
       name = $2, concept = $3, public_relationships = $4,
       conflict_left = $5, conflict_right = $6,
       marks_left = $7, marks_right = $8,
       desire = $9, private_notes = $10, updated_at = now()
     where id = $1`,
    [
      id,
      str(fd, 'name', 80),
      str(fd, 'concept', 600),
      str(fd, 'public_relationships', 1000),
      str(fd, 'conflict_left', 40),
      str(fd, 'conflict_right', 40),
      clamp(int(fd, 'marks_left'), 0, 3),
      clamp(int(fd, 'marks_right'), 0, 3),
      str(fd, 'desire', 2000),
      str(fd, 'private_notes', 4000),
    ]
  );
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, id)}${user.role === 'dm' ? '&' : '?'}ok=Saved`);
}

/* ---------- chosen cards ---------- */

export async function setDesireCard(fd) {
  const user = await requireUser();
  const id = int(fd, 'character_id');
  if (!(await canEditCharacter(user, id))) fail('/', 'Not allowed.');
  const card = int(fd, 'card', 0);
  if (card !== 0 && (card < 1 || card > 22)) fail(meUrl(user, id), 'Pick a desire card from 1 to 22.');
  await q('update characters set desire_card = $2, updated_at = now() where id = $1', [id, card || null]);
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, id)}${user.role === 'dm' ? '&' : '?'}ok=${card ? 'Desire+card+chosen' : 'Desire+card+cleared'}#cards`);
}

export async function setHouseCard(fd) {
  const user = await requireUser();
  const id = int(fd, 'character_id');
  if (!(await canEditCharacter(user, id))) fail('/', 'Not allowed.');
  const house = int(fd, 'house', -1);
  if (house < -1 || house > 7) fail(meUrl(user, id), 'Pick one of the eight Houses.');
  await q('update characters set house = $2, updated_at = now() where id = $1', [id, house >= 0 ? house : null]);
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, id)}${user.role === 'dm' ? '&' : '?'}ok=House+saved#cards`);
}

export async function addRelationshipCard(fd) {
  const user = await requireUser();
  const me = int(fd, 'character_id');
  const other = int(fd, 'other_id');
  const card = int(fd, 'card');
  const role = str(fd, 'role', 10);
  if (!(await canEditCharacter(user, me))) fail('/', 'Not allowed.');
  if (card < 23 || card > 36) fail(meUrl(user, me), 'Pick a relationship card.');
  if (!other || other === me) fail(meUrl(user, me), 'Pick the other character for this relationship.');
  const o = await q('select 1 from characters where id = $1', [other]);
  if (!o.length) fail(meUrl(user, me), 'That character does not exist.');
  const [giver, taker] = role === 'taker' ? [other, me] : [me, other];
  await q('insert into relationship_cards (card, giver_id, taker_id) values ($1,$2,$3)', [card, giver, taker]);
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, me)}${user.role === 'dm' ? '&' : '?'}ok=Relationship+card+added#cards`);
}

export async function removeRelationshipCard(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  const me = int(fd, 'character_id');
  const rows = await q('select giver_id, taker_id from relationship_cards where id = $1', [id]);
  if (!rows.length) fail(meUrl(user, me), 'That relationship card is already gone.');
  const mayEdit = (await canEditCharacter(user, rows[0].giver_id)) || (await canEditCharacter(user, rows[0].taker_id));
  if (!mayEdit) fail('/', 'Not allowed.');
  await q('delete from relationship_cards where id = $1', [id]);
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, me)}${user.role === 'dm' ? '&' : '?'}ok=Relationship+card+removed#cards`);
}

export async function adjustInspiration(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  if (!(await canEditCharacter(user, id))) fail('/', 'Not allowed.');
  const delta = int(fd, 'delta') > 0 ? 1 : -1;
  await q('update characters set inspiration = least(3, greatest(0, inspiration + $2)) where id = $1', [id, delta]);
  revalidatePath('/', 'layout');
}

export async function toggleMonologue(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  if (!(await canEditCharacter(user, id))) fail('/', 'Not allowed.');
  await q('update characters set monologue_used = not monologue_used where id = $1', [id]);
  revalidatePath('/', 'layout');
}

/* ---------- tags ---------- */

export async function addTag(fd) {
  const user = await requireUser();
  const characterId = int(fd, 'character_id');
  if (!(await canEditCharacter(user, characterId))) fail('/', 'Not allowed.');
  const kind = str(fd, 'kind', 10) === 'negative' ? 'negative' : 'positive';
  const word = str(fd, 'word', 40);
  if (!word) fail(meUrl(user, characterId), 'A tag needs a word.');
  const count = await q('select count(*)::int as n from tags where character_id = $1 and kind = $2', [characterId, kind]);
  if (count[0].n >= 3) fail(meUrl(user, characterId), `You already have 3 ${kind} tags. Deepen one or remove one first.`);
  await q('insert into tags (character_id, kind, word, skill, scene) values ($1,$2,$3,$4,$5)', [
    characterId,
    kind,
    word,
    str(fd, 'skill', 40),
    str(fd, 'scene', 60),
  ]);
  revalidatePath('/', 'layout');
  redirect(`${meUrl(user, characterId)}${user.role === 'dm' ? '&' : '?'}ok=Tag+added`);
}

async function tagOwnerCheck(user, tagId) {
  const rows = await q('select character_id from tags where id = $1', [tagId]);
  if (!rows.length) return null;
  return (await canEditCharacter(user, rows[0].character_id)) ? rows[0] : null;
}

export async function adjustPips(fd) {
  const user = await requireUser();
  const id = int(fd, 'tag_id');
  if (!(await tagOwnerCheck(user, id))) fail('/', 'Not allowed.');
  const delta = int(fd, 'delta') > 0 ? 1 : -1;
  await q('update tags set pips = least(3, greatest(1, pips + $2)) where id = $1', [id, delta]);
  revalidatePath('/', 'layout');
}

export async function deleteTag(fd) {
  const user = await requireUser();
  const id = int(fd, 'tag_id');
  if (!(await tagOwnerCheck(user, id))) fail('/', 'Not allowed.');
  await q('delete from tags where id = $1', [id]);
  revalidatePath('/', 'layout');
}

/* ---------- rumours ---------- */

export async function addRumour(fd) {
  const user = await requireUser();
  const text = str(fd, 'text', 400);
  if (!text) fail('/rumours', 'Write the rumour first.');
  const session = await currentSession();
  await q('insert into rumours (text, author_id, created_session) values ($1,$2,$3)', [text, user.id, session]);
  revalidatePath('/rumours');
  redirect('/rumours');
}

export async function spreadRumour(fd) {
  await requireUser();
  const id = int(fd, 'id');
  await q("update rumours set status = 'spread', fading = 0 where id = $1 and status = 'active'", [id]);
  revalidatePath('/rumours');
}

export async function cashSpark(fd) {
  await requireUser();
  const id = int(fd, 'id');
  await q("update rumours set status = 'used' where id = $1 and status = 'spread'", [id]);
  revalidatePath('/rumours');
}

export async function deleteRumour(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  const rows = await q('select author_id, status from rumours where id = $1', [id]);
  if (!rows.length) return;
  const mine = rows[0].author_id === user.id && rows[0].status === 'active';
  if (user.role !== 'dm' && !mine) fail('/rumours', 'Not allowed.');
  await q('delete from rumours where id = $1', [id]);
  revalidatePath('/rumours');
}

/* ---------- NPCs ---------- */

export async function saveNpc(fd) {
  const user = await requireUser();
  const id = int(fd, 'id', 0);
  const name = str(fd, 'name', 80);
  if (!name) fail('/npcs', 'The NPC needs a name.');
  const targetRaw = int(fd, 'target_character_id', 0);
  const target = targetRaw || null;

  if (target) {
    const t = await q('select owner_id from characters where id = $1', [target]);
    if (!t.length) fail('/npcs', 'Pick a valid player character.');
    if (user.role !== 'dm' && t[0].owner_id === user.id) {
      fail('/npcs', 'Your NPCs must be tied to another player’s character.');
    }
  } else if (user.role !== 'dm') {
    fail('/npcs', 'Pick which player character this NPC is tied to.');
  }

  const cardN = int(fd, 'card_n', 0);
  if (cardN !== 0 && (cardN < 37 || cardN > 66)) fail('/npcs', 'Pick a connection card from 37 to 66.');
  const cardSide = cardN && ['a', 'b'].includes(str(fd, 'card_side', 1)) ? str(fd, 'card_side', 1) : '';

  const fields = [
    name,
    target,
    str(fd, 'relationship', 120),
    str(fd, 'opinion', 400),
    str(fd, 'public_notes', 1000),
    str(fd, 'want', 600),
    str(fd, 'secret', 1000),
    cardN || null,
    cardSide,
  ];

  if (id) {
    const rows = await q('select author_id from npcs where id = $1', [id]);
    if (!rows.length || (user.role !== 'dm' && rows[0].author_id !== user.id)) fail('/npcs', 'Not allowed.');
    await q(
      `update npcs set name=$2, target_character_id=$3, relationship=$4, opinion=$5,
         public_notes=$6, want=$7, secret=$8, card_n=$9, card_side=$10 where id=$1`,
      [id, ...fields]
    );
  } else {
    if (user.role !== 'dm') {
      const c = await q('select count(*)::int as n from npcs where author_id = $1', [user.id]);
      if (c[0].n >= 3) fail('/npcs', 'You already have 3 NPCs (2 plus the mid-campaign slot).');
    }
    await q(
      `insert into npcs (author_id, name, target_character_id, relationship, opinion, public_notes, want, secret, card_n, card_side)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [user.id, ...fields]
    );
  }
  revalidatePath('/npcs');
  redirect('/npcs?ok=Saved');
}

export async function deleteNpc(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  const rows = await q('select author_id from npcs where id = $1', [id]);
  if (!rows.length || (user.role !== 'dm' && rows[0].author_id !== user.id)) fail('/npcs', 'Not allowed.');
  await q('delete from npcs where id = $1', [id]);
  revalidatePath('/npcs');
}

export async function adjustLeverage(fd) {
  const user = await requireUser();
  const id = int(fd, 'id');
  const rows = await q('select author_id from npcs where id = $1', [id]);
  if (!rows.length || (user.role !== 'dm' && rows[0].author_id !== user.id)) fail('/npcs', 'Not allowed.');
  const delta = int(fd, 'delta') > 0 ? 1 : -1;
  await q('update npcs set leverage = least(9, greatest(0, leverage + $2)) where id = $1', [id, delta]);
  revalidatePath('/npcs');
}

/* ---------- DM tools ---------- */

export async function endSession(fd) {
  await requireDM();
  const session = await currentSession();
  // Rumours: those already fading are crossed off; the rest start fading.
  await q("update rumours set status = 'faded' where status = 'active' and fading >= 1");
  await q("update rumours set fading = 1 where status = 'active' and fading = 0");
  await q('update characters set monologue_used = false');
  const summary = str(fd, 'summary', 2000);
  if (summary) await q('insert into session_log (session_no, text) values ($1,$2)', [session, summary]);
  await setSetting('session', String(session + 1));
  revalidatePath('/', 'layout');
  redirect(`/dm?ok=${encodeURIComponent('Session ' + session + ' closed. Now on session ' + (session + 1) + '.')}`);
}

export async function addLog(fd) {
  await requireDM();
  const text = str(fd, 'text', 2000);
  if (!text) fail('/dm', 'Write something for the log first.');
  await q('insert into session_log (session_no, text) values ($1,$2)', [await currentSession(), text]);
  revalidatePath('/', 'layout');
  redirect('/dm?ok=Logged');
}

export async function deleteLog(fd) {
  await requireDM();
  await q('delete from session_log where id = $1', [int(fd, 'id')]);
  revalidatePath('/', 'layout');
}

export async function saveCollab(fd) {
  await requireDM();
  await setSetting('collab', str(fd, 'collab', 4000));
  revalidatePath('/', 'layout');
  redirect('/dm?ok=Saved');
}
