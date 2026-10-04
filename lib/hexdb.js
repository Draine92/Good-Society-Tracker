import { q } from '@/lib/db';
import { generateTerrain, COLS, ROWS } from '@/lib/hex';

export const DEFAULT_SEED = 2026;

export async function seedHexes(seed = DEFAULT_SEED, overwrite = false) {
  const cells = generateTerrain(seed);
  const vals = [], params = [];
  cells.forEach((h, i) => {
    const o = i * 6;
    vals.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6})`);
    params.push(h.c, h.r, h.terrain, h.road, h.feature, h.name);
  });
  const conflict = overwrite
    ? 'do update set terrain = excluded.terrain, road = excluded.road, feature = excluded.feature, name = case when hexes.house = \'\' then excluded.name else hexes.name end'
    : 'do nothing';
  await q(`insert into hexes (c, r, terrain, road, feature, name) values ${vals.join(',')} on conflict (c, r) ${conflict}`, params);
}

// Loads the whole map, seeding it the first time. The DM-only secret is never selected for players.
export async function loadHexes(isDM) {
  let rows = await q(`select c, r, terrain, road, feature, name, house, notes${isDM ? ', secret' : ''} from hexes`);
  if (rows.length < COLS * ROWS) {
    await seedHexes();
    rows = await q(`select c, r, terrain, road, feature, name, house, notes${isDM ? ', secret' : ''} from hexes`);
  }
  return rows;
}
