/* ============================================================================
   SEKONDMENT — DESIGN SYSTEM (single source of truth for prototypes)
   Golden-ratio spacing (φ≈1.618), modular type scale, generous breathing room.
   Import these tokens/primitives so every screen is consistent and never
   re-eyeballed. Mirrors the real app's CSS variables.
   ========================================================================== */

export const C = {
  blue: '#1d4ed8', blueBright: '#2563eb', blueDeep: '#1e3a8a',
  gold: '#c8a24a', goldBright: '#e0b454',
  bg: '#ffffff', surface: '#f7f8fa', surface2: '#eef1f5',
  ink: '#0f1419', muted: '#5b6573', line: 'rgba(15,20,25,.08)',
  green: '#2f8f6b', red: '#a14b3d',
  shadow: '0 1px 2px rgba(15,30,60,.05), 0 18px 44px -20px rgba(15,30,60,.20)',
};

// Golden-ratio spacing scale (base 8, ×1.618). Use these, never arbitrary px.
export const S = { xs: 5, sm: 8, md: 13, lg: 21, xl: 34, xxl: 55, xxxl: 89 };

// Modular type scale (1.25 / major third), Fraunces for display, Spline for body.
export const T = {
  display: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 42, lineHeight: 1.08, letterSpacing: '-0.02em', fontWeight: 600 },
  h1: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.01em', fontWeight: 600 },
  h2: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, lineHeight: 1.2, fontWeight: 600 },
  h3: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 17, lineHeight: 1.3, fontWeight: 600 },
  body: { fontFamily: 'Spline Sans, system-ui, sans-serif', fontSize: 15, lineHeight: 1.55 },
  small: { fontFamily: 'Spline Sans, system-ui, sans-serif', fontSize: 13, lineHeight: 1.5 },
  micro: { fontFamily: 'Spline Sans, system-ui, sans-serif', fontSize: 11.5, lineHeight: 1.4 },
};

export const RADIUS = { sm: 8, md: 13, lg: 18, pill: 999 };

// Shared primitives ---------------------------------------------------------
export const page = { fontFamily: T.body.fontFamily, color: C.ink, background: C.surface, minHeight: '100vh' };
export const container = (max = 880) => ({ maxWidth: max, margin: '0 auto', padding: `0 ${S.lg}px` });

export const card = (pad = S.lg) => ({
  background: C.bg, border: `1px solid ${C.line}`, borderRadius: RADIUS.lg,
  padding: pad, boxShadow: C.shadow,
});

export const pill = (color = C.blue) => ({
  display: 'inline-block', fontSize: T.micro.fontSize, fontWeight: 600,
  padding: `${S.xs}px ${S.md}px`, borderRadius: RADIUS.pill,
  background: color + '14', color,
});

export const btn = (variant: 'primary' | 'ghost' | 'gold' = 'primary') => ({
  border: variant === 'ghost' ? `1px solid ${C.line}` : 'none',
  background: variant === 'primary' ? C.blue : variant === 'gold' ? C.gold : 'transparent',
  color: variant === 'ghost' ? C.ink : '#fff',
  padding: `${S.md}px ${S.lg}px`, borderRadius: RADIUS.md,
  fontSize: T.body.fontSize, fontWeight: 500, cursor: 'pointer',
  fontFamily: T.body.fontFamily,
});

export const fontsLink = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap";
