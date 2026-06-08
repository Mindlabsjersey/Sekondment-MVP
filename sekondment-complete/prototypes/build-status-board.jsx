import React, { useState } from 'react';

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', MOSSDK = '#143329', SAND = '#c9a86a';
const INK = '#0c1f1a', PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';
const AMBER = '#b8862f', GREEN = '#1f4d3f', GREY = '#9aa39e';

// status: done = real code shipped · proto = clickable prototype, not wired · todo = not started
const S = { done: { l: 'Built (real code)', c: GREEN, bg: 'rgba(31,77,63,.1)', dot: GREEN },
            proto: { l: 'Prototype', c: AMBER, bg: 'rgba(184,134,47,.12)', dot: AMBER },
            todo: { l: 'Not started', c: GREY, bg: 'rgba(154,163,158,.15)', dot: GREY } };

const PHASES = [
  {
    name: 'Phase 0 — Foundations', pct: 100,
    items: [
      ['Database schema (21 tables)', 'done', 'Migrations 0001–0006, all relationships + constraints'],
      ['Row Level Security (36 policies)', 'done', 'Multi-tenant isolation across every table'],
      ['Company Resource / payee model', 'done', 'Baked into engagements: payee_type + split'],
      ['TypeScript types', 'done', 'Mirror the full schema'],
    ],
  },
  {
    name: 'Phase 1 — Identity & Trust', pct: 85,
    items: [
      ['Auth (email + Google + LinkedIn)', 'done', 'Server actions, OAuth callback, middleware'],
      ['Sign-up with role toggle', 'done', 'Business / Expert / (Employer Partner pending UI)'],
      ['Onboarding — business + expert', 'done', 'Profile forms, availability seeding'],
      ['Onboarding — employer partner', 'todo', 'New account type needs its own onboarding'],
      ['Dashboard (role-aware shell)', 'done', 'Gated on profile, Trust Score bar'],
      ['Verification flow (ID / cert / LinkedIn)', 'todo', 'Schema ready; UI + admin review missing'],
      ['Trust Score computation', 'todo', 'Factors table exists; calc engine not built'],
    ],
  },
  {
    name: 'Phase 2 — Marketplace', pct: 60,
    items: [
      ['Expert discovery + search/filters', 'proto', 'Filters, sort, profile drawer — not wired to DB'],
      ['Opportunity creation (outcome-first)', 'proto', '4-step wizard, live preview — not wired'],
      ['Proposals (price + timeline + cover)', 'todo', 'Schema ready; the expert-side flow is next'],
      ['Favourites / shortlists', 'proto', 'Save action in discovery; no persistence'],
      ['Rate types (fixed/hourly/daily/retainer)', 'done', 'In schema; UI surfaces partially'],
    ],
  },
  {
    name: 'Phase 3 — Engagement & Money', pct: 55,
    items: [
      ['Engagement workspace', 'proto', 'Milestones, activity, role views'],
      ['Escrow: fund → submit → release', 'proto', 'Full state machine, ledger — mock, not Stripe'],
      ['Multi-payee split (Company Resource)', 'proto', 'Live split math shown; needs Stripe Transfers'],
      ['Stripe Connect integration', 'todo', 'PaymentIntents, Transfers, webhooks — not built'],
      ['Contracts / engagement agreement', 'todo', 'Scope/deliverables/dates doc generation'],
      ['Internal messaging (realtime)', 'todo', 'Tables + RLS ready; no UI or Realtime wiring'],
    ],
  },
  {
    name: 'Phase 4 — Trust Loop & Partners', pct: 40,
    items: [
      ['Employer Partner dashboard', 'proto', 'Approval queue, commission tracking — not wired'],
      ['Per-employee approval workflow', 'proto', 'Approve/suspend/revoke in UI; schema ready'],
      ['Two-sided reviews', 'todo', 'Schema ready; UI + reputation rollup missing'],
      ['Dispute resolution', 'todo', 'Schema ready; raise/respond/admin-resolve UI missing'],
      ['Admin dashboard', 'todo', 'Users, verification, escrow, disputes, analytics'],
    ],
  },
  {
    name: 'Deferred (post-MVP, agreed)', pct: 0,
    items: [
      ['AI matching / recommendations', 'todo', 'Phase 2+ of roadmap'],
      ['Subscriptions / featured listings', 'todo', 'Secondary revenue'],
      ['Talent pools', 'todo', 'Business Pro feature'],
      ['Native mobile (iOS/Android)', 'todo', 'PWA-first recommended for MVP'],
      ['Video profiles / proposals, white-label', 'todo', 'Future roadmap'],
    ],
  },
];

