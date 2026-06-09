import React, { useState } from 'react';

/* ============================================================================
   SEKONDMENT — full walkthrough, built on the locked design system.
   Golden-ratio spacing · modular type scale · generous whitespace · crisp menus.
   Fuller journey + quality-gate messaging for unproven experts.
   Visual mockup, demo data — not a live backend.
   ========================================================================== */

const C = { blue: '#1d4ed8', blueDeep: '#1e3a8a', gold: '#c8a24a', bg: '#fff', surface: '#f7f8fa', surface2: '#eef1f5', ink: '#0f1419', muted: '#5b6573', line: 'rgba(15,20,25,.08)', green: '#2f8f6b', red: '#a14b3d', shadow: '0 1px 2px rgba(15,30,60,.05), 0 18px 44px -20px rgba(15,30,60,.20)' };
const S = { xs: 5, sm: 8, md: 13, lg: 21, xl: 34, xxl: 55, xxxl: 89 };
const T = {
  display: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 44, lineHeight: 1.07, letterSpacing: '-0.02em', fontWeight: 600, margin: 0 },
  h1: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 29, lineHeight: 1.15, letterSpacing: '-0.01em', fontWeight: 600, margin: 0 },
  h2: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 21, lineHeight: 1.2, fontWeight: 600, margin: 0 },
  h3: { fontFamily: 'Fraunces, Georgia, serif', fontSize: 16, lineHeight: 1.3, fontWeight: 600, margin: 0 },
  body: { fontFamily: 'Spline Sans, system-ui, sans-serif', fontSize: 15, lineHeight: 1.55 },
  small: { fontSize: 13, lineHeight: 1.5, color: C.muted },
  micro: { fontSize: 11.5, lineHeight: 1.4 },
};
const R = { sm: 8, md: 13, lg: 18, pill: 999 };
const FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap";
const gbp = (n) => '£' + n.toLocaleString();

const card = (pad = S.lg) => ({ background: C.bg, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: pad, boxShadow: C.shadow });
const pill = (color = C.blue) => ({ display: 'inline-block', fontSize: T.micro.fontSize, fontWeight: 600, padding: `${S.xs}px ${S.md}px`, borderRadius: R.pill, background: color + '14', color });
const btn = (v = 'primary') => ({ border: v === 'ghost' ? `1px solid ${C.line}` : 'none', background: v === 'primary' ? C.blue : v === 'gold' ? C.gold : 'transparent', color: v === 'ghost' ? C.ink : '#fff', padding: `${S.md}px ${S.lg}px`, borderRadius: R.md, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: T.body.fontFamily });

const EXPERTS = [
  { id: 'priya', name: 'Priya Nair', headline: 'Fractional payments architect', day: 750, trust: 92, proof: '4 Stripe Connect builds delivered', exp: [['Stripe Connect Implementation', 'proven', 4], ['API Integration', 'verified', 6]] },
  { id: 'david', name: 'David Lewis', headline: 'AML / KYC specialist', day: 580, trust: 81, proof: '11 AML reviews completed', exp: [['AML Review', 'proven', 11], ['KYC Review', 'proven', 8]] },
  { id: 'aisha', name: 'Aisha Brahim', headline: 'Trust & fund administration', day: 650, trust: 88, proof: '6 trust admin engagements', exp: [['Trust Administration', 'proven', 6]] },
];

function buildProject(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('stripe') || t.includes('payment') || t.includes('marketplace')) return { title: 'Implement Stripe Connect for marketplace payments', scope: 'Design and build split payments with escrow-style milestone funding and Connect payouts.', exp: ['Stripe Connect Implementation', 'API Integration'], milestones: ['Discovery & architecture', 'Build & integrate', 'Testing & go-live'], hours: 120, budget: [8000, 15000] };
  if (t.includes('aml') || t.includes('kyc') || t.includes('compliance')) return { title: 'AML / KYC onboarding review & overhaul', scope: 'Review current AML/KYC process, document gaps, implement a compliant onboarding flow.', exp: ['AML Review', 'KYC Review'], milestones: ['Current-state review', 'Gap analysis & design', 'Implementation & handover'], hours: 160, budget: [10000, 20000] };
  return { title: 'Scoped project from your brief', scope: text || 'Describe what you need and we structure it into milestones and a budget.', exp: ['Business Transformation'], milestones: ['Discovery', 'Delivery', 'Handover'], hours: 100, budget: [6000, 12000] };
}

export default function FullWalkthrough() {
  const [role, setRole] = useState(null);
  return (
    <div style={{ fontFamily: T.body.fontFamily, color: C.ink, background: C.surface, minHeight: '100vh' }}>
      <link href={FONTS} rel="stylesheet" />
      {role === null && <Landing onPick={setRole} />}
      {role === 'business' && <BusinessApp onExit={() => setRole(null)} />}
      {role === 'expert' && <ExpertApp onExit={() => setRole(null)} />}
      {role === 'partner' && <PartnerApp onExit={() => setRole(null)} />}
    </div>
  );
}

