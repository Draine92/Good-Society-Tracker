export default function Pips({ n, max = 3 }) {
  return (
    <span className="pips" aria-label={`${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}
