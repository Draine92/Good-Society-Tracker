import './globals.css';
import Link from 'next/link';
import { getUser, userCount } from '@/lib/auth';
import { logout } from './actions';
import AutoRefresh from '@/components/AutoRefresh';
import ThemeToggle from '@/components/ThemeToggle';
import { SITE_NAME } from '@/lib/world';
import CelticKnot from '@/components/CelticKnot';
import { currentSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: SITE_NAME,
  description: 'The shared notice board for our Corvane campaign: rumours, the court, the rules and the deck.',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('gs_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="top">
          <div className="brand">
            <span className="crest"><CelticKnot size={28} gap="var(--top-gap)" /></span> {SITE_NAME}
          </div>
          <div className="top-right">
          {user && (
            <nav>
              <Link href="/">Notice board</Link>
              <Link href="/court">The Court</Link>
              <Link href="/map">Map</Link>
              <Link href="/calendar">Calendar</Link>
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
          <ThemeToggle />
          </div>
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
