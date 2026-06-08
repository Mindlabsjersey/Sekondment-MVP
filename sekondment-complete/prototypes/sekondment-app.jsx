import React, { useState, useMemo, createContext, useContext } from 'react';

/* ============================================================================
   SEKONDMENT — unified demo app
   One navigable application: homepage → auth → role dashboards → discovery →
   opportunity → proposal → engagement/escrow. Shared in-memory store so actions
   on one screen show up on another (post an opportunity, it appears for experts;
   accept a proposal, an engagement is created).
   ============================================================================ */

const C = {
  moss: '#1f4d3f', moss2: '#2d6a55', mossdk: '#143329', sand: '#c9a86a',
  ink: '#0c1f1a', paper: '#f6f3ec', paper2: '#efe9dd', muted: '#5a6b63',
  line: 'rgba(12,31,26,.12)', amber: '#b8862f', green: '#1f4d3f',
};

// ---------- seed data ----------
const SEED_EXPERTS = [
  { id: 'e1', name: 'Eleanor Voss', headline: 'Fractional Marketing Director', skills: ['Brand Strategy', 'Demand Gen', 'Positioning'], industries: ['B2B SaaS'], daily: 850, trust: 94, avail: 'available_now', modes: ['Remote', 'Hybrid'], verified: true, employer: null, reviews: 23 },
  { id: 'e2', name: 'Marcus Chen', headline: 'Interim CFO & Finance Advisor', skills: ['Fundraising', 'FP&A', 'Cost Reduction'], industries: ['Finance'], daily: 1100, trust: 91, avail: 'available_from', modes: ['Remote'], verified: true, employer: null, reviews: 17 },
  { id: 'e3', name: 'Priya Anand', headline: 'Senior Product Designer', skills: ['UX', 'Design Systems', 'Prototyping'], industries: ['SaaS', 'Fintech'], daily: 640, trust: 88, avail: 'available_now', modes: ['Remote', 'On-site'], verified: true, employer: 'Northpoint Studio', reviews: 11 },
  { id: 'e4', name: 'James Okafor', headline: 'Digital Transformation Consultant', skills: ['Operations', 'Change Mgmt', 'ERP'], industries: ['Manufacturing'], daily: 950, trust: 86, avail: 'project_only', modes: ['Hybrid'], verified: true, employer: null, reviews: 29 },
  { id: 'e5', name: 'Sofia Reyes', headline: 'Growth & Performance Marketing', skills: ['Paid Social', 'SEO', 'CRO'], industries: ['Retail'], daily: 580, trust: 79, avail: 'fractional_only', modes: ['Remote'], verified: false, employer: null, reviews: 6 },
  { id: 'e6', name: 'Aoife Brennan', headline: 'Lead Engineer (Seconded)', skills: ['React', 'Node', 'Cloud'], industries: ['SaaS'], daily: 720, trust: 83, avail: 'available_now', modes: ['Remote'], verified: true, employer: 'Atlas Digital', reviews: 9 },
];

const SEED_OPPS = [
  { id: 'o1', biz: 'Meridian Health', title: 'Fractional CMO to lead our Q3 product launch', outcome: 'Launch a product', expertise: ['Brand Strategy', 'Demand Gen'], industry: 'B2B SaaS', budgetMin: 6000, budgetMax: 12000, duration: '3 months', mode: 'Remote', rateType: 'fixed' },
  { id: 'o2', biz: 'Coastal Logistics', title: 'Interim finance lead for fundraising round', outcome: 'Fill a leadership gap', expertise: ['Fundraising', 'FP&A'], industry: 'Finance', budgetMin: 8000, budgetMax: 15000, duration: '4 months', mode: 'Hybrid', rateType: 'daily' },
];

const AVAIL_LABELS = { available_now: 'Available now', available_from: 'Available soon', project_only: 'Project only', fractional_only: 'Fractional only', advisory_only: 'Advisory only' };

// ---------- global store ----------
const Store = createContext(null);
const useStore = () => useContext(Store);

