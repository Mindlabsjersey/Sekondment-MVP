import React, { useState } from 'react';

/* ============================================================================
   SEKONDMENT — current build state (reality check vs planning doc 015).
   Shows what ACTUALLY exists in the codebase today, grouped by area, with the
   doc-vs-reality gaps flagged honestly. Visual summary, not a live backend.
   ========================================================================== */

const BLUE = '#1d4ed8', GOLD = '#c8a24a', INK = '#0f1419', MUTED = '#5b6573';
const LINE = 'rgba(15,20,25,.09)', PAPER = '#f6f7f9', SURF = '#fff', GREEN = '#2f8f6b', AMBER = '#b8862f';

const BUILT = {
  'Marketplace core': ['Opportunities (post/list/detail)', 'Proposals (submit/accept/reject)', 'Expert discovery + filters', 'Saved experts & opportunities', 'Engagements'],
  'Money & escrow': ['Milestone fund/submit/release', 'Ledger (append-only)', 'Company Resource split', 'Configurable commission (15/12.5/10)', 'Reviews (2-sided)', 'Disputes'],
  'Expertise engine': ['Expertise taxonomy (~295 records)', 'Aliases + relationships', 'Declared/verified/proven levels', 'Matching engine (scored + reasons)', 'match_recommendations', 'Expertise upgrade on completion'],
  'Capacity marketplace': ['Capacity profiles', 'Availability + tags', 'Bookings', 'Utilisation tracking', 'Team capability search'],
  'Operations Centre': ['16 dashboards (exec/revenue/payments/…)', 'Liquidity Score', 'Internal roles + RLS', 'Audit logs', 'CRM pipeline + add leads', 'Data exports (CSV)'],
  'Trust & safety': ['Trust Score engine', 'Verification documents', 'Anti-circumvention filter', 'Compliance events', 'Account moderation'],
  'Collaboration': ['Real-time messaging', 'Notifications (bell)', 'Secure file sharing', 'Project boards', 'Deliverable uploads'],
  'Global readiness': ['Country/region/timezone fields', 'Work mode (remote/hybrid/onsite)', 'Multi-currency', 'Jurisdiction notes', '8 industry themes'],
};

const GAPS = [
  { item: 'Live Stripe + Supabase run', kind: 'verify', note: 'built, never run against live infra' },
  { item: 'Dark mode / realtime / uploads / mobile', kind: 'verify', note: 'built, needs clicking through live' },
  { item: 'Board card detail modal', kind: 'minor', note: 'small UI gap' },
  { item: 'Full notification centre page', kind: 'minor', note: 'bell exists, no full page' },
  { item: 'Chat file attachments (in-message)', kind: 'minor', note: 'partial' },
  { item: 'AI Project/Team Builder (full AI)', kind: 'future', note: 'rule-based foundation exists' },
  { item: 'Advisory marketplace', kind: 'future', note: 'planned phase' },
  { item: 'Subscriptions / paid tiers', kind: 'future', note: 'planned phase' },
];

const DOC_WRONG = [
  ['Tables', '25', '51'],
  ['Migrations', '12', '29'],
  ['RLS policies', '~40', '85'],
  ['Expertise engine', 'not built', 'BUILT'],
  ['Matching', 'not built', 'BUILT'],
  ['Capacity marketplace', 'not built', 'BUILT'],
  ['Commission', '8%', '15% (configurable)'],
];

export default function CurrentState() {
  const [tab, setTab] = useState('built');
  const serif = { fontFamily: 'Fraunces, Georgia, serif' };
  return (
    <div style={{ fontFamily: 'Spline Sans, system-ui, sans-serif', color: INK, background: PAPER, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ background: SURF, borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, position: 'relative' }}>
              <span style={{ position: 'absolute', top: 6.5, right: 6.5, width: 7, height: 7, borderRadius: 2, background: GOLD }} />
            </span>
            <span style={{ ...serif, fontWeight: 600, fontSize: 18 }}>Sekondment — current build state</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 10, overflowX: 'auto' }}>
            {[['built', 'What exists'], ['gaps', 'What\'s left'], ['doc', 'Doc 015 check']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 'none', border: 'none', background: tab === k ? BLUE : 'transparent', color: tab === k ? '#fff' : MUTED, padding: '7px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px 50px' }}>
        {tab === 'built' && (
          <div>
            <h1 style={{ ...serif, fontSize: 24, margin: '0 0 2px' }}>What's actually built</h1>
            <p style={{ color: MUTED, fontSize: 14, marginTop: 0 }}>51 tables · 29 migrations · 85 RLS policies · 16 Ops Centre dashboards.</p>
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              {Object.entries(BUILT).map(([area, items]) => (
                <div key={area} style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }}>
                  <h2 style={{ ...serif, fontSize: 16, margin: '0 0 8px' }}>{area}</h2>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {items.map((i) => (
                      <span key={i} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 7, background: GREEN + '12', color: GREEN, border: `1px solid ${GREEN}33` }}>✓ {i}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'gaps' && (
          <div>
            <h1 style={{ ...serif, fontSize: 24, margin: '0 0 2px' }}>What's genuinely left</h1>
            <p style={{ color: MUTED, fontSize: 14, marginTop: 0 }}>Honest list — most is "verify it runs," not "build it."</p>
            <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: 8, marginTop: 14 }}>
              {GAPS.map((g, i) => {
                const c = g.kind === 'verify' ? AMBER : g.kind === 'minor' ? BLUE : MUTED;
                const lbl = g.kind === 'verify' ? 'VERIFY' : g.kind === 'minor' ? 'MINOR' : 'FUTURE';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 8px', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{g.item}</div>
                      <div style={{ fontSize: 11.5, color: MUTED }}>{g.note}</div>
                    </div>
                    <span style={{ flex: 'none', fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: c + '18', color: c }}>{lbl}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>The biggest "gap" isn't building — it's the first live run in Devin to confirm the built features work end-to-end.</p>
          </div>
        )}

        {tab === 'doc' && (
          <div>
            <h1 style={{ ...serif, fontSize: 24, margin: '0 0 2px' }}>Planning doc 015 vs reality</h1>
            <p style={{ color: MUTED, fontSize: 14, marginTop: 0 }}>The doc is a good strategy, but describes a much older build. Don't use its "not built" list as current.</p>
            <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: 0, marginTop: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', fontSize: 11, fontWeight: 700, color: MUTED, padding: '10px 14px', borderBottom: `1px solid ${LINE}`, background: PAPER }}>
                <span>Item</span><span>Doc says</span><span>Reality</span>
              </div>
              {DOC_WRONG.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', fontSize: 13, padding: '10px 14px', borderTop: i ? `1px solid ${LINE}` : 'none', alignItems: 'center' }}>
                  <span>{r[0]}</span>
                  <span style={{ color: MUTED, textDecoration: 'line-through' }}>{r[1]}</span>
                  <span style={{ color: GREEN, fontWeight: 600 }}>{r[2]}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>Keep doc 015's strategy, launch plan and "what not to do". Ignore its build-inventory and "not built yet" sections — they're stale.</p>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 26 }}>Visual summary of the real codebase state. Not a live backend.</p>
      </div>
    </div>
  );
}
