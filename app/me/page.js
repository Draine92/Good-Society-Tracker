import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { saveCharacter, addTag, adjustPips, deleteTag, changeOwnPassword } from '../actions';
import Flash from '@/components/Flash';
import Pips from '@/components/Pips';

export default async function MePage({ searchParams }) {
  const user = await requireUser();
  let rows;
  if (user.role === 'dm') {
    const id = parseInt(searchParams?.char, 10);
    if (!id) redirect('/dm');
    rows = await q('select * from characters where id = $1', [id]);
  } else {
    rows = await q('select * from characters where owner_id = $1', [user.id]);
  }
  const c = rows[0];
  if (!c) {
    return <p className="muted">No character found for this account yet. Ask your DM.</p>;
  }
  const tags = await q('select * from tags where character_id = $1 order by kind, id', [c.id]);

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>{user.role === 'dm' ? `Editing ${c.name}` : 'My character'}</h1>
      <p className="sub">
        Everything here is on the public sheet except your desire and private notes, which only you and the DM can see.
      </p>

      <form action={saveCharacter} className="card">
        <input type="hidden" name="id" value={c.id} />
        <label>Character name</label>
        <input type="text" name="name" defaultValue={c.name} maxLength={80} />
        <label>Concept (class, house, one-line description)</label>
        <textarea name="concept" defaultValue={c.concept} maxLength={600} />
        <label>Public ties (the public side of your relationship cards)</label>
        <textarea name="public_relationships" defaultValue={c.public_relationships} maxLength={1000} />

        <h3 style={{ marginTop: 18 }}>Inner conflict</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div>
            <label>One side</label>
            <input type="text" name="conflict_left" defaultValue={c.conflict_left} maxLength={40} placeholder="Love" />
          </div>
          <div>
            <label>Other side</label>
            <input type="text" name="conflict_right" defaultValue={c.conflict_right} maxLength={40} placeholder="Duty" />
          </div>
          <div>
            <label>Marks on first side (0-3)</label>
            <input type="number" name="marks_left" min={0} max={3} defaultValue={c.marks_left} />
          </div>
          <div>
            <label>Marks on second side (0-3)</label>
            <input type="number" name="marks_right" min={0} max={3} defaultValue={c.marks_right} />
          </div>
        </div>

        <label>Secret desire (private)</label>
        <textarea name="desire" defaultValue={c.desire} maxLength={2000} />
        <label>Private notes</label>
        <textarea name="private_notes" defaultValue={c.private_notes} maxLength={4000} />
        <p><button type="submit">Save</button></p>
      </form>

      <h2>Reputation tags</h2>
      <p className="sub">
        Up to 3 positive and 3 negative. Each names a skill and a scene where it matters. Earn or deepen one per
        milestone. Pips are how many times per session it can be invoked.
      </p>
      <div className="grid">
        {tags.map((t) => (
          <div key={t.id} className="card">
            <div className="row between">
              <strong className={t.kind === 'positive' ? 'chip pos' : 'chip neg'}>{t.word}</strong>
              <Pips n={t.pips} />
            </div>
            <div className="meta">
              {t.kind === 'positive' ? 'Amplifies' : 'Weighs on'}: {t.skill || 'any skill'} · {t.scene || 'any scene'}
            </div>
            <div className="row">
              <form action={adjustPips}>
                <input type="hidden" name="tag_id" value={t.id} />
                <input type="hidden" name="delta" value="1" />
                <button className="ghost small">Deepen</button>
              </form>
              <form action={adjustPips}>
                <input type="hidden" name="tag_id" value={t.id} />
                <input type="hidden" name="delta" value="-1" />
                <button className="ghost small">Lessen</button>
              </form>
              <form action={deleteTag}>
                <input type="hidden" name="tag_id" value={t.id} />
                <button className="danger small">Remove</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Add a tag</h3>
        <form action={addTag}>
          <input type="hidden" name="character_id" value={c.id} />
          <label>Type</label>
          <select name="kind" defaultValue="positive">
            <option value="positive">Positive (amplifies)</option>
            <option value="negative">Negative (weighs on you)</option>
          </select>
          <label>Word</label>
          <input type="text" name="word" maxLength={40} placeholder="Silver-tongued" required />
          <label>Skill</label>
          <input type="text" name="skill" maxLength={40} placeholder="Persuasion" />
          <label>Scene</label>
          <input type="text" name="scene" maxLength={60} placeholder="at court" />
          <p><button type="submit">Add tag</button></p>
        </form>
      </div>

      {user.role === 'player' && (
        <>
          <h2>Account</h2>
          <div className="card">
            <form action={changeOwnPassword}>
              <label>Current password</label>
              <input type="password" name="current" autoComplete="current-password" required />
              <label>New password (8+ characters)</label>
              <input type="password" name="next" autoComplete="new-password" minLength={8} required />
              <p><button type="submit">Change password</button></p>
            </form>
          </div>
        </>
      )}
    </>
  );
}
