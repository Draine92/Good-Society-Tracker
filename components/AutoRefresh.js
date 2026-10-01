'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Re-fetches server data every few seconds so everyone sees changes live.
// Skips a refresh while someone is typing in a field.
export default function AutoRefresh({ seconds = 8 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const el = document.activeElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
