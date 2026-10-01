import Pips from './Pips';
import { adjustInspiration, toggleMonologue } from '@/app/actions';

function Boxes({ n }) {
  return (
    <div className="bar">
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'box on' : 'box'} />
      ))}
    </div>
  );
}

export default function CharacterCard({ c, tags, canEdit }) {
  const ready = c.marks_left >= 3 || c.marks_right >= 3 || c.marks_left + c.marks_right >= 5;
  const pos = tags.filter((t) => t.kind === 'positive');
  const neg = tags.filter((t) => t.kind === 'negative');
  return (
    <article className="card">
      <h3>{c.name || c.display_name}</h3>
      <div className="meta">Played by {c.display_name}</div>
      {c.concept && <p>{c.concept}</p>}
      {c.public_relationships && (
        <p className="muted">
          <strong>Ties:</strong> {c.public_relationships}
        </p>
      )}

      <div className="chips">
        {pos.map((t) => (
          <span key={t.id} className="chip pos" title={`${t.skill} · ${t.scene}`}>
            {t.word} <Pips n={t.pips} />
            {(t.skill || t.scene) && (
              <small>
                {t.skill}
                {t.skill && t.scene ? ' · ' : ''}
                {t.scene}
              </small>
            )}
          </span>
        ))}
        {neg.map((t) => (
          <span key={t.id} className="chip neg" title={`${t.skill} · ${t.scene}`}>
            {t.word} <Pips n={t.pips} />
            {(t.skill || t.scene) && (
              <small>
                {t.skill}
                {t.skill && t.scene ? ' · ' : ''}
                {t.scene}
              </small>
            )}
          </span>
        ))}
        {!tags.length && <span className="muted">No tags yet</span>}
      </div>

      {(c.conflict_left || c.conflict_right) && (
        <div className="conflict">
          <div>
            {c.conflict_left}
            <Boxes n={c.marks_left} />
          </div>
          <div className="vs">vs</div>
          <div className="r">
            {c.conflict_right}
            <Boxes n={c.marks_right} />
          </div>
        </div>
      )}
      {ready && <div className="badge">Inner conflict ready to resolve</div>}

      <div className="row between" style={{ marginTop: 10 }}>
        <div className="row">
          <span>Inspiration</span>
          <Pips n={c.inspiration} />
          {canEdit && (
            <>
              <form action={adjustInspiration}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="delta" value="-1" />
                <button className="ghost small" aria-label="Spend inspiration">−</button>
              </form>
              <form action={adjustInspiration}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="delta" value="1" />
                <button className="ghost small" aria-label="Gain inspiration">+</button>
              </form>
            </>
          )}
        </div>
        <div className="row">
          <span className={c.monologue_used ? 'muted' : ''}>
            Monologue: {c.monologue_used ? 'used' : 'ready'}
          </span>
          {canEdit && (
            <form action={toggleMonologue}>
              <input type="hidden" name="id" value={c.id} />
              <button className="ghost small">Toggle</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
