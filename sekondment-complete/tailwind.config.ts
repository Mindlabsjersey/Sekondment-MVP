import type { Config } from 'tailwindcss';

/**
 * Colours are driven by CSS variables (see globals.css) so the same class names
 * (bg-paper, text-ink, bg-moss…) work in both light and dark mode. Legacy names
 * kept as semantic aliases to avoid rewriting every component:
 *   paper -> app background   ink -> primary text   paper2 -> raised surface
 *   muted -> secondary text   moss -> royal blue     sand -> gold accent
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--c-text)',
        paper: { DEFAULT: 'var(--c-bg)', 2: 'var(--c-surface2)' },
        surface: 'var(--c-surface)',
        moss: { DEFAULT: 'var(--c-blue)', 2: 'var(--c-blue-bright)', dk: 'var(--c-blue-deep)' },
        sand: { DEFAULT: 'var(--c-gold)', bright: 'var(--c-gold-bright)' },
        muted: 'var(--c-muted)',
        industry: 'var(--c-industry, var(--c-blue))',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Spline Sans', 'system-ui', 'sans-serif'],
      },
      borderColor: { DEFAULT: 'var(--line)' },
      boxShadow: { soft: 'var(--shadow-soft)' },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};

export default config;
