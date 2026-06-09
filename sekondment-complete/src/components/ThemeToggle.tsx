'use client';

import { useEffect, useState } from 'react';

/**
 * Theme toggle. Reads/writes the `dark` class on <html> and persists the choice
 * in a `theme` cookie. The initial theme (default light) is resolved server-side
 * in the root layout from that cookie, so there is no inline script and no flash.
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
