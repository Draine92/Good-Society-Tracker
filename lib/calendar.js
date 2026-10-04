// The Corvane calendar and weather. Pure functions: the DM stores one date, and the weather for every
// hex is worked out from that date, so everyone sees the same sky without anything stored per tile.
import { ROWS, noiseField, fullyOnMap } from '@/lib/hex';

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const ERA = 'of the Concord';
export const DEFAULT_DATE = { year: 312, month: 3, day: 1 };

// month: index 0-11. season drives the temperature. Edit names freely.
export const MONTHS = [
  { name: 'Hearthmoon', season: 'Winter' },
  { name: 'Frostwane', season: 'Winter' },
  { name: 'Lastsnow', season: 'Winter' },
  { name: 'Thawmere', season: 'Spring' },
  { name: 'Seedwake', season: 'Spring' },
  { name: 'Bloomtide', season: 'Spring', note: 'The Season opens in the capital' },
  { name: 'Highsun', season: 'Summer', note: 'The height of the Season' },
  { name: 'Gildmonth', season: 'Summer' },
  { name: 'Reaping', season: 'Summer' },
  { name: 'Mistfall', season: 'Autumn' },
  { name: 'Embertide', season: 'Autumn' },
  { name: 'Duskwane', season: 'Autumn' },
];
// Six-day week, five weeks to a month.
export const WEEKDAYS = ['Oathday', 'Sealday', 'Markday', 'Fairday', 'Courtday', 'Restday'];

export function clampDate(d) {
  const year = Math.max(1, Math.min(99999, Math.floor(Number(d.year)) || DEFAULT_DATE.year));
  const month = Math.max(0, Math.min(MONTHS_PER_YEAR - 1, Math.floor(Number(d.month)) || 0));
  const day = Math.max(1, Math.min(DAYS_PER_MONTH, Math.floor(Number(d.day)) || 1));
  return { year, month, day };
}
export const dayNumber = (d) => d.year * MONTHS_PER_YEAR * DAYS_PER_MONTH + d.month * DAYS_PER_MONTH + (d.day - 1);
export function fromDayNumber(n) {
  const perYear = MONTHS_PER_YEAR * DAYS_PER_MONTH;
  const year = Math.floor(n / perYear);
  const rem = n - year * perYear;
  return clampDate({ year, month: Math.floor(rem / DAYS_PER_MONTH), day: (rem % DAYS_PER_MONTH) + 1 });
}
export const addDays = (d, n) => fromDayNumber(Math.max(DAYS_PER_MONTH * 12, dayNumber(d) + n));
export const weekday = (d) => WEEKDAYS[dayNumber(d) % WEEKDAYS.length];
export const formatDate = (d) => `${weekday(d)}, ${d.day} ${MONTHS[d.month].name}, Year ${d.year} ${ERA}`;
export const shortDate = (d) => `${d.day} ${MONTHS[d.month].name}, Year ${d.year}`;
export const parseDate = (s) => {
  const [year, month, day] = String(s || '').split(',').map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? clampDate({ year, month, day }) : DEFAULT_DATE;
};
export const serializeDate = (d) => `${d.year},${d.month},${d.day}`;

// ---------- weather ----------
export const WEATHER = {
  clear: { label: 'Clear skies', glyph: '☀', note: 'Good visibility.' },
  partly: { label: 'Partly cloudy', glyph: '⛅', note: '' },
  overcast: { label: 'Overcast', glyph: '☁', note: '' },
  drizzle: { label: 'Light rain', glyph: '🌦', note: 'Tracks soften; fires are harder to light.' },
  rain: { label: 'Rain', glyph: '🌧', note: 'Disadvantage on Perception checks that rely on hearing.' },
  storm: { label: 'Thunderstorm', glyph: '⛈', note: 'Disadvantage on ranged attacks and sight or hearing Perception. Open flames go out.' },
  snow: { label: 'Snow', glyph: '🌨', note: 'Difficult going. Tracks are easy to follow.' },
  blizzard: { label: 'Blizzard', glyph: '❄', note: 'Travel at half pace, Constitution saves against exhaustion, heavily obscured at range.' },
  fog: { label: 'Fog', glyph: '🌫', note: 'Lightly obscured beyond 30 feet.' },
  windy: { label: 'High winds', glyph: '💨', note: 'Disadvantage on ranged attacks; flying is hazardous.' },
  heat: { label: 'Scorching heat', glyph: '🔥', note: 'Constitution saves each hour of hard travel without water.' },
};

const BIAS = { sea: 0.05, swamp: 0.08, forest: 0.04, mountains: 0.06, hills: 0.02, plains: 0, desert: -0.14 };
const TEMP_ADJ = { mountains: -8, hills: -2, desert: 6, sea: -1, swamp: 1, forest: -1, plains: 0 };

export function tempLabel(t) {
  if (t < -5) return 'Bitter cold';
  if (t < 2) return 'Freezing';
  if (t < 8) return 'Cold';
  if (t < 15) return 'Cool';
  if (t < 22) return 'Mild';
  if (t < 28) return 'Warm';
  if (t < 34) return 'Hot';
  return 'Sweltering';
}

// hexes: iterable of { c, r, terrain }. roll: DM's "re-roll" counter. Returns Map "c,r" -> weather.
export function weatherMap(hexes, date, roll = 0) {
  const n = dayNumber(date);
  const fP = noiseField(31), fW = noiseField(77), fT = noiseField(113);
  const yearPos = ((date.month * DAYS_PER_MONTH + date.day - 1) / (MONTHS_PER_YEAR * DAYS_PER_MONTH)) * 2 * Math.PI;
  const seasonal = 10 + 14 * -Math.cos(yearPos); // about -4 in deep winter, 24 at midsummer
  const springAutumn = Math.abs(Math.sin(yearPos)) * 0.04;
  const out = new Map();
  for (const h of hexes) {
    const { c, r, terrain } = h;
    if (!fullyOnMap(c, r)) continue; // hexes cut off by the edge of the map get no weather
    const t0 = roll * 53.1;
    const q = fP(c / 3 + n * 0.55 + t0, r / 3 + n * 0.21) + (BIAS[terrain] ?? 0) + springAutumn;
    const wind = fW(c / 3.4 - n * 0.4 + t0, r / 3.4 + n * 0.3);
    const temp =
      seasonal + (r < ROWS / 2 ? -(ROWS / 2 - r) * 0.4 : (r - ROWS / 2) * 0.4) + (TEMP_ADJ[terrain] ?? 0) +
      (fT(c / 4 + n * 0.3, r / 4) - 0.45) * 8;
    let type;
    if (q > 0.8) type = 'storm';
    else if (q > 0.69) type = 'rain';
    else if (q > 0.62) type = 'drizzle';
    else if (wind < 0.35 && q > 0.5 && (terrain === 'swamp' || terrain === 'sea' || temp < 4)) type = 'fog';
    else if (q > 0.54) type = 'overcast';
    else if (temp >= 28) type = 'heat';
    else if (wind > 0.72) type = 'windy';
    else if (q > 0.44) type = 'partly';
    else type = 'clear';
    if (temp <= 0) {
      if (type === 'storm') type = 'blizzard';
      else if (type === 'rain') type = 'snow';
      else if (type === 'drizzle') type = 'snow';
    }
    out.set(`${c},${r}`, { type, temp: Math.round(temp), temperature: tempLabel(temp), ...WEATHER[type] });
  }
  return out;
}
