// A card drawn in the style of the printed Good Society cards: ornate ink corners,
// italic centred wording, a small illustration, and a tinted ground.
import CelticKnot from './CelticKnot';

export function Letter() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" className="rc-art">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <rect x="22" y="26" width="156" height="84" rx="4" fill="#fffaf0" />
        <path d="M22 30 L100 78 L178 30" />
        <path d="M22 108 L82 62 M178 108 L118 62" opacity=".55" />
        <path d="M60 14 C70 4 92 6 100 18 C108 6 130 4 140 14" opacity=".7" />
      </g>
      <circle cx="100" cy="80" r="15" fill="#7d1f2b" stroke="#4a1018" strokeWidth="2" />
      <circle cx="100" cy="80" r="9" fill="none" stroke="#e7b9bf" strokeWidth="1.5" />
      <path d="M100 73 L103 79 L109 80 L104 84 L106 90 L100 86 L94 90 L96 84 L91 80 L97 79 Z" fill="#e7b9bf" />
    </svg>
  );
}

export function Shield() {
  return (
    <div className="rc-art rc-shield" aria-hidden="true">
      <svg viewBox="0 0 200 150">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M100 8 C84 20 62 24 44 22 C44 74 56 112 100 142 C144 112 156 74 156 22 C138 24 116 20 100 8 Z" fill="#fffaf0" />
          <path d="M100 18 C87 27 70 31 54 30 C55 74 65 104 100 130 C135 104 145 74 146 30 C130 31 113 27 100 18 Z" opacity=".5" />
          <path d="M40 62 C22 56 14 40 18 26 C30 30 38 44 40 62 Z M30 92 C14 84 8 68 12 54 C24 58 30 74 30 92 Z" />
          <path d="M160 62 C178 56 186 40 182 26 C170 30 162 44 160 62 Z M170 92 C186 84 192 68 188 54 C176 58 170 74 170 92 Z" />
        </g>
      </svg>
      <span className="rc-knot"><CelticKnot size={46} gap="#fffaf0" /></span>
    </div>
  );
}

function Frame({ num, kind, sub, children, art, tone }) {
  return (
    <div className={`rc ${tone}${art ? '' : ' noart'}`}>
      <span className="rc-line" />
      <i className="rc-c tl" /><i className="rc-c tr" /><i className="rc-c bl" /><i className="rc-c br" />
      <div className="rc-top"><span /><b>{num}</b><span /></div>
      <div className="rc-kind">{kind}</div>
      {sub && <div className="rc-sub"><span /><em>{sub}</em><span /></div>}
      <div className="rc-body">{children}</div>
      {art}
    </div>
  );
}

export function ConnectionFront({ n, name }) {
  return (
    <Frame tone="sage" num={`#${n}`} kind="Connection" sub="Person" art={<Letter />}>
      <p className="rc-quote">{name}</p>
    </Frame>
  );
}
export function ConnectionBack({ n, a, b }) {
  return (
    <Frame tone="sage" num={`#${n}`} kind="Connection" sub="Choose a side">
      <div className="rc-text">
        <h4>Side A</h4>
        <p>{a}</p>
        <hr />
        <h4>Side B</h4>
        <p>{b}</p>
        <p className="rc-note">The player who takes this card chooses the name.</p>
      </div>
    </Frame>
  );
}
export function HouseFront({ i, name, base }) {
  return (
    <Frame tone="lilac" num={ROMAN[i]} kind="House" sub={base} art={<Shield />}>
      <p className="rc-quote">{name}</p>
    </Frame>
  );
}
export function HouseBack({ i, name, base, flavour }) {
  return (
    <Frame tone="lilac" num={ROMAN[i]} kind="House" sub={base}>
      <div className="rc-text">
        <h4>{name}</h4>
        <p><em>{flavour}</em></p>
        <hr />
        <p>Choose a House as your starting package: two starting reputation tags and a social standing.</p>
      </div>
    </Frame>
  );
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
