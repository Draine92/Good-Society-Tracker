import Link from 'next/link';
import { DESIRES, RELATIONSHIPS, CONNECTIONS, FAMILIES } from '@/lib/deck-data';
import { ImgCard, StillImg, HouseFlip, ConnectionFlip } from './CardViews';
import { setDesireCard, setHouseCard, addRelationshipCard, removeRelationshipCard } from '@/app/actions';

const pad = (n) => String(n).padStart(2, '0');

function relTitle(card) {
  return RELATIONSHIPS.find((r) => r.n === card)?.public.title || `Card ${card}`;
}

function RelRole({ r, characterId }) {
  const iAmGiver = r.giver_id === characterId;
  return (
    <p className="cardcap">
      <strong>{relTitle(r.card)}</strong>
      <br />
      {iAmGiver ? <>You are the giver · <em>{r.taker_name}</em> is the taker</> : <><em>{r.giver_name}</em> is the giver · you are the taker</>}
    </p>
  );
}

/* mode: 'edit' shows the choosers (the player, or the DM editing); 'view' is read-only (DM overview). */
export default function PlayerCards({ c, cards, characters = [], mode = 'edit' }) {
  const desire = cards.desire_card ? DESIRES.find((d) => d.n === cards.desire_card) : null;
  const house = cards.house != null ? FAMILIES[cards.house] : null;
  const others = characters.filter((o) => o.id !== c.id);
  const edit = mode === 'edit';
  const nothing = !desire && !house && !cards.relationships.length && !cards.connections.length && !cards.authored.length;

  return (
    <section className="mycards" id="cards">
      {nothing && !edit && <p className="muted">No cards chosen yet.</p>}

      <div className="vis-grid">
        {/* ---------- PUBLIC ---------- */}
        <div className="vis public">
          <h3>Public <small>everyone at the table can see these</small></h3>

          <h4>House</h4>
          {house ? (
            <div className="cardrow"><HouseFlip i={cards.house} house={house} /></div>
          ) : (
            <p className="muted">No House chosen.</p>
          )}

          <h4>Relationships <small>public side</small></h4>
          {cards.relationships.length === 0 ? (
            <p className="muted">No relationship cards yet.</p>
          ) : (
            <div className="cardrow">
              {cards.relationships.map((r) => (
                <div key={r.id} className="cardcol">
                  <StillImg n={r.card} side="front" name="Relationship" />
                  <RelRole r={r} characterId={c.id} />
                  {edit && (
                    <form action={removeRelationshipCard}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="character_id" value={c.id} />
                      <button className="ghost small">Remove</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}

          <h4>Connections <small>NPCs tied to this character</small></h4>
          {cards.connections.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <div className="cardrow">
              {cards.connections.map((n) => {
                const conn = CONNECTIONS.find((x) => x.n === n.card_n);
                return conn ? (
                  <div key={n.id} className="cardcol">
                    <ConnectionFlip conn={conn} only={n.card_side || undefined} startBack />
                    <p className="cardcap"><strong>{n.name}</strong>{n.relationship ? ` · ${n.relationship}` : ''}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {cards.authored.length > 0 && (
            <>
              <h4>NPCs written by this player</h4>
              <div className="cardrow">
                {cards.authored.map((n) => {
                  const conn = CONNECTIONS.find((x) => x.n === n.card_n);
                  return conn ? (
                    <div key={n.id} className="cardcol">
                      <ConnectionFlip conn={conn} only={n.card_side || undefined} startBack />
                      <p className="cardcap"><strong>{n.name}</strong>{n.target_name ? ` · tied to ${n.target_name}` : ''}</p>
                    </div>
                  ) : null;
                })}
              </div>
            </>
          )}
        </div>

        {/* ---------- PRIVATE ---------- */}
        <div className="vis private">
          <h3>Private <small>only you and the DM{cards.relationships.length ? ' (and the other character in each relationship)' : ''}</small></h3>

          <h4>Desire</h4>
          {desire ? (
            <div className="cardrow">
              <ImgCard n={desire.n} name="Desire" startBack />
            </div>
          ) : (
            <p className="muted">No desire card chosen.</p>
          )}

          <h4>Relationships <small>private side</small></h4>
          {cards.relationships.length === 0 ? (
            <p className="muted">No relationship cards yet.</p>
          ) : (
            <div className="cardrow">
              {cards.relationships.map((r) => (
                <div key={r.id} className="cardcol">
                  <StillImg n={r.card} side="back" name="Relationship" />
                  <RelRole r={r} characterId={c.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <div className="card chooser">
          <h3>Choose your cards</h3>
          <p className="sub">Changing a choice replaces the old one. Your DM can see everything on this page.</p>

          <details>
            <summary>Desire card {desire ? `(now #${desire.n})` : '(none)'}</summary>
            <p className="muted small-note">Tap a card to choose it. Only you and the DM will see which you hold.</p>
            <div className="picker">
              {DESIRES.map((d) => (
                <form action={setDesireCard} key={d.n}>
                  <input type="hidden" name="character_id" value={c.id} />
                  <input type="hidden" name="card" value={d.n} />
                  <button type="submit" className={`thumb${cards.desire_card === d.n ? ' on' : ''}`} aria-label={`Choose desire card ${d.n}`}>
                    <img src={`/cards/${pad(d.n)}-front.webp`} alt="" loading="lazy" />
                    <span>#{d.n}</span>
                  </button>
                </form>
              ))}
            </div>
            {desire && (
              <form action={setDesireCard}>
                <input type="hidden" name="character_id" value={c.id} />
                <input type="hidden" name="card" value="0" />
                <button className="ghost small">Put my desire card back</button>
              </form>
            )}
          </details>

          <details>
            <summary>House {house ? `(now ${house.name})` : '(none)'}</summary>
            <form action={setHouseCard}>
              <input type="hidden" name="character_id" value={c.id} />
              <label>Your family background</label>
              <select name="house" defaultValue={cards.house ?? -1}>
                <option value="-1">— none —</option>
                {FAMILIES.map((f, i) => (
                  <option key={f.name} value={i}>{f.name} ({f.base})</option>
                ))}
              </select>
              <p><button type="submit">Save House</button></p>
            </form>
          </details>

          <details>
            <summary>Add a relationship card</summary>
            {others.length === 0 ? (
              <p className="muted">There are no other characters yet.</p>
            ) : (
              <form action={addRelationshipCard}>
                <input type="hidden" name="character_id" value={c.id} />
                <label>Card</label>
                <select name="card" defaultValue="23">
                  {RELATIONSHIPS.map((r) => (
                    <option key={r.n} value={r.n}>#{r.n} {r.public.title}</option>
                  ))}
                </select>
                <label>With</label>
                <select name="other_id" required>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>{o.name || o.display_name}</option>
                  ))}
                </select>
                <label>Your part on the card</label>
                <select name="role" defaultValue="giver">
                  <option value="giver">I am the giver</option>
                  <option value="taker">I am the taker</option>
                </select>
                <p><button type="submit">Add relationship</button></p>
              </form>
            )}
          </details>

          <p className="muted small-note">
            Connection cards are chosen when you write an NPC on the <Link href="/npcs">NPC roster</Link>.
          </p>
        </div>
      )}
    </section>
  );
}
