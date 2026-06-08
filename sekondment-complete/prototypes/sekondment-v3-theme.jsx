import React, { useState, useMemo, createContext, useContext } from 'react';

/* ============================================================================
   SEKONDMENT v3 — Design system preview
   Royal blue + gold brand · Apple-style light/dark · per-industry accent themes.
   "Fiverr, but professional." Mobile-first.
   ========================================================================== */

// ---- THEME TOKENS ----------------------------------------------------------
const THEMES = {
  light: {
    bg: '#ffffff', surface: '#f7f8fa', surface2: '#eef1f5', text: '#0f1419',
    muted: '#5b6573', line: 'rgba(15,20,25,.10)', line2: 'rgba(15,20,25,.06)',
    shadow: '0 14px 40px -18px rgba(15,30,60,.28)',
  },
  dark: {
    bg: '#0f1115', surface: '#1a1d24', surface2: '#22262f', text: '#f2f4f8',
    muted: '#9aa4b2', line: 'rgba(255,255,255,.10)', line2: 'rgba(255,255,255,.05)',
    shadow: '0 16px 44px -16px rgba(0,0,0,.6)',
  },
};
const BLUE = '#1d4ed8', BLUE_DEEP = '#1e3a8a', BLUE_BRIGHT = '#2563eb';
const GOLD = '#c8a24a', GOLD_BRIGHT = '#e0b454';

// Industry accents — desaturated siblings, each with light & dark tint backgrounds.
const INDUSTRIES = {
  Technology: { c: '#4f6bed', tintL: '#eef1fe', tintD: '#191f33' },
  Finance: { c: '#2f8f6b', tintL: '#e9f5f0', tintD: '#15241f' },
  Marketing: { c: '#c2557a', tintL: '#fbecf1', tintD: '#2b1a21' },
  Legal: { c: '#7c5cc4', tintL: '#f1ecfa', tintD: '#221b30' },
  Creative: { c: '#c08a3e', tintL: '#f8f0e4', tintD: '#2a2118' },
  Operations: { c: '#2e8aa0', tintL: '#e8f4f7', tintD: '#152528' },
  Healthcare: { c: '#c75f52', tintL: '#fbeeec', tintD: '#2b1b18' },
  People: { c: '#5a7a9e', tintL: '#eef2f7', tintD: '#1a2129' },
};
const industryOf = (name) => INDUSTRIES[name] || { c: BLUE, tintL: '#eef1fe', tintD: '#191f33' };

const Ctx = createContext(null);
const useT = () => useContext(Ctx);

// ---- DATA ------------------------------------------------------------------
const EXPERTS = [
  { id: 1, name: 'Eleanor Voss', headline: 'Fractional Marketing Director', industry: 'Marketing', skills: ['Brand', 'Demand Gen'], rate: 850, trust: 94, verified: true },
  { id: 2, name: 'Marcus Chen', headline: 'Interim CFO & Finance Advisor', industry: 'Finance', skills: ['Fundraising', 'FP&A'], rate: 1100, trust: 91, verified: true },
  { id: 3, name: 'Priya Anand', headline: 'Senior Product Designer', industry: 'Creative', skills: ['UX', 'Design Systems'], rate: 640, trust: 88, verified: true },
  { id: 4, name: 'James Okafor', headline: 'Cloud Solutions Architect', industry: 'Technology', skills: ['AWS', 'Platform'], rate: 980, trust: 86, verified: false },
  { id: 5, name: 'Sofia Ricci', headline: 'Commercial Counsel', industry: 'Legal', skills: ['Contracts', 'IP'], rate: 920, trust: 90, verified: true },
  { id: 6, name: 'Tom Hale', headline: 'Operations Transformation Lead', industry: 'Operations', skills: ['Lean', 'Supply Chain'], rate: 870, trust: 84, verified: true },
];
const OPPS = [
  { id: 1, title: 'Fractional CMO for Q3 launch', industry: 'Marketing', budget: '£6k–£9k', mode: 'Remote', skills: ['Brand', 'GTM'] },
  { id: 2, title: 'Interim finance lead, fundraise', industry: 'Finance', budget: '£8k–£12k', mode: 'Hybrid', skills: ['Fundraising'] },
  { id: 3, title: 'Design system overhaul', industry: 'Creative', budget: '£5k–£7k', mode: 'Remote', skills: ['UX', 'Figma'] },
  { id: 4, title: 'Cloud migration architecture', industry: 'Technology', budget: '£10k–£15k', mode: 'Remote', skills: ['AWS'] },
];

