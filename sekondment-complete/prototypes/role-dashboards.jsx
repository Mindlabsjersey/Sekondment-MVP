import React, { useState } from 'react';

/* ============================================================================
   SEKONDMENT — role dashboards + commission control (visual prototype, demo data).
   Shows: Business / Expert / Employer-Partner dashboards (each role-specific),
   and the Owner commission control. Mockup, not a live backend.
   Brand: royal blue #1d4ed8 + gold #c8a24a, Fraunces.
   ========================================================================== */

const BLUE = '#1d4ed8', GOLD = '#c8a24a', INK = '#0f1419', MUTED = '#5b6573';
const LINE = 'rgba(15,20,25,.09)', PAPER = '#f6f7f9', SURF = '#fff', GREEN = '#2f8f6b';

const gbp = (n) => '£' + n.toLocaleString();

export default function RoleDashboards() {
  const [role, setRole] = useState('business');
  const serif = { fontFamily: 'Fraunces, Georgia, serif' };
  const roles = [['business', 'Business'], ['expert', 'Expert'], ['partner', 'Employer Partner'], ['owner', 'Owner · Commission']];

  return (
    <div style={{ fontFamily: 'Spline Sans, system-ui, sans-serif', color: INK, background: PAPER, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ background: SURF, borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 6.5, right: 6.5, width: 7, height: 7, borderRadius: 2, background: GOLD }} />
          </span>
          <span style={{ ...serif, fontWeight: 600, fontSize: 18 }}>Sekondment</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>dashboard view</span>
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 10px 8px', display: 'flex', gap: 3, overflowX: 'auto' }}>
          {roles.map(([k, l]) => (
            <button key={k} onClick={() => setRole(k)} style={{ flex: 'none', border: 'none', background: role === k ? BLUE : 'transparent', color: role === k ? '#fff' : MUTED, padding: '7px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 50px' }}>
        {role === 'business' && <Business serif={serif} />}
        {role === 'expert' && <Expert serif={serif} />}
        {role === 'partner' && <Partner serif={serif} />}
        {role === 'owner' && <Owner serif={serif} />}
        <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 26 }}>Visual prototype — each role sees only what's relevant. Mockup, not a live backend.</p>
      </div>
    </div>
  );
}

const card = { background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 };
function Stat({ serif, label, value, sub, accent }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11.5, color: MUTED }}>{label}</div>
      <div style={{ ...serif, fontSize: 24, color: accent || INK }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Section({ serif, title, sub, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{ ...serif, fontSize: 17, margin: '0 0 2px' }}>{title}</h2>
      {sub && <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 10px' }}>{sub}</p>}
      {children}
    </div>
  );
}
function Row({ left, right, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '11px 0', borderTop: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 14, minWidth: 0 }}>{left}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || MUTED, flex: 'none' }}>{right}</span>
    </div>
  );
}

// ── BUSINESS: what they posted, proposals in, active work, spend ─────────────
function Business({ serif }) {
  return (
    <div>
      <h1 style={{ ...serif, fontSize: 26, margin: '0 0 2px' }}>Welcome back, Lumio SaaS</h1>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>Your opportunities, proposals and active engagements.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginTop: 14 }}>
        <Stat serif={serif} label="Open opportunities" value="2" />
        <Stat serif={serif} label="New proposals" value="5" accent={BLUE} sub="3 need review" />
        <Stat serif={serif} label="Active engagements" value="1" />
        <Stat serif={serif} label="Total spend" value={gbp(9000)} sub="across all projects" />
      </div>
      <Section serif={serif} title="Proposals to review" sub="experts who applied to your opportunities">
        <div style={card}>
          <Row left="Priya Nair · Stripe Connect build" right="92 match" color={BLUE} />
          <Row left="David Lewis · AML overhaul" right="88 match" color={BLUE} />
          <Row left="Maria Santos · M365 migration" right="71 match" color={GOLD} />
        </div>
      </Section>
      <Section serif={serif} title="Active engagement" sub="work underway">
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Stripe Connect implementation</span><span style={{ ...serif }}>{gbp(12000)}</span></div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Priya Nair · milestone 2 of 3 · {gbp(5000)} in escrow</div>
          <div style={{ height: 8, background: PAPER, borderRadius: 5, marginTop: 10 }}><div style={{ width: '55%', height: '100%', borderRadius: 5, background: BLUE }} /></div>
        </div>
      </Section>
    </div>
  );
}

