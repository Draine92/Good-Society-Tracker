'use client';

import { useState } from 'react';

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
        <Card
          key={item.n} big={big} tone={meta.tone} orn={meta.orn} num={item.n}
          front={
            <>
              <span className="kind">Side A</span>
              <strong className="ctitle">{item.name}</strong>
              <span className="ctext">{item.a}</span>
            </>
          }
          back={
            <>
              <span className="kind">Side B</span>
              <strong className="ctitle">{item.name}</strong>
              <span className="ctext">{item.b}</span>
            </>
          }
        />
      );
    }
    return (
      <Card
        key={item.name} big={big} tone={meta.tone} orn={meta.orn}
        front={
          <>
            <span className="kind">{item.base}</span>
            <strong className="ctitle">{item.name}</strong>
            <span className="ctext">{item.flavour}</span>
          </>
        }
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
