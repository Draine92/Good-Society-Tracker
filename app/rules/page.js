import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { CHAPTERS, RULES_INTRO } from '@/lib/rules-data';

export const metadata = { title: 'Rules of the Concord' };

export default async function RulesPage({ searchParams }) {
  await requireUser();
  const n = Number(searchParams?.ch);
  const idx = CHAPTERS.findIndex((c) => c.n === n); // -1 = the opening page
  const chapter = idx >= 0 ? CHAPTERS[idx] : null;
  const prev = idx > 0 ? CHAPTERS[idx - 1] : idx === 0 ? { n: 0, title: 'Overview' } : null;
  const next = idx >= 0 ? CHAPTERS[idx + 1] : CHAPTERS[0];
  const href = (c) => (c.n ? `/rules?ch=${c.n}` : '/rules');

  return (
    <>
      <h1>Rules of the Concord</h1>
      <p className="sub">The table’s house rules, kept in one book.</p>
      <div className="book">
        <nav className="book-page book-toc" aria-label="Contents">
          <h2>Contents</h2>
          <ol>
            <li>
              <Link href="/rules" className={!chapter ? 'on' : ''}>Overview</Link>
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
    </>
  );
}
