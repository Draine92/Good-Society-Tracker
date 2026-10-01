import { requireUser } from '@/lib/auth';
import { q, currentSession } from '@/lib/db';
import { addRumour, spreadRumour, cashSpark, deleteRumour } from '../actions';
import Flash from '@/components/Flash';

export default async function RumoursPage({ searchParams }) {
  const user = await requireUser();
  const session = await currentSession();
  const rumours = await q(
    `select r.*, u.display_name as author from rumours r left join users u on u.id = r.author_id order by r.id desc`
  );
  const active = rumours.filter((r) => r.status === 'active');
  const spread = rumours.filter((r) => r.status === 'spread');
  const archive = rumours.filter((r) => r.status === 'used' || r.status === 'faded');

  const canDelete = (r) => user.role === 'dm' || (r.author_id === user.id && r.status === 'active');

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>The Rumour Board</h1>
      <p className="sub">
        Session {session}. Write as society, not as your character. Spread a rumour to give it a Spark, and cash a
        Spark in play to make it affect the story. Rumours nobody spreads fade after a session.
      </p>

      <div className="card">
        <form action={addRumour}>
          <label htmlFor="text">New rumour</label>
          <textarea id="text" name="text" maxLength={400} placeholder="The Ashgroves are quietly selling the ward-stone…" required />
          <p><button type="submit">Add to the board</button></p>
        </form>
      </div>

      <h2>Sparks ready ({spread.length})</h2>
      <div className="stack">
        {spread.length === 0 && <p className="muted">No spread rumours yet.</p>}
        {spread.map((r) => (
          <div key={r.id} className="card rumour">
            <p>
              <span className="badge">Spark</span> {r.text}
              <br />
              <small className="muted">Added by {r.author || 'someone'}</small>
            </p>
            <div className="row">
              <form action={cashSpark}>
                <input type="hidden" name="id" value={r.id} />
                <button>Cash Spark</button>
              </form>
              {canDelete(r) && (
                <form action={deleteRumour}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="ghost small">Remove</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2>Whispers ({active.length})</h2>
      <div className="stack">
        {active.length === 0 && <p className="muted">Nothing is being whispered.</p>}
        {active.map((r) => (
          <div key={r.id} className="card rumour">
            <p>
              {r.fading >= 1 && <span className="badge fade">Fading</span>} {r.text}
              <br />
              <small className="muted">Added by {r.author || 'someone'} in session {r.created_session}</small>
            </p>
            <div className="row">
              <form action={spreadRumour}>
                <input type="hidden" name="id" value={r.id} />
                <button className="ghost">Spread it</button>
              </form>
              {canDelete(r) && (
                <form action={deleteRumour}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="ghost small">Remove</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      {archive.length > 0 && (
        <details>
          <summary>Used and faded ({archive.length})</summary>
          <ul>
            {archive.map((r) => (
              <li key={r.id} className="muted">
                <s>{r.text}</s> <small>({r.status === 'used' ? 'used' : 'faded'})</small>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
