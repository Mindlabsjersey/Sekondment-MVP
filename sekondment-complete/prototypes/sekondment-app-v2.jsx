import React, { useState, useMemo, createContext, useContext } from 'react';

/* ============================================================================
   SEKONDMENT — complete clickable prototype (mock data)
   Roles: Business · Expert · Employer Partner · Admin
   Flow: Home → pick role → dashboard → full journey incl. escrow, disputes,
         partner approvals, admin verification & dispute resolution.
   ========================================================================== */

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', MOSSDK = '#143329', SAND = '#c9a86a';
const INK = '#0c1f1a', PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';
const AMBER = '#b8862f', GREEN = '#1f4d3f', RED = '#a14b3d';

const Store = createContext(null);
const useStore = () => useContext(Store);

// Viewport hook — inline styles can't use media queries, so we branch on width.
function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < bp : false);
  React.useEffect(() => {
    const on = () => setM(window.innerWidth < bp);
    on(); window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return m;
}
const MobileCtx = createContext(false);
const useMobile = () => useContext(MobileCtx);

// ---------- seed data ----------
const SEED_EXPERTS = [
  { id: 1, name: 'Eleanor Voss', headline: 'Fractional Marketing Director', skills: ['Brand Strategy', 'Demand Gen'], daily: 850, trust: 94, avail: 'available_now', company: null, reviews: 23, verified: true, bio: 'Two decades scaling B2B SaaS brands from seed to Series C.' },
  { id: 2, name: 'Marcus Chen', headline: 'Interim CFO & Finance Advisor', skills: ['Fundraising', 'FP&A'], daily: 1100, trust: 91, avail: 'available_from', company: null, reviews: 17, verified: true, bio: 'Interim finance leadership through fundraises and turnarounds.' },
  { id: 3, name: 'Priya Anand', headline: 'Senior Product Designer', skills: ['UX', 'Design Systems'], daily: 640, trust: 88, avail: 'available_now', company: 'Northpoint Studio', reviews: 11, verified: true, bio: 'Product designer deployed via Northpoint Studio.' },
  { id: 4, name: 'James Okafor', headline: 'Digital Transformation Consultant', skills: ['Operations', 'Change Mgmt'], daily: 950, trust: 86, avail: 'project_only', company: null, reviews: 29, verified: false, bio: 'Helping mid-market firms modernise operations.' },
];

const SEED_OPPS = [
  { id: 1, title: 'Fractional CMO for Q3 product launch', outcome: 'Launch a product', expertise: ['Brand Strategy', 'Demand Gen'], budget: '£6,000–£9,000', mode: 'Remote', business: 'Acme SaaS', proposals: [] },
  { id: 2, title: 'Interim finance lead during fundraise', outcome: 'Fill a leadership gap', expertise: ['Fundraising', 'FP&A'], budget: '£8,000–£12,000', mode: 'Hybrid', business: 'Tideway Health', proposals: [] },
];

const SEED_EMPLOYEES = [
  { id: 1, name: 'Priya Anand', headline: 'Senior Product Designer', skills: ['UX', 'Design Systems'], status: 'approved', commission: 0.2, deployments: 3, earned: 4080 },
  { id: 2, name: 'Aoife Brennan', headline: 'Lead Engineer', skills: ['React', 'Cloud'], status: 'approved', commission: 0.25, deployments: 2, earned: 2720 },
  { id: 3, name: 'Daniel Mercer', headline: 'Data Analyst', skills: ['SQL', 'Python'], status: 'pending', commission: 0.2, deployments: 0, earned: 0 },
  { id: 4, name: 'Lena Ortiz', headline: 'Brand Strategist', skills: ['Brand', 'Content'], status: 'pending', commission: 0.2, deployments: 0, earned: 0 },
];

function StoreProvider({ children }) {
  const [opps, setOpps] = useState(SEED_OPPS);
  const [engagements, setEngagements] = useState([]);
  const [employees, setEmployees] = useState(SEED_EMPLOYEES);
  const [experts, setExperts] = useState(SEED_EXPERTS);
  const [disputes, setDisputes] = useState([]);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const addProposal = (oppId, p) => setOpps(os => os.map(o => o.id === oppId ? { ...o, proposals: [...o.proposals, { ...p, id: Date.now(), status: 'submitted' }] } : o));
  const createEngagement = (e) => { const id = Date.now(); setEngagements(es => [...es, { ...e, id, milestones: e.milestones.map((m, i) => ({ ...m, id: i + 1, status: 'pending' })), ledger: [], reviewed: false, status: 'active' }]); return id; };
  const updateEngagement = (id, fn) => setEngagements(es => es.map(e => e.id === id ? fn(e) : e));
  const addOpp = (o) => setOpps(os => [{ ...o, id: Date.now(), proposals: [] }, ...os]);
  const setEmployeeStatus = (id, status) => setEmployees(es => es.map(e => e.id === id ? { ...e, status } : e));
  const setExpertVerified = (id, v) => setExperts(xs => xs.map(x => x.id === id ? { ...x, verified: v, trust: Math.min(100, x.trust + (v ? 6 : -6)) } : x));
  const addDispute = (d) => setDisputes(ds => [...ds, { ...d, id: Date.now(), status: 'open' }]);
  const resolveDispute = (id, outcome) => setDisputes(ds => ds.map(d => d.id === id ? { ...d, status: `resolved_${outcome}` } : d));

  return <Store.Provider value={{ opps, engagements, employees, experts, disputes, addProposal, createEngagement, updateEngagement, addOpp, setEmployeeStatus, setExpertVerified, addDispute, resolveDispute, flash }}>
    {children}
    {toast && <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: INK, color: PAPER, padding: '13px 22px', borderRadius: 12, fontSize: 14.5, fontWeight: 500, zIndex: 200, boxShadow: '0 16px 40px -12px rgba(12,31,26,.5)' }}>{toast}</div>}
  </Store.Provider>;
}

export default function App() {
  const isMobile = useIsMobile();
  return <MobileCtx.Provider value={isMobile}><StoreProvider><Router /></StoreProvider></MobileCtx.Provider>;
}

function Router() {
  const [route, setRoute] = useState({ name: 'home' });
  const [role, setRole] = useState(null);
  const go = (name, params = {}) => setRoute({ name, ...params });

  if (route.name === 'home') return <Home go={go} setRole={setRole} />;
  if (route.name === 'browseExperts') return <BrowseExperts go={go} />;
  if (route.name === 'browseOpps') return <BrowseOpps go={go} />;
  if (route.name === 'signup') return <SignUp go={go} setRole={setRole} />;
  if (route.name === 'signin') return <SignIn go={go} setRole={setRole} />;

  const screens = {
    dashboard: <Dashboard role={role} go={go} />,
    discover: <Discover go={go} />,
    expert: <ExpertProfile id={route.id} go={go} />,
    opps: <OppList role={role} go={go} />,
    opp: <OppDetail id={route.id} role={role} go={go} />,
    newopp: <NewOpp go={go} />,
    engagement: <Engagement id={route.id} role={role} go={go} />,
    partner: <PartnerDashboard go={go} />,
    adminDisputes: <AdminDisputes go={go} />,
    adminVerify: <AdminVerify go={go} />,
  };

  return <AppFrame role={role} route={route} go={go} setRole={setRole}>{screens[route.name]}</AppFrame>;
}

