import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { CHAPTERS, RULES_INTRO } from '@/lib/rules-data';
import { PLAYER_INTRO, PLAYER_SECTIONS } from '@/lib/player-rules-data';

export const metadata = { title: 'Rules of the Concord' };

function CheatSheet() {
  return (
    <div className="book-page cheat">
      <div className="prose" dangerouslySetInnerHTML={{ __html: PLAYER_INTRO }} />
      <nav className="cheat-jump" aria-label="Sections">
        {PLAYER_SECTIONS.map((s) => (
          <a key={s.n} href={`#s${s.n}`}>{s.title}</a>
        ))}
      </nav>
      {PLAYER_SECTIONS.map((s) => (
        <section key={s.n} id={`s${s.n}`} className="cheat-sec">
          <h2>{s.title}</h2>
          <div className="prose" dangerouslySetInnerHTML={{ __html: s.html }} />
        </section>
      ))}
    </div>
  );
}

function FullBook({ chapterNo }) {
  const idx = CHAPTERS.findIndex((c) => c.n === chapterNo); // -1 = the opening page
  const chapter = idx >= 0 ? CHAPTERS[idx] : null;
  const prev = idx > 0 ? CHAPTERS[idx - 1] : idx === 0 ? { n: 0, title: 'Overview' } : null;
  const next = idx >= 0 ? CHAPTERS[idx + 1] : CHAPTERS[0];
  const href = (c) => (c.n ? `/rules?v=dm&ch=${c.n}` : '/rules?v=dm');
  return (
    <div className="book">
      <nav className="book-page book-toc" aria-label="Contents">
        <h2>Contents</h2>
        <ol>
          <li>
            <Link href="/rules?v=dm" className={!chapter ? 'on' : ''}>Overview</Link>
          </li>
          {CHAPTERS.map((c) => (
            <li key={c.n}>
              <Link href={href(c)} className={chapter?.n === c.n ? 'on' : ''}>
                <span className="num">{c.n}</span> {c.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <article className="book-page book-body">
        {chapter ? (
          <>
            <h2>{chapter.n}. {chapter.title}</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: chapter.html }} />
          </>
        ) : (
          <>
            <h2>Overview</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: RULES_INTRO }} />
          </>
        )}
        <div className="turn">
          {prev ? <Link href={href(prev)}>← {prev.n ? `${prev.n}. ` : ''}{prev.title}</Link> : <span />}
          {next ? <Link href={href(next)}>{next.n}. {next.title} →</Link> : <span />}
        </div>
      </article>
    </div>
  );
}

export default async function RulesPage({ searchParams }) {
  const user = await requireUser();
  const isDM = user.role === 'dm';
  // Players only ever get the cheat sheet; the full book is rendered for the DM alone.
  const showFull = isDM && (searchParams?.v === 'dm' || searchParams?.ch !== undefined);

  return (
    <>
      <h1>Rules of the Concord</h1>
      <p className="sub">
        {showFull ? 'The DM’s full rulebook, in granular detail.' : 'A quick reference for the table.'}
      </p>
      {isDM && (
        <div className="deck-tabs">
          <Link href="/rules" className={`tab btn ${!showFull ? 'on' : ''}`}>Player cheat sheet</Link>
          <Link href="/rules?v=dm" className={`tab btn ${showFull ? 'on' : ''}`}>Full DM rulebook</Link>
        </div>
      )}
      {showFull ? <FullBook chapterNo={Number(searchParams?.ch)} /> : <CheatSheet />}
    </>
  );
}