function StoreProvider({ children }) {
  const [route, setRoute] = useState({ name: 'home' });
  const [role, setRole] = useState(null); // 'business' | 'expert'
  const [experts] = useState(SEED_EXPERTS);
  const [opps, setOpps] = useState(SEED_OPPS);
  const [proposals, setProposals] = useState([]); // {id, oppId, expertId, price, timeline, msg, status}
  const [engagements, setEngagements] = useState([]); // created on accept
  const [saved, setSaved] = useState({});
  const [toast, setToast] = useState(null);

  const go = (name, params = {}) => { setRoute({ name, ...params }); window.scrollTo?.(0, 0); };
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const addOpp = (o) => { const id = 'o' + Date.now(); setOpps(p => [{ ...o, id, biz: 'Your Company' }, ...p]); return id; };
  const addProposal = (p) => { const id = 'p' + Date.now(); setProposals(ps => [{ ...p, id, status: 'submitted' }, ...ps]); flash('Proposal submitted'); };
  const setProposalStatus = (id, status) => {
    setProposals(ps => ps.map(p => p.id === id ? { ...p, status } : p));
    if (status === 'accepted') {
      const p = proposals.find(x => x.id === id);
      if (p) {
        const exp = experts.find(e => e.id === p.expertId);
        const opp = opps.find(o => o.id === p.oppId);
        const total = p.price || opp?.budgetMax || 5000;
        const engId = 'eng' + Date.now();
        const m3 = Math.round(total / 3);
        setEngagements(es => [{
          id: engId, oppId: p.oppId, expertId: p.expertId, expertName: exp?.name, employer: exp?.employer,
          title: opp?.title || 'Engagement', total, payeeType: exp?.employer ? 'employer_partner' : 'expert',
          splitToExpert: exp?.employer ? 0.2 : null,
          milestones: [
            { id: 1, title: 'Discovery & kickoff', amount: total - 2 * m3, status: 'pending' },
            { id: 2, title: 'Delivery', amount: m3, status: 'pending' },
            { id: 3, title: 'Completion & handover', amount: m3, status: 'pending' },
          ], ledger: [],
        }, ...es]);
        flash('Proposal accepted — engagement created');
        go('engagement', { id: engId });
      }
    } else flash(status === 'shortlisted' ? 'Proposal shortlisted' : 'Proposal updated');
  };
  const updateEngagement = (id, fn) => setEngagements(es => es.map(e => e.id === id ? fn(e) : e));

  const val = { route, go, role, setRole, experts, opps, addOpp, proposals, addProposal, setProposalStatus, engagements, updateEngagement, saved, setSaved, flash, toast };
  return <Store.Provider value={val}>{children}</Store.Provider>;
}

// ---------- shared UI ----------
const Btn = ({ children, onClick, variant = 'primary', lg, style }) => {
  const base = { fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', borderRadius: lg ? 12 : 10, padding: lg ? '14px 24px' : '10px 18px', fontSize: lg ? 16 : 14.5, border: 'none', transition: 'all .15s', display: 'inline-flex', alignItems: 'center', gap: 8, ...style };
  const v = variant === 'primary' ? { background: C.moss, color: '#fff' } : variant === 'ghost' ? { background: 'transparent', color: C.ink, border: `1px solid ${C.line}` } : { background: '#fff', color: C.ink, border: `1px solid ${C.line}` };
  return <button onClick={onClick} style={{ ...base, ...v }} onMouseEnter={e => { if (variant === 'primary') e.currentTarget.style.background = C.moss2; }} onMouseLeave={e => { if (variant === 'primary') e.currentTarget.style.background = C.moss; }}>{children}</button>;
};
const Logo = ({ size = 18 }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size }}><span style={{ width: size * 1.35, height: size * 1.35, borderRadius: 6, background: C.moss, position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: '25%', right: '25%', width: '28%', height: '28%', borderRadius: 2, background: C.sand }} /></span>Sekondment</span>;
const Avatar = ({ name, size = 50, gold }) => { const i = name.split(' ').map(n => n[0]).join('').slice(0, 2); return <div style={{ width: size, height: size, borderRadius: size * 0.27, background: gold ? `linear-gradient(135deg,${C.sand},#d8bd86)` : `linear-gradient(135deg,${C.moss},${C.moss2})`, color: gold ? C.mossdk : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size * 0.36, flex: 'none' }}>{i}</div>; };

function TopBar({ children }) {
  const { go, role } = useStore();
  return <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 16 }}>
      <span onClick={() => go(role ? 'dashboard' : 'home')} style={{ cursor: 'pointer' }}><Logo /></span>
      {role && <span style={{ fontSize: 12.5, color: C.muted, background: C.paper2, padding: '4px 10px', borderRadius: 100 }}>{role === 'business' ? 'Business' : 'Expert'}</span>}
      <span style={{ flex: 1 }} />
      {children}
    </div>
  </div>;
}