function Brand({ size = 19 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
      <span style={{ width: 26, height: 26, borderRadius: R.sm, background: C.blue, position: 'relative' }}>
        <span style={{ position: 'absolute', top: 6.5, right: 6.5, width: 7, height: 7, borderRadius: 2, background: C.gold }} />
      </span>
      <span style={{ fontFamily: T.h2.fontFamily, fontWeight: 600, fontSize: size }}>Sekondment</span>
    </div>
  );
}

function Landing({ onPick }) {
  return (
    <div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: `${S.lg}px ${S.lg}px` }}><Brand size={22} /></div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: `${S.xxl}px ${S.lg}px ${S.xl}px`, textAlign: 'center' }}>
        <span style={pill(C.gold)}>Jersey-launched · global from day one</span>
        <h1 style={{ ...T.display, marginTop: S.lg, marginBottom: S.md }}>Deploy expertise,<br />not headcount.</h1>
        <p style={{ ...T.body, fontSize: 17, color: C.muted, maxWidth: 500, margin: `0 auto ${S.xl}px` }}>Scope your project in seconds, find verified expertise, fund it safely, and manage delivery — all in one place. No permanent hiring.</p>
        <div style={{ display: 'flex', gap: S.md, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onPick('business')} style={btn('primary')}>I need expertise →</button>
          <button onClick={() => onPick('expert')} style={btn('ghost')}>I offer expertise</button>
          <button onClick={() => onPick('partner')} style={btn('ghost')}>We have spare capacity</button>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: `${S.xl}px ${S.lg}px`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: S.lg }}>
        {[
          ['✦', 'Scope in seconds', 'Describe your need in plain English — get a structured project, milestones and budget instantly. Useful before you hire anyone.'],
          ['✓', 'Proven, not claimed', 'Expertise is verified by completed work. See exactly who has done this before — and the evidence.'],
          ['🛡', 'Safe by design', 'Milestone funding holds money until you approve the work. Both sides protected, escrow-style.'],
          ['↗', 'Capacity, unlocked', 'Firms deploy spare staff capacity and earn from it. People stay on their own payroll.'],
        ].map(([icon, h, b]) => (
          <div key={h} style={card(S.lg)}>
            <div style={{ fontSize: 22, marginBottom: S.sm }}>{icon}</div>
            <h3 style={{ ...T.h3, marginBottom: S.xs }}>{h}</h3>
            <p style={{ ...T.small, margin: 0 }}>{b}</p>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1000, margin: `0 auto ${S.xxl}px`, padding: `${S.xl}px ${S.lg}px 0` }}>
        <div style={{ ...card(S.xl), textAlign: 'center', background: 'linear-gradient(135deg, rgba(29,78,216,.03), rgba(200,162,74,.04))' }}>
          <p style={{ ...T.h2, marginBottom: S.sm }}>Built for serious work, not gig-economy churn</p>
          <p style={{ ...T.small, maxWidth: 540, margin: '0 auto' }}>Finance, compliance, trust & fund administration, technology, security, marketing and fractional leadership — the kind of expertise where proof and trust matter.</p>
        </div>
      </div>
    </div>
  );
}

