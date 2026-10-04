import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { loadHexes, loadClock } from '@/lib/hexdb';
import { MONTHS, WEEKDAYS, DAYS_PER_MONTH, MONTHS_PER_YEAR, ERA, formatDate, dayNumber, weatherMap, clampDate } from '@/lib/calendar';
import { advanceDate, setDate, rerollWeather, saveEvent, deleteEvent } from '@/app/actions';
import { loadEvents, eventsOn, upcoming } from '@/lib/events';

export const metadata = { title: 'Calendar' };

function EventFields({ e }) {
  return (
    <>
      <label>Title<input name="title" maxLength={80} defaultValue={e.title} required /></label>
      <div className="cal-set">
        <label>Month
          <select name="month" defaultValue={e.month}>{MONTHS.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}</select>
        </label>
        <label>Day<input type="number" name="day" min="1" max={DAYS_PER_MONTH} defaultValue={e.day} /></label>
        <label>Year<input type="number" name="year" min="1" defaultValue={e.year ?? ''} placeholder="every year" /></label>
      </div>
      <label>Notes<textarea name="notes" maxLength={600} defaultValue={e.notes} style={{ minHeight: 70 }} /></label>
      <label className="check"><input type="checkbox" name="dm_only" defaultChecked={!e.is_public} /> DM only (hidden from players)</label>
    </>
  );
}

export default async function CalendarPage({ searchParams }) {
  const user = await requireUser();
  const isDM = user.role === 'dm';
  const { date, roll } = await loadClock();
  const events = await loadEvents(isDM);
  // Browsing other months is view-only; the highlighted day is always the real date.
  const view = clampDate({
    year: Number(searchParams?.y) || date.year,
    month: searchParams?.m !== undefined ? Number(searchParams.m) : date.month,
    day: 1,
  });
  const prev = view.month === 0 ? { y: view.year - 1, m: MONTHS_PER_YEAR - 1 } : { y: view.year, m: view.month - 1 };
  const next = view.month === MONTHS_PER_YEAR - 1 ? { y: view.year + 1, m: 0 } : { y: view.year, m: view.month + 1 };
  const month = MONTHS[view.month];
  const isToday = (d) => view.year === date.year && view.month === date.month && d === date.day;

  const partyRaw = await getSetting('party_hex', '');
  let partyWx = null;
  if (partyRaw) {
    const hexes = await loadHexes(false);
    const [pc, pr] = partyRaw.split(',').map(Number);
    const h = hexes.find((x) => x.c === pc && x.r === pr);
    if (h) partyWx = { where: h.name || h.house || `hex ${pc + 1}, ${pr + 1}`, w: weatherMap([h], date, roll).get(partyRaw) };
  }

  const days = Array.from({ length: DAYS_PER_MONTH }, (_, i) => i + 1);
  const offset = (view.year * MONTHS_PER_YEAR * DAYS_PER_MONTH + view.month * DAYS_PER_MONTH) % WEEKDAYS.length; // weekday of the 1st
  const cells = [...Array(offset).fill(null), ...days];

  return (
    <>
      <h1>The Calendar</h1>
      <p className="sub">{formatDate(date)}</p>

      <div className="cal-layout">
        <div className="card cal">
          <div className="cal-head">
            <Link className="ghost small btn" href={`/calendar?y=${prev.y}&m=${prev.m}`}>← {MONTHS[prev.m].name}</Link>
            <h2>{month.name}, Year {view.year}</h2>
            <Link className="ghost small btn" href={`/calendar?y=${next.y}&m=${next.m}`}>{MONTHS[next.m].name} →</Link>
          </div>
          <p className="muted cal-sub">
            {month.season}{month.note ? ` · ${month.note}` : ''} · Year {view.year} {ERA}
          </p>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <div key={w} className="cal-dow">{w}</div>)}
            {cells.map((d, i) => (
              <div key={i} className={`cal-day${d && isToday(d) ? ' today' : ''}${d && dayNumber({ ...view, day: d }) < dayNumber(date) ? ' past' : ''}${d ? '' : ' empty'}`}>
                {d}
                {d && eventsOn(events, view.year, view.month, d).map((e) => (
                  <span key={e.id} className={`cal-ev${e.is_public ? '' : ' priv'}`} title={e.notes || e.title}>{e.title}</span>
                ))}
              </div>
            ))}
          </div>
          {(view.month !== date.month || view.year !== date.year) && (
            <p><Link href="/calendar">Back to today</Link></p>
          )}
        </div>

        <div className="cal-side">
          <div className="card">
            <h3>Coming up</h3>
            {upcoming(events, date).length ? (
              <ul className="cal-up">
                {upcoming(events, date).map((e) => (
                  <li key={`${e.id}-${e.inDays}`}>
                    <b>{e.title}</b>{!e.is_public && <span className="muted"> (DM only)</span>}
                    <br /><span className="muted">{e.inDays === 0 ? 'Today' : e.inDays === 1 ? 'Tomorrow' : `In ${e.inDays} days`} · {e.on.day} {MONTHS[e.on.month].name}</span>
                    {e.notes && <><br /><span className="muted">{e.notes}</span></>}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">Nothing is scheduled yet.</p>}
          </div>
          {partyWx?.w && (
            <div className="card">
              <h3>Weather at the party</h3>
              <p><b>{partyWx.w.glyph} {partyWx.w.label}</b>, {partyWx.w.temperature.toLowerCase()} near {partyWx.where}.</p>
              {partyWx.w.note && <p className="muted">{partyWx.w.note}</p>}
              <p><Link href="/map">See the weather across the map →</Link></p>
            </div>
          )}
          {isDM && (
            <div className="card">
              <h3>Events</h3>
              {events.filter((e) => e.month === view.month).map((e) => (
                <details key={e.id} className="cal-evedit">
                  <summary>{e.day} {MONTHS[e.month].name}: {e.title}{e.year === null ? ' · yearly' : ` · Year ${e.year}`}{e.is_public ? '' : ' · DM only'}</summary>
                  <form action={saveEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <EventFields e={e} />
                    <button className="small">Save</button>
                  </form>
                  <form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><button className="small ghost">Delete</button></form>
                </details>
              ))}
              <details className="cal-evedit">
                <summary><b>+ Add an event</b></summary>
                <form action={saveEvent}>
                  <EventFields e={{ title: '', month: view.month, day: 1, year: null, notes: '', is_public: true }} />
                  <button className="small">Add event</button>
                </form>
              </details>
            </div>
          )}
          {isDM && (
            <div className="card">
              <h3>Keep the date</h3>
              <div className="hx-inline">
                <form action={async () => { 'use server'; await advanceDate(1); }}><button className="small">+1 day</button></form>
                <form action={async () => { 'use server'; await advanceDate(6); }}><button className="small ghost">+6 days</button></form>
                <form action={async () => { 'use server'; await advanceDate(30); }}><button className="small ghost">+1 month</button></form>
                <form action={async () => { 'use server'; await advanceDate(-1); }}><button className="small ghost">−1 day</button></form>
              </div>
              <form action={setDate} className="cal-set">
                <label>Day<input type="number" name="day" min="1" max={DAYS_PER_MONTH} defaultValue={date.day} /></label>
                <label>Month
                  <select name="month" defaultValue={date.month}>
                    {MONTHS.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}
                  </select>
                </label>
                <label>Year<input type="number" name="year" min="1" defaultValue={date.year} /></label>
                <button className="small">Set date</button>
              </form>
              <form action={rerollWeather}><button className="small ghost">Re-roll today’s weather</button></form>
              <p className="muted">Weather is generated from the date for every hex, so moving the date moves the skies.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
