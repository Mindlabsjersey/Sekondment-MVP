import React, { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* ============================================================================
   SEKONDMENT — Operations Centre (owner/staff only).
   Rich demo data across industries + account types, real charts, decision-framed.
   Brand: royal blue #1d4ed8 + gold #c8a24a, Fraunces serif. Mobile-first.
   ========================================================================== */

const BLUE = '#1d4ed8', GOLD = '#c8a24a', INK = '#0f1419', MUTED = '#5b6573';
const LINE = 'rgba(15,20,25,.08)', PAPER = '#f6f7f9', SURF = '#fff', GREEN = '#2f8f6b', RED = '#a14b3d';

const IND = {
  Technology: '#4f6bed', Finance: '#2f8f6b', Marketing: '#c2557a',
  Operations: '#2e8aa0', Legal: '#7c5cc4', Healthcare: '#c75f52', Creative: '#c08a3e', People: '#5a7a9e',
};

// ── DEMO DATA (rich, believable, multi-dimensional) ─────────────────────────
const REV_TREND = [
  { m: 'Jan', gmv: 18000, rev: 2700 }, { m: 'Feb', gmv: 24500, rev: 3675 },
  { m: 'Mar', gmv: 31200, rev: 4680 }, { m: 'Apr', gmv: 42800, rev: 6420 },
  { m: 'May', gmv: 51600, rev: 7740 }, { m: 'Jun', gmv: 67300, rev: 10095 },
];
const SIGNUPS = [
  { m: 'Jan', business: 6, expert: 14, partner: 1 }, { m: 'Feb', business: 9, expert: 19, partner: 2 },
  { m: 'Mar', business: 12, expert: 24, partner: 2 }, { m: 'Apr', business: 15, expert: 31, partner: 4 },
  { m: 'May', business: 19, expert: 38, partner: 5 }, { m: 'Jun', business: 26, expert: 47, partner: 7 },
];
const BY_INDUSTRY = [
  { name: 'Finance', value: 86200, users: 71 }, { name: 'Technology', value: 64800, users: 88 },
  { name: 'Marketing', value: 31500, users: 42 }, { name: 'Operations', value: 22400, users: 29 },
  { name: 'Legal', value: 18900, users: 19 }, { name: 'Healthcare', value: 11200, users: 14 },
  { name: 'Creative', value: 7600, users: 17 }, { name: 'People', value: 5300, users: 11 },
];
const ACCOUNT_MIX = [
  { name: 'Experts', value: 173, color: BLUE }, { name: 'Businesses', value: 87, color: GOLD },
  { name: 'Employer partners', value: 21, color: GREEN }, { name: 'Company resources', value: 34, color: '#7c5cc4' },
];
const REVENUE_SOURCE = [
  { name: 'Freelance experts', value: 58 }, { name: 'Company resources', value: 31 }, { name: 'Advisory', value: 11 },
];
const FUNNEL = [
  { stage: 'Signup', n: 315 }, { stage: 'Onboarded', n: 248 }, { stage: 'Profile complete', n: 201 },
  { stage: 'Expertise added', n: 167 }, { stage: 'Proposal', n: 112 }, { stage: 'Engagement', n: 64 },
  { stage: 'Funded', n: 51 }, { stage: 'Completed', n: 38 },
];
const DEMAND = [
  { name: 'Stripe Connect Implementation', req: 14, sup: 4, val: 12500 },
  { name: 'AML Review', req: 19, sup: 9, val: 14800 },
  { name: 'ISO27001 Implementation', req: 11, sup: 3, val: 18200 },
  { name: 'Microsoft 365 Migration', req: 9, sup: 7, val: 8600 },
  { name: 'Fractional CFO', req: 8, sup: 5, val: 22000 },
  { name: 'Trust Administration', req: 7, sup: 6, val: 9400 },
];
const GEO = [
  { c: 'Jersey', users: 92, rev: 78400 }, { c: 'United Kingdom', users: 121, rev: 96200 },
  { c: 'Ireland', users: 48, rev: 31500 }, { c: 'UAE (Dubai)', users: 37, rev: 28900 }, { c: 'Other', users: 17, rev: 12100 },
];
const CRM = [
  ['Channel Islands Bank', 'Finance', 'Demo booked', 25000, GOLD],
  ['Dubai FinServ Group', 'Finance', 'Contacted', 60000, MUTED],
  ['Galway Tech', 'Technology', 'Trial', 15000, BLUE],
  ['Pinnacle Legal', 'Legal', 'Enterprise opp', 90000, '#7c5cc4'],
  ['Brightwave Retail', 'Marketing', 'Won', 12000, GREEN],
];

const gbp = (n) => '£' + (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k' : n);
const fmtFull = (n) => '£' + n.toLocaleString();

export default function OpsCentre() {
  const [tab, setTab] = useState('exec');
  const serif = { fontFamily: 'Fraunces, Georgia, serif' };
  const tabs = [['exec', 'Executive'], ['revenue', 'Revenue'], ['growth', 'Growth'], ['marketplace', 'Marketplace'], ['geo', 'Geographic'], ['crm', 'CRM']];

  return (
    <div style={{ fontFamily: 'Spline Sans, system-ui, sans-serif', color: INK, background: PAPER, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* header */}
      <div style={{ background: SURF, borderBottom: `1px solid ${LINE}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 6.5, right: 6.5, width: 7, height: 7, borderRadius: 2, background: GOLD }} />
          </span>
          <span style={{ ...serif, fontWeight: 600, fontSize: 18 }}>Operations Centre</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: BLUE + '18', color: BLUE, marginLeft: 4 }}>Platform Owner</span>
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 10px 8px', display: 'flex', gap: 2, overflowX: 'auto' }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 'none', border: 'none', background: tab === k ? BLUE : 'transparent', color: tab === k ? '#fff' : MUTED, padding: '7px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '18px 16px 50px' }}>
        {tab === 'exec' && <Exec serif={serif} />}
        {tab === 'revenue' && <Revenue serif={serif} />}
        {tab === 'growth' && <Growth serif={serif} />}
        {tab === 'marketplace' && <Marketplace serif={serif} />}
        {tab === 'geo' && <Geo serif={serif} />}
        {tab === 'crm' && <Crm serif={serif} />}
        <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 28 }}>Visual prototype — demo data illustrating the analytics. Not a live backend.</p>
      </div>
    </div>
  );
}

const card = { background: SURF, border: `1px solid ${LINE}`, borderRadius: 16, padding: 16 };
function H({ serif, children, sub }) {
  return (<div style={{ marginBottom: 10 }}>
    <h2 style={{ ...serif, fontSize: 16, margin: 0 }}>{children}</h2>
    {sub && <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{sub}</p>}
  </div>);
}
function Grid({ children, min = 150 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 }}>{children}</div>;
}
function Stat({ serif, label, value, delta, tone }) {
  return (<div style={{ ...card, padding: 14 }}>
    <div style={{ fontSize: 11.5, color: MUTED }}>{label}</div>
    <div style={{ ...serif, fontSize: 23, color: tone === 'warn' ? RED : INK }}>{value}</div>
    {delta && <div style={{ fontSize: 11, color: GREEN, marginTop: 2 }}>{delta}</div>}
  </div>);
}
const tip = { contentStyle: { borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 12 } };

function Exec({ serif }) {
  return (<div>
    <H serif={serif} sub="Real-time platform health, monetisation and liquidity. Staff only.">Executive overview</H>
    {/* liquidity */}
    <div style={{ ...card, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
      <div style={{ textAlign: 'center', flex: 'none' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...serif, fontSize: 30 }}>78</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>Liquidity / 100</div>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h3 style={{ ...serif, fontSize: 16, margin: '0 0 3px' }}>Marketplace Liquidity Score</h3>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Diagnosis: <strong style={{ color: INK }}>Healthy — keep recruiting high-demand expertise</strong></p>
        <p style={{ fontSize: 12, marginTop: 5 }}>Supply 228 · Demand 64 open · 38 completed · Risk <span style={{ color: GREEN }}>Low</span></p>
      </div>
    </div>
    <div style={{ marginBottom: 12 }}>
      <Grid min={140}>
        <Stat serif={serif} label="Total GMV" value={gbp(235400)} delta="+30% MoM" />
        <Stat serif={serif} label="Platform revenue" value={gbp(35310)} delta="+30% MoM" />
        <Stat serif={serif} label="Total users" value="315" delta="+18% MoM" />
        <Stat serif={serif} label="Active engagements" value="64" />
        <Stat serif={serif} label="Verified experts" value="118" />
        <Stat serif={serif} label="Open disputes" value="2" tone="warn" />
        <Stat serif={serif} label="Verification backlog" value="7" tone="warn" />
        <Stat serif={serif} label="Take rate" value="15%" />
      </Grid>
    </div>
    <div style={{ ...card, marginBottom: 12 }}>
      <H serif={serif} sub="GMV flowing through escrow vs platform revenue (the 15% fee)">Revenue & GMV trend</H>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={REV_TREND} margin={{ left: -10, right: 6, top: 4 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BLUE} stopOpacity={0.25} /><stop offset="100%" stopColor={BLUE} stopOpacity={0} /></linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.3} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
          <XAxis dataKey="m" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={gbp} />
          <Tooltip {...tip} formatter={(v) => fmtFull(v)} />
          <Area type="monotone" dataKey="gmv" stroke={BLUE} strokeWidth={2} fill="url(#g1)" name="GMV" />
          <Area type="monotone" dataKey="rev" stroke={GOLD} strokeWidth={2} fill="url(#g2)" name="Revenue" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>);
}

function Revenue({ serif }) {
  return (<div>
    <H serif={serif} sub="Where the money comes from — drives geographic & vertical focus">Revenue</H>
    <div style={{ ...card, marginBottom: 12 }}>
      <H serif={serif}>Revenue by industry</H>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={BY_INDUSTRY} layout="vertical" margin={{ left: 20, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={gbp} />
          <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11, fill: INK }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} formatter={(v) => fmtFull(v)} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {BY_INDUSTRY.map((d) => <Cell key={d.name} fill={IND[d.name] || BLUE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <Grid min={240}>
      <div style={card}>
        <H serif={serif} sub="freelance vs employer-backed vs advisory">Revenue by source</H>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={REVENUE_SOURCE} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
              {REVENUE_SOURCE.map((d, i) => <Cell key={i} fill={[BLUE, GREEN, GOLD][i]} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v) => v + '%'} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={card}>
        <H serif={serif} sub="the Company Resource model in action">Money split (last release)</H>
        {[['Milestone funded', 5000, INK], ['Platform fee (15%)', 750, RED], ['To employer partner', 3825, BLUE], ['Employee bonus split', 425, GOLD]].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '9px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
            <span style={{ color: MUTED }}>{r[0]}</span><span style={{ ...serif, color: r[2] }}>{fmtFull(r[1])}</span>
          </div>
        ))}
      </div>
    </Grid>
  </div>);
}

function Growth({ serif }) {
  const maxF = FUNNEL[0].n;
  return (<div>
    <H serif={serif} sub="Are we growing, and where does the funnel leak?">User growth</H>
    <div style={{ ...card, marginBottom: 12 }}>
      <H serif={serif} sub="signups by account type">New users / month</H>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={SIGNUPS} margin={{ left: -16, right: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
          <XAxis dataKey="m" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="expert" stackId="a" fill={BLUE} name="Experts" radius={[0, 0, 0, 0]} />
          <Bar dataKey="business" stackId="a" fill={GOLD} name="Businesses" />
          <Bar dataKey="partner" stackId="a" fill={GREEN} name="Employer partners" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div style={{ ...card }}>
      <H serif={serif} sub="where users drop off → fix the biggest leak">Activation funnel</H>
      {FUNNEL.map((f, i) => (
        <div key={i} style={{ margin: '7px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{f.stage}</span><span style={{ color: MUTED }}>{f.n} · {Math.round(f.n / maxF * 100)}%</span>
          </div>
          <div style={{ height: 9, background: PAPER, borderRadius: 5 }}>
            <div style={{ width: `${f.n / maxF * 100}%`, height: '100%', borderRadius: 5, background: i < 4 ? BLUE : i < 6 ? GOLD : GREEN }} />
          </div>
        </div>
      ))}
    </div>
  </div>);
}

function Marketplace({ serif }) {
  return (<div>
    <H serif={serif} sub="Supply vs demand by expertise → what to recruit next">Marketplace intelligence</H>
    <div style={{ ...card, marginBottom: 12 }}>
      <H serif={serif} sub="tall demand + short supply = recruit here">Demand vs supply (by expertise)</H>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={DEMAND} margin={{ left: -14, right: 6, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} angle={-18} textAnchor="end" interval={0} height={50} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
          <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="req" fill={BLUE} name="Requested" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sup" fill={GOLD} name="Available experts" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div style={card}>
      <H serif={serif} sub="biggest gaps = priority recruitment">Supply gaps</H>
      {[...DEMAND].map((d) => ({ ...d, gap: d.req - d.sup })).sort((a, b) => b.gap - a.gap).slice(0, 4).map((d, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
          <span style={{ minWidth: 0 }}>{d.name}</span>
          <span style={{ flex: 'none', marginLeft: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: RED + '14', color: RED }}>gap {d.gap}</span>
            <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>avg {gbp(d.val)}</span>
          </span>
        </div>
      ))}
    </div>
  </div>);
}

function Geo({ serif }) {
  const max = Math.max(...GEO.map((g) => g.rev));
  return (<div>
    <H serif={serif} sub="Global from day one — Jersey first, then where the data points">Geographic</H>
    <Grid min={240}>
      <div style={card}>
        <H serif={serif}>Users by country</H>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={GEO} dataKey="users" nameKey="c" outerRadius={78}>
              {GEO.map((d, i) => <Cell key={i} fill={[BLUE, '#2563eb', GREEN, GOLD, MUTED][i]} />)}
            </Pie>
            <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={card}>
        <H serif={serif} sub="where to expand next">Revenue by country</H>
        {GEO.map((g, i) => (
          <div key={i} style={{ margin: '9px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span>{g.c}</span><span style={{ color: MUTED }}>{fmtFull(g.rev)}</span>
            </div>
            <div style={{ height: 9, background: PAPER, borderRadius: 5 }}>
              <div style={{ width: `${g.rev / max * 100}%`, height: '100%', borderRadius: 5, background: BLUE }} />
            </div>
          </div>
        ))}
      </div>
    </Grid>
    <div style={{ ...card, marginTop: 12 }}>
      <H serif={serif}>Account mix</H>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={ACCOUNT_MIX} dataKey="value" nameKey="name" innerRadius={42} outerRadius={76} paddingAngle={2}>
            {ACCOUNT_MIX.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>);
}

function Crm({ serif }) {
  const stages = ['Lead', 'Contacted', 'Demo booked', 'Trial', 'Enterprise opp', 'Won'];
  return (<div>
    <H serif={serif} sub="Founder-led sales & partnerships, inside the platform">CRM pipeline</H>
    <div style={card}>
      {CRM.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '11px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r[0]}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{r[1]} · est. {fmtFull(r[3])}</div>
          </div>
          <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: r[4] + '18', color: r[4] }}>{r[2]}</span>
        </div>
      ))}
    </div>
    <div style={{ ...card, marginTop: 12 }}>
      <H serif={serif} sub="pipeline value by stage">Pipeline</H>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={[{ s: 'Lead', v: 0 }, { s: 'Contacted', v: 60000 }, { s: 'Demo', v: 25000 }, { s: 'Trial', v: 15000 }, { s: 'Enterprise', v: 90000 }, { s: 'Won', v: 12000 }]} margin={{ left: -8, right: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
          <XAxis dataKey="s" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={gbp} />
          <Tooltip {...tip} formatter={(v) => fmtFull(v)} />
          <Bar dataKey="v" fill={GOLD} radius={[4, 4, 0, 0]} name="Est. value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>);
}
