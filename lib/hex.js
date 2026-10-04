// Hex-map geometry, terrain and travel maths. Pointy-top hexes, "odd-r" offset coordinates (c = column, r = row).
// Pure functions only, so it runs on the server (seeding) and in the browser (travel calculator).

export const COLS = 28;
export const ROWS = 20;
export const DEFAULT_HEX_MILES = 6;

// cost = hexes' worth of travel to enter. null = impassable on foot.
export const TERRAIN = {
  sea: { label: 'Sea', cost: null, fill: '#9fbcbd', glyph: '' },
  plains: { label: 'Plains', cost: 1, fill: '#dccf98', glyph: '' },
  forest: { label: 'Forest', cost: 2, fill: '#8fa66e', glyph: '♣' },
  hills: { label: 'Hills', cost: 2, fill: '#bda274', glyph: '∩' },
  mountains: { label: 'Mountains', cost: 3, fill: '#a39d92', glyph: '▲' },
  swamp: { label: 'Swamp', cost: 3, fill: '#819d86', glyph: '≈' },
  desert: { label: 'Desert', cost: 2, fill: '#e4c882', glyph: '·' },
};
export const TERRAIN_KEYS = Object.keys(TERRAIN);
export const ROAD_COST = 0.5; // a road makes any land hex cost this much to enter

export const FEATURES = {
  '': { label: 'None', glyph: '' },
  capital: { label: 'Capital', glyph: '★' },
  city: { label: 'City or town', glyph: '●' },
  fort: { label: 'Fortress', glyph: '⌂' },
  ruin: { label: 'Ruin', glyph: '✦' },
  landmark: { label: 'Landmark', glyph: '◆' },
};

// Miles covered per day (5e travel pace for a party on foot, plus mounted).
export const PACES = [
  { id: 'slow', label: 'Slow (on foot)', miles: 18 },
  { id: 'normal', label: 'Normal (on foot)', miles: 24 },
  { id: 'fast', label: 'Fast (on foot)', miles: 30 },
  { id: 'mounted', label: 'Mounted', miles: 40 },
];

const SQ3 = Math.sqrt(3);
export const hexW = (s) => SQ3 * s;
export const key = (c, r) => `${c},${r}`;

export function center(c, r, s) {
  return { x: s * SQ3 * (c + 0.5 * (r & 1)), y: s * 1.5 * r };
}

export function corners(c, r, s) {
  const { x, y } = center(c, r, s);
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
export function neighbors(c, r) {
  return (r & 1 ? ODD : EVEN).map(([dc, dr]) => [c + dc, r + dr]).filter(([a, b]) => a >= 0 && b >= 0 && a < COLS && b < ROWS);
}

function cube(c, r) {
  const x = c - (r - (r & 1)) / 2;
  return { x, z: r, y: -x - r };
}
export function distance(a, b) {
  const p = cube(a.c, a.r), q = cube(b.c, b.r);
  return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z));
}

// ---- cheapest route (Dijkstra) over a Map of key -> hex ----
export function stepCost(h) {
  if (!h) return null;
  const t = TERRAIN[h.terrain];
  if (!t || t.cost === null) return null;
  return h.road ? ROAD_COST : t.cost;
}

export function findRoute(map, from, to) {
  const start = key(from.c, from.r), goal = key(to.c, to.r);
  if (stepCost(map.get(goal)) === null) return null;
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const open = [[0, from.c, from.r]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, c, r] = open.shift();
    const k = key(c, r);
    if (d > (dist.get(k) ?? Infinity)) continue;
    if (k === goal) break;
    for (const [nc, nr] of neighbors(c, r)) {
      const cost = stepCost(map.get(key(nc, nr)));
      if (cost === null) continue;
      const nd = d + cost, nk = key(nc, nr);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, k);
        open.push([nd, nc, nr]);
      }
    }
  }
  if (!dist.has(goal)) return null;
  const path = [];
  for (let k = goal; k; k = prev.get(k)) {
    const [c, r] = k.split(',').map(Number);
    path.unshift({ c, r });
    if (k === start) break;
  }
  return { path, cost: dist.get(goal) };
}

// ---- seeded terrain generator ----
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function noiseField(seed) {
  const cache = new Map();
  const at = (i, j) => {
    const k = `${i},${j}`;
    if (!cache.has(k)) cache.set(k, rng(seed * 7919 + i * 374761393 + j * 668265263)());
    return cache.get(k);
  };
  const sm = (t) => t * t * (3 - 2 * t);
  const one = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => (one(x, y) * 0.55 + one(x * 2.1, y * 2.1) * 0.3 + one(x * 4.3, y * 4.3) * 0.15);
}

// Returns [{ c, r, terrain, road, feature, name }]; the DM's own edits can be layered on top.
export function generateTerrain(seed = 1) {
  const elev = noiseField(seed), moist = noiseField(seed + 101), relief = noiseField(seed + 303);
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y } = center(c, r, 1);
      const dx = (x - (COLS * SQ3) / 2) / ((COLS * SQ3) / 2), dy = (y - (ROWS * 1.5) / 2) / ((ROWS * 1.5) / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const e = elev(c / 5.5, r / 5.5) - 0.42 * d * d - 0.05;
      const rel = relief(c / 3.2 + 90, r / 3.2 + 90);
      const m = moist(c / 4.5 + 40, r / 4.5 + 40);
      let t;
      if (e < 0.2) t = 'sea';
      else if (rel > 0.7 && e > 0.26) t = 'mountains';
      else if (rel > 0.6 && e > 0.24) t = 'hills';
      else if (m > 0.62) t = e < 0.28 && m > 0.66 ? 'swamp' : 'forest';
      else if (m < 0.27) t = 'desert';
      else t = 'plains';
      out.push({ c, r, terrain: t, road: false, feature: '', name: '' });
    }
  }
  // the capital sits on the land hex closest to the middle
  let best = null, bd = Infinity;
  for (const h of out) {
    if (h.terrain === 'sea' || h.terrain === 'mountains') continue;
    const dd = Math.hypot(h.c - COLS / 2, h.r - ROWS / 2);
    if (dd < bd) { bd = dd; best = h; }
  }
  if (best) { best.terrain = 'plains'; best.feature = 'capital'; best.name = 'The Capital'; }
  return out;
}