const Atmosphere = () => <>
  <div style={{ position: 'absolute', top: -200, right: -150, width: 540, height: 540, borderRadius: '50%', background: `radial-gradient(circle,rgba(31,77,63,.08),transparent 68%)`, pointerEvents: 'none' }} />
  <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
</>;

// ============================ SCREENS ============================

function Home() {
  const { go, setRole } = useStore();
  const enter = (r) => { setRole(r); go('dashboard'); };
  return <div style={{ position: 'relative', overflow: 'hidden' }}>
    <Atmosphere />
    <TopBar><Btn variant="ghost" onClick={() => go('signin')}>Sign in</Btn></TopBar>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '70px 24px', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 48, alignItems: 'center' }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: C.moss, background: 'rgba(31,77,63,.08)', padding: '7px 14px', borderRadius: 100, marginBottom: 24 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.moss }} />Trusted expertise marketplace</span>
          <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 60, lineHeight: 1.03, letterSpacing: '-.03em', margin: 0 }}>Access expertise <em style={{ color: C.moss }}>on demand.</em></h1>
          <p style={{ fontSize: 19, color: C.muted, lineHeight: 1.55, margin: '24px 0 32px', maxWidth: '48ch' }}>Engage verified experts, advisors and specialists through secure, milestone-based engagements. Deploy expertise — not headcount.</p>
          <div style={{ display: 'flex', gap: 13 }}>
            <Btn lg onClick={() => enter('business')}>Find Expertise →</Btn>
            <Btn lg variant="ghost" onClick={() => enter('expert')}>Become an Expert</Btn>
          </div>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Demo — tap either to enter that role. No sign-up needed.</p>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 20, padding: 24, boxShadow: '0 1px 2px rgba(12,31,26,.06),0 24px 60px -24px rgba(12,31,26,.22)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 24, right: 24, fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', color: C.moss, background: 'rgba(31,77,63,.1)', padding: '5px 10px', borderRadius: 6 }}>VERIFIED</span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            <Avatar name="Eleanor Voss" size={54} />
            <div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>Fractional CMO</div><div style={{ fontSize: 13.5, color: C.muted }}>Available now · Remote</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>{['Growth', 'B2B SaaS', 'Fractional'].map(t => <span key={t} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 7, background: C.paper2, fontWeight: 500 }}>{t}</span>)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>Trust Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 120, height: 7, borderRadius: 100, background: C.paper2, overflow: 'hidden' }}><div style={{ height: '100%', width: '94%', background: `linear-gradient(90deg,${C.moss},${C.sand})` }} /></div><span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>94</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function SignIn() {
  const { go, setRole } = useStore();
  return <div style={{ position: 'relative', minHeight: '100vh' }}>
    <Atmosphere />
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 2 }}>
      <span onClick={() => go('home')} style={{ cursor: 'pointer', display: 'inline-block', marginBottom: 28 }}><Logo size={20} /></span>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 30, margin: '0 0 6px' }}>Enter the demo</h1>
      <p style={{ color: C.muted, margin: '0 0 24px' }}>Choose a role to explore the full journey.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <div onClick={() => { setRole('business'); go('dashboard'); }} style={card()}>
          <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>I'm a Business →</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>Post opportunities, find experts, manage engagements.</div>
        </div>
        <div onClick={() => { setRole('expert'); go('dashboard'); }} style={card()}>
          <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>I'm an Expert →</div>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>Browse opportunities, submit proposals, get engaged.</div>
        </div>
      </div>
    </div>
  </div>;
}
const card = () => ({ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 15, padding: 20, cursor: 'pointer', transition: 'all .15s' });

