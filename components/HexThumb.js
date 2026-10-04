import { COLS, ROWS, TERRAIN, corners, center } from '@/lib/hex';

const S = 20;
const W = Math.ceil(S * Math.sqrt(3) * (COLS + 0.5)) + 8;
const H = Math.ceil(S * 1.5 * ROWS + S * 0.5) + 8;

// Static, non-interactive preview of the hex map for the notice board.
export default function HexThumb({ hexes, party }) {
  return (
    <svg className="map-thumb hex-thumb" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of Corvane">
      <g transform={`translate(${4 + (S * Math.sqrt(3)) / 2} ${4 + S})`}>
        {hexes.map((h) => (
          <polygon key={`${h.c},${h.r}`} points={corners(h.c, h.r, S)} fill={(TERRAIN[h.terrain] || TERRAIN.plains).fill} stroke="rgba(60,40,20,.25)" strokeWidth=".6" />
        ))}
        {hexes.filter((h) => h.feature === 'capital').map((h) => {
          const p = center(h.c, h.r, S);
          return <text key="cap" x={p.x} y={p.y + 6} textAnchor="middle" fontSize="18" fill="#8a1a2e">★</text>;
        })}
        {party && (() => {
          const c = center(party.c, party.r, S);
          return <path d={`M${c.x - 6},${c.y + 7} L${c.x - 6},${c.y - 14} L${c.x + 8},${c.y - 9} L${c.x - 6},${c.y - 4}`} fill="#8a1a2e" stroke="#fff" strokeWidth="1.2" />;
        })()}
      </g>
    </svg>
  );
}
