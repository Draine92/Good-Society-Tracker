import { requireUser } from '@/lib/auth';
import { q, getSetting, currentSession } from '@/lib/db';
import CharacterCard from '@/components/CharacterCard';
import Flash from '@/components/Flash';
import { FAMILIES, RELATIONSHIPS } from '@/lib/deck-data';

export default async function Home({ searchParams }) {
  const user = await requireUser();
  const characters = await q(
    `select c.*, u.display_name from characters c join users u on u.id = c.owner_id order by c.id`
  );
  const tags = await q('select * from tags order by id');
  const rels = await q(
    `select r.id, r.card, r.giver_id, r.taker_id,
            coalesce(nullif(gc.name,''), gu.display_name) as giver_name,
            coalesce(nullif(tc.name,''), tu.display_name) as taker_name
       from relationship_cards r
       join characters gc on gc.id = r.giver_id join users gu on gu.id = gc.owner_id
       join characters tc on tc.id = r.taker_id join users tu on tu.id = tc.owner_id order by r.id`
  );
  const collab = await getSetting('collab', '');
  const session = await currentSession();
  const log = await q('select * from session_log order by id desc limit 8');

  return (
    <>
      <Flash searchParams={searchParams} />
      <h1>The Court</h1>
      <p className="sub">Every player character, as the whole table knows them. Session {session}.</p>

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
              house={c.house != null ? FAMILIES[c.house]?.name : ''}
              ties={rels
                .filter((r) => r.giver_id === c.id || r.taker_id === c.id)
                .map((r) => ({
                  id: r.id,
                  title: RELATIONSHIPS.find((x) => x.n === r.card)?.public.title || 'Relationship',
                  text: r.giver_id === c.id ? `${r.taker_name} (you are the giver)` : `${r.giver_name} (they are the giver)`,
                }))}
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
          <h2 id="story">Story so far</h2>
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