function Header({ onExit, label, tabs, tab, setTab }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: `${S.md}px ${S.lg}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand />
        <button onClick={onExit} style={{ border: 'none', background: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}>{label} · Sign out</button>
      </div>
      {tabs && (
        <div style={{ maxWidth: 820, margin: '0 auto', padding: `0 ${S.md}px ${S.sm}px`, display: 'flex', gap: S.xs, overflowX: 'auto' }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 'none', border: 'none', background: tab === k ? C.blue : 'transparent', color: tab === k ? '#fff' : C.muted, padding: `${S.sm}px ${S.md}px`, borderRadius: R.md, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessApp({ onExit }) {
  const [tab, setTab] = useState('build');
  return (
    <div style={{ paddingBottom: S.xxl }}>
      <Header onExit={onExit} label="Lumio SaaS" tabs={[['build', 'New project'], ['matches', 'Matches'], ['active', 'Active']]} tab={tab} setTab={setTab} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: `${S.xl}px ${S.lg}px` }}>
        {tab === 'build' && <ProjectBuilder onPosted={() => setTab('matches')} />}
        {tab === 'matches' && <Matches />}
        {tab === 'active' && <ActiveEngagement />}
      </div>
    </div>
  );
}

function ProjectBuilder({ onPosted }) {
  const [text, setText] = useState('');
  const [proj, setProj] = useState(null);
  return (
    <div style={{ display: 'grid', gap: S.lg }}>
      <div style={{ ...card(S.xl), background: 'linear-gradient(135deg, rgba(29,78,216,.04), rgba(200,162,74,.05))' }}>
        <span style={pill(C.blue)}>✦ Project Builder</span>
        <h1 style={{ ...T.h1, margin: `${S.md}px 0 ${S.xs}px` }}>Describe what you need</h1>
        <p style={{ ...T.small, marginBottom: S.lg }}>Plain English. We structure it into a scoped project with milestones and budget — instantly.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="e.g. We need to add Stripe Connect payments with escrow to our marketplace"
          style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line}`, borderRadius: R.md, padding: S.md, fontSize: 15, fontFamily: T.body.fontFamily, resize: 'vertical', lineHeight: 1.5 }} />
        <button onClick={() => setProj(buildProject(text))} style={{ ...btn('primary'), marginTop: S.md }}>Build my project →</button>
      </div>

      {proj && (
        <div style={card(S.xl)}>
          <span style={{ ...T.micro, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>Suggested project</span>
          <h2 style={{ ...T.h2, margin: `${S.xs}px 0 ${S.md}px` }}>{proj.title}</h2>
          <p style={{ ...T.body, color: C.muted, marginTop: 0, marginBottom: S.lg }}>{proj.scope}</p>
          <div style={{ display: 'flex', gap: S.sm, flexWrap: 'wrap', marginBottom: S.lg }}>
            {proj.exp.map((e) => <span key={e} style={pill(C.blue)}>{e}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.lg, marginBottom: S.lg }}>
            <div><span style={{ ...T.micro, color: C.muted }}>Est. hours</span><p style={{ ...T.h2, margin: 0 }}>{proj.hours}h</p></div>
            <div><span style={{ ...T.micro, color: C.muted }}>Budget range</span><p style={{ ...T.h2, margin: 0 }}>{gbp(proj.budget[0])}–{gbp(proj.budget[1])}</p></div>
          </div>
          <span style={{ ...T.micro, color: C.muted }}>Suggested milestones</span>
          <ol style={{ ...T.body, margin: `${S.sm}px 0 ${S.lg}px`, paddingLeft: S.lg }}>{proj.milestones.map((m, i) => <li key={i} style={{ marginBottom: S.xs }}>{m}</li>)}</ol>
          <button onClick={onPosted} style={{ ...btn('primary'), width: '100%' }}>Post & see matched experts →</button>
        </div>
      )}
    </div>
  );
}

