import { q } from './db';

/* Everything a character "holds". Callers decide who may see which part. */
export async function loadCards(characterId) {
  const ch = await q('select desire_card, house, owner_id from characters where id = $1', [characterId]);
  if (!ch.length) return null;
  const relationships = await q(
    `select r.id, r.card, r.giver_id, r.taker_id, r.is_public,
            coalesce(nullif(gc.name,''), gu.display_name) as giver_name,
            coalesce(nullif(tc.name,''), tu.display_name) as taker_name
       from relationship_cards r
       join characters gc on gc.id = r.giver_id join users gu on gu.id = gc.owner_id
       join characters tc on tc.id = r.taker_id join users tu on tu.id = tc.owner_id
      where r.giver_id = $1 or r.taker_id = $1
      order by r.id`,
    [characterId]
  );
  // connection cards on NPCs tied to this character (public) ...
  const connections = await q(
    `select n.id, n.name, n.relationship, n.card_n, n.card_side
       from npcs n where n.target_character_id = $1 and n.card_n is not null order by n.id`,
    [characterId]
  );
  // ... and the NPCs this character's player wrote (also public, the want/secret are not shown here)
  const authored = await q(
    `select n.id, n.name, n.relationship, n.card_n, n.card_side,
            coalesce(nullif(c.name,''), u.display_name) as target_name
       from npcs n
       left join characters c on c.id = n.target_character_id
       left join users u on u.id = c.owner_id
      where n.author_id = $1 and n.card_n is not null order by n.id`,
    [ch[0].owner_id]
  );
  return {
    desire_card: ch[0].desire_card,
    house: ch[0].house,
    relationships,
    connections,
    authored,
  };
}
