'use client';

import { useEffect, useState } from 'react';

const KEY = 'gs_theme';

function effectiveDark() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'dark') return true;
  if (set === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// A candle that switches the site between light and dark. Lit candle = dark mode (candlelight).
// The choice is remembered in this browser only; until someone clicks, the site follows their device setting.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(effectiveDark());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(effectiveDark());
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  function toggle() {
    const next = effectiveDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setDark(next === 'dark');
  }

  const label = dark ? 'Snuff the candle for light mode' : 'Light the candle for dark mode';
  return (
    <button type="button" className="candle-btn" onClick={toggle} aria-pressed={dark} aria-label={label} title={label}>
      <svg viewBox="0 0 22 30" aria-hidden="true">
        {dark ? (
          <>
            <circle className="glow" cx="11" cy="9" r="9" />
            <path className="flame" d="M11 1.5c3 3.2 4.4 5.6 4.4 8a4.4 4.4 0 0 1-8.8 0c0-2.4 1.4-4.8 4.4-8z" />
            <path className="flame-core" d="M11 6c1.4 1.6 2 2.8 2 4a2 2 0 0 1-4 0c0-1.2.6-2.4 2-4z" />
          </>
        ) : (
          <path className="smoke" d="M11 11c-2-1.6 2-3 0-5s2-3 0-4.5" />
        )}
        <line className="wick" x1="11" y1="11" x2="11" y2="14.5" />
        <path className="wax" d="M6 14.5h10V27a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" />
      </svg>
    </button>
  );
}