export default function App() {
  const [mode, setMode] = useState('light');
  const t = THEMES[mode];
  return <Ctx.Provider value={{ t, mode, setMode }}><Shell /></Ctx.Provider>;
}

function Shell() {
  const { t } = useT();
  const [route, setRoute] = useState({ name: 'home' });
  const go = (name, p = {}) => setRoute({ name, ...p });
  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100vh', fontFamily: 'Spline Sans,system-ui,sans-serif', transition: 'background .3s,color .3s' }}>
      <Fonts />
      <TopBar go={go} />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px 120px' }}>
        {route.name === 'home' && <Home go={go} />}
        {route.name === 'experts' && <Experts go={go} />}
        {route.name === 'expert' && <ExpertDetail id={route.id} go={go} />}
        {route.name === 'opps' && <Opps go={go} />}
        {route.name === 'opp' && <OppDetail id={route.id} go={go} />}
      </div>
    </div>
  );
}

function TopBar({ go }) {
  const { t, mode, setMode } = useT();
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 40, background: mode === 'light' ? 'rgba(255,255,255,.82)' : 'rgba(15,17,21,.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.line}` }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', height: 58, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => go('home')} style={{ cursor: 'pointer', flex: 'none' }}><Logo /></div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', flex: 1 }}>
          <Nav onClick={() => go('experts')}>Experts</Nav>
          <Nav onClick={() => go('opps')}>Opportunities</Nav>
        </div>
        <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')} aria-label="toggle theme"
          style={{ flex: 'none', width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.line}`, background: t.surface, color: t.text, cursor: 'pointer', fontSize: 16 }}>
          {mode === 'light' ? '🌙' : '☀️'}
        </button>
        <button style={{ flex: 'none', ...btn(BLUE, '#fff'), padding: '9px 14px' }}>Sign up</button>
      </div>
    </div>
  );
}

/* ---------------- HOME ---------------- */
function Home({ go }) {
  const { t } = useT();
  return (
    <div style={{ paddingTop: 32 }}>
      <Glow />
      <span style={pill(t)}>● Trusted expertise marketplace</span>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 'clamp(34px,8vw,56px)', lineHeight: 1.05, letterSpacing: '-.03em', margin: '18px 0 0' }}>
        Hire expertise the <span style={{ color: BLUE }}>professional</span> way.
      </h1>
      <p style={{ fontSize: 17, color: t.muted, margin: '18px 0 26px', lineHeight: 1.55, maxWidth: '52ch' }}>
        Engage verified experts and company resources through secure, milestone-based work — with the polish your business expects.
      </p>
      <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
        <button onClick={() => go('experts')} style={{ ...btn(BLUE, '#fff'), flex: '1 1 auto' }}>Browse experts →</button>
        <button onClick={() => go('opps')} style={{ ...btnOutline(t), flex: '1 1 auto' }}>See opportunities</button>
      </div>

      {/* gold accent strip */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 13, background: `linear-gradient(90deg,${GOLD}22,transparent)`, border: `1px solid ${GOLD}55` }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <span style={{ fontSize: 13.5, color: t.text }}><b>Milestone escrow + Trust Score</b> on every engagement. Gold-standard protection for both sides.</span>
      </div>

      <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 20, margin: '36px 0 14px' }}>Browse by industry</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 11 }}>
        {Object.keys(INDUSTRIES).map(name => {
          const ind = industryOf(name);
          return <div key={name} onClick={() => go('experts')} style={{ cursor: 'pointer', borderRadius: 14, padding: '16px 16px', background: t.surface, border: `1px solid ${t.line}`, borderLeft: `3px solid ${ind.c}`, transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: ind.c, marginBottom: 10 }} />
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{name}</div>
            <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>View experts →</div>
          </div>;
        })}
      </div>
    </div>
  );
}

/* ---------------- EXPERTS ---------------- */
function Experts({ go }) {
  const { t } = useT();
  const [filter, setFilter] = useState('All');
  const list = filter === 'All' ? EXPERTS : EXPERTS.filter(e => e.industry === filter);
  return (
    <div style={{ paddingTop: 26 }}>
      <H1>Find expertise</H1>
      <Sub>Verified experts and company resources, by industry.</Sub>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 14px' }}>
        {['All', ...Object.keys(INDUSTRIES)].map(f => {
          const active = filter === f; const ind = industryOf(f);
          const col = f === 'All' ? BLUE : ind.c;
          return <button key={f} onClick={() => setFilter(f)} style={{ flex: 'none', padding: '8px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', border: `1px solid ${active ? col : t.line}`, background: active ? col : t.surface, color: active ? '#fff' : t.muted }}>{f}</button>;
        })}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {list.map(e => <ExpertCard key={e.id} e={e} onClick={() => go('expert', { id: e.id })} />)}
      </div>
    </div>
  );
}

function ExpertCard({ e, onClick }) {
  const { t, mode } = useT();
  const ind = industryOf(e.industry);
  const tint = mode === 'light' ? ind.tintL : ind.tintD;
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', borderRadius: 16, background: t.surface, border: `1px solid ${t.line}`, borderLeft: `4px solid ${ind.c}`, overflow: 'hidden', transition: 'transform .15s,box-shadow .2s' }}
      onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = t.shadow; }}
      onMouseLeave={ev => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar name={e.name} c={ind.c} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16 }}>{e.name}</span>
            {e.verified && <Verified />}
          </div>
          <div style={{ color: t.muted, fontSize: 13, margin: '2px 0 8px' }}>{e.headline}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: ind.c, background: tint, padding: '3px 9px', borderRadius: 6 }}>{e.industry}</span>
            {e.skills.map(s => <Tag key={s}>{s}</Tag>)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <TrustRing v={e.trust} c={ind.c} />
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>£{e.rate}<span style={{ fontSize: 10.5, color: t.muted, fontWeight: 400 }}>/day</span></div>
        </div>
      </div>
    </div>
  );
}

function ExpertDetail({ id, go }) {
  const { t, mode } = useT();
  const e = EXPERTS.find(x => x.id === id); if (!e) return null;
  const ind = industryOf(e.industry);
  const tint = mode === 'light' ? ind.tintL : ind.tintD;
  return (
    <div style={{ paddingTop: 18 }}>
      <Back go={go} to="experts">Back to experts</Back>
      {/* industry-tinted profile header */}
      <div style={{ marginTop: 14, borderRadius: 18, padding: 22, background: tint, border: `1px solid ${ind.c}33`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle,${ind.c}33,transparent 70%)` }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
          <Avatar name={e.name} c={ind.c} size={64} />
          <div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 24, margin: 0 }}>{e.name}</h1>
              {e.verified && <Verified />}
            </div>
            <div style={{ color: t.muted, fontSize: 14.5, marginTop: 3 }}>{e.headline}</div>
            <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11.5, fontWeight: 600, color: '#fff', background: ind.c, padding: '4px 11px', borderRadius: 7 }}>{e.industry}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
        <Stat label="Trust Score" value={e.trust} c={ind.c} /><Stat label="Day rate" value={`£${e.rate}`} c={ind.c} /><Stat label="Status" value={e.verified ? 'Verified' : 'Pending'} c={ind.c} />
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>{e.skills.map(s => <Tag key={s}>{s}</Tag>)}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{ ...btn(BLUE, '#fff'), flex: 1 }}>Message</button>
        <button style={{ ...btnGold(), flex: 1 }}>✦ Engage {e.name.split(' ')[0]}</button>
      </div>
    </div>
  );
}

