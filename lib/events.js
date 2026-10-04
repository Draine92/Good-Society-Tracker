import { q, getSetting, setSetting } from '@/lib/db';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, dayNumber, fromDayNumber } from '@/lib/calendar';

// The four seasonal festivals every year. Stored by month number, so renaming a month never breaks them.
const FESTIVALS = [
  { title: 'Firstlight', month: 5, day: 1, notes: 'The opening ball of the Season, held in the capital. The Houses arrive in order of precedence.' },
  { title: 'Longday', month: 6, day: 15, notes: 'Midsummer. Gardens are thrown open, and no business is conducted.' },
  { title: 'The Turning', month: 9, day: 10, notes: 'The autumn farewell supper. Families begin to leave the capital for their estates.' },
  { title: 'The Quiet', month: 0, day: 15, notes: 'A midwinter vigil kept in silence. Even the Houses do not feud on this night.' },
];

// A second batch: customs of the Concord, the Houses and the realm's magic. All repeat yearly.
const MORE_FESTIVALS = [
  { title: 'Concord Day', month: 0, day: 1, notes: 'The year opens. Every House renews its Oath before a truthstone at the capital. A House that sends no one has made a statement.' },
  { title: 'Counting Day', month: 1, day: 10, notes: 'The Counting-Houses open their books and debts are called in. Old money pretends not to notice; new money notices everything.' },
  { title: 'Gifting Night', month: 1, day: 25, notes: 'Houses exchange tokens of favour. A gift is never only a gift: accepting one is accepting an obligation.' },
  { title: 'Banner Muster', month: 2, day: 20, notes: 'The Banner Houses muster their sworn swords before the roads reopen. Reviews, rivalries and the occasional challenge.' },
  { title: 'Wardwaking', month: 3, day: 12, notes: 'The truthstone wards are re-attuned at dusk. For about an hour they flicker, and every House pretends not to listen at its neighbours’ doors.' },
  { title: 'Well-Blessing', month: 3, day: 25, notes: 'The Temple Houses bless the ley-wells. Pilgrims crowd the roads, and the estates tied to a well hold open house.' },
  { title: 'Pact Day', month: 4, day: 14, notes: 'Marriage pacts are announced and betrothals sealed before the court. Pacts broken after this day carry the full weight of the Concord.' },
  { title: 'Bonding Fair', month: 7, day: 5, notes: 'The estates parade their bonded beasts. A great deal of quiet bargaining happens in the stables.' },
  { title: 'The Gilded Close', month: 7, day: 20, notes: 'The final ball of the Season. Reputations are settled, engagements are whispered, and scandals saved for last are spent.' },
  { title: 'Harvest Tithe', month: 8, day: 15, notes: 'Houses pay their tithes of grain and of magic. The accounting is public, and so are the shortfalls.' },
  { title: 'Envoys’ Audience', month: 8, day: 28, notes: 'The Far-Courts send envoys, and the capital receives them in strict order of precedence. Mistakes are remembered for years.' },
  { title: 'The Reckoning', month: 10, day: 1, notes: 'Precedence is reviewed at the capital and disputes of Standing are heard. Houses rise and fall by a single ruling.' },
  { title: 'Hallowfire', month: 10, day: 15, notes: 'The Houses light fires for their dead. Ancestral ward-stones hum, and bonded dragons are restless.' },
  { title: 'Day of Amends', month: 11, day: 10, notes: 'Shadowed and scandalised Houses make public penance. A good atonement here can restore a name, and a poor one finishes it.' },
];

// Loads events, adding the festivals the first time. The DM sees private events too.
export async function loadEvents(isDM) {
  if (!(await getSetting('cal_festivals_seeded', ''))) {
    await setSetting('cal_festivals_seeded', '1');
    for (const f of FESTIVALS) {
      await q('insert into calendar_events (title, month, day, year, notes, is_public) values ($1,$2,$3,null,$4,true)', [f.title, f.month, f.day, f.notes]);
    }
  }
  if (!(await getSetting('cal_festivals_v2', ''))) {
    await setSetting('cal_festivals_v2', '1');
    for (const f of MORE_FESTIVALS) {
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
