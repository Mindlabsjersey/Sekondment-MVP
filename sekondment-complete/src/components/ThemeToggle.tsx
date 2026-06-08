'use client';

import { useEffect, useState } from 'react';

/**
 * Theme toggle. Reads/writes the `dark` class on <html>. Defaults to the OS
 * preference on first load. We avoid localStorage (not available in some
 * embedded contexts) and instead persist via a cookie the layout can read.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.cookie = `theme=${next ? 'dark' : 'light'};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="w-9 h-9 rounded-xl border flex items-center justify-center text-base hover:bg-paper-2 transition"
      style={{ borderColor: 'var(--line)' }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

/** Inline script string to set the theme class before paint (no flash). */
export const themeInitScript = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    var t = m ? m[1] : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;
