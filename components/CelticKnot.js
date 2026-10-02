// A triquetra: three interlaced loops that pass over and under each other.
// Drawn by hand as SVG so it takes its colour from the text (currentColor) and works at any size.
// Each loop is drawn whole first. Then the stretches where a loop passes over another are drawn again
// on top, with a thin halo in `gap` (the background colour) that cuts a clean gap in the loop beneath.
const LENS = "M 1.3400 0 A 1.1165 1.1165 0 0 1 -0.6600 0 A 1.1165 1.1165 0 0 1 1.3400 0 Z";
const ANGLES = [90, 210, 330];
// For each loop: [start, length, over] in units of 1/1000 of the loop's length.
const PIECES = {"0": [[0, 311.83, false], [311.83, 188.17, true], [500.0, 188.17, false], [688.17, 311.83, true]], "1": [[0, 311.83, false], [311.83, 188.17, true], [500.0, 188.17, false], [688.17, 311.83, true]], "2": [[0.0, 311.83, false], [311.83, 188.17, true], [500.0, 188.17, false], [688.17, 311.83, true]]};

const W = 0.2; // strand width
const HALO = 0.36;

function Pieces({ over, stroke, width, extend = 0, keyp }) {
  return ANGLES.map((ang, k) =>
    PIECES[k]
      .filter((p) => p[2] === over)
      .map((p, i) => (
        <path
          key={`${keyp}-${k}-${i}`}
          transform={`rotate(${ang})`}
          d={LENS}
          pathLength="1000"
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray={`${p[1] + extend * 2} ${1000}`}
          strokeDashoffset={-(p[0] - extend)}
        />
      ))
  );
}

export default function CelticKnot({ size = 24, gap = 'var(--paper-2)', className = '', title }) {
  return (
    <svg
      viewBox="-1.35 -1.5 2.7 2.5"
      width={size}
      height={size * (2.5 / 2.7)}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <g transform="scale(1,-1)" strokeLinejoin="round">
        {ANGLES.map((ang) => (
          <path key={ang} transform={`rotate(${ang})`} d={LENS} fill="none" stroke="currentColor" strokeWidth={W} />
        ))}
        <Pieces over={true} stroke={gap} width={HALO} keyp="h" />
        <Pieces over={true} stroke="currentColor" width={W} extend={4} keyp="o" />
      </g>
    </svg>
  );
}