function Matches() {
  return (
    <div>
      <h1 style={{ ...T.h1, marginBottom: S.xs }}>Matched experts</h1>
      <p style={{ ...T.small, marginBottom: S.lg }}>Ranked by proven expertise — with the evidence, so you hire with confidence.</p>
      <div style={{ display: 'grid', gap: S.md }}>
        {EXPERTS.map((e, i) => {
          const score = 96 - i * 7;
          return (
            <div key={e.id} style={card(S.lg)}>
              <div style={{ display: 'flex', gap: S.md }}>
                <div style={{ width: 46, height: 46, flex: 'none', borderRadius: R.pill, background: score >= 80 ? C.blue : C.gold, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.h2.fontFamily, fontWeight: 700, fontSize: 17 }}>{score}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: S.sm }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{e.name}</span>
                    <span style={{ ...T.small, flex: 'none' }}>{gbp(e.day)}/day</span>
                  </div>
                  <p style={{ ...T.small, margin: `2px 0 ${S.sm}px` }}>{e.headline}</p>
                  <div style={{ ...T.micro, color: C.green, display: 'flex', alignItems: 'center', gap: S.xs, marginBottom: S.sm }}>
                    <span style={{ fontWeight: 700 }}>✓ Proven:</span> {e.proof}
                  </div>
                  <div style={{ display: 'flex', gap: S.xs, flexWrap: 'wrap' }}>
                    {e.exp.map((x) => <span key={x[0]} style={{ ...T.micro, padding: `2px ${S.sm}px`, borderRadius: R.sm, border: `1px solid ${(x[1] === 'proven' ? C.gold : C.green)}55`, color: x[1] === 'proven' ? C.gold : C.green }}>{x[0]} · {x[2]}×</span>)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveEngagement() {
  const steps = [['Discovery & architecture', 4000, 'released'], ['Build & integrate', 5000, 'funded'], ['Testing & go-live', 3000, 'pending']];
  const sc = { released: C.green, funded: C.gold, pending: C.muted };
  return (
    <div>
      <h1 style={{ ...T.h1, marginBottom: S.xs }}>Active engagement</h1>
      <p style={{ ...T.small, marginBottom: S.lg }}>Priya Nair · {gbp(12000)} · milestone escrow</p>
      <div style={card(S.lg)}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: S.md, padding: `${S.md}px 0`, borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <span style={{ width: 26, height: 26, flex: 'none', borderRadius: R.pill, border: `2px solid ${sc[s[2]]}`, color: sc[s[2]], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{s[2] === 'released' ? '✓' : i + 1}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 14 }}>{s[0]}</div><div style={{ ...T.micro, color: sc[s[2]], textTransform: 'capitalize' }}>{s[2]}</div></div>
            <span style={{ fontFamily: T.h2.fontFamily, fontSize: 15 }}>{gbp(s[1])}</span>
            {s[2] === 'funded' && <button style={{ ...btn('primary'), padding: `${S.sm}px ${S.md}px`, fontSize: 13 }}>Release</button>}
          </div>
        ))}
        <div style={{ marginTop: S.md, padding: S.md, background: C.surface, borderRadius: R.md, ...T.micro, color: C.muted }}>Escrow-style: funds held until you approve each milestone.</div>
      </div>
    </div>
  );
}

function ExpertApp({ onExit }) {
  return (
    <div style={{ paddingBottom: S.xxl }}>
      <Header onExit={onExit} label="Priya Nair" />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: `${S.xl}px ${S.lg}px` }}>
        <h1 style={{ ...T.h1, marginBottom: S.xs }}>Welcome back, Priya</h1>
        <p style={{ ...T.small, marginBottom: S.lg }}>Work matched to your proven expertise, and your earnings.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: S.md, marginBottom: S.xl }}>
          {[['Released', gbp(3400), C.green], ['In escrow', gbp(4250), C.ink], ['Trust Score', '92', C.blue]].map(([l, v, c]) => (
            <div key={l} style={card(S.md)}><div style={{ ...T.micro, color: C.muted }}>{l}</div><div style={{ fontFamily: T.h2.fontFamily, fontSize: 23, color: c }}>{v}</div></div>
          ))}
        </div>
        <div style={{ ...card(S.lg), borderColor: C.gold, marginBottom: S.xl }}>
          <h3 style={{ ...T.h3, marginBottom: S.xs }}>Why proof matters here</h3>
          <p style={{ ...T.small, margin: 0 }}>Sekondment ranks by <strong style={{ color: C.ink }}>proven</strong> expertise — verified by completed work. New experts start as “declared”, become “verified” with evidence, and “proven” once they deliver. This isn’t a place to pad a CV; it’s where real track record wins the work and the higher rates.</p>
        </div>
        <h2 style={{ ...T.h2, marginBottom: S.md }}>Matched to your proven expertise</h2>
        <div style={{ display: 'grid', gap: S.md }}>
          {[['Marketplace payments build · Fintech', 96, gbp(12000)], ['API integration · SaaS', 84, gbp(8000)]].map(([t, s, v], i) => (
            <div key={i} style={card(S.lg)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: S.sm }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t}</span>
                <span style={{ ...T.micro, fontWeight: 700, color: C.blue }}>{s}% match</span>
              </div>
              <div style={{ ...T.micro, color: C.muted, marginTop: S.xs }}>Budget {v} · remote</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerApp({ onExit }) {
  return (
    <div style={{ paddingBottom: S.xxl }}>
      <Header onExit={onExit} label="Meridian Trust" />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: `${S.xl}px ${S.lg}px` }}>
        <h1 style={{ ...T.h1, marginBottom: S.xs }}>Turn spare capacity into revenue</h1>
        <p style={{ ...T.small, marginBottom: S.lg }}>Deploy your team’s spare hours. They stay on your payroll; you earn; they get an optional bonus.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: S.md, marginBottom: S.xl }}>
          {[['Partner earnings', gbp(7650), C.green], ['Employee bonuses', gbp(850), C.gold], ['People deployed', '3', C.ink], ['Utilisation', '64%', C.ink]].map(([l, v, c]) => (
            <div key={l} style={card(S.md)}><div style={{ ...T.micro, color: C.muted }}>{l}</div><div style={{ fontFamily: T.h2.fontFamily, fontSize: 23, color: c }}>{v}</div></div>
          ))}
        </div>
        <h2 style={{ ...T.h2, marginBottom: S.md }}>Your deployed people</h2>
        <div style={card(S.lg)}>
          {[['Aisha Brahim', 'Trust admin support', gbp(3825), gbp(425)], ['James Okoro', 'Fund admin overflow', gbp(3825), gbp(425)]].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${S.md}px 0`, borderTop: i ? `1px solid ${C.line}` : 'none' }}>
              <div><div style={{ fontWeight: 600, fontSize: 15 }}>{r[0]}</div><div style={{ ...T.micro, color: C.muted }}>{r[1]}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ ...T.micro, color: C.green }}>you {r[2]}</div><div style={{ ...T.micro, color: C.gold }}>+ bonus {r[3]}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
