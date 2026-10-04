import { requireUser } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { loadHexes, loadClock } from '@/lib/hexdb';
import { DEFAULT_HEX_MILES } from '@/lib/hex';
import HexMap from '@/components/HexMap';
import { WORLD_NAME } from '@/lib/world';

export const metadata = { title: 'Map' };

export default async function MapPage() {
  const user = await requireUser();
  const isDM = user.role === 'dm';
  // Load the hexes first: the very first load also resets the party marker for the new layout.
  const hexes = await loadHexes(isDM);
  const [miles, party, clock] = await Promise.all([
    getSetting('hex_miles', String(DEFAULT_HEX_MILES)),
    getSetting('party_hex', ''),
    loadClock(),
  ]);
  return (
    <>
      <h1>Map of {WORLD_NAME}</h1>
      <p className="sub">
        {isDM ? 'Name places, mark Houses, move the party and measure journeys.' : 'Look around Corvane, see where the party is and measure a journey.'}
      </p>
      <HexMap initial={hexes} isDM={isDM} initialMiles={Number(miles) || DEFAULT_HEX_MILES} initialParty={party || null} initialDate={clock.date} initialRoll={clock.roll} />
    </>
  );
}