// ── EXPERT: matched work, proposals out, earnings, expertise ─────────────────
function Expert({ serif }) {
  return (
    <div>
      <h1 style={{ ...serif, fontSize: 26, margin: '0 0 2px' }}>Welcome back, Priya</h1>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>Matched opportunities, your proposals and earnings.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginTop: 14 }}>
        <Stat serif={serif} label="Earnings (released)" value={gbp(3400)} accent={GREEN} />
        <Stat serif={serif} label="In escrow" value={gbp(4250)} sub="milestone 2 funded" />
        <Stat serif={serif} label="Active engagements" value="1" />
        <Stat serif={serif} label="Trust Score" value="92" accent={BLUE} />
      </div>
      <Section serif={serif} title="Matched to you" sub="opportunities fitting your proven expertise">
        <div style={card}>
          <Row left="Marketplace payments build · Fintech" right="96 match" color={BLUE} />
          <Row left="API integration · SaaS scale-up" right="84 match" color={BLUE} />
          <Row left="Stripe migration · Marketplace" right="80 match" color={GOLD} />
        </div>
      </Section>
      <Section serif={serif} title="Your expertise" sub="proven expertise wins more work">
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Stripe Connect Implementation', 'proven'], ['API Integration', 'verified'], ['Cloud Architecture', 'declared']].map(([n, lvl]) => (
            <span key={n} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: `1px solid ${(lvl === 'proven' ? GOLD : lvl === 'verified' ? GREEN : MUTED)}55`, color: lvl === 'proven' ? GOLD : lvl === 'verified' ? GREEN : MUTED }}>{n} · {lvl}</span>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── EMPLOYER PARTNER: deployed people, capacity, earnings, bonus splits ──────
function Partner({ serif }) {
  return (
    <div>
      <h1 style={{ ...serif, fontSize: 26, margin: '0 0 2px' }}>Welcome back, Meridian Trust</h1>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>Your deployed people, capacity and partner earnings.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginTop: 14 }}>
        <Stat serif={serif} label="Partner earnings" value={gbp(7650)} accent={GREEN} sub="paid to company" />
        <Stat serif={serif} label="Employee bonuses" value={gbp(850)} accent={GOLD} sub="optional split paid" />
        <Stat serif={serif} label="People deployed" value="3" />
        <Stat serif={serif} label="Capacity listed" value="2" sub="profiles public" />
      </div>
      <Section serif={serif} title="Deployed people" sub="your staff on active engagements — they stay on your payroll">
        <div style={card}>
          <Row left="Aisha Brahim · Trust admin support" right={gbp(3825) + ' + ' + gbp(425)} color={GREEN} />
          <Row left="James Okoro · Fund admin overflow" right={gbp(3825) + ' + ' + gbp(425)} color={GREEN} />
        </div>
      </Section>
      <Section serif={serif} title="How the split works" sub="the Company Resource model">
        <div style={{ ...card, fontSize: 13, color: MUTED }}>
          You receive the payment; your employee stays on payroll and gets an optional bonus split. The platform fee comes off first, then the remainder splits between you (bulk) and the individual (bonus).
        </div>
      </Section>
    </div>
  );
}

// ── OWNER: commission control ────────────────────────────────────────────────
function Owner({ serif }) {
  const [site, setSite] = useState(15);
  const [overrides, setOverrides] = useState({ 'Northbank Capital': 10, 'Lumio SaaS': null, 'Meridian Trust': 12.5 });
  return (
    <div>
      <h1 style={{ ...serif, fontSize: 26, margin: '0 0 2px' }}>Commission control</h1>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>Set the platform fee site-wide, or override per company. Rates lock onto each engagement at start.</p>
      <Section serif={serif} title="Site-wide default" sub={`currently ${site}% — applies to all new engagements without an override`}>
        <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[15, 12.5, 10].map((p) => (
            <button key={p} onClick={() => setSite(p)} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: site === p ? 'none' : `1px solid ${LINE}`, background: site === p ? BLUE : SURF, color: site === p ? '#fff' : INK }}>{p}%</button>
          ))}
          <span style={{ fontSize: 11.5, color: MUTED, marginLeft: 4 }}>12.5% standard reduction · 10% rare high-value</span>
        </div>
      </Section>
      <Section serif={serif} title="Per-company overrides" sub="custom rate for specific clients; blank = site default">
        <div style={card}>
          {Object.entries(overrides).map(([co, val], i) => (
            <div key={co} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
              <span style={{ fontSize: 14, flex: 1 }}>{co}</span>
              <span style={{ fontSize: 11, color: MUTED }}>default {site}%</span>
              {[10, 12.5, 15, null].map((opt) => (
                <button key={String(opt)} onClick={() => setOverrides((o) => ({ ...o, [co]: opt }))} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: val === opt ? 'none' : `1px solid ${LINE}`, background: val === opt ? GOLD : SURF, color: val === opt ? '#fff' : MUTED }}>{opt == null ? '—' : opt + '%'}</button>
              ))}
            </div>
          ))}
        </div>
      </Section>
      <Section serif={serif} title="How the fee works">
        <div style={{ ...card, fontSize: 13, color: MUTED }}>
          The fee is taken off the top of each milestone — that's your revenue, <strong style={{ color: INK }}>not split with anyone</strong>. The remainder goes to the expert, or (Company Resource) splits between employer and employee. Changing a rate only affects new engagements; live deals keep their locked rate.
        </div>
      </Section>
    </div>
  );
}
