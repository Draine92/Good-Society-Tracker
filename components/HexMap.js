'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COLS, ROWS, MAP_W, MAP_H, MAP_S, TERRAIN, TERRAIN_KEYS, FEATURES, PACES, ROAD_COST,
  center, corners, neighbors, distance, findRoute, key,
} from '@/lib/hex';
import { saveHex, paintHex, setHexMiles, resetHexTerrain, setPartyHex, advanceDate, rerollWeather } from '@/app/actions';
import { MAP_SRC, MAP_ALT } from '@/lib/world';
import { weatherMap, formatDate, MONTHS } from '@/lib/calendar';

const S = 28;
// Hexes are built at radius S and scaled up to sit on the picture's own printed grid.
const K = MAP_S / S;
const W = MAP_W;
const H = MAP_H;
const label = (h) => h.name || h.house || '';
const days = (cost, perDay) => Math.ceil((cost / perDay) * 2) / 2;

export default function HexMap({ initial, isDM, initialMiles, initialParty, initialDate, initialRoll }) {
  const [hexes, setHexes] = useState(() => new Map(initial.map((h) => [key(h.c, h.r), h])));
  const [miles, setMiles] = useState(initialMiles);
  const [party, setParty] = useState(() => {
    if (!initialParty) return null;
    const [c, r] = initialParty.split(',').map(Number);
    return Number.isInteger(c) && Number.isInteger(r) ? { c, r } : null;
  });
  const [mode, setMode] = useState('look'); // look | travel | paint
  const [sel, setSel] = useState(null);
  const [trip, setTrip] = useState({ a: null, b: null });
  const [brush, setBrush] = useState('plains');
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [msg, setMsg] = useState('');
  const [full, setFull] = useState(false);
  const [showWx, setShowWx] = useState(true);
  const [showTerrain, setShowTerrain] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [roll, setRoll] = useState(initialRoll || 0);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);
  const painting = useRef(false);

  const patch = (c, r, p) =>
    setHexes((m) => {
      const n = new Map(m);
      n.set(key(c, r), { ...n.get(key(c, r)), ...p });
      return n;
    });

  const tint = showTerrain || mode === 'paint';
  const route = useMemo(
    () => (trip.a && trip.b ? findRoute(hexes, trip.a, trip.b) : null),
    [hexes, trip]
  );
  const wx = useMemo(() => weatherMap(hexes.values(), date, roll), [hexes, date, roll]);
  const onRoute = useMemo(() => new Set((route?.path || []).map((p) => key(p.c, p.r))), [route]);

  // The wheel only zooms in full screen (or with Ctrl/Cmd held), so normal page scrolling still works.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!full && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ratio = W / rect.width;
      const ux = (e.clientX - rect.left) * ratio, uy = (e.clientY - rect.top) * ratio;
      const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => {
        const k = Math.min(6, Math.max(0.6, v.k * f));
        const cx = W / 2, cy = H / 2, g = k / v.k;
        return { k, x: ux - cx - g * (ux - cx - v.x), y: uy - cy - g * (uy - cy - v.y) };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [full]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === 'Escape') leaveFull(); };
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      document.body.style.overflow = '';
    };
  }, [full]);

  function enterFull() {
    setFull(true);
    wrapRef.current?.requestFullscreen?.().catch(() => {}); // falls back to the on-page overlay
  }
  function leaveFull() {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function paintAt(c, r) {
    const h = hexes.get(key(c, r));
    if (!h) return;
    let terrain = h.terrain, road = h.road;
    if (brush === 'road') road = true;
    else if (brush === 'noroad') road = false;
    else terrain = brush;
    if (terrain === 'sea') road = false;
    if (terrain === h.terrain && road === h.road) return;
    patch(c, r, { terrain, road });
    paintHex(c, r, terrain, road);
  }

  function clickHex(c, r) {
    if (moved.current) return;
    if (mode === 'paint') return; // painting is handled on pointer events
    setSel({ c, r });
    setMsg('');
    if (mode === 'travel') {
      setTrip((t) => (!t.a || (t.a && t.b) ? { a: { c, r }, b: null } : { a: t.a, b: { c, r } }));
    }
  }

  // ----- the hex layer is memoised so panning stays smooth -----
  const layer = useMemo(() => {
    const out = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const h = hexes.get(key(c, r));
        if (!h) continue;
        const t = TERRAIN[h.terrain] || TERRAIN.plains;
        const { x, y } = center(c, r, S);
        const f = FEATURES[h.feature];
        out.push(
          <g
            key={`${c},${r}`}
            className="hx"
            data-c={c}
            data-r={r}
            onClick={() => clickHex(c, r)}
            onPointerDown={() => {
              if (mode === 'paint' && isDM) { painting.current = true; paintAt(c, r); }
            }}
            onPointerEnter={() => {
              if (mode === 'paint' && isDM && painting.current) paintAt(c, r);
            }}
          >
            <polygon points={corners(c, r, S)} fill={t.fill} fillOpacity={tint ? 0.5 : 0} className="hx-poly" />
            {t.glyph && tint && <text x={x} y={y - 3} className="hx-glyph">{t.glyph}</text>}
            {showWx && h.terrain !== 'sea' && wx.get(key(c, r)) && (
              <text x={x} y={y - 15} className="hx-wx">{wx.get(key(c, r)).glyph}</text>
            )}
            {h.road && h.terrain !== 'sea' && (
              <g className="hx-road">
                {neighbors(c, r).map(([nc, nr]) => {
                  const o = hexes.get(key(nc, nr));
                  if (!o?.road || o.terrain === 'sea' || nr < r || (nr === r && nc < c)) return null;
                  const p = center(nc, nr, S);
                  return <line key={`${nc},${nr}`} x1={x} y1={y} x2={p.x} y2={p.y} />;
                })}
                <circle cx={x} cy={y} r="2.2" />
              </g>
            )}
            {f?.glyph && tint && <text x={x} y={y + 4} className={`hx-feat ${h.feature}`}>{f.glyph}</text>}
            {label(h) && (
              <text x={x} y={y + 15} className={h.house ? 'hx-label house' : 'hx-label'}>
                {label(h).length > 14 ? label(h).slice(0, 13) + '…' : label(h)}
              </text>
            )}
          </g>
        );
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes, mode, isDM, brush, showWx, wx, tint]);

  const selHex = sel ? hexes.get(key(sel.c, sel.r)) : null;
  const pick = (p) => hexes.get(key(p.c, p.r));
  const straight = trip.a && trip.b ? distance(trip.a, trip.b) : 0;
  const nameOf = (p) => { const h = pick(p); return label(h) || `${TERRAIN[h.terrain].label} (${p.c + 1}, ${p.r + 1})`; };

  async function onSave(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('c', sel.c); fd.set('r', sel.r);
    const res = await saveHex(fd);
    if (res?.ok) {
      const p = { name: fd.get('name') || '', house: fd.get('house') || '', notes: fd.get('notes') || '' };
      if (isDM) Object.assign(p, { terrain: fd.get('terrain'), feature: fd.get('feature') || '', road: fd.get('road') === 'on', secret: fd.get('secret') || '' });
      patch(sel.c, sel.r, p);
      setMsg('Saved.');
    } else setMsg('Could not save.');
  }

  function zoom(k) { setView((v) => ({ ...v, k: Math.min(5, Math.max(0.6, k)) })); }

  return (
    <div className={`hexmap${full ? ' full' : ''}`} ref={wrapRef}>
      <div className="hexmap-main">
        <div className="deck-tabs">
          <button className={`tab ${mode === 'look' ? 'on' : ''}`} onClick={() => setMode('look')}>Look</button>
          <button className={`tab ${mode === 'travel' ? 'on' : ''}`} onClick={() => setMode('travel')}>Travel</button>
          {isDM && <button className={`tab ${mode === 'paint' ? 'on' : ''}`} onClick={() => setMode('paint')}>Paint terrain</button>}
          <button className={`tab ${showWx ? 'on' : ''}`} onClick={() => setShowWx((v) => !v)}>Weather</button>
          <button className={`tab ${tint ? 'on' : ''}`} onClick={() => setShowTerrain((v) => !v)} disabled={mode === 'paint'}>Terrain colours</button>
          <span className="hexmap-zoom">
            <button className="ghost small" onClick={full ? leaveFull : enterFull}>{full ? 'Exit full screen' : 'Full screen'}</button>
            <button className="ghost small" onClick={() => zoom(view.k * 1.3)} aria-label="Zoom in">＋</button>
            <button className="ghost small" onClick={() => zoom(view.k / 1.3)} aria-label="Zoom out">−</button>
            <button className="ghost small" onClick={() => setView({ x: 0, y: 0, k: 1 })}>Reset</button>
          </span>
        </div>

        <div
          ref={stageRef}
          className={`hexmap-stage ${mode === 'paint' ? 'painting' : ''}`}
          onPointerDown={(e) => {
            moved.current = false;
            if (mode !== 'paint') drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (Math.abs(dx) + Math.abs(dy) > 5) moved.current = true;
            if (moved.current) {
              const ratio = W / stageRef.current.getBoundingClientRect().width;
              setView((v) => ({ ...v, x: d.vx + dx * ratio, y: d.vy + dy * ratio }));
            }
          }}
          onPointerUp={() => { drag.current = null; painting.current = false; }}
          onPointerLeave={() => { drag.current = null; painting.current = false; }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Hex map of Corvane">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: 'center' }}>
              <image href={MAP_SRC} x="0" y="0" width={MAP_W} height={MAP_H} preserveAspectRatio="none" aria-label={MAP_ALT} />
              <g transform={`scale(${K})`}>
                {layer}
                {route && (
                  <g className="hx-route" pointerEvents="none">
                    {route.path.map((p) => (
                      <polygon key={key(p.c, p.r)} points={corners(p.c, p.r, S)} className="hx-on" />
                    ))}
                    <polyline points={route.path.map((p) => { const c = center(p.c, p.r, S); return `${c.x},${c.y}`; }).join(' ')} />
                  </g>
                )}
                {[trip.a && ['A', trip.a], trip.b && ['B', trip.b]].filter(Boolean).map(([l, p]) => {
                  const c = center(p.c, p.r, S);
                  return (
                    <g key={l} pointerEvents="none">
                      <circle cx={c.x} cy={c.y - 2} r="9" className="hx-pin" />
                      <text x={c.x} y={c.y + 1.5} className="hx-pin-t">{l}</text>
                    </g>
                  );
                })}
                {party && (() => {
                  const c = center(party.c, party.r, S);
                  return (
                    <g pointerEvents="none" className="hx-party">
                      <path d={`M${c.x - 9},${c.y + 10} L${c.x - 9},${c.y - 20} L${c.x + 11},${c.y - 13} L${c.x - 9},${c.y - 6}`} />
                      <circle cx={c.x - 9} cy={c.y + 10} r="2.4" />
                    </g>
                  );
                })()}
                {sel && <polygon points={corners(sel.c, sel.r, S)} className="hx-sel" pointerEvents="none" />}
              </g>
            </g>
          </svg>
        </div>
        <p className="muted small-note">
          {full ? 'Scroll to zoom, drag to move, Esc to leave full screen.' : 'Use ＋ and − to zoom (or hold Ctrl and scroll), drag to move.'} Each hex is {miles} miles across.
        </p>
        <ul className="hx-legend">
          {TERRAIN_KEYS.map((k) => (
            <li key={k}><i style={{ background: TERRAIN[k].fill }} />{TERRAIN[k].label}{TERRAIN[k].cost ? ` ×${TERRAIN[k].cost}` : ' (no foot travel)'}</li>
          ))}
          <li><i className="road" />Road ×{ROAD_COST}</li>
        </ul>
      </div>

      <datalist id="hx-houses">{[...new Set([...hexes.values()].map((h) => h.house).filter(Boolean))].map((n) => <option key={n} value={n} />)}</datalist>
      <aside className="hexmap-side">
        <div className="card date-card">
          <h3>📅 {MONTHS[date.month].name}, Year {date.year}</h3>
          <p>{formatDate(date)}</p>
          {isDM && (
            <p className="hx-inline">
              <button className="small" onClick={async () => { const r = await advanceDate(1); if (r?.ok) { setDate(r.date); setRoll(0); } }}>+1 day</button>
              <button className="small ghost" onClick={async () => { const r = await advanceDate(6); if (r?.ok) { setDate(r.date); setRoll(0); } }}>+6 days</button>
              <button className="small ghost" onClick={async () => { const r = await rerollWeather(); if (r?.ok) setRoll(r.roll); }}>Re-roll weather</button>
            </p>
          )}
        </div>
        <div className="card party-card">
          <h3>⚑ The party</h3>
          {party && hexes.get(key(party.c, party.r)) ? (
            <p>
              Currently at <b>{label(hexes.get(key(party.c, party.r))) || `${TERRAIN[hexes.get(key(party.c, party.r)).terrain].label} (${party.c + 1}, ${party.r + 1})`}</b>.{' '}
              <button className="ghost small" onClick={() => { setSel(party); setMode('look'); }}>Show hex</button>
              {wx.get(key(party.c, party.r)) && <><br /><span className="muted">{wx.get(key(party.c, party.r)).glyph} {wx.get(key(party.c, party.r)).label}, {wx.get(key(party.c, party.r)).temperature.toLowerCase()}.</span></>}
            </p>
          ) : (
            <p className="muted">The party’s position hasn’t been marked yet.</p>
          )}
          {isDM && (
            <p className="hx-inline">
              <button className="small" disabled={!sel} onClick={async () => { await setPartyHex(sel.c, sel.r); setParty({ ...sel }); }}>
                Move party to selected hex
              </button>
              {party && <button className="ghost small" onClick={async () => { await setPartyHex(null); setParty(null); }}>Remove marker</button>}
            </p>
          )}
        </div>
        {mode === 'travel' && (
          <div className="card">
            <h3>Travel</h3>
            {!trip.a && <p className="muted">Click a hex to set where the party starts.</p>}
            {trip.a && !trip.b && <p className="muted"><b>From:</b> {nameOf(trip.a)}. Now click the destination.</p>}
            {trip.a && trip.b && (
              <>
                <p><b>{nameOf(trip.a)}</b> → <b>{nameOf(trip.b)}</b></p>
                <p className="muted">Straight line: {straight} {straight === 1 ? 'hex' : 'hexes'} ({straight * miles} miles).</p>
                {route ? (
                  <>
                    <p>Best route: <b>{route.path.length - 1} hexes</b> ({(route.path.length - 1) * miles} miles), travel cost <b>{route.cost}</b>.</p>
                    <table className="hx-pace">
                      <thead><tr><th>Pace</th><th>Time</th></tr></thead>
                      <tbody>
                        {PACES.map((p) => {
                          const d = days(route.cost, p.miles / miles);
                          return <tr key={p.id}><td>{p.label}<br /><span className="muted">{p.miles} mi/day</span></td><td>{d <= 1 ? 'Under a day' : `${d} days`}</td></tr>;
                        })}
                      </tbody>
                    </table>
                    <p className="muted">Rough guide: terrain slows you (see the legend), roads speed you up. Water can’t be crossed on foot.</p>
                  </>
                ) : (
                  <p>No land route between those hexes.</p>
                )}
                <button className="ghost small" onClick={() => setTrip({ a: null, b: null })}>Clear</button>
              </>
            )}
          </div>
        )}

        {mode === 'paint' && isDM && (
          <div className="card">
            <h3>Paint terrain</h3>
            <p className="muted">The terrain here is what travel uses. It started from the picture, so only repaint what you want to change. Pick a brush, then click or drag.</p>
            <div className="hx-brushes">
              {TERRAIN_KEYS.map((k) => (
                <button key={k} className={`brush ${brush === k ? 'on' : ''}`} onClick={() => setBrush(k)}>
                  <i style={{ background: TERRAIN[k].fill }} />{TERRAIN[k].label}
                </button>
              ))}
              <button className={`brush ${brush === 'road' ? 'on' : ''}`} onClick={() => setBrush('road')}><i className="road" />Add road</button>
              <button className={`brush ${brush === 'noroad' ? 'on' : ''}`} onClick={() => setBrush('noroad')}>Remove road</button>
            </div>
            <hr />
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const v = Number(new FormData(e.currentTarget).get('miles'));
                const res = await setHexMiles(v);
                if (res?.ok) setMiles(res.miles);
              }}
              className="hx-inline"
            >
              <label>Miles per hex <input type="number" name="miles" min="1" max="100" defaultValue={miles} /></label>
              <button className="small">Set</button>
            </form>
            <button
              className="small ghost"
              onClick={async () => {
                if (!confirm('Put every hex back to the terrain drawn on the map? Roads and your terrain edits are replaced. Names, Houses and notes stay.')) return;
                const res = await resetHexTerrain();
                if (res?.ok) window.location.reload();
              }}
            >
              Reset terrain to the picture
            </button>
          </div>
        )}

        <div className="card">
          {selHex && !isDM ? (
            <div key={`${sel.c},${sel.r}`}>
              <h3>
                {selHex.name || selHex.house || `Hex ${sel.c + 1}, ${sel.r + 1}`}
                <span className="muted"> · {TERRAIN[selHex.terrain].label}{selHex.road ? ', road' : ''}</span>
              </h3>
              {wx.get(key(sel.c, sel.r)) && (
                <p className="hx-wx-line">
                  <b>{wx.get(key(sel.c, sel.r)).glyph} {wx.get(key(sel.c, sel.r)).label}</b>, {wx.get(key(sel.c, sel.r)).temperature.toLowerCase()}.
                  {wx.get(key(sel.c, sel.r)).note && <><br /><span className="muted">{wx.get(key(sel.c, sel.r)).note}</span></>}
                </p>
              )}
              {selHex.house && <p><b>House:</b> {selHex.house}</p>}
              {selHex.notes ? <p>{selHex.notes}</p> : <p className="muted">Nothing is written about this place yet. Your DM will add it as your stories grow.</p>}
            </div>
          ) : selHex ? (
            <form key={`${sel.c},${sel.r}`} onSubmit={onSave}>
              <h3>
                Hex {sel.c + 1}, {sel.r + 1}
                <span className="muted"> · {TERRAIN[selHex.terrain].label}{selHex.road ? ', road' : ''}</span>
              </h3>
              {wx.get(key(sel.c, sel.r)) && (
                <p className="hx-wx-line">
                  <b>{wx.get(key(sel.c, sel.r)).glyph} {wx.get(key(sel.c, sel.r)).label}</b>, {wx.get(key(sel.c, sel.r)).temperature.toLowerCase()}.
                  {wx.get(key(sel.c, sel.r)).note && <><br /><span className="muted">{wx.get(key(sel.c, sel.r)).note}</span></>}
                </p>
              )}
              <label>Place name<input name="name" maxLength={60} defaultValue={selHex.name} placeholder="Ashgrove Vale" /></label>
              <label>House from here<input name="house" list="hx-houses" maxLength={60} defaultValue={selHex.house} placeholder="House Ashgrove" /></label>
              <label>What’s going on here
                <textarea name="notes" maxLength={1200} defaultValue={selHex.notes} placeholder="A feud over the ward-stone…" style={{ minHeight: 90 }} />
              </label>
              {isDM && (
                <>
                  <hr />
                  <div className="hx-inline">
                    <label>Terrain
                      <select name="terrain" defaultValue={selHex.terrain}>
                        {TERRAIN_KEYS.map((k) => <option key={k} value={k}>{TERRAIN[k].label}</option>)}
                      </select>
                    </label>
                    <label>Feature
                      <select name="feature" defaultValue={selHex.feature}>
                        {Object.entries(FEATURES).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="check"><input type="checkbox" name="road" defaultChecked={selHex.road} /> Road</label>
                  <label>DM secret (only you see this)
                    <textarea name="secret" maxLength={1200} defaultValue={selHex.secret || ''} style={{ minHeight: 70 }} />
                  </label>
                </>
              )}
              <button>Save hex</button> <span className="muted">{msg}</span>
            </form>
          ) : (
            <p className="muted">{isDM ? 'Click a hex to name it, claim it for a House, or note what’s happening there.' : 'Click a hex to see what is known about it.'}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
