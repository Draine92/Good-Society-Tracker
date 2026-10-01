import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { saveNpc, deleteNpc, adjustLeverage } from '../actions';
import Flash from '@/components/Flash';
import Pips from '@/components/Pips';

function NpcForm({ npc, targets }) {
  return (
    <form action={saveNpc}>
      {npc && <input type="hidden" name="id" value={npc.id} />}
      <label>Name</label>
      <input type="text" name="name" defaultValue={npc?.name || ''} maxLength={80} required />
      <label>Tied to which player character?</label>
      <select name="target_character_id" defaultValue={npc?.target_character_id || ''}>
        <option value="">— none (DM only) —</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>{t.name || t.display_name}</option>
        ))}
      </select>
      <label>Relationship to them</label>
      <input type="text" name="relationship" defaultValue={npc?.relationship || ''} maxLength={120} placeholder="Sibling, rival, patron…" />
      <label>Their opinion of that character (public)</label>
      <input type="text" name="opinion" defaultValue={npc?.opinion || ''} maxLength={400} />
      <label>Public notes</label>
      <textarea name="public_notes" defaultValue={npc?.public_notes || ''} maxLength={1000} />
      <label>Want (private: you and the DM)</label>
      <textarea name="want" defaultValue={npc?.want || ''} maxLength={600} />
      <label>Secret (private: you and the DM)</label>
      <textarea name="secret" defaultValue={npc?.secret || ''} maxLength={1000} />
      <p><button type="submit">{npc ? 'Save NPC' : 'Create NPC'}</button></p>
    </form>
  );
}

export default async function NpcsPage({ searchParams }) {
  const user = await requireUser();
  const characters = await q(
    'select c.id, c.name, c.owner_id, u.display_name from characters c join users u on u.id = c.owner_id order by c.id'
  );
  const npcs = await q(
    'select n.*, u.display_name as author from npcs n join users u on u.id = n.author_id order by n.id'
  );
  const mine = npcs.filter((n) => n.author_id === user.id);
  const targets = user.role === 'dm' ? characters : characters.filter((c) => c.owner_id !== user.id);

  const groups = characters.map((c) => ({
    c,
    list: npcs.filter((n) => n.target_character_id === c.id),
  }));
  const unattached = npcs.filter((n) => !n.target_character_id);

  const NpcCard = ({ n }) => {
    const canSee = user.role === 'dm' || n.author_id === user.id;
    return (
      <article className="card">
        <h3>{n.name}</h3>
        <div className="meta">
          {n.relationship || 'Connection'} · written by {n.author}
        </div>
        {n.opinion && <p><em>“{n.opinion}”</em></p>}
        {n.public_notes && <p>{n.public_notes}</p>}
        <div className="row">
          <span>Leverage</span>
          <Pips n={n.leverage} max={Math.max(2, n.leverage)} />
          {canSee && (
            <>
              <form action={adjustLeverage}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="delta" value="-1" />
                <button className="ghost small" aria-label="Spend leverage">−</button>
              </form>
              <form action={adjustLeverage}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="delta" value="1" />
                <button className="ghost small" aria-label="Gain leverage">+</button>
              </form>
            </>
          )}
        </div>
        {canSee && (n.want || n.secret) && (
          <div className="secret">
            {n.want && <div><strong>Want:</strong> {n.want}</div>}
            {n.secret && <div><strong>Secret:</strong> {n.secret}</div>}
          </div>
        )}
        {canSee && (
          <details>
            <summary>Edit</summary>
            <NpcForm npc={n} targets={targets} />
            <form action={deleteNpc}>
              <input type="hidden" name="id" value={n.id} />
              <button className="danger small">Delete this NPC</button>
            </form>
          </details>
        )}
      </article>
    );
  };

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>NPC Roster</h1>
      <p className="sub">
        Each player writes NPCs for the other characters and plays them. Wants and secrets are visible only to the
        author and the DM.
      </p>

      {groups.map(({ c, list }) => (
        <section key={c.id}>
          <h2>Tied to {c.name || c.display_name}</h2>
          {list.length === 0 ? (
            <p className="muted">No NPCs yet.</p>
          ) : (
            <div className="grid">
              {list.map((n) => (
                <NpcCard key={n.id} n={n} />
              ))}
            </div>
          )}
        </section>
      ))}

      {unattached.length > 0 && (
        <section>
          <h2>Other characters</h2>
          <div className="grid">
            {unattached.map((n) => (
              <NpcCard key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}

      <h2>Add an NPC</h2>
      {user.role === 'player' && (
        <p className="muted">You’ve written {mine.length} of 3 (two to start, plus one mid-campaign slot).</p>
      )}
      <div className="card">
        <NpcForm targets={targets} />
      </div>
    </>
  );
}