function Dashboard() {
  const { role, go, opps, proposals, engagements } = useStore();
  const isBiz = role === 'business';
  const myProps = proposals;
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere />
    <TopBar>
      {isBiz ? <Btn onClick={() => go('createOpp')}>+ Create Opportunity</Btn> : <Btn onClick={() => go('browse')}>Browse Opportunities</Btn>}
      <Btn variant="ghost" onClick={() => go('home')} style={{ marginLeft: 8 }}>Exit</Btn>
    </TopBar>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '34px 24px 70px', position: 'relative', zIndex: 2 }}>
      <p style={{ color: C.muted, fontSize: 14, margin: '0 0 4px' }}>Welcome back</p>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 36, margin: '0 0 26px' }}>{isBiz ? 'Your Company' : 'Your expert profile'}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
        {isBiz ? <>
          <Tile label="Active Opportunities" value={opps.filter(o => o.biz === 'Your Company').length} onClick={() => go('myOpps')} />
          <Tile label="Proposals received" value={myProps.length} onClick={() => go('myOpps')} />
          <Tile label="Active Engagements" value={engagements.length} onClick={() => engagements[0] && go('engagement', { id: engagements[0].id })} />
        </> : <>
          <Tile label="Open Opportunities" value={opps.length} onClick={() => go('browse')} />
          <Tile label="My Proposals" value={myProps.length} />
          <Tile label="Active Engagements" value={engagements.length} onClick={() => engagements[0] && go('engagement', { id: engagements[0].id })} />
        </>}
      </div>

      {/* contextual next-step */}
      <div style={{ background: 'rgba(31,77,63,.05)', border: `1px solid rgba(31,77,63,.22)`, borderRadius: 16, padding: '22px 24px' }}>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '0 0 8px', color: C.moss }}>{isBiz ? 'Find the expertise you need' : 'Find work worth doing'}</h2>
        <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.55, margin: '0 0 16px', maxWidth: '60ch' }}>
          {isBiz ? 'Post an opportunity describing the outcome you want, or browse verified experts directly. Proposals arrive here, and accepting one opens a secure, milestone-based engagement.' : 'Browse open opportunities, submit a proposal with your price and timeline, and when a business accepts, a secure engagement with escrow is created automatically.'}
        </p>
        {isBiz ? <div style={{ display: 'flex', gap: 10 }}><Btn onClick={() => go('createOpp')}>Create Opportunity</Btn><Btn variant="ghost" onClick={() => go('discovery')}>Browse Experts</Btn></div>
               : <Btn onClick={() => go('browse')}>Browse Opportunities</Btn>}
      </div>
    </div>
  </div>;
}
const Tile = ({ label, value, onClick }) => <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 15, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default' }}><div style={{ color: C.muted, fontSize: 13.5 }}>{label}</div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 30, marginTop: 4 }}>{value}</div></div>;

