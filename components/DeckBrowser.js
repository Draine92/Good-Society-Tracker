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
      return (
        <Card
          key={item.n} big={big} tone={meta.tone} orn={meta.orn} num={item.n}
          front={
            <>
              <span className="kind">{item.kind}{item.age ? ' · Age' : ''}</span>
              <strong className="ctitle">{item.title}</strong>
              <span className="ctext">{item.text}</span>
              {isDM && item.hook && <span className="chook"><b>Hook:</b> {item.hook}</span>}
            </>
          }
        />
      );
    }
    if (tab === 'relationships') {
      const sameAsPublic = !item.private.title && /^same/i.test(item.private.text);
      return (
        <Card
          key={item.n} big={big} tone={meta.tone} orn={meta.orn} num={item.n}
          front={
            <>
              <span className="kind">Public</span>
              <strong className="ctitle">{item.public.title}</strong>
              <span className="ctext">{item.public.text}</span>
            </>
          }
          back={
            <>
              <span className="kind">Private</span>
              <strong className="ctitle">{sameAsPublic ? item.public.title : item.private.title || item.public.title}</strong>
              <span className="ctext">{sameAsPublic ? `Same as the public side. ${item.private.text.replace(/^same\.?,?\s*/i, '')}` : item.private.text}</span>
            </>
          }
        />
      );
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