/* ---------------- HOME ---------------- */
function Home({ go, setRole }) {
  const m = useMobile();
  const enter = (r) => { setRole(r); go(r === 'employer_partner' ? 'partner' : r === 'admin' ? 'adminDisputes' : 'dashboard'); };
  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <FontsAndGrain />
      <Glow t={-200} r={-150} c="rgba(31,77,63,.1)" />
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.82)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 18px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo small={m} />
          <div style={{ display: 'flex', gap: m ? 8 : 16, alignItems: 'center', fontSize: 14 }}>
            {!m && <><span onClick={() => go('browseExperts')} style={{ cursor: 'pointer', color: MUTED, fontWeight: 500 }}>Experts</span>
            <span onClick={() => go('browseOpps')} style={{ cursor: 'pointer', color: MUTED, fontWeight: 500 }}>Opportunities</span></>}
            <button onClick={() => go('signin')} style={{ ...ghost(), padding: m ? '8px 12px' : '11px 18px' }}>Sign in</button>
            <button onClick={() => go('signup')} style={{ ...primary(), padding: m ? '8px 12px' : '11px 18px' }}>Get started</button>
          </div>
        </div>
      </nav>
      <header style={{ maxWidth: 1100, margin: '0 auto', padding: m ? '40px 20px 32px' : '76px 24px 40px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1.1fr .9fr', gap: m ? 32 : 48, alignItems: 'center' }}>
          <div>
            <Pill>Trusted expertise marketplace</Pill>
            <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: m ? 38 : 'clamp(40px,6vw,68px)', lineHeight: 1.04, letterSpacing: '-.03em', margin: '20px 0 0' }}>Access expertise <em style={{ fontStyle: 'italic', color: MOSS }}>on demand.</em></h1>
            <p style={{ fontSize: m ? 16.5 : 19, color: MUTED, maxWidth: '50ch', margin: '20px 0 28px', lineHeight: 1.55 }}>Engage verified experts, advisors and specialists through secure, milestone-based engagements. Deploy expertise — not headcount.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => go('browseExperts')} style={{ ...primary(true), flex: m ? '1 1 100%' : 'none' }}>Browse Expertise →</button>
              <button onClick={() => go('signup')} style={{ ...ghost(true), flex: m ? '1 1 100%' : 'none' }}>Become an Expert</button>
            </div>
            <div style={{ display: 'flex', gap: m ? 18 : 28, marginTop: m ? 32 : 46, paddingTop: m ? 22 : 28, borderTop: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
              <Trust n="Escrow" l="Funds released per milestone" /><Trust n="0–100" l="Trust Score on every profile" /><Trust n="15%" l="Flat platform fee" />
            </div>
          </div>
          {!m && <FloatCard />}
        </div>
        <p style={{ marginTop: m ? 28 : 40, fontSize: 12.5, color: MUTED, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 14px' }}>
          ▶ Clickable demo. <b>Browse</b> without an account, <b>sign up</b> as any role, then use the role-switcher to play both sides of an engagement.
        </p>
      </header>
    </div>
  );
}

function FloatCard() {
  return <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 20, padding: 24, boxShadow: '0 24px 60px -28px rgba(12,31,26,.3)', position: 'relative', animation: 'rise .6s ease both' }}>
    <span style={{ position: 'absolute', top: 24, right: 24, fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', color: MOSS, background: 'rgba(31,77,63,.1)', padding: '5px 10px', borderRadius: 6 }}>✓ VERIFIED</span>
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
      <Avatar name="Eleanor Voss" size={54} />
      <div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>Fractional CMO</div><div style={{ fontSize: 13.5, color: MUTED }}>Available now · Remote</div></div>
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>{['Growth Strategy', 'B2B SaaS', 'Fractional'].map(t => <span key={t} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 7, background: PAPER2, fontWeight: 500 }}>{t}</span>)}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 13, color: MUTED }}>Trust Score</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 120, height: 7, borderRadius: 100, background: PAPER2, overflow: 'hidden' }}><div style={{ height: '100%', width: '94%', background: `linear-gradient(90deg,${MOSS},${SAND})` }} /></div>
        <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>94</span>
      </div>
    </div>
  </div>;
}

/* ---------------- PUBLIC BROWSE (logged-out) ---------------- */
function PublicNav({ go }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => go('home')} style={{ cursor: 'pointer' }}><Logo small /></div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          <span onClick={() => go('browseExperts')} style={{ cursor: 'pointer', color: MUTED, fontWeight: 500 }}>Experts</span>
          <span onClick={() => go('browseOpps')} style={{ cursor: 'pointer', color: MUTED, fontWeight: 500 }}>Opportunities</span>
          <button onClick={() => go('signin')} style={ghost()}>Sign in</button>
          <button onClick={() => go('signup')} style={primary()}>Get started</button>
        </div>
      </div>
    </nav>
  );
}

function Gate({ go, noun, remaining }) {
  return (
    <div style={{ position: 'relative', marginTop: 18 }}>
      <div style={{ position: 'absolute', top: -96, left: 0, right: 0, height: 96, background: `linear-gradient(to bottom,transparent,${PAPER})`, pointerEvents: 'none' }} />
      <div style={{ background: MOSSDK, color: PAPER, borderRadius: 18, padding: 34, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <Glow t={-50} r={-50} c="rgba(201,168,106,.28)" />
        <div style={{ position: 'relative' }}>
          <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 23, margin: '0 0 8px' }}>{remaining}+ more {noun} await</h3>
          <p style={{ color: 'rgba(246,243,236,.75)', maxWidth: 440, margin: '0 auto 22px', lineHeight: 1.55, fontSize: 14.5 }}>Create a free account to see full profiles, filter by availability and budget, and engage through secure, milestone-based work.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => go('signup')} style={{ ...primary(true), background: PAPER, color: INK }}>Create free account →</button>
            <button onClick={() => go('signin')} style={{ ...ghost(true), color: PAPER, borderColor: 'rgba(246,243,236,.3)' }}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicShell({ go, children }) {
  return <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative' }}>
    <FontsAndGrain /><PublicNav go={go} />
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 80px', position: 'relative', zIndex: 2 }}>{children}</main>
  </div>;
}

function BrowseExperts({ go }) {
  const { experts } = useStore();
  const teaser = experts.slice(0, 6);
  return (
    <PublicShell go={go}>
      <Pill>Browse experts</Pill>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 36, letterSpacing: '-.02em', margin: '18px 0 8px' }}>Verified expertise, on demand</h1>
      <p style={{ color: MUTED, fontSize: 17, maxWidth: '60ch', margin: '0 0 28px', lineHeight: 1.5 }}>A preview of the experts and company resources on Sekondment. Create a free account to see full profiles, reviews, and filters.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {teaser.map(e => <div key={e.id} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, display: 'flex', gap: 15, alignItems: 'center' }}>
          <Avatar name={e.name} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5 }}>{e.name}</span>
              {e.verified && <Badge>✓ VERIFIED</Badge>}
              {e.company && <span style={{ fontSize: 11.5, color: SAND, fontWeight: 600 }}>Company Resource</span>}
            </div>
            <div style={{ color: MUTED, fontSize: 13.5, margin: '2px 0 8px' }}>{e.headline}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{e.skills.map(s => <Tag key={s}>{s}</Tag>)}</div>
          </div>
          <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.trust}</div><div style={{ fontSize: 11.5, color: MUTED }}>Trust</div></div>
        </div>)}
      </div>
      <Gate go={go} noun="experts" remaining={18} />
    </PublicShell>
  );
}

