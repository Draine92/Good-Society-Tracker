'use client';

import { useState } from 'react';
import { ConnectionFront, ConnectionBack, HouseFront, HouseBack } from './PrintCard';

function Card({ front, back, tone, orn, num, big }) {
  const [flipped, setFlipped] = useState(false);
  const flippable = Boolean(back);
  return (
    <button
      type="button"
      className={`pcard ${tone}${flipped ? ' flipped' : ''}${big ? ' big' : ''}${flippable ? '' : ' still'}`}
      onClick={() => flippable && setFlipped((f) => !f)}
      aria-label={flippable ? 'Turn the card over' : undefined}
    >
      <span className="pcard-inner">
        <span className="face front">
          <span className="corner">{num != null ? `#${String(num).padStart(2, '0')}` : ''} <i>{orn}</i></span>
          {front}
          {flippable && <span className="turnhint">tap to turn ↻</span>}
        </span>
        {flippable && (
          <span className="face back">
            <span className="corner">{num != null ? `#${String(num).padStart(2, '0')}` : ''} <i>{orn}</i></span>
            {back}
            <span className="turnhint">tap to turn ↻</span>
          </span>
        )}
      </span>
    </button>
  );
}

function FlipCard({ label, front, back, big }) {
  const [flipped, setFlipped] = useState(false);
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

function ImgCard({ n, name, hook, big }) {
  const [flipped, setFlipped] = useState(false);
  const id = String(n).padStart(2, '0');
  return (
    <div className="imgcard-wrap">
      <button
        type="button"
        className={`pcard img${flipped ? ' flipped' : ''}${big ? ' big' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={`${name}, card ${n}. Turn the card over`}
      >
        <span className="pcard-inner">
          <span className="face front"><img src={`/cards/${id}-front.webp`} alt={`${name} card ${n}, front`} loading="lazy" /></span>
          <span className="face back"><img src={`/cards/${id}-back.webp`} alt={`${name} card ${n}, back`} loading="lazy" /></span>
        </span>
      </button>
      {hook && <span className="chook"><b>Hook:</b> {hook}</span>}
    </div>
  );
}

const TABS = [
  { id: 'desires', label: 'Desires', orn: '❦', tone: 'wine' },
  { id: 'relationships', label: 'Relationships', orn: '♥', tone: 'rose' },
  { id: 'connections', label: 'Connections', orn: '✥', tone: 'sage' },
  { id: 'houses', label: 'Houses', orn: '⚜', tone: 'gold' },
];

export default function DeckBrowser({ desires, relationships, connections, families, isDM }) {
  const [tab, setTab] = useState('desires');
  const [drawn, setDrawn] = useState(null);
  const [drawKey, setDrawKey] = useState(0);
  const meta = TABS.find((t) => t.id === tab);

  const render = (item, big = false) => {
    if (tab === 'desires') {
      return <ImgCard key={item.n} n={item.n} name="Desire" big={big} hook={isDM ? item.hook : ''} />;
    }
    if (tab === 'relationships') {
      return <ImgCard key={item.n} n={item.n} name="Relationship" big={big} />;
    }
    if (tab === 'connections') {
      return (
        <FlipCard
          key={item.n} big={big} label={`${item.name}, connection ${item.n}`}
          front={<ConnectionFront n={item.n} name={item.name} />}
          back={<ConnectionBack n={item.n} a={item.a} b={item.b} />}
        />
      );
    }
    const i = families.indexOf(item);
    return (
      <FlipCard
        key={item.name} big={big} label={`${item.name}, House`}
        front={<HouseFront i={i} name={item.name} base={item.base} />}
        back={<HouseBack i={i} name={item.name} base={item.base} flavour={item.flavour} />}
      />
    );
  };

  const items = { desires, relationships, connections, houses: families }[tab];

  return (
    <div>
      <div className="deck-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'tab on' : 'tab'}
            onClick={() => { setTab(t.id); setDrawn(null); }}
          >
            {t.label}
          </button>
        ))}
        <button
          className="draw"
          onClick={() => { setDrawn(items[Math.floor(Math.random() * items.length)]); setDrawKey((k) => k + 1); }}
        >
          Draw a card
        </button>
      </div>

      {drawn && (
        <div className="drawn" key={drawKey}>
          {render(drawn, true)}
          <button className="ghost small" onClick={() => setDrawn(null)}>Put it back</button>
        </div>
      )}

      <div className="deck-grid">{items.map((it) => render(it))}</div>
    </div>
  );
}
