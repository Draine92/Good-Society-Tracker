import { MAP_W, MAP_H, MAP_S, center } from '@/lib/hex';

// Static, non-interactive preview of the map for the notice board, with the party's flag if one is placed.
export default function HexThumb({ party }) {
  const p = party ? center(party.c, party.r, MAP_S) : null;
  return (
    <svg className="map-thumb hex-thumb" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Map of Corvane">
      <image href="/world-map-small.jpg" x="0" y="0" width={MAP_W} height={MAP_H} preserveAspectRatio="none" />
      {p && (
        <g transform={`translate(${p.x} ${p.y}) scale(.65)`}>
          <path d="M-40,45 L-40,-95 L60,-60 L-40,-25" fill="#8a1a2e" stroke="#fff" strokeWidth="8" strokeLinejoin="round" />
          <circle cx="-40" cy="45" r="12" fill="#3a2a1a" stroke="#fff" strokeWidth="5" />
        </g>
      )}
    </svg>
  );
}