// ---- Expert discovery (business) ----
function Discovery() {
  const { experts, go, saved, setSaved, flash } = useStore();
  const [q, setQ] = useState(''); const [minTrust, setMinTrust] = useState(0); const [maxDaily, setMaxDaily] = useState(1500); const [verifiedOnly, setVerifiedOnly] = useState(false);
  const results = useMemo(() => experts.filter(e => (!q || `${e.name} ${e.headline} ${e.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase())) && e.trust >= minTrust && e.daily <= maxDaily && (!verifiedOnly || e.verified)).sort((a, b) => b.trust - a.trust), [experts, q, minTrust, maxDaily, verifiedOnly]);
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn variant="ghost" onClick={() => go('dashboard')}>Dashboard</Btn></TopBar>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 24px 70px', position: 'relative', zIndex: 2 }}>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 34, margin: '0 0 18px' }}>Find expertise</h1>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, role or skill…" style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', fontSize: 15, fontFamily: 'inherit', marginBottom: 18, outline: 'none' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
        <aside style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
          <FG label={`Min Trust · ${minTrust}`}><input type="range" min="0" max="100" value={minTrust} onChange={e => setMinTrust(+e.target.value)} style={{ width: '100%', accentColor: C.moss }} /></FG>
          <FG label={`Max day rate · £${maxDaily}`}><input type="range" min="400" max="1500" step="50" value={maxDaily} onChange={e => setMaxDaily(+e.target.value)} style={{ width: '100%', accentColor: C.moss }} /></FG>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, cursor: 'pointer' }}><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} style={{ accentColor: C.moss, width: 16, height: 16 }} />Verified only</label>
        </aside>
        <div style={{ display: 'grid', gap: 13 }}>
          <span style={{ fontSize: 14, color: C.muted }}><b style={{ color: C.ink }}>{results.length}</b> experts</span>
          {results.map(e => <div key={e.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Avatar name={e.name} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.name}</span>{e.verified && <span style={{ fontSize: 10.5, fontWeight: 600, color: C.moss, background: 'rgba(31,77,63,.1)', padding: '3px 8px', borderRadius: 5 }}>✓ VERIFIED</span>}{e.employer && <span style={{ fontSize: 11.5, color: C.sand, fontWeight: 600 }}>via {e.employer}</span>}</div>
              <div style={{ color: C.muted, fontSize: 14, margin: '2px 0 9px' }}>{e.headline}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{e.skills.slice(0, 3).map(s => <span key={s} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 6, background: C.paper2, fontWeight: 500 }}>{s}</span>)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.trust}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Trust</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>£{e.daily}<span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>/day</span></div>
            </div>
            <Btn variant="ghost" onClick={() => { setSaved(s => ({ ...s, [e.id]: !s[e.id] })); flash(saved[e.id] ? 'Removed' : 'Saved to shortlist'); }} style={{ flex: 'none' }}>{saved[e.id] ? '★ Saved' : '☆ Save'}</Btn>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}
const FG = ({ label, children }) => <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.line}` }}><div style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', color: C.muted, marginBottom: 10 }}>{label}</div>{children}</div>;

// ---- Create opportunity (business) ----
function CreateOpp() {
  const { go, addOpp } = useStore();
  const [f, setF] = useState({ title: '', outcome: 'Launch a product', expertise: [], industry: '', budgetMin: '', budgetMax: '', duration: '', mode: 'Remote', rateType: 'fixed' });
  const up = (k, v) => setF(s => ({ ...s, [k]: v }));
  const OUTCOMES = ['Launch a product', 'Deliver a project', 'Improve marketing', 'Fill a leadership gap', 'Reduce costs', 'Digital transformation'];
  const EXP = ['Brand Strategy', 'Demand Gen', 'Product Design', 'Fundraising', 'Operations', 'SEO', 'Cloud'];
  const publish = () => { if (f.title.trim().length < 3) return; addOpp({ ...f, budgetMin: +f.budgetMin || null, budgetMax: +f.budgetMax || null }); go('myOpps'); };
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn variant="ghost" onClick={() => go('dashboard')}>Cancel</Btn></TopBar>
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '34px 24px 70px', position: 'relative', zIndex: 2 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: C.moss }}>Start with the outcome</span>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 34, margin: '8px 0 22px' }}>Create an opportunity</h1>
      <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: 28, display: 'grid', gap: 18 }}>
        <Field label="What are you trying to achieve?"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{OUTCOMES.map(o => <Pill key={o} on={f.outcome === o} onClick={() => up('outcome', o)}>{o}</Pill>)}</div></Field>
        <Field label="Opportunity title *"><Inp value={f.title} onChange={v => up('title', v)} placeholder="e.g. Fractional CMO to lead our Q3 launch" /></Field>
        <Field label="Required expertise"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{EXP.map(x => <Pill key={x} on={f.expertise.includes(x)} onClick={() => up('expertise', f.expertise.includes(x) ? f.expertise.filter(y => y !== x) : [...f.expertise, x])}>{x}</Pill>)}</div></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Budget from (£)"><Inp type="number" value={f.budgetMin} onChange={v => up('budgetMin', v)} placeholder="6000" /></Field>
          <Field label="Budget to (£)"><Inp type="number" value={f.budgetMax} onChange={v => up('budgetMax', v)} placeholder="12000" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Duration"><Inp value={f.duration} onChange={v => up('duration', v)} placeholder="3 months" /></Field>
          <Field label="Rate type"><select value={f.rateType} onChange={e => up('rateType', e.target.value)} style={inp()}>{['fixed', 'hourly', 'daily', 'retainer'].map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}</select></Field>
        </div>
        <Btn lg onClick={publish} style={{ opacity: f.title.trim().length < 3 ? .5 : 1 }}>Publish Opportunity →</Btn>
      </div>
    </div>
  </div>;
}
const Field = ({ label, children }) => <div><label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{label}</label>{children}</div>;
const inp = () => ({ width: '100%', boxSizing: 'border-box', padding: '12px 15px', borderRadius: 11, border: `1px solid ${C.line}`, background: '#fff', fontSize: 15, fontFamily: 'inherit', color: C.ink, outline: 'none' });
const Inp = ({ value, onChange, placeholder, type = 'text' }) => <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp()} />;
const Pill = ({ on, onClick, children }) => <button onClick={onClick} style={{ padding: '8px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${on ? C.moss : C.line}`, background: on ? C.moss : '#fff', color: on ? '#fff' : C.muted }}>{on ? '✓ ' : ''}{children}</button>;

// ---- My opportunities + proposals received (business) ----
function MyOpps() {
  const { opps, proposals, go, experts, setProposalStatus } = useStore();
  const mine = opps.filter(o => o.biz === 'Your Company');
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn onClick={() => go('createOpp')}>+ New</Btn><Btn variant="ghost" onClick={() => go('dashboard')} style={{ marginLeft: 8 }}>Dashboard</Btn></TopBar>
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '30px 24px 70px', position: 'relative', zIndex: 2 }}>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 32, margin: '0 0 20px' }}>My opportunities</h1>
      {mine.length === 0 && <Empty>No opportunities yet. <a onClick={() => go('createOpp')} style={link}>Create one →</a></Empty>}
      <div style={{ display: 'grid', gap: 16 }}>
        {mine.map(o => {
          const props = proposals.filter(p => p.oppId === o.id);
          return <div key={o.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 22 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: C.moss }}>{o.outcome}</span>
            <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19, margin: '4px 0 8px' }}>{o.title}</div>
            <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 14 }}>£{(o.budgetMin || 0).toLocaleString()}–£{(o.budgetMax || 0).toLocaleString()} · {o.duration || 'Flexible'} · {o.mode}</div>
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 10 }}>{props.length} proposal{props.length !== 1 ? 's' : ''}</div>
              {props.map(p => { const e = experts.find(x => x.id === p.expertId); return <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.line}` }}>
                <Avatar name={e?.name || '?'} size={40} gold={!!e?.employer} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{e?.name}{e?.employer && <span style={{ color: C.sand, fontSize: 12, fontWeight: 600 }}> · via {e.employer}</span>}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>£{(p.price || 0).toLocaleString()} · {p.timeline}{p.msg ? ` — "${p.msg.slice(0, 50)}${p.msg.length > 50 ? '…' : ''}"` : ''}</div>
                </div>
                {p.status === 'accepted' ? <span style={{ fontSize: 12.5, color: C.green, fontWeight: 600 }}>✓ Accepted</span>
                  : p.status === 'rejected' ? <span style={{ fontSize: 12.5, color: C.muted }}>Declined</span>
                  : <div style={{ display: 'flex', gap: 7 }}>
                      <Btn onClick={() => setProposalStatus(p.id, 'accepted')} style={{ padding: '7px 14px', fontSize: 13 }}>Accept</Btn>
                      <Btn variant="ghost" onClick={() => setProposalStatus(p.id, 'rejected')} style={{ padding: '7px 14px', fontSize: 13 }}>Decline</Btn>
                    </div>}
              </div>; })}
              {props.length === 0 && <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Waiting for experts to propose. (Switch to the Expert role to submit one.)</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}
const Empty = ({ children }) => <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: C.muted }}>{children}</div>;
const link = { color: C.moss, cursor: 'pointer', fontWeight: 500 };

// ---- Browse opportunities + propose (expert) ----
function Browse() {
  const { opps, go } = useStore();
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn variant="ghost" onClick={() => go('dashboard')}>Dashboard</Btn></TopBar>
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '30px 24px 70px', position: 'relative', zIndex: 2 }}>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 32, margin: '0 0 6px' }}>Open opportunities</h1>
      <p style={{ color: C.muted, margin: '0 0 22px' }}>Find work that fits, then submit a proposal.</p>
      <div style={{ display: 'grid', gap: 14 }}>
        {opps.map(o => <div key={o.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: C.moss }}>{o.outcome}</span>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19, margin: '4px 0 6px' }}>{o.title}</div>
              <div style={{ fontSize: 13.5, color: C.muted }}>{o.biz} · {o.industry || '—'} · {o.mode}</div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>£{(o.budgetMin || 0).toLocaleString()}–{(o.budgetMax || 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{o.rateType} · {o.duration || 'Flexible'}</div>
            </div>
          </div>
          {o.expertise?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0' }}>{o.expertise.map(x => <span key={x} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 6, background: C.paper2, fontWeight: 500 }}>{x}</span>)}</div>}
          <Btn onClick={() => go('propose', { oppId: o.id })}>Submit proposal →</Btn>
        </div>)}
      </div>
    </div>
  </div>;
}

function Propose() {
  const { route, opps, go, addProposal, experts } = useStore();
  const opp = opps.find(o => o.id === route.oppId);
  const me = experts[0]; // demo: act as Eleanor
  const [price, setPrice] = useState(opp?.budgetMax || ''); const [timeline, setTimeline] = useState(''); const [msg, setMsg] = useState('');
  if (!opp) return null;
  const submit = () => { addProposal({ oppId: opp.id, expertId: me.id, price: +price || null, timeline: timeline || 'Flexible', msg }); go('dashboard'); };
  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn variant="ghost" onClick={() => go('browse')}>Back</Btn></TopBar>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '34px 24px 70px', position: 'relative', zIndex: 2 }}>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 30, margin: '0 0 6px' }}>Submit a proposal</h1>
      <p style={{ color: C.muted, margin: '0 0 8px' }}>For <b style={{ color: C.ink }}>{opp.title}</b></p>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Proposing as {me.name}{me.employer ? ` · payment routes to ${me.employer}` : ''}</div>
      <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: 26, display: 'grid', gap: 18 }}>
        <Field label="Your price (£)"><Inp type="number" value={price} onChange={setPrice} placeholder={String(opp.budgetMax || 5000)} /></Field>
        <Field label="Timeline"><Inp value={timeline} onChange={setTimeline} placeholder="e.g. 3 weeks, can start Monday" /></Field>
        <Field label="Cover message"><textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Why you're a strong fit for this outcome…" style={{ ...inp(), resize: 'none', lineHeight: 1.5 }} /></Field>
        <Btn lg onClick={submit}>Send proposal →</Btn>
      </div>
    </div>
  </div>;
}

// ---- Engagement + escrow ----
function Engagement() {
  const { route, engagements, updateEngagement, role, flash, go } = useStore();
  const eng = engagements.find(e => e.id === route.id);
  if (!eng) return <div style={{ padding: 60, textAlign: 'center' }}><p>No engagement found.</p><Btn onClick={() => go('dashboard')}>Dashboard</Btn></div>;
  const FEE = 15;
  const total = eng.total;
  const released = eng.milestones.filter(m => m.status === 'released').reduce((a, m) => a + m.amount, 0);
  const inEscrow = eng.milestones.filter(m => ['funded', 'submitted'].includes(m.status)).reduce((a, m) => a + m.amount, 0);
  const isBiz = role === 'business';

  const act = (id, status, ledgerEntries) => updateEngagement(eng.id, e => ({ ...e, milestones: e.milestones.map(m => m.id === id ? { ...m, status } : m), ledger: ledgerEntries ? [...ledgerEntries, ...e.ledger] : e.ledger }));
  const fund = (m) => { act(m.id, 'funded', [{ id: Date.now(), label: `Funded "${m.title}" into escrow`, amount: m.amount, dir: 'in' }]); flash(`£${m.amount.toLocaleString()} into escrow`); };
  const submit = (m) => { act(m.id, 'submitted'); flash('Work submitted'); };
  const release = (m) => {
    const fee = +(m.amount * FEE / 100).toFixed(2); const net = m.amount - fee;
    const entries = [{ id: Date.now() + 1, label: `Platform fee (${FEE}%)`, amount: fee, dir: 'fee' }];
    if (eng.payeeType === 'employer_partner' && eng.splitToExpert) {
      entries.push({ id: Date.now() + 2, label: `To ${eng.employer}`, amount: +(net * (1 - eng.splitToExpert)).toFixed(2), dir: 'out' });
      entries.push({ id: Date.now() + 3, label: `Split to ${eng.expertName}`, amount: +(net * eng.splitToExpert).toFixed(2), dir: 'out' });
    } else entries.push({ id: Date.now() + 2, label: `To ${eng.payeeType === 'employer_partner' ? eng.employer : eng.expertName}`, amount: net, dir: 'out' });
    act(m.id, 'released', entries.reverse()); flash(`£${m.amount.toLocaleString()} released`);
  };
  const SM = { pending: ['Not funded', C.muted], funded: ['In escrow', C.amber], submitted: ['Awaiting approval', C.amber], released: ['Released', C.green] };

  return <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
    <Atmosphere /><TopBar><Btn variant="ghost" onClick={() => go('dashboard')}>Dashboard</Btn></TopBar>
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 70px', position: 'relative', zIndex: 2 }}>
      <div style={{ background: C.mossdk, color: C.paper, borderRadius: 20, padding: '26px 28px', position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,106,.28),transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: C.sand }}>Active Engagement</span>
            <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22, marginTop: 5 }}>{eng.title}</div>
            <div style={{ fontSize: 13.5, marginTop: 8, color: 'rgba(246,243,236,.7)' }}>{eng.expertName}{eng.employer && <span style={{ color: C.sand }}> · via {eng.employer} (paid to employer)</span>}</div>
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <HS label="Total" v={`£${total.toLocaleString()}`} /><HS label="In escrow" v={`£${inEscrow.toLocaleString()}`} c={C.sand} /><HS label="Released" v={`£${released.toLocaleString()}`} c={C.sand} />
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,.12)', overflow: 'hidden', marginTop: 20 }}><div style={{ height: '100%', width: `${(released / total) * 100}%`, background: `linear-gradient(90deg,${C.moss2},${C.sand})`, transition: 'width .5s' }} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: 0 }}>Milestones</h2>
            <span style={{ fontSize: 12.5, color: C.muted }}>Viewing as {isBiz ? 'Business' : 'Expert'}</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {eng.milestones.map((m, i) => { const [lbl, col] = SM[m.status]; return <div key={m.id} style={{ background: '#fff', border: `1px solid ${m.status === 'released' ? 'rgba(31,77,63,.3)' : C.line}`, borderRadius: 15, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 13 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', background: m.status === 'released' ? C.moss : C.paper2, color: m.status === 'released' ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 14 }}>{m.status === 'released' ? '✓' : i + 1}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 15.5 }}>{m.title}</div><span style={{ fontSize: 12, fontWeight: 600, color: col, marginTop: 6, display: 'inline-block' }}>● {lbl}</span></div>
                </div>
                <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>£{m.amount.toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {isBiz && m.status === 'pending' && <Btn onClick={() => fund(m)} style={{ padding: '8px 16px', fontSize: 13.5 }}>Fund into escrow →</Btn>}
                {!isBiz && m.status === 'pending' && <Hint>Waiting for the business to fund</Hint>}
                {!isBiz && m.status === 'funded' && <Btn onClick={() => submit(m)} style={{ padding: '8px 16px', fontSize: 13.5 }}>Submit work →</Btn>}
                {isBiz && m.status === 'funded' && <Hint>Funded — awaiting submission</Hint>}
                {isBiz && m.status === 'submitted' && <Btn onClick={() => release(m)} style={{ padding: '8px 16px', fontSize: 13.5 }}>Approve & release →</Btn>}
                {!isBiz && m.status === 'submitted' && <Hint>Submitted — awaiting approval</Hint>}
                {m.status === 'released' && <Hint done>Released{eng.payeeType === 'employer_partner' ? ` to ${eng.employer}` : ''}</Hint>}
              </div>
            </div>; })}
          </div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, position: 'sticky', top: 78 }}>
          <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Escrow ledger</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px' }}>Every movement, on the record.</p>
          {eng.ledger.length === 0 && <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: 0 }}>Fund a milestone to begin.</p>}
          <div style={{ display: 'grid', gap: 8 }}>{eng.ledger.map(e => <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}><span style={{ color: C.muted }}>{e.label}</span><span style={{ fontWeight: 600, flex: 'none', color: e.dir === 'in' ? C.amber : e.dir === 'fee' ? C.muted : C.moss }}>{e.dir === 'in' ? '+' : e.dir === 'fee' ? '−' : '→'}£{e.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>)}</div>
        </div>
      </div>
    </div>
  </div>;
}
const HS = ({ label, v, c }) => <div><div style={{ fontSize: 11.5, color: 'rgba(246,243,236,.55)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22, marginTop: 3, color: c || C.paper }}>{v}</div></div>;
const Hint = ({ children, done }) => <span style={{ fontSize: 13, color: done ? C.moss : C.muted, fontWeight: done ? 500 : 400, fontStyle: done ? 'normal' : 'italic' }}>{done ? '✓ ' : ''}{children}</span>;

// ---------- router ----------
function Router() {
  const { route, toast, role, go, setRole } = useStore();
  const screens = { home: Home, signin: SignIn, dashboard: Dashboard, discovery: Discovery, createOpp: CreateOpp, myOpps: MyOpps, browse: Browse, propose: Propose, engagement: Engagement };
  const Screen = screens[route.name] || Home;
  return <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: C.paper, color: C.ink, minHeight: '100vh' }}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');*::selection{background:${C.sand}55}`}</style>
    {/* role switcher — lets you experience both sides of the same shared data */}
    {role && <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 90, background: C.ink, color: C.paper, borderRadius: 100, padding: 5, display: 'flex', gap: 4, boxShadow: '0 12px 30px -8px rgba(12,31,26,.5)' }}>
      {['business', 'expert'].map(r => <button key={r} onClick={() => { setRole(r); go('dashboard'); }} style={{ padding: '8px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: role === r ? C.paper : 'transparent', color: role === r ? C.ink : 'rgba(246,243,236,.6)' }}>{r === 'business' ? 'Business' : 'Expert'}</button>)}
    </div>}
    <Screen />
    {toast && <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: C.paper, padding: '13px 22px', borderRadius: 12, fontSize: 14.5, fontWeight: 500, zIndex: 80, boxShadow: '0 16px 40px -12px rgba(12,31,26,.5)' }}>{toast}</div>}
  </div>;
}

export default function App() {
  return <StoreProvider><Router /></StoreProvider>;
}
