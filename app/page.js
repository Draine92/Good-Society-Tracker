import { requireUser } from '@/lib/auth';
import { q, getSetting, currentSession } from '@/lib/db';
import CharacterCard from '@/components/CharacterCard';
import Flash from '@/components/Flash';

export default async function Home({ searchParams }) {
  const user = await requireUser();
  const characters = await q(
    `select c.*, u.display_name from characters c join users u on u.id = c.owner_id order by c.id`
  );
  const tags = await q('select * from tags order by id');
  const collab = await getSetting('collab', '');
  const session = await currentSession();
  const log = await q('select * from session_log order by id desc limit 8');

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>The Public Sheet</h1>
      <p className="sub">What everyone at the table knows. Session {session}.</p>

      {characters.length === 0 ? (
        <p className="muted">
          No player characters yet.{' '}
          {user.role === 'dm' ? 'Create player accounts on the DM page.' : 'Ask your DM for an account.'}
        </p>
      ) : (
        <div className="grid">
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              c={c}
              tags={tags.filter((t) => t.character_id === c.id)}
              canEdit={user.role === 'dm' || c.owner_id === user.id}
            />
          ))}
        </div>
      )}

      {collab && (
        <>
          <h2>Session zero decisions</h2>
          <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{collab}</div>
        </>
      )}

      {log.length > 0 && (
        <>
          <h2>Story so far</h2>
          <ul className="log">
            {log.map((l) => (
              <li key={l.id}>
                <strong>Session {l.session_no}:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