/* ---------------- OPPS ---------------- */
function Opps({ go }) {
  const { t } = useT();
  return (
    <div style={{ paddingTop: 26 }}>
      <H1>Open opportunities</H1>
      <Sub>Work worth doing, colour-coded by industry.</Sub>
      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        {OPPS.map(o => { const ind = industryOf(o.industry); return (
          <div key={o.id} onClick={() => go('opp', { id: o.id })} style={{ cursor: 'pointer', borderRadius: 16, background: t.surface, border: `1px solid ${t.line}`, borderLeft: `4px solid ${ind.c}`, padding: 16, transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: ind.c, textTransform: 'uppercase', letterSpacing: '.04em' }}>{o.industry}</span>
                <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5, margin: '4px 0 8px' }}>{o.title}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{o.skills.map(s => <Tag key={s}>{s}</Tag>)}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}><div style={{ fontWeight: 600, fontSize: 14 }}>{o.budget}</div><div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{o.mode}</div></div>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function OppDetail({ id, go }) {
  const { t, mode } = useT();
  const o = OPPS.find(x => x.id === id); if (!o) return null;
  const ind = industryOf(o.industry); const tint = mode === 'light' ? ind.tintL : ind.tintD;
  return (
    <div style={{ paddingTop: 18 }}>
      <Back go={go} to="opps">Back to opportunities</Back>
      <div style={{ marginTop: 14, borderRadius: 18, padding: 22, background: tint, border: `1px solid ${ind.c}33` }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: ind.c, textTransform: 'uppercase', letterSpacing: '.04em' }}>{o.industry}</span>
        <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 24, margin: '6px 0 10px' }}>{o.title}</h1>
        <div style={{ display: 'flex', gap: 14, color: t.muted, fontSize: 14, flexWrap: 'wrap' }}><span>💷 {o.budget}</span><span>📍 {o.mode}</span></div>
      </div>
      <button style={{ ...btnGold(), width: '100%', marginTop: 18 }}>✦ Submit a proposal</button>
    </div>
  );
}

