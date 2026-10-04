import Link from 'next/link';
import { requireDM } from '@/lib/auth';
import { q, getSetting, currentSession } from '@/lib/db';
import { FAMILIES } from '@/lib/deck-data';
import { createPlayer, removePlayer, resetPassword, endSession, addLog, deleteLog, saveCollab } from '../actions';
import Flash from '@/components/Flash';
import PlayerCards from '@/components/PlayerCards';
import { loadCards } from '@/lib/cards';

export default async function DMPage({ searchParams }) {
  await requireDM();
  const session = await currentSession();
  const users = await q('select id, username, display_name, role from users order by id');
  const characters = await q(
    'select c.*, u.display_name from characters c join users u on u.id = c.owner_id order by c.id'
  );
  const npcs = await q(
    'select n.*, u.display_name as author from npcs n join users u on u.id = n.author_id order by n.id'
  );
  const cardsByChar = Object.fromEntries(await Promise.all(characters.map(async (c) => [c.id, await loadCards(c.id)])));
  const collab = await getSetting('collab', '');
  const log = await q('select * from session_log order by id desc limit 20');
  const rumourCounts = await q("select status, count(*)::int as n from rumours group by status");

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>DM Screen</h1>
      <p className="sub">Only you can see this page. Currently in session {session}.</p>

      <h2>Players</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th>Username</th><th>Display name</th><th>Role</th><th>Reset password</th><th>Remove</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.display_name}</td>
                <td>{u.role}</td>
                <td>
                  <form action={resetPassword} className="row">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="password" name="password" placeholder="New password" minLength={8} style={{ width: 150 }} required />
                    <button className="ghost small">Set</button>
                  </form>
                </td>
                <td>
                  {u.role === 'player' ? (
                    <details>
                      <summary>Remove…</summary>
                      <form action={removePlayer} className="remove-confirm">
                        <input type="hidden" name="user_id" value={u.id} />
                        <p className="small-note">
                          Permanently removes <strong>{u.display_name}</strong>, their character and the {npcs.filter((n) => n.author_id === u.id).length} NPC(s) they wrote. This cannot be undone.
                        </p>
                        <button className="small danger">Yes, remove {u.display_name}</button>
                      </form>
                    </details>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ marginTop: 16 }}>Add a player</h3>
        <form action={createPlayer} className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <label>Username</label>
            <input type="text" name="username" required />
          </div>
          <div>
            <label>Display name</label>
            <input type="text" name="display_name" />
          </div>
          <div>
            <label>Starting password</label>
            <input type="password" name="password" minLength={8} required />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>

      <h2>End of session</h2>
      <div className="card">
        <p className="muted">
          Closing a session fades unspread rumours (crossed off if they were already fading), resets monologue tokens
          and starts the next session. Add a short summary for the story log if you like.
        </p>
        <form action={endSession}>
          <label>Session summary (optional)</label>
          <textarea name="summary" maxLength={2000} />
          <p><button type="submit">Close session {session}</button></p>
        </form>
      </div>

      <h2>Milestone checklist</h2>
      <div className="card">
        <ol>
          <li>Spend or lose monologue tokens</li>
          <li>Each player earns or deepens one tag</li>
          <li>Update inner conflict marks (resolve if ready)</li>
          <li>Keep, replace or retire desires</li>
          <li>Clean up the rumour board</li>
          <li>Top up empty NPC leverage if you choose</li>
        </ol>
        <p className="muted">
          Rumours: {rumourCounts.map((r) => `${r.n} ${r.status}`).join(', ') || 'none yet'}.
        </p>
      </div>

      <h2>Player secrets</h2>
      <div className="stack">
        {characters.length === 0 && <p className="muted">No players yet.</p>}
        {characters.map((c) => (
          <div key={c.id} className="card">
            <div className="row between">
              <h3>{c.name || c.display_name}</h3>
              <Link href={`/me?char=${c.id}`}>Edit character</Link>
            </div>
            <details className="dm-cards">
              <summary>
                Cards: {cardsByChar[c.id]?.desire_card ? `desire #${cardsByChar[c.id].desire_card}` : 'no desire'} ·{' '}
                {cardsByChar[c.id]?.house != null ? FAMILIES[cardsByChar[c.id].house].name : 'no House'} ·{' '}
                {cardsByChar[c.id]?.relationships.length || 0} relationship(s) · {cardsByChar[c.id]?.connections.length || 0} connection(s)
              </summary>
              <PlayerCards c={c} cards={cardsByChar[c.id]} characters={characters} mode="view" />
            </details>
            <div className="secret">
              <div><strong>Desire:</strong> {c.desire || <span className="muted">not set</span>}</div>
              {c.private_notes && <div><strong>Private notes:</strong> {c.private_notes}</div>}
            </div>
            {npcs.filter((n) => n.target_character_id === c.id && (n.want || n.secret)).map((n) => (
              <div key={n.id} className="secret">
                <strong>{n.name}</strong> (by {n.author})
                {n.want && <div>Want: {n.want}</div>}
                {n.secret && <div>Secret: {n.secret}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <h2>Session zero decisions</h2>
      <div className="card">
        <form action={saveCollab}>
          <label>Shown on the public sheet</label>
          <textarea name="collab" defaultValue={collab} maxLength={4000} style={{ minHeight: 140 }} placeholder="Tone: romantic comedy" />
          <p><button type="submit">Save</button></p>
        </form>
      </div>

      <h2>Story log</h2>
      <div className="card">
        <form action={addLog}>
          <label>Add an entry</label>
          <textarea name="text" maxLength={2000} />
          <p><button type="submit">Add</button></p>
        </form>
        <ul className="log">
          {log.map((l) => (
            <li key={l.id}>
              <strong>Session {l.session_no}:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>{' '}
              <form action={deleteLog} style={{ display: 'inline' }}>
                <input type="hidden" name="id" value={l.id} />
                <button className="link">delete</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
