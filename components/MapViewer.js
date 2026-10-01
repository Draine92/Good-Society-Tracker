'use client';

import { useEffect, useRef, useState } from 'react';
import { MAP_SRC, MAP_ALT } from '@/lib/world';

function Placeholder({ big }) {
  return (
    <div className={big ? 'map-empty big' : 'map-empty'}>
      <div className="compass">✥</div>
      <strong>The map is still being drawn.</strong>
      <span>Your DM will pin it here soon.</span>
    </div>
  );
}

// Static preview for the notice board. Hides itself behind a placeholder if the image is missing.
// An image can fail before React hydrates, so also check the element once mounted.
function useImageFailed() {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  return [ref, failed, () => setFailed(true)];
}

export function MapThumb() {
  const [ref, failed, onError] = useImageFailed();
  if (failed) return <Placeholder />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} className="map-thumb" src={MAP_SRC} alt={MAP_ALT} onError={onError} />;
}

// Full-page viewer: scroll or pinch to zoom, drag to pan, buttons for phones.
export default function MapViewer() {
  const [imgRef, failed, onImgError] = useImageFailed();
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  const clamp = (s) => Math.min(6, Math.max(1, s));
  const zoomTo = (s) => {
    const next = clamp(s);
    setScale(next);
    if (next === 1) setPos({ x: 0, y: 0 });
  };

  if (failed) return <Placeholder big />;

  return (
    <div className="map-viewer">
      <div className="map-tools">
        <button className="ghost small" onClick={() => zoomTo(scale * 1.4)} aria-label="Zoom in">＋</button>
        <button className="ghost small" onClick={() => zoomTo(scale / 1.4)} aria-label="Zoom out">−</button>
        <button className="ghost small" onClick={() => zoomTo(1)}>Reset</button>
      </div>
      <div
        className="map-stage"
        onWheel={(e) => {
          zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 1) drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
          }
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            zoomTo(pinch.current.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
          } else if (drag.current && scale > 1) {
            setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={MAP_SRC}
          alt={MAP_ALT}
          draggable={false}
          onError={onImgError}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        />
      </div>
      <p className="muted small-note">Scroll or pinch to zoom, drag to move around.</p>
    </div>
  );
}
