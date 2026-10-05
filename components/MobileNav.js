'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const MAIN = [
  { href: '/', label: 'Board', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/court', label: 'Court', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z' },
  { href: '/map', label: 'Map', icon: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14' },
  { href: '/calendar', label: 'Calendar', icon: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4' },
  { href: '/rules', label: 'Rules', icon: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM8 20a3 3 0 0 1-3-3' },
];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

// A bottom tab bar for phones. Everything else lives under "More".
export default function MobileNav({ role, name, session, logoutAction }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const more = [
    { href: '/deck', label: 'The Deck' },
    { href: '/rumours', label: 'Rumours' },
    { href: '/npcs', label: 'NPCs' },
    role === 'player' ? { href: '/me', label: 'My character' } : { href: '/dm', label: 'DM tools' },
  ];
  const isOn = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  const moreOn = more.some((m) => isOn(m.href));

  return (
    <>
      {open && (
        <div className="mnav-sheet-wrap" onClick={() => setOpen(false)}>
          <div className="mnav-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="More">
            <p className="mnav-who">{name}{session ? ` · Session ${session}` : ''}</p>
            {more.map((m) => (
              <Link key={m.href} href={m.href} className={isOn(m.href) ? 'on' : ''}>{m.label}</Link>
            ))}
            <form action={logoutAction}><button className="mnav-out" type="submit">Sign out</button></form>
          </div>
        </div>
      )}
      <nav className="mnav" aria-label="Main">
        {MAIN.map((m) => (
          <Link key={m.href} href={m.href} className={isOn(m.href) ? 'on' : ''}>
            <Icon d={m.icon} />
            <span>{m.label}</span>
          </Link>
        ))}
        <button type="button" className={`mnav-more${moreOn || open ? ' on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Icon d="M5 12h.01M12 12h.01M19 12h.01" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
