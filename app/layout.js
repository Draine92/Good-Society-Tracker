import './globals.css';
import Link from 'next/link';
import { getUser, userCount } from '@/lib/auth';
import { logout } from './actions';
import AutoRefresh from '@/components/AutoRefresh';
import { currentSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Good Society Tracker',
  description: 'Shared board for our Good Society x D&D campaign',
};

export default async function RootLayout({ children }) {
  let user = null;
  let session = null;
  let error = null;
  try {
    user = await getUser();
    if (user) session = await currentSession();
  } catch (e) {
    error = e.message;
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Source+Sans+3:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="top">
          <div className="brand">
            <span className="crest">❦</span> Good Society Tracker
          </div>
          {user && (
            <nav>
              <Link href="/">Notice board</Link>
              <Link href="/court">The Court</Link>
              <Link href="/map">Map</Link>
              <Link href="/rules">Rules</Link>
              <Link href="/deck">Deck</Link>
              <Link href="/rumours">Rumours</Link>
              <Link href="/npcs">NPCs</Link>
              {user.role === 'player' && <Link href="/me">My character</Link>}
              {user.role === 'dm' && <Link href="/dm">DM</Link>}
              <span className="who">
                {user.display_name}
                {session ? ` · Session ${session}` : ''}
              </span>
              <form action={logout}>
                <button className="link" type="submit">Sign out</button>
              </form>
            </nav>
          )}
        </header>
        <main>
          {error ? (
            <div className="flash err">
              The app couldn’t reach its database: {error}. Check the DATABASE_URL setting.
            </div>
          ) : (
            children
          )}
        </main>
        {user && <AutoRefresh seconds={8} />}
      </body>
    </html>
  );
}
