import { requireUser } from '@/lib/auth';
import DeckBrowser from '@/components/DeckBrowser';
import { DESIRES, RELATIONSHIPS, CONNECTIONS, FAMILIES } from '@/lib/deck-data';

export const metadata = { title: 'The Deck' };

export default async function DeckPage() {
  const user = await requireUser();
  const isDM = user.role === 'dm';
  // Adventure hooks are the DM's notes, so they never leave the server for players.
  const desires = DESIRES.map((d) => (isDM ? d : { ...d, hook: '' }));
  return (
    <>
      <h1>The Deck</h1>
      <p className="sub">
        Desires, relationships, connections and Houses for building characters. Tap a card to turn it over.
      </p>
      <DeckBrowser desires={desires} relationships={RELATIONSHIPS} connections={CONNECTIONS} families={FAMILIES} isDM={isDM} />
    </>
  );
}