export default function StatusBoard() {
  const [filter, setFilter] = useState('all');
  const all = PHASES.flatMap(p => p.items);
  const counts = { done: all.filter(i => i[1] === 'done').length, proto: all.filter(i => i[1] === 'proto').length, todo: all.filter(i => i[1] === 'todo').length };
  const total = all.length;
  const overall = Math.round(((counts.done + counts.proto * 0.5) / total) * 100);

  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap');
        @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        *::selection{background:${SAND}55}`}</style>
      <div style={{ position: 'absolute', top: -200, right: -150, width: 540, height: 540, borderRadius: '50%', background: `radial-gradient(circle,rgba(31,77,63,.08),transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px 70px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 26 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: MOSS, position: 'relative' }}><span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>
          <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19 }}>Sekondment</span>
          <span style={{ fontSize: 12.5, color: MUTED, background: PAPER2, padding: '4px 10px', borderRadius: 100 }}>Build status</span>
        </div>

        {/* overall */}
        <div style={{ background: MOSSDK, color: PAPER, borderRadius: 20, padding: '28px 30px', position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,106,.28),transparent 70%)' }} />
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: SAND }}>MVP progress</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
              <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 46, letterSpacing: '-.02em' }}>{overall}%</span>
              <span style={{ fontSize: 14.5, color: 'rgba(246,243,236,.7)' }}>weighted (prototypes count half)</span>
            </div>
            <div style={{ height: 9, borderRadius: 9, background: 'rgba(255,255,255,.14)', overflow: 'hidden', marginTop: 14 }}>
              <div style={{ height: '100%', width: `${overall}%`, background: `linear-gradient(90deg,${MOSS2},${SAND})`, borderRadius: 9 }} />
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 18 }}>
              <Legend dot={GREEN} n={counts.done} label="Built" light />
              <Legend dot={SAND} n={counts.proto} label="Prototype" light />
              <Legend dot={GREY} n={counts.todo} label="To do" light />
            </div>
          </div>
        </div>

        {/* filter */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {[['all', 'All'], ['done', 'Built'], ['proto', 'Prototypes'], ['todo', 'To do']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${filter === v ? MOSS : LINE}`, background: filter === v ? MOSS : '#fff', color: filter === v ? '#fff' : MUTED }}>{l}</button>
          ))}
        </div>

        {/* phases */}
        <div style={{ display: 'grid', gap: 16 }}>
          {PHASES.map((p, pi) => {
            const items = p.items.filter(i => filter === 'all' || i[1] === filter);
            if (items.length === 0) return null;
            return (
              <div key={p.name} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '20px 22px', animation: 'rise .4s ease both', animationDelay: `${pi * 0.05}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17.5, margin: 0 }}>{p.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 90, height: 6, borderRadius: 6, background: PAPER2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct === 0 ? GREY : `linear-gradient(90deg,${MOSS},${SAND})`, borderRadius: 6 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: MUTED, minWidth: 34, textAlign: 'right' }}>{p.pct}%</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map(([name, status, note]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 0', borderTop: `1px solid ${LINE}` }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: S[status].dot, flex: 'none', marginTop: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{name}</div>
                        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{note}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: S[status].c, background: S[status].bg, padding: '3px 9px', borderRadius: 6, flex: 'none', whiteSpace: 'nowrap' }}>{S[status].l}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* what's next */}
        <div style={{ marginTop: 22, background: 'rgba(31,77,63,.05)', border: `1px solid rgba(31,77,63,.22)`, borderRadius: 16, padding: '20px 22px' }}>
          <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16, margin: '0 0 12px', color: MOSS }}>Recommended next 3 builds</h3>
          {[
            ['1. Expert proposal flow', 'Browse opportunities → submit price+timeline+cover → business accepts. Connects discovery to escrow and exercises the proposals table. Completes success-metric steps 2–3.'],
            ['2. Reviews + disputes', 'The trust loop that closes an engagement (success-metric step 7). Schema is ready.'],
            ['3. Stripe Connect (real money)', 'Swap the mock escrow for PaymentIntents + Transfers + webhooks. The single biggest leap from prototype to product.'],
          ].map(([t, d]) => (
            <div key={t} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, n, label, light }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot }} />
    <span style={{ fontSize: 14, fontWeight: 600 }}>{n}</span>
    <span style={{ fontSize: 13, color: light ? 'rgba(246,243,236,.65)' : MUTED }}>{label}</span>
  </div>;
}
