import { q, getSetting, setSetting } from '@/lib/db';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, dayNumber, fromDayNumber } from '@/lib/calendar';

// The four seasonal festivals every year. Stored by month number, so renaming a month never breaks them.
const FESTIVALS = [
  { title: 'Firstlight', month: 5, day: 1, notes: 'The opening ball of the Season, held in the capital. The Houses arrive in order of precedence.' },
  { title: 'Longday', month: 6, day: 15, notes: 'Midsummer. Gardens are thrown open, and no business is conducted.' },
  { title: 'The Turning', month: 9, day: 10, notes: 'The autumn farewell supper. Families begin to leave the capital for their estates.' },
  { title: 'The Quiet', month: 0, day: 15, notes: 'A midwinter vigil kept in silence. Even the Houses do not feud on this night.' },
];

// Loads events, adding the festivals the first time. The DM sees private events too.
export async function loadEvents(isDM) {
  if (!(await getSetting('cal_festivals_seeded', ''))) {
    await setSetting('cal_festivals_seeded', '1');
    for (const f of FESTIVALS) {
      await q('insert into calendar_events (title, month, day, year, notes, is_public) values ($1,$2,$3,null,$4,true)', [f.title, f.month, f.day, f.notes]);
    }
  }
  return q(
    `select id, title, month, day, year, notes, is_public from calendar_events ${isDM ? '' : 'where is_public'} order by month, day, id`
  );
}

export const eventsOn = (events, year, month, day) =>
  events.filter((e) => e.month === month && e.day === day && (e.year === null || e.year === year));

// The next few events on or after `date`, with how many days away each is.
export function upcoming(events, date, limit = 4) {
  const today = dayNumber(date);
  const out = [];
  for (let i = 0; i < MONTHS_PER_YEAR * DAYS_PER_MONTH && out.length < limit; i++) {
    const d = fromDayNumber(today + i);
    for (const e of eventsOn(events, d.year, d.month, d.day)) out.push({ ...e, inDays: i, on: d });
  }
  return out.slice(0, limit);
}