function BrowseOpps({ go }) {
  const { opps } = useStore();
  const teaser = opps.slice(0, 6);
  return (
    <PublicShell go={go}>
      <Pill>Open opportunities</Pill>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 36, letterSpacing: '-.02em', margin: '18px 0 8px' }}>Work worth doing</h1>
      <p style={{ color: MUTED, fontSize: 17, maxWidth: '60ch', margin: '0 0 28px', lineHeight: 1.5 }}>A preview of open opportunities from businesses on Sekondment. Create a free expert account to submit proposals.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {teaser.map(o => <div key={o.id} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: MOSS, textTransform: 'uppercase', letterSpacing: '.04em' }}>{o.outcome}</span>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5, margin: '4px 0 8px' }}>{o.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{o.expertise.map(x => <Tag key={x}>{x}</Tag>)}</div>
            </div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 600 }}>{o.budget}</div><div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{o.mode}</div></div>
          </div>
        </div>)}
      </div>
      <Gate go={go} noun="opportunities" remaining={12} />
    </PublicShell>
  );
}

/* ---------------- AUTH ---------------- */
function SignUp({ go, setRole }) {
  const [r, setR] = useState('business');
  const enter = () => { setRole(r); go(r === 'employer_partner' ? 'partner' : 'dashboard'); };
  const ROLES = [['business', 'Business'], ['expert', 'Expert'], ['employer_partner', 'Employer']];
  const blurb = { business: 'Find and engage verified experts through secure, milestone-based work.', expert: 'Deploy your expertise and find opportunities worth doing.', employer_partner: 'Deploy your employees through Sekondment and earn commission on their work.' };
  return (
    <AuthShell go={go} title="Create your account" sub="Deploy expertise, not headcount.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: 5, background: PAPER2, borderRadius: 12, marginBottom: 18 }}>
        {ROLES.map(([v, l]) => <button key={v} onClick={() => setR(v)} style={{ padding: '10px 4px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: r === v ? '#fff' : 'transparent', color: r === v ? INK : MUTED, boxShadow: r === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>{l}</button>)}
      </div>
      <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px', lineHeight: 1.5 }}>{blurb[r]}</p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <button onClick={enter} style={ghost()}>Continue with Google</button>
        <button onClick={enter} style={ghost()}>Continue with LinkedIn</button>
      </div>
      <Divider />
      <Field label={r === 'expert' ? 'Full name' : 'Company name'}><Inp placeholder={r === 'expert' ? 'Jane Doe' : 'Acme Studio'} /></Field>
      <Field label="Work email"><Inp placeholder="you@company.com" /></Field>
      <Field label="Password"><Inp type="password" placeholder="••••••••" /></Field>
      <button onClick={enter} style={{ ...primary(true), width: '100%', marginTop: 4 }}>Create account →</button>
      <p style={{ textAlign: 'center', fontSize: 13.5, color: MUTED, marginTop: 16 }}>Already have an account? <span onClick={() => go('signin')} style={{ color: MOSS, cursor: 'pointer', fontWeight: 500 }}>Sign in</span></p>
    </AuthShell>
  );
}

function SignIn({ go, setRole }) {
  const enter = (r) => { setRole(r); go(r === 'employer_partner' ? 'partner' : r === 'admin' ? 'adminDisputes' : 'dashboard'); };
  return (
    <AuthShell go={go} title="Welcome back" sub="Sign in to your account.">
      <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <button onClick={() => enter('business')} style={ghost()}>Continue with Google</button>
        <button onClick={() => enter('business')} style={ghost()}>Continue with LinkedIn</button>
      </div>
      <Divider />
      <Field label="Email"><Inp placeholder="you@company.com" /></Field>
      <Field label="Password"><Inp type="password" placeholder="••••••••" /></Field>
      <button onClick={() => enter('business')} style={{ ...primary(true), width: '100%', marginTop: 4 }}>Sign in →</button>
      <div style={{ marginTop: 18, padding: 14, background: PAPER2, borderRadius: 11 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>Demo — sign in as</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[['business', 'Business'], ['expert', 'Expert'], ['employer_partner', 'Employer'], ['admin', 'Admin']].map(([r, l]) => <button key={r} onClick={() => enter(r)} style={{ ...ghost(), fontSize: 13, padding: '7px 12px' }}>{l}</button>)}
        </div>
      </div>
    </AuthShell>
  );
}

function AuthShell({ go, title, sub, children }) {
  return <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
    <FontsAndGrain /><Glow t={-200} r={-150} c="rgba(31,77,63,.08)" />
    <nav style={{ padding: '20px 24px', position: 'relative', zIndex: 2 }}><div onClick={() => go('home')} style={{ cursor: 'pointer', display: 'inline-block' }}><Logo /></div></nav>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px 60px', position: 'relative', zIndex: 2 }}>
      <div style={{ width: 'min(440px,100%)' }}>
        <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 32, letterSpacing: '-.02em', margin: '0 0 6px' }}>{title}</h1>
        <p style={{ color: MUTED, fontSize: 15.5, margin: '0 0 26px' }}>{sub}</p>
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, padding: 28 }}>{children}</div>
      </div>
    </div>
  </div>;
}
function Divider() { return <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 18px', color: MUTED, fontSize: 13 }}><span style={{ height: 1, flex: 1, background: LINE }} />or<span style={{ height: 1, flex: 1, background: LINE }} /></div>; }

/* ---------------- APP FRAME ---------------- */
function AppFrame({ role, route, go, setRole, children }) {
  const m = useMobile();
  const NAV = {
    business: [['dashboard', 'Dashboard'], ['discover', 'Find Experts'], ['opps', 'Opportunities']],
    expert: [['dashboard', 'Dashboard'], ['opps', 'Find Work']],
    employer_partner: [['partner', 'Dashboard']],
    admin: [['adminDisputes', 'Disputes'], ['adminVerify', 'Verification']],
  };
  const nav = NAV[role] ?? [];
  const roleLabel = { business: 'Business', expert: 'Expert', employer_partner: 'Employer Partner', admin: 'Admin' }[role];
  const canSwitch = role === 'business' || role === 'expert';

  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative' }}>
      <FontsAndGrain />
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: m ? '0 16px' : '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: m ? 14 : 28, overflowX: m ? 'auto' : 'visible' }}>
          <div onClick={() => go(role === 'employer_partner' ? 'partner' : role === 'admin' ? 'adminDisputes' : 'dashboard')} style={{ cursor: 'pointer', flex: 'none' }}><Logo small /></div>
          <div style={{ display: 'flex', gap: m ? 14 : 22, flex: 'none' }}>
            {nav.map(([n, l]) => <span key={n} onClick={() => go(n)} style={{ cursor: 'pointer', fontSize: 14, fontWeight: route.name === n ? 600 : 500, color: route.name === n ? INK : MUTED, whiteSpace: 'nowrap' }}>{l}</span>)}
          </div>
          <span style={{ flex: 1, minWidth: m ? 8 : 0 }} />
          {!m && <span style={{ fontSize: 12.5, color: MUTED, background: PAPER2, padding: '4px 11px', borderRadius: 100, flex: 'none' }}>{roleLabel}</span>}
          <span onClick={() => { setRole(null); go('home'); }} style={{ cursor: 'pointer', fontSize: 14, color: MUTED, flex: 'none' }}>Exit</span>
        </div>
      </nav>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: m ? '20px 16px 110px' : '32px 24px 90px', position: 'relative', zIndex: 2 }}>{children}</main>

      {canSwitch && (
        <div style={{ position: 'fixed', bottom: m ? 12 : 20, right: m ? 12 : 20, left: m ? 12 : 'auto', zIndex: 100, background: INK, color: PAPER, borderRadius: 14, padding: 10, boxShadow: '0 16px 40px -12px rgba(12,31,26,.5)', display: 'flex', gap: 6, alignItems: 'center', justifyContent: m ? 'center' : 'flex-start' }}>
          <span style={{ fontSize: 12, color: 'rgba(246,243,236,.6)', padding: '0 6px' }}>View as</span>
          {[['business', 'Business'], ['expert', 'Expert']].map(([r, l]) => (
            <button key={r} onClick={() => { setRole(r); go(r === 'business' && route.name === 'partner' ? 'dashboard' : route.name); }}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: role === r ? PAPER : 'transparent', color: role === r ? INK : PAPER, flex: m ? 1 : 'none' }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- DASHBOARD (business/expert) ---------------- */
function Dashboard({ role, go }) {
  const { opps, engagements } = useStore();
  const m = useMobile();
  const isB = role === 'business';
  return (
    <Fade>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div><p style={{ color: MUTED, fontSize: 14, margin: '0 0 4px' }}>Welcome back</p><H1>{isB ? 'Acme SaaS' : 'Eleanor Voss'}</H1></div>
        {isB ? <button onClick={() => go('newopp')} style={{ ...primary(), width: m ? '100%' : 'auto' }}>+ Create Opportunity</button> : <button onClick={() => go('opps')} style={{ ...primary(), width: m ? '100%' : 'auto' }}>Browse Opportunities</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(3,1fr)' : 'repeat(3,1fr)', gap: m ? 10 : 14, marginBottom: 24 }}>
        <Tile label={isB ? 'Open Opportunities' : 'Available Opportunities'} value={opps.length} onClick={() => go('opps')} />
        <Tile label="Active Engagements" value={engagements.filter(e => e.status !== 'complete').length} onClick={() => engagements[0] && go('engagement', { id: engagements[0].id })} />
        <Tile label={isB ? 'Verified Experts' : 'Trust Score'} value={isB ? '4' : '94'} onClick={() => isB && go('discover')} />
      </div>
      {engagements.length > 0 ? (
        <>
          <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>Your engagements</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {engagements.map(e => <Card key={e.id} onClick={() => go('engagement', { id: e.id })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 600, fontSize: 15.5 }}>{e.title}</div><div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{e.expertName}{e.company && ` · via ${e.company}`}</div></div>
                <Status s={e.status === 'complete' ? 'complete' : 'active'} />
              </div>
            </Card>)}
          </div>
        </>
      ) : <Empty>{isB ? 'No engagements yet. Find an expert or post an opportunity to begin.' : 'No engagements yet. Browse opportunities and submit a proposal.'}</Empty>}
    </Fade>
  );
}

/* ---------------- DISCOVER ---------------- */
function Discover({ go }) {
  const { experts } = useStore();
  const [q, setQ] = useState('');
  const results = useMemo(() => experts.filter(e => !q || `${e.name} ${e.headline} ${e.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase())), [q, experts]);
  return (
    <Fade>
      <H1>Find expertise</H1>
      <p style={{ color: MUTED, margin: '6px 0 22px' }}>Browse verified experts and company resources.</p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, role or skill…" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 11, border: `1px solid ${LINE}`, background: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 20 }} />
      <div style={{ display: 'grid', gap: 12 }}>
        {results.map(e => <Card key={e.id} onClick={() => go('expert', { id: e.id })}>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <Avatar name={e.name} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5 }}>{e.name}</span>
                {e.verified && <Badge>✓ VERIFIED</Badge>}
                {e.company && <span style={{ fontSize: 11.5, color: SAND, fontWeight: 600 }}>via {e.company}</span>}
              </div>
              <div style={{ color: MUTED, fontSize: 13.5, margin: '2px 0 8px' }}>{e.headline}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{e.skills.map(s => <Tag key={s}>{s}</Tag>)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.trust}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>Trust</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>£{e.daily}<span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>/day</span></div>
            </div>
          </div>
        </Card>)}
      </div>
    </Fade>
  );
}

function ExpertProfile({ id, go }) {
  const { experts, flash } = useStore();
  const e = experts.find(x => x.id === id);
  if (!e) return null;
  return (
    <Fade>
      <Back go={go} to="discover" label="Back to experts" />
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '16px 0 20px' }}>
        <Avatar name={e.name} size={70} />
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 26, margin: 0 }}>{e.name}</h1>{e.verified && <Badge>✓ VERIFIED</Badge>}</div>
          <div style={{ color: MUTED, fontSize: 15, marginTop: 3 }}>{e.headline}</div>
        </div>
      </div>
      {e.company && <Note>This is a <b>Company Resource</b> — deployed via {e.company}, who receives payment. {e.name} stays employed by {e.company}.</Note>}
      <p style={{ color: MUTED, lineHeight: 1.6, margin: '16px 0' }}>{e.bio}</p>
      <div style={{ display: 'flex', gap: 12, margin: '18px 0' }}>
        <MiniStat label="Trust Score" value={e.trust} /><MiniStat label="Day rate" value={`£${e.daily}`} /><MiniStat label="Reviews" value={e.reviews} />
      </div>
      <Section title="Skills"><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{e.skills.map(s => <span key={s} style={{ fontSize: 13, padding: '5px 11px', borderRadius: 7, background: '#fff', border: `1px solid ${LINE}` }}>{s}</span>)}</div></Section>
      <button onClick={() => { flash(`Invitation sent to ${e.name.split(' ')[0]}`); go('opps'); }} style={{ ...primary(true), marginTop: 16 }}>Engage {e.name.split(' ')[0]} →</button>
    </Fade>
  );
}

/* ---------------- OPPORTUNITIES ---------------- */
function OppList({ role, go }) {
  const { opps } = useStore();
  const isB = role === 'business';
  return (
    <Fade>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <H1>{isB ? 'Your opportunities' : 'Open opportunities'}</H1>
        {isB && <button onClick={() => go('newopp')} style={primary()}>+ Create</button>}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {opps.map(o => <Card key={o.id} onClick={() => go('opp', { id: o.id })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: MOSS, textTransform: 'uppercase', letterSpacing: '.04em' }}>{o.outcome}</span>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, margin: '4px 0 8px' }}>{o.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{o.expertise.map(x => <Tag key={x}>{x}</Tag>)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{o.budget}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{o.mode}</div>
              {o.proposals.length > 0 && <div style={{ fontSize: 12, color: MOSS, fontWeight: 600, marginTop: 6 }}>{o.proposals.length} proposal{o.proposals.length > 1 ? 's' : ''}</div>}
            </div>
          </div>
        </Card>)}
      </div>
    </Fade>
  );
}

function OppDetail({ id, role, go }) {
  const { opps, addProposal, createEngagement, flash } = useStore();
  const o = opps.find(x => x.id === id);
  const [proposing, setProposing] = useState(false);
  const [price, setPrice] = useState('5000'); const [timeline, setTimeline] = useState('4 weeks'); const [msg, setMsg] = useState('');
  if (!o) return null;
  const isB = role === 'business';
  const accept = (p) => {
    const eid = createEngagement({ title: o.title, expertName: p.expertName, company: p.company, payeeType: p.company ? 'business' : 'expert',
      milestones: [{ title: 'Discovery', amount: Math.round(p.price * 0.2) }, { title: 'Delivery', amount: Math.round(p.price * 0.5) }, { title: 'Completion', amount: p.price - Math.round(p.price * 0.2) - Math.round(p.price * 0.5) }] });
    flash('Proposal accepted — engagement created'); go('engagement', { id: eid });
  };
  return (
    <Fade>
      <Back go={go} to="opps" label="Back to opportunities" />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: MOSS, textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginTop: 16 }}>{o.outcome}</span>
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 26, margin: '4px 0 10px' }}>{o.title}</h1>
      <div style={{ display: 'flex', gap: 14, color: MUTED, fontSize: 14, marginBottom: 18 }}><span>💷 {o.budget}</span><span>📍 {o.mode}</span><span>🏢 {o.business}</span></div>
      {!isB && (
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 22 }}>
          {!proposing ? <>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, margin: '0 0 8px' }}>Interested?</h3>
            <p style={{ color: MUTED, fontSize: 14, margin: '0 0 16px' }}>Submit a proposal with your price and timeline.</p>
            <button onClick={() => setProposing(true)} style={primary(true)}>Submit a proposal →</button>
          </> : <>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, margin: '0 0 16px' }}>Your proposal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Total price (£)"><Inp value={price} onChange={setPrice} type="number" /></Field>
              <Field label="Timeline"><Inp value={timeline} onChange={setTimeline} /></Field>
            </div>
            <Field label="Cover message"><textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} placeholder="Why you're a strong fit…" style={inpStyle(true)} /></Field>
            <button onClick={() => { addProposal(o.id, { expertName: 'Eleanor Voss', company: null, price: +price, timeline, msg }); flash('Proposal submitted'); setProposing(false); }} style={{ ...primary(true), marginTop: 6 }}>Send proposal →</button>
          </>}
        </div>
      )}
      {isB && (
        <div>
          <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '0 0 12px' }}>Proposals ({o.proposals.length})</h3>
          {o.proposals.length === 0 && <Empty>No proposals yet. Switch to Expert (bottom-right) and submit one, then come back.</Empty>}
          <div style={{ display: 'grid', gap: 12 }}>
            {o.proposals.map(p => <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', gap: 13 }}>
                  <Avatar name={p.expertName} />
                  <div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 15.5 }}>{p.expertName}</div><div style={{ fontSize: 13.5, color: MUTED, margin: '3px 0' }}>£{(+p.price).toLocaleString()} · {p.timeline}</div>{p.msg && <div style={{ fontSize: 13.5 }}>{p.msg}</div>}</div>
                </div>
                {p.status === 'accepted' ? <Status s="complete" label="Accepted" /> : <button onClick={() => accept(p)} style={primary()}>Accept →</button>}
              </div>
            </Card>)}
          </div>
        </div>
      )}
    </Fade>
  );
}

function NewOpp({ go }) {
  const { addOpp, flash } = useStore();
  const [title, setTitle] = useState(''); const [outcome, setOutcome] = useState('Launch a product'); const [budget, setBudget] = useState('');
  const OUT = ['Launch a product', 'Deliver a project', 'Improve marketing', 'Fill a leadership gap', 'Reduce costs', 'Growth initiative'];
  return (
    <Fade>
      <Back go={go} to="opps" label="Cancel" />
      <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 30, margin: '16px 0 6px', letterSpacing: '-.02em' }}>Create an <em style={{ fontStyle: 'italic', color: MOSS }}>opportunity</em></h1>
      <p style={{ color: MUTED, margin: '0 0 22px' }}>Start with the outcome you want.</p>
      <Field label="What are you trying to achieve?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{OUT.map(o => <Chip key={o} active={outcome === o} onClick={() => setOutcome(o)}>{o}</Chip>)}</div>
      </Field>
      <Field label="Title"><Inp value={title} onChange={setTitle} placeholder="e.g. Fractional CMO for our Q3 launch" /></Field>
      <Field label="Budget range"><Inp value={budget} onChange={setBudget} placeholder="e.g. £6,000–£9,000" /></Field>
      <button disabled={title.trim().length < 3} onClick={() => { addOpp({ title, outcome, expertise: ['Strategy'], budget: budget || 'Flexible', mode: 'Remote', business: 'Acme SaaS' }); flash('Opportunity published'); go('opps'); }} style={{ ...primary(true), marginTop: 8, opacity: title.trim().length < 3 ? 0.5 : 1 }}>Publish →</button>
    </Fade>
  );
}

/* ---------------- ENGAGEMENT + ESCROW + DISPUTE ---------------- */
function Engagement({ id, role, go }) {
  const { engagements, updateEngagement, addDispute, flash } = useStore();
  const m = useMobile();
  const e = engagements.find(x => x.id === id);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  if (!e) return <Empty>Engagement not found. <span onClick={() => go('dashboard')} style={{ color: MOSS, cursor: 'pointer' }}>Back</span></Empty>;
  const isB = role === 'business';
  const FEE = 0.15;
  const total = e.milestones.reduce((a, m) => a + m.amount, 0);
  const released = e.milestones.filter(m => m.status === 'released').reduce((a, m) => a + m.amount, 0);
  const inEscrow = e.milestones.filter(m => ['funded', 'submitted'].includes(m.status)).reduce((a, m) => a + m.amount, 0);
  const act = (mid, status, ledger, msg) => { updateEngagement(e.id, eng => { const milestones = eng.milestones.map(m => m.id === mid ? { ...m, status } : m); const allDone = milestones.every(m => m.status === 'released'); return { ...eng, milestones, ledger: ledger ? [...ledger, ...eng.ledger] : eng.ledger, status: allDone ? 'complete' : 'active' }; }); flash(msg); };
  const fund = (m) => act(m.id, 'funded', [{ id: Date.now(), label: `Funded "${m.title}"`, amount: m.amount, dir: 'in' }], `£${m.amount.toLocaleString()} funded`);
  const submit = (m) => act(m.id, 'submitted', null, `Work submitted`);
  const release = (m) => { const fee = Math.round(m.amount * FEE), net = m.amount - fee; act(m.id, 'released', [{ id: Date.now() + 2, label: e.company ? `Transfer to ${e.company}` : `Transfer to ${e.expertName}`, amount: net, dir: 'out' }, { id: Date.now() + 1, label: `Platform fee`, amount: fee, dir: 'fee' }], `£${m.amount.toLocaleString()} released`); };
  const SM = { pending: ['Not funded', MUTED], funded: ['In escrow', AMBER], submitted: ['Awaiting approval', AMBER], released: ['Released', GREEN] };

  return (
    <Fade>
      <Back go={go} to="dashboard" label="Back to dashboard" />
      <div style={{ background: MOSSDK, color: PAPER, borderRadius: 18, padding: '24px 26px', position: 'relative', overflow: 'hidden', margin: '16px 0 20px' }}>
        <Glow t={-50} r={-50} c="rgba(201,168,106,.28)" />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: SAND }}>{e.status === 'complete' ? 'Completed' : 'Active'} Engagement</span>
            <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 21, marginTop: 5 }}>{e.title}</div>
            <div style={{ fontSize: 13.5, color: 'rgba(246,243,236,.7)', marginTop: 4 }}>{e.expertName}{e.company && <> · <span style={{ color: SAND }}>via {e.company}</span></>}</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <HStat label="Total" value={`£${total.toLocaleString()}`} /><HStat label="In escrow" value={`£${inEscrow.toLocaleString()}`} c={AMBER} /><HStat label="Released" value={`£${released.toLocaleString()}`} c={SAND} />
          </div>
        </div>
        <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,.14)', overflow: 'hidden', marginTop: 18 }}><div style={{ height: '100%', width: `${(released / total) * 100}%`, background: `linear-gradient(90deg,${MOSS2},${SAND})`, transition: 'width .5s' }} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 300px', gap: 20, alignItems: 'start' }}>
        <div>
          <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '4px 0 12px' }}>Milestones</h2>
          <div style={{ display: 'grid', gap: 11 }}>
            {e.milestones.map((m, i) => {
              const [lbl, col] = SM[m.status];
              return <Card key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: m.status === 'released' ? MOSS : PAPER2, color: m.status === 'released' ? '#fff' : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 13, flex: 'none' }}>{m.status === 'released' ? '✓' : i + 1}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</div><span style={{ fontSize: 11.5, fontWeight: 600, color: col, marginTop: 5, display: 'inline-block' }}>● {lbl}</span></div>
                  </div>
                  <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16 }}>£{m.amount.toLocaleString()}</div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  {isB && m.status === 'pending' && <Btn onClick={() => fund(m)} primary>Fund into escrow →</Btn>}
                  {!isB && m.status === 'pending' && <Hint>Waiting for business to fund</Hint>}
                  {!isB && m.status === 'funded' && <Btn onClick={() => submit(m)} primary>Submit work →</Btn>}
                  {isB && m.status === 'funded' && <Hint>Funded — awaiting submission</Hint>}
                  {isB && m.status === 'submitted' && <Btn onClick={() => release(m)} primary>Approve & release →</Btn>}
                  {!isB && m.status === 'submitted' && <Hint>Submitted — awaiting approval</Hint>}
                  {m.status === 'released' && <Hint done>Released{e.company ? ` to ${e.company}` : ''}</Hint>}
                </div>
              </Card>;
            })}
          </div>

          {/* dispute */}
          <div style={{ marginTop: 16, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 15, margin: 0 }}>Disputes</h3>
              {inEscrow > 0 && !disputeOpen && <button onClick={() => setDisputeOpen(true)} style={{ fontSize: 13, color: RED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Raise a dispute</button>}
            </div>
            {disputeOpen && <div style={{ marginTop: 12 }}>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2} placeholder="Describe the issue — an admin will review." style={inpStyle(true)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn primary onClick={() => { addDispute({ engagement: e.title, reason: disputeReason, raisedBy: isB ? 'business' : 'expert' }); flash('Dispute raised — admin notified'); setDisputeOpen(false); setDisputeReason(''); }}>Submit</Btn>
                <Btn onClick={() => setDisputeOpen(false)}>Cancel</Btn>
              </div>
            </div>}
            {!disputeOpen && inEscrow === 0 && <p style={{ fontSize: 13, color: MUTED, margin: '8px 0 0' }}>Disputes can be raised on funded milestones.</p>}
          </div>

          {e.status === 'complete' && !e.reviewed && (
            <div style={{ marginTop: 14, background: 'rgba(31,77,63,.06)', border: `1px solid rgba(31,77,63,.25)`, borderRadius: 14, padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, color: MOSS }}>Engagement complete 🎉</div>
              <p style={{ fontSize: 13.5, color: MUTED, margin: '4px 0 14px' }}>All milestones released. Leave a review to close the loop.</p>
              <button onClick={() => { updateEngagement(e.id, eng => ({ ...eng, reviewed: true })); flash('Review submitted'); }} style={primary(true)}>Leave a review →</button>
            </div>
          )}
          {e.reviewed && <Note>✓ Review submitted. This engagement is fully closed.</Note>}
        </div>

        <div style={{ position: m ? 'static' : 'sticky', top: 78, display: 'grid', gap: 14 }}>
          <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 15, padding: 18 }}>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 15, margin: '0 0 12px' }}>How a milestone splits</h3>
            {(() => { const ex = 2000, fee = ex * FEE, net = ex - fee; const rows = [['Client pays', ex, INK], ['Platform fee (15%)', -fee, MUTED], [e.company || e.expertName, net, MOSS]]; return rows.map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? `1px solid ${LINE}` : 'none', fontSize: 13.5 }}><span style={{ color: r[2] === INK ? INK : MUTED, fontWeight: r[2] === INK ? 600 : 400 }}>{r[0]}</span><span style={{ fontWeight: 600, color: r[2] }}>{r[1] < 0 ? '−' : ''}£{Math.abs(r[1]).toLocaleString()}</span></div>); })()}
            <p style={{ fontSize: 11, color: MUTED, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>{e.company ? `Funds route to ${e.company}.` : 'Funds route to the expert.'} Example on £2,000.</p>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 15, padding: 18 }}>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>Escrow ledger</h3>
            <p style={{ fontSize: 11.5, color: MUTED, margin: '0 0 10px' }}>Every movement, on the record.</p>
            {e.ledger.length === 0 ? <p style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic', margin: 0 }}>Fund a milestone to begin.</p>
              : <div style={{ display: 'grid', gap: 7 }}>{e.ledger.map(l => <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: MUTED }}>{l.label}</span><span style={{ fontWeight: 600, color: l.dir === 'in' ? AMBER : l.dir === 'fee' ? MUTED : MOSS, flex: 'none' }}>{l.dir === 'in' ? '+' : l.dir === 'fee' ? '−' : '→'}£{l.amount.toLocaleString()}</span></div>)}</div>}
          </div>
        </div>
      </div>
    </Fade>
  );
}

/* ---------------- EMPLOYER PARTNER ---------------- */
function PartnerDashboard({ go }) {
  const { employees, setEmployeeStatus, flash } = useStore();
  const m = useMobile();
  const [invite, setInvite] = useState(false);
  const pending = employees.filter(e => e.status === 'pending');
  const approved = employees.filter(e => e.status === 'approved');
  const totalDeployments = employees.reduce((a, e) => a + e.deployments, 0);
  const commission = employees.reduce((a, e) => a + e.earned * e.commission, 0);
  const SM = { pending: ['Awaiting approval', AMBER], approved: ['Approved', GREEN], suspended: ['Suspended', MUTED], revoked: ['Declined', RED] };

  return (
    <Fade>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div><p style={{ color: MUTED, fontSize: 14, margin: '0 0 4px' }}>Partner dashboard</p><H1>Northpoint Studio</H1></div>
        <button onClick={() => setInvite(true)} style={{ ...primary(), width: m ? '100%' : 'auto' }}>+ Register employee</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: m ? 10 : 14, marginBottom: 16 }}>
        <Tile label="Active employees" value={approved.length} />
        <Tile label="Deployments" value={totalDeployments} />
        <Tile label="Pending approval" value={pending.length} />
        <Tile label="Commission earned" value={`£${Math.round(commission).toLocaleString()}`} accent />
      </div>
      {pending.length > 0 && <div style={{ background: 'rgba(184,134,47,.08)', border: `1px solid rgba(184,134,47,.3)`, borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(184,134,47,.15)', color: AMBER, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{pending.length}</span>
        <span style={{ fontSize: 14.5 }}><b>{pending.length} employee{pending.length > 1 ? 's' : ''}</b> awaiting approval before they can be deployed.</span>
      </div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {employees.map(e => { const [lbl, col] = SM[e.status]; return <Card key={e.id}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: m ? 'wrap' : 'nowrap' }}>
            <Avatar name={e.name} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16 }}>{e.name}</span><span style={{ fontSize: 11.5, fontWeight: 600, color: col }}>● {lbl}</span></div>
              <div style={{ color: MUTED, fontSize: 13.5, margin: '2px 0 8px' }}>{e.headline}</div>
              <div style={{ display: 'flex', gap: 6 }}>{e.skills.map(s => <Tag key={s}>{s}</Tag>)}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: MUTED }}>
              <div><b style={{ color: INK }}>{Math.round(e.commission * 100)}%</b> commission</div>
              {e.earned > 0 && <div style={{ color: MOSS, fontWeight: 500, marginTop: 3 }}>£{Math.round(e.earned * e.commission).toLocaleString()} earned</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {e.status === 'pending' && <><Btn primary onClick={() => { setEmployeeStatus(e.id, 'approved'); flash(`${e.name.split(' ')[0]} approved`); }}>Approve</Btn><Btn onClick={() => { setEmployeeStatus(e.id, 'revoked'); flash('Declined'); }}>Decline</Btn></>}
              {e.status === 'approved' && <Btn onClick={() => { setEmployeeStatus(e.id, 'suspended'); flash('Suspended'); }}>Suspend</Btn>}
              {e.status === 'suspended' && <Btn primary onClick={() => { setEmployeeStatus(e.id, 'approved'); flash('Reinstated'); }}>Reinstate</Btn>}
            </div>
          </div>
        </Card>; })}
      </div>
      <div style={{ marginTop: 22, background: MOSSDK, color: PAPER, borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
        <Glow t={-40} r={-40} c="rgba(201,168,106,.25)" />
        <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, margin: '0 0 10px', position: 'relative' }}>How your commission works</h3>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(246,243,236,.8)', margin: 0, maxWidth: '64ch', position: 'relative' }}>Client pays into escrow → Sekondment takes 15% → funds route to you → you keep your commission and pass the rest to your employee, who stays on your payroll throughout.</p>
      </div>
      {invite && <Modal onClose={() => setInvite(false)} title="Register an employee" desc="Invite an employee by their expert account email. They build a profile; you approve before any deployment.">
        <Field label="Employee email"><Inp placeholder="employee@northpoint.com" /></Field>
        <Btn primary onClick={() => { setInvite(false); flash('Invitation sent'); }}>Send invitation</Btn>
      </Modal>}
    </Fade>
  );
}

/* ---------------- ADMIN ---------------- */
function AdminDisputes({ go }) {
  const { disputes, resolveDispute, flash } = useStore();
  const open = disputes.filter(d => d.status === 'open');
  const resolved = disputes.filter(d => d.status !== 'open');
  return (
    <Fade>
      <H1>Dispute resolution</H1>
      <p style={{ color: MUTED, margin: '6px 0 24px' }}>Review evidence and resolve. Resolution moves real funds in production.</p>
      <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '0 0 14px' }}>Needs action ({open.length})</h2>
      {open.length === 0 ? <Empty>No open disputes. Raise one from an engagement (as Business or Expert) to see it appear here.</Empty>
        : <div style={{ display: 'grid', gap: 14 }}>{open.map(d => <Card key={d.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16 }}>{d.engagement}</div><div style={{ fontSize: 12.5, color: MUTED }}>Raised by {d.raisedBy}</div></div><Status s="active" label="Open" /></div>
          <div style={{ background: PAPER, borderRadius: 10, padding: 12, fontSize: 13.5, marginBottom: 14 }}>{d.reason}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <Btn primary onClick={() => { resolveDispute(d.id, 'release'); flash('Released to payee'); }}>Release</Btn>
            <Btn onClick={() => { resolveDispute(d.id, 'split'); flash('Released with split'); }}>Split</Btn>
            <Btn onClick={() => { resolveDispute(d.id, 'refund'); flash('Refunded to business'); }}>Refund</Btn>
          </div>
        </Card>)}</div>}
      {resolved.length > 0 && <><h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, margin: '24px 0 14px' }}>Resolved ({resolved.length})</h2>
        <div style={{ display: 'grid', gap: 10 }}>{resolved.map(d => <Card key={d.id}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14 }}>{d.engagement}</span><Status s="complete" label={d.status.replace('resolved_', '')} /></div></Card>)}</div></>}
    </Fade>
  );
}

function AdminVerify({ go }) {
  const { experts, setExpertVerified, flash } = useStore();
  return (
    <Fade>
      <H1>Verification queue</H1>
      <p style={{ color: MUTED, margin: '6px 0 24px' }}>Verify experts. Each change recalculates their Trust Score.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {experts.map(e => <Card key={e.id}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Avatar name={e.name} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16 }}>{e.name}</span>{e.verified && <Badge>✓ VERIFIED</Badge>}</div>
              <div style={{ color: MUTED, fontSize: 13.5, marginTop: 2 }}>{e.headline} · Trust {e.trust}</div>
            </div>
            {e.verified
              ? <Btn onClick={() => { setExpertVerified(e.id, false); flash('Verification removed'); }}>Un-verify</Btn>
              : <Btn primary onClick={() => { setExpertVerified(e.id, true); flash(`${e.name.split(' ')[0]} verified · Trust Score recalculated`); }}>Verify</Btn>}
          </div>
        </Card>)}
      </div>
    </Fade>
  );
}

/* ---------------- shared UI ---------------- */
function FontsAndGrain() {
  return <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes fade{from{opacity:0}to{opacity:1}}*{box-sizing:border-box}*::selection{background:${SAND}55}`}</style>
    <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', zIndex: 1, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
  </>;
}
const Fade = ({ children }) => <div style={{ animation: 'fade .3s ease' }}>{children}</div>;
function Logo({ small }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: small ? 17 : 20 }}><span style={{ width: small ? 24 : 27, height: small ? 24 : 27, borderRadius: 7, background: MOSS, position: 'relative' }}><span style={{ position: 'absolute', top: small ? 6 : 7, right: small ? 6 : 7, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>Sekondment</div>; }
function Avatar({ name, size = 46 }) { const ini = name.split(' ').map(n => n[0]).join(''); return <div style={{ width: size, height: size, borderRadius: size * 0.27, background: `linear-gradient(135deg,${MOSS},${MOSS2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size * 0.36, flex: 'none' }}>{ini}</div>; }
function Glow({ t, r, c }) { return <div style={{ position: 'absolute', top: t, right: r, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle,${c},transparent 68%)`, pointerEvents: 'none' }} />; }
const H1 = ({ children }) => <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 32, letterSpacing: '-.02em', margin: 0 }}>{children}</h1>;
function Pill({ children }) { return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: MOSS, background: 'rgba(31,77,63,.08)', padding: '7px 14px', borderRadius: 100 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: MOSS }} />{children}</span>; }
function Trust({ n, l }) { return <div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 28 }}>{n}</div><div style={{ fontSize: 13, color: MUTED }}>{l}</div></div>; }
function Tile({ label, value, onClick, accent }) { return <div onClick={onClick} style={{ background: accent ? MOSS : '#fff', color: accent ? '#fff' : INK, border: `1px solid ${accent ? MOSS : LINE}`, borderRadius: 15, padding: 20, cursor: onClick ? 'pointer' : 'default' }}><div style={{ fontSize: 13, color: accent ? 'rgba(246,243,236,.7)' : MUTED, marginBottom: 6 }}>{label}</div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 28 }}>{value}</div></div>; }
function Card({ children, onClick }) { return <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s,box-shadow .2s' }} onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 34px -16px rgba(12,31,26,.2)'; } }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>{children}</div>; }
function MiniStat({ label, value }) { return <div style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19 }}>{value}</div><div style={{ fontSize: 11.5, color: MUTED }}>{label}</div></div>; }
function HStat({ label, value, c }) { return <div><div style={{ fontSize: 11, color: 'rgba(246,243,236,.55)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 20, marginTop: 3, color: c || PAPER }}>{value}</div></div>; }
function Section({ title, children }) { return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: MUTED, marginBottom: 9 }}>{title}</div>{children}</div>; }
function Field({ label, children }) { return <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 7 }}>{label}</label>{children}</div>; }
const inpStyle = (area) => ({ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1px solid ${LINE}`, background: '#fff', fontSize: 14.5, fontFamily: 'inherit', color: INK, outline: 'none', resize: area ? 'none' : undefined, lineHeight: 1.5 });
function Inp({ value, onChange, placeholder, type = 'text' }) { return onChange ? <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inpStyle(false)} /> : <input type={type} placeholder={placeholder} style={inpStyle(false)} />; }
function Btn({ children, onClick, primary: p }) { return <button onClick={onClick} style={{ padding: '9px 15px', borderRadius: 9, border: p ? 'none' : `1px solid ${LINE}`, background: p ? MOSS : '#fff', color: p ? '#fff' : INK, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{children}</button>; }
function Chip({ children, active, onClick }) { return <button onClick={onClick} style={{ padding: '9px 14px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${active ? MOSS : LINE}`, background: active ? MOSS : '#fff', color: active ? '#fff' : MUTED }}>{children}</button>; }
function Tag({ children }) { return <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 6, background: PAPER2, fontWeight: 500 }}>{children}</span>; }
function Badge({ children }) { return <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', color: MOSS, background: 'rgba(31,77,63,.1)', padding: '3px 8px', borderRadius: 5 }}>{children}</span>; }
function Hint({ children, done }) { return <span style={{ fontSize: 13, color: done ? MOSS : MUTED, fontWeight: done ? 500 : 400, fontStyle: done ? 'normal' : 'italic' }}>{done ? '✓ ' : ''}{children}</span>; }
function Back({ go, to, label }) { return <span onClick={() => go(to)} style={{ cursor: 'pointer', fontSize: 14, color: MUTED, fontWeight: 500 }}>← {label}</span>; }
function Note({ children }) { return <div style={{ background: 'rgba(201,168,106,.13)', border: `1px solid ${SAND}55`, borderRadius: 10, padding: '12px 15px', fontSize: 13.5, lineHeight: 1.5 }}>{children}</div>; }
function Empty({ children }) { return <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, fontSize: 14.5, lineHeight: 1.6 }}>{children}</div>; }
function Status({ s, label }) { const map = { active: [AMBER, 'rgba(184,134,47,.12)'], complete: [GREEN, 'rgba(31,77,63,.1)'] }; const [c, bg] = map[s] || map.active; return <span style={{ fontSize: 12, fontWeight: 600, color: c, background: bg, padding: '4px 10px', borderRadius: 7, textTransform: 'capitalize' }}>{label || s}</span>; }
function Modal({ title, desc, children, onClose }) { return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,31,26,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><div onClick={e => e.stopPropagation()} style={{ background: PAPER, borderRadius: 18, padding: 28, width: 'min(440px,100%)', boxShadow: '0 30px 70px -20px rgba(12,31,26,.5)' }}><h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22, margin: '0 0 6px' }}>{title}</h2><p style={{ color: MUTED, fontSize: 14, margin: '0 0 18px', lineHeight: 1.5 }}>{desc}</p>{children}</div></div>; }
function primary(lg) { return { padding: lg ? '14px 24px' : '11px 18px', borderRadius: lg ? 12 : 10, background: MOSS, color: '#fff', border: 'none', fontSize: lg ? 16 : 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }; }
function ghost(lg) { return { padding: lg ? '14px 24px' : '11px 18px', borderRadius: lg ? 12 : 10, background: 'transparent', color: INK, border: `1px solid ${LINE}`, fontSize: lg ? 16 : 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }; }
