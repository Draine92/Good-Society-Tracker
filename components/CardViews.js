'use client';

import { useState } from 'react';
import { ConnectionFront, ConnectionBack, HouseFront, HouseBack } from './PrintCard';

/* A card that turns over. `front` and `back` are the two faces. */
export function FlipCard({ label, front, back, big, startBack = false }) {
  const [flipped, setFlipped] = useState(startBack);
  return (
    <div className="imgcard-wrap">
      <button
        type="button"
        className={`pcard img${flipped ? ' flipped' : ''}${big ? ' big' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={`${label}. Turn the card over`}
      >
        <span className="pcard-inner">
          <span className="face front">{front}</span>
          <span className="face back">{back}</span>
        </span>
      </button>
    </div>
  );
}

/* A real printed card (desire or relationship), front and back images. */
export function ImgCard({ n, name, hook, big, startBack = false }) {
  const id = String(n).padStart(2, '0');
  return (
    <div className="imgcard-wrap">
      <FlipCard
        label={`${name}, card ${n}`}
        big={big}
        startBack={startBack}
        front={<img src={`/cards/${id}-front.webp`} alt={`${name} card ${n}, front`} loading="lazy" />}
        back={<img src={`/cards/${id}-back.webp`} alt={`${name} card ${n}, back`} loading="lazy" />}
      />
      {hook && <span className="chook"><b>Hook:</b> {hook}</span>}
    </div>
  );
}

/* One face of a printed card, not turnable (used where only one side should be shown). */
export function StillImg({ n, side, name }) {
  const id = String(n).padStart(2, '0');
  return (
    <div className="imgcard-wrap">
      <div className="pcard img still">
        <span className="pcard-inner">
          <span className="face front">
            <img src={`/cards/${id}-${side}.webp`} alt={`${name} card ${n}, ${side}`} loading="lazy" />
          </span>
        </span>
      </div>
    </div>
  );
}

export function HouseFlip({ i, house }) {
  return (
    <FlipCard
      label={`${house.name}, House`}
      front={<HouseFront i={i} name={house.name} base={house.base} />}
      back={
        <HouseBack
          i={i} name={house.name} base={house.base} flavour={house.flavour}
          positive={house.positive} negative={house.negative} title={house.title}
        />
      }
    />
  );
}

export function ConnectionFlip({ conn, only, startBack = false }) {
  return (
    <FlipCard
      label={`${conn.name}, connection ${conn.n}`}
      startBack={startBack}
      front={<ConnectionFront n={conn.n} name={conn.name} />}
      back={<ConnectionBack n={conn.n} a={conn.a} b={conn.b} only={only} />}
    />
  );
}