/* ---------------- PRIMITIVES ---------------- */
function Fonts() { return <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box}::selection{background:${GOLD}55}::-webkit-scrollbar{height:0;width:0}`}</style>; }
function Logo() { const { t } = useT(); return <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, color: t.text }}><span style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, position: 'relative' }}><span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 2, background: GOLD }} /></span>Sekondment</div>; }
function Nav({ children, onClick }) { const { t } = useT(); return <span onClick={onClick} style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500, color: t.muted, whiteSpace: 'nowrap', alignSelf: 'center' }}>{children}</span>; }
const H1 = ({ children }) => <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>{children}</h1>;
function Sub({ children }) { const { t } = useT(); return <p style={{ color: t.muted, fontSize: 15, margin: '6px 0 8px' }}>{children}</p>; }
function Avatar({ name, c, size = 46 }) { return <div style={{ width: size, height: size, borderRadius: size * 0.28, background: `linear-gradient(135deg,${c},${c}bb)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size * 0.36, flex: 'none' }}>{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>; }
function Tag({ children }) { const { t } = useT(); return <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 6, background: t.surface2, color: t.muted, fontWeight: 500 }}>{children}</span>; }
function Verified() { return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', color: GOLD, border: `1px solid ${GOLD}`, padding: '2px 6px', borderRadius: 5 }}>✦ VERIFIED</span>; }
function Stat({ label, value, c }) { const { t } = useT(); return <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 13, padding: '13px 12px', textAlign: 'center' }}><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19, color: c }}>{value}</div><div style={{ fontSize: 11.5, color: t.muted, marginTop: 2 }}>{label}</div></div>; }
function TrustRing({ v, c }) { const { t } = useT(); const deg = (v / 100) * 360; return <div style={{ width: 46, height: 46, borderRadius: '50%', background: `conic-gradient(${c} ${deg}deg,${t.surface2} 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}><div style={{ width: 36, height: 36, borderRadius: '50%', background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 13 }}>{v}</div></div>; }
function Back({ children, go, to }) { const { t } = useT(); return <span onClick={() => go(to)} style={{ cursor: 'pointer', fontSize: 14, color: t.muted, fontWeight: 500 }}>← {children}</span>; }
function Glow() { return <div style={{ position: 'absolute', top: 40, right: -40, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle,${BLUE}22,transparent 68%)`, pointerEvents: 'none', zIndex: 0 }} />; }
function pill(t) { return { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: BLUE, background: `${BLUE}14`, padding: '7px 13px', borderRadius: 100, position: 'relative' }; }
function btn(bg, fg) { return { padding: '13px 20px', borderRadius: 12, background: bg, color: fg, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }; }
function btnGold() { return { padding: '13px 20px', borderRadius: 12, background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, color: '#1a1400', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }; }
function btnOutline(t) { return { padding: '13px 20px', borderRadius: 12, background: 'transparent', color: t.text, border: `1px solid ${t.line}`, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }; }
