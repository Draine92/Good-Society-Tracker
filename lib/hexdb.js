import { q } from '@/lib/db';
import { COLS, ROWS } from '@/lib/hex';
import { MAP_HEXES } from '@/lib/hex-seed';

export const LAYOUT = 'corvane-picture-v1';

export async function seedHexes(overwrite = false) {
  const cells = MAP_HEXES.map(([c, r, terrain, feature]) => ({ c, r, terrain, feature, road: false, name: '' }));
  const vals = [], params = [];
  cells.forEach((h, i) => {
    const o = i * 6;
    vals.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6})`);
    params.push(h.c, h.r, h.terrain, h.road, h.feature, h.name);
  });
  const conflict = overwrite
    ? 'do update set terrain = excluded.terrain, road = excluded.road, feature = excluded.feature'
    : 'do nothing';
  await q(`insert into hexes (c, r, terrain, road, feature, name) values ${vals.join(',')} on conflict (c, r) ${conflict}`, params);
}

// Loads the whole map, seeding it the first time. The DM-only secret is never selected for players.
export async function loadHexes(isDM) {
  // The grid changed to match the map picture, so hexes saved for any older layout are replaced.
  if ((await getSetting('hex_layout', '')) !== LAYOUT) {
    await q('delete from hexes');
    await setSetting('party_hex', '');
    await seedHexes();
    await setSetting('hex_layout', LAYOUT);
  }
  let rows = await q(`select c, r, terrain, road, feature, name, house, notes${isDM ? ', secret' : ''} from hexes`);
  if (rows.length < COLS * ROWS) {
    await seedHexes();
    rows = await q(`select c, r, terrain, road, feature, name, house, notes${isDM ? ', secret' : ''} from hexes`);
  }
  return rows;
}

import { getSetting, setSetting } from '@/lib/db';
import { DEFAULT_DATE, parseDate, serializeDate } from '@/lib/calendar';

export async function loadClock() {
  const [d, roll] = await Promise.all([getSetting('cal_date', serializeDate(DEFAULT_DATE)), getSetting('weather_roll', '0')]);
  return { date: parseDate(d), roll: parseInt(roll, 10) || 0 };
}
