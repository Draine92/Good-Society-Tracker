import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { q, currentSession, getSetting } from '@/lib/db';
import Flash from '@/components/Flash';
import Pips from '@/components/Pips';
import HexThumb from '@/components/HexThumb';
import { loadClock, loadHexes } from '@/lib/hexdb';
import { shortDate, weekday, MONTHS, ERA, weatherMap } from '@/lib/calendar';
import { loadEvents, eventsOn, upcoming } from '@/lib/events';
import { SITE_NAME, DDB_URL } from '@/lib/world';
import CelticKnot from '@/components/CelticKnot';
import { DESIRES, RELATIONSHIPS, CONNECTIONS } from '@/lib/deck-data';

const clip = (s, n = 90) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '');

export default async function NoticeBoard({ searchParams }) {
  const user = await requireUser();
  const { date: today, roll } = await loadClock();
  const hexes = await loadHexes(false); // also makes sure the map layout is current before reading the party marker
  const partyRaw = await getSetting('party_hex', '');
  const party = partyRaw ? (([c, r]) => ({ c, r }))(partyRaw.split(',').map(Number)) : null;
  const session = await currentSession();

  const events = await loadEvents(user.role === 'dm');
  const todays = eventsOn(events, today.year, today.month, today.day);
  const soon = upcoming(events, today, 5).filter((e) => e.inDays > 0).slice(0, 3);
  const partyHex = party && hexes.find((h) => h.c === party.c && h.r === party.r);
  const wx = partyHex ? weatherMap([partyHex], today, roll).get(`${party.c},${party.r}`) : null;
  const wxWhere = partyHex ? partyHex.name || partyHex.house || `hex ${party.c + 1}, ${party.r + 1}` : '';

  const characters = await q(
    `select c.id, c.name, c.concept, c.inspiration, c.monologue_used, c.marks_left, c.marks_right, u.display_name
     from characters c join users u on u.id = c.owner_id order by c.id`
  );
  const tags = await q(`select character_id, word, pips from tags where kind = 'positive' order by pips desc, id`);
  const rumours = await q(
    `select text, status, fading from rumours where status in ('active','spread') order by (status = 'spread') desc, id desc`
  );
  const npcs = await q(
    `select n.id, n.name, n.relationship, c.name as target_name, tu.display_name as target_player
     from npcs n left join characters c on c.id = n.target_character_id left join users tu on tu.id = c.owner_id
     order by n.id desc`
  );
  const log = await q('select session_no, text from session_log order by id desc limit 2');

  const sparks = rumours.filter((r) => r.status === 'spread');
  const whispers = rumours.filter((r) => r.status === 'active');
  const topTag = (id) => tags.find((t) => t.character_id === id);

  return (
    <>
      <Flash searchParams={searchParams} />
      <div className="board">
        <div className="plank">
          <h1>{SITE_NAME}</h1>
          <span>Notice Board · Session {session} · {weekday(today)}, {shortDate(today)}</span>
        </div>

        <div className="board-layout">
        <Link href="/rules" className="book-obj" aria-label="Open the rules book">
          <span className="book-cover">
            <span className="book-orn"><CelticKnot size={46} gap="var(--crimson)" /></span>
            <span className="book-title">Rules of the Concord</span>
            <span className="book-orn small">· · ·</span>
          </span>
          <span className="obj-label">Rules reference</span>
        </Link>

        <div className="board-grid">
          <Link href="/map" className="note map-note" aria-label="Open the world map">
            <span className="pin" />
            <h3>The Known World</h3>
            <HexThumb party={party} />
            <span className="more">Open the full map →</span>
          </Link>

          <Link href="/calendar" className="note tilt-l" aria-label="Open the calendar">
            <span className="pin" />
            <h3>The Calendar</h3>
            <p className="nb-date">
              <span className="nb-day">{today.day}</span>
              <span>
                <b>{MONTHS[today.month].name}</b>
                <br />
                <span className="muted">{weekday(today)} · {MONTHS[today.month].season} · Year {today.year} {ERA}</span>
              </span>
            </p>
            {todays.length > 0 && (
              <p className="nb-today">{todays.map((e) => e.title).join(' · ')} <span className="muted">today</span></p>
            )}
            {soon.length > 0 ? (
              <ul className="mini">
                {soon.map((e) => (
                  <li key={`${e.id}-${e.inDays}`}>
                    <strong>{e.title}</strong>
                    <span className="muted"> · {e.inDays === 1 ? 'tomorrow' : `in ${e.inDays} days`}</span>
                  </li>
                ))}
              </ul>
            ) : todays.length === 0 ? (
              <p className="muted">Nothing is marked in the coming days.</p>
            ) : null}
            <span className="more">Open the calendar →</span>
          </Link>

          <Link href="/map" className="note tilt-r" aria-label="Open the map for the weather">
            <span className="pin" />
            <h3>Weather Report</h3>
            {wx ? (
              <>
                <p className="nb-wx">
                  <span className="nb-glyph" aria-hidden="true">{wx.glyph}</span>
                  <span>
                    <b>{wx.label}</b>
                    <br />
                    <span className="muted">{wx.temperature} · near {wxWhere}</span>
                  </span>
                </p>
                {wx.note && <p className="muted">{wx.note}</p>}
              </>
            ) : (
              <p className="muted">
                {party ? 'The party is beyond the edge of the charted lands, so there is no report.' : 'No report yet: the party has not been placed on the map.'}
              </p>
            )}
            <span className="more">Weather across the map →</span>
          </Link>

          <Link href="/rumours" className="note tilt-l2" aria-label="Open the rumour board">
            <span className="pin" />
            <h3>Rumour Board</h3>
            <p className="tally">
              <b>{sparks.length}</b> {sparks.length === 1 ? 'Spark' : 'Sparks'} · <b>{whispers.length}</b>{' '}
              {whispers.length === 1 ? 'whisper' : 'whispers'}
            </p>
            {rumours.length === 0 && <p className="muted">Nothing is being whispered.</p>}
            <ul className="mini">
              {rumours.slice(0, 3).map((r, i) => (
                <li key={i}>
                  {r.status === 'spread' && <span className="badge">Spark</span>}
                  {r.status === 'active' && r.fading >= 1 && <span className="badge fade">Fading</span>} {clip(r.text)}
                </li>
              ))}
            </ul>
            <span className="more">Read the board →</span>
          </Link>

          <Link href="/court" className="note tilt-r" aria-label="Open the court">
            <span className="pin" />
            <h3>The Court</h3>
            {characters.length === 0 && <p className="muted">No player characters yet.</p>}
            <ul className="mini">
              {characters.map((c) => {
                const t = topTag(c.id);
                const ready = c.marks_left >= 3 || c.marks_right >= 3 || c.marks_left + c.marks_right >= 5;
                return (
                  <li key={c.id}>
                    <strong>{c.name || c.display_name}</strong>
                    {c.concept && <span className="muted"> · {clip(c.concept, 40)}</span>}
                    <div className="row" style={{ gap: 10 }}>
                      {t && <span className="chip pos">{t.word}</span>}
                      <Pips n={c.inspiration} />
                      {ready && <span className="badge">Conflict ready</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <span className="more">Meet the court →</span>
          </Link>

          <Link href="/npcs" className="note tilt-l2" aria-label="Open the NPC roster">
            <span className="pin" />
            <h3>Persons of Note</h3>
            <p className="tally">
              <b>{npcs.length}</b> {npcs.length === 1 ? 'acquaintance' : 'acquaintances'}
            </p>
            {npcs.length === 0 && <p className="muted">No one of note yet.</p>}
            <ul className="mini">
              {npcs.slice(0, 4).map((n) => (
                <li key={n.id}>
                  <strong>{n.name}</strong>
                  <span className="muted">
                    {n.relationship ? ` · ${clip(n.relationship, 30)}` : ''}
                    {n.target_name || n.target_player ? ` · of ${n.target_name || n.target_player}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <span className="more">See everyone →</span>
          </Link>

          <a href={DDB_URL} target="_blank" rel="noopener noreferrer" className="note tilt-r2" aria-label="Open the campaign on D&D Beyond">
            <span className="pin" />
            <h3>The Campaign</h3>
            <p className="muted">Characters, sheets and dice live on D&amp;D Beyond. Open our campaign page to find your character and the table.</p>
            <span className="more">Open on D&amp;D Beyond ↗</span>
          </a>

          <Link href="/court#story" className="note tilt-r2" aria-label="Open the story so far">
            <span className="pin" />
            <h3>Story So Far</h3>
            {log.length === 0 && <p className="muted">The tale has yet to begin.</p>}
            <ul className="mini">
              {log.map((l, i) => (
                <li key={i}>
                  <strong>Session {l.session_no}:</strong> {clip(l.text, 140)}
                </li>
              ))}
            </ul>
            <span className="more">Read on →</span>
          </Link>
        </div>

        <Link href="/deck" className="deck-obj" aria-label="Open the deck of cards">
          <span className="deck-stack">
            <span className="dcard c1" /><span className="dcard c2" /><span className="dcard c3" />
            <span className="dcard c4"><span className="deck-orn">⚜</span></span>
          </span>
          <span className="obj-label">{DESIRES.length + RELATIONSHIPS.length + CONNECTIONS.length} cards</span>
        </Link>
        </div>
      </div>
    </>
  );
}
