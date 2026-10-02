// A card drawn in the style of the printed Good Society cards: ornate ink corners,
// italic centred wording, a small illustration, and a tinted ground.

export function Sigil() {
  return <span className="rc-art rc-sigil" role="img" aria-label="Ornamental sigil" />;
}

export function Medallion() {
  return <span className="rc-art rc-medal" role="img" aria-label="Ornamental medallion" />;
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
    <Frame tone="sage" num={`#${n}`} kind="Connection" sub="Person" art={<Sigil />}>
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
    <Frame tone="lilac" num={ROMAN[i]} kind="House" sub={base} art={<Medallion />}>
      <p className="rc-quote">{name}</p>
    </Frame>
  );
}
export function HouseBack({ i, name, base, flavour, positive = [], negative = [], title }) {
  return (
    <Frame tone="lilac" num={ROMAN[i]} kind="House" sub={base}>
      <div className="rc-text rc-house">
        <h4>{name}</h4>
        <p><em>{flavour}</em></p>
        <hr />
        <h4>Starting reputation</h4>
        <p className="rc-small">Pick one of each and write them on the public sheet.</p>
        <p className="rc-tags"><b>▲ Positive</b> {positive.join(', ')}</p>
        <p className="rc-tags"><b>▽ Negative</b> {negative.join(', ')}</p>
        {title && <p className="rc-small rc-title">{title}</p>}
      </div>
    </Frame>
  );
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
