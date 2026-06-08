import React, { useState } from 'react';

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', MOSSDK = '#143329', SAND = '#c9a86a';
const INK = '#0c1f1a', PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';
const AMBER = '#b8862f', GREEN = '#1f4d3f', RED = '#a14b3d';

const STATUS_META = {
  pending: { label: 'Awaiting approval', color: AMBER, bg: 'rgba(184,134,47,.12)' },
  approved: { label: 'Approved', color: GREEN, bg: 'rgba(31,77,63,.1)' },
  suspended: { label: 'Suspended', color: MUTED, bg: 'rgba(90,107,99,.12)' },
  revoked: { label: 'Revoked', color: RED, bg: 'rgba(161,75,61,.1)' },
};

const SEED = [
  { id: 1, name: 'Priya Anand', headline: 'Senior Product Designer', skills: ['UX', 'Design Systems'], status: 'approved', commission: 0.20, deployments: 3, earned: 4080, active: true },
  { id: 2, name: 'Aoife Brennan', headline: 'Lead Engineer', skills: ['React', 'Cloud'], status: 'approved', commission: 0.25, deployments: 2, earned: 2720, active: true },
  { id: 3, name: 'Daniel Mercer', headline: 'Data Analyst', skills: ['SQL', 'Python', 'Dashboards'], status: 'pending', commission: 0.20, deployments: 0, earned: 0, active: false },
  { id: 4, name: 'Lena Ortiz', headline: 'Brand Strategist', skills: ['Brand', 'Content'], status: 'pending', commission: 0.20, deployments: 0, earned: 0, active: false },
  { id: 5, name: 'Sam Whitfield', headline: 'DevOps Engineer', skills: ['Kubernetes', 'CI/CD'], status: 'suspended', commission: 0.25, deployments: 1, earned: 1360, active: false },
];

export default function EmployerDashboard() {
  const [employees, setEmployees] = useState(SEED);
  const [tab, setTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [defaultCommission, setDefaultCommission] = useState(0.20);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };
  const setStatus = (id, status, msg) => { setEmployees(es => es.map(e => e.id === id ? { ...e, status, active: status === 'approved' } : e)); flash(msg); };

  const pending = employees.filter(e => e.status === 'pending');
  const approved = employees.filter(e => e.status === 'approved');
  const totalEarned = employees.reduce((a, e) => a + e.earned, 0);
  const commissionEarned = employees.reduce((a, e) => a + e.earned * e.commission, 0);
  const totalDeployments = employees.reduce((a, e) => a + e.deployments, 0);

  const filtered = tab === 'all' ? employees : tab === 'pending' ? pending : approved;

  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');
        @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
        *::selection{background:${SAND}55}`}</style>
      <div style={{ position: 'absolute', top: -200, right: -150, width: 540, height: 540, borderRadius: '50%', background: `radial-gradient(circle,rgba(31,77,63,.08),transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: MOSS, position: 'relative' }}><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>
          <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>Sekondment</span>
          <span style={{ fontSize: 12.5, color: MUTED, background: PAPER2, padding: '4px 10px', borderRadius: 100, marginLeft: 4 }}>Employer Partner</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 14, color: MUTED }}>Northpoint Studio</span>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 70px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
          <div>
            <p style={{ color: MUTED, fontSize: 14, margin: '0 0 4px' }}>Partner dashboard</p>
            <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 34, letterSpacing: '-.02em', margin: 0 }}>Your deployed talent</h1>
          </div>
          <button onClick={() => setInviteOpen(true)} style={{ padding: '12px 20px', borderRadius: 12, background: MOSS, color: '#fff', border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>+ Register employee</button>
        </div>

        {/* stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 14 }}>
          <StatTile label="Active employees" value={approved.length} sub={`${employees.length} registered`} />
          <StatTile label="Total deployments" value={totalDeployments} sub="across all employees" />
          <StatTile label="Employee earnings" value={`£${totalEarned.toLocaleString()}`} sub="gross, all time" />
          <StatTile label="Your commission" value={`£${Math.round(commissionEarned).toLocaleString()}`} sub="earned to date" accent />
        </div>

        {/* approval queue callout */}
        {pending.length > 0 && (
          <div style={{ background: 'rgba(184,134,47,.08)', border: `1px solid rgba(184,134,47,.3)`, borderRadius: 14, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12, animation: 'rise .4s ease both' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(184,134,47,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AMBER, fontWeight: 700, flex: 'none' }}>{pending.length}</span>
            <span style={{ fontSize: 14.5, color: INK }}><b>{pending.length} employee{pending.length > 1 ? 's' : ''}</b> awaiting your approval before they can be deployed.</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setTab('pending')} style={{ fontSize: 13.5, fontWeight: 500, color: AMBER, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>
          </div>
        )}

        {/* tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: `1px solid ${LINE}` }}>
          {[['all', `All (${employees.length})`], ['pending', `Pending (${pending.length})`], ['approved', `Approved (${approved.length})`]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === v ? MOSS : 'transparent'}`, color: tab === v ? INK : MUTED, fontSize: 14.5, fontWeight: tab === v ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>{l}</button>
          ))}
        </div>

        {/* employee list */}
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((e, i) => {
            const meta = STATUS_META[e.status];
            return (
              <div key={e.id} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 15, padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center', animation: 'rise .4s ease both', animationDelay: `${i * 0.04}s` }}>
                <Avatar name={e.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5 }}>{e.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: meta.color, background: meta.bg, padding: '3px 9px', borderRadius: 6 }}>{meta.label}</span>
                  </div>
                  <div style={{ color: MUTED, fontSize: 13.5, margin: '2px 0 8px' }}>{e.headline}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {e.skills.map(s => <span key={s} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 6, background: PAPER2, fontWeight: 500 }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: MUTED, flex: 'none', minWidth: 100 }}>
                  <div><b style={{ color: INK, fontSize: 14 }}>{Math.round(e.commission * 100)}%</b> commission</div>
                  <div style={{ marginTop: 3 }}>{e.deployments} deployment{e.deployments !== 1 ? 's' : ''}</div>
                  {e.earned > 0 && <div style={{ marginTop: 3, color: MOSS, fontWeight: 500 }}>£{Math.round(e.earned * e.commission).toLocaleString()} earned</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 'none' }}>
                  {e.status === 'pending' && <>
                    <Btn onClick={() => setStatus(e.id, 'approved', `${e.name.split(' ')[0]} approved for deployment`)} primary>Approve</Btn>
                    <Btn onClick={() => setStatus(e.id, 'revoked', `${e.name.split(' ')[0]}'s registration declined`)}>Decline</Btn>
                  </>}
                  {e.status === 'approved' && <Btn onClick={() => setStatus(e.id, 'suspended', `${e.name.split(' ')[0]} suspended`)}>Suspend</Btn>}
                  {e.status === 'suspended' && <Btn onClick={() => setStatus(e.id, 'approved', `${e.name.split(' ')[0]} reinstated`)} primary>Reinstate</Btn>}
                  {e.status === 'revoked' && <span style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>Declined</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '50px 20px', color: MUTED, background: '#fff', borderRadius: 15, border: `1px solid ${LINE}` }}>No employees in this view.</div>}
        </div>

        {/* commission explainer */}
        <div style={{ marginTop: 24, background: MOSSDK, color: PAPER, borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,106,.25),transparent 70%)' }} />
          <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, margin: '0 0 10px' }}>How your commission works</h3>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(246,243,236,.8)', margin: 0, maxWidth: '64ch' }}>
            When an approved employee is engaged, the client pays into escrow. Sekondment takes its 15% platform fee, then funds route to you as the employer. You keep your set commission and pass the remainder to your employee — all on-platform, all tracked. Your employee stays on your payroll throughout.
          </p>
        </div>
      </div>

      {/* register employee modal */}
      {inviteOpen && (
        <div onClick={() => setInviteOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,31,26,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: PAPER, borderRadius: 20, padding: 30, width: 'min(440px,100%)', animation: 'pop .25s ease', boxShadow: '0 30px 70px -20px rgba(12,31,26,.5)' }}>
            <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22, margin: '0 0 6px' }}>Register an employee</h2>
            <p style={{ color: MUTED, fontSize: 14.5, margin: '0 0 20px', lineHeight: 1.5 }}>Invite an employee to be deployable through Sekondment. They build their expert profile; you approve before any deployment.</p>
            <Label>Employee email</Label>
            <Inp placeholder="employee@northpoint.com" />
            <Label>Name</Label>
            <Inp placeholder="Jordan Reyes" />
            <Label>Commission for this employee · {Math.round(defaultCommission * 100)}%</Label>
            <input type="range" min="0" max="0.4" step="0.05" value={defaultCommission} onChange={e => setDefaultCommission(+e.target.value)} style={{ width: '100%', accentColor: MOSS, marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 20px' }}>Your cut of their net earnings, after the 15% platform fee.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setInviteOpen(false); flash('Invitation sent'); }} style={{ flex: 1, padding: '12px', borderRadius: 11, background: MOSS, color: '#fff', border: 'none', fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Send invitation</button>
              <button onClick={() => setInviteOpen(false)} style={{ padding: '12px 18px', borderRadius: 11, background: '#fff', border: `1px solid ${LINE}`, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: INK, color: PAPER, padding: '13px 22px', borderRadius: 12, fontSize: 14.5, fontWeight: 500, zIndex: 80, boxShadow: '0 16px 40px -12px rgba(12,31,26,.5)' }}>{toast}</div>}
    </div>
  );
}

function Avatar({ name }) {
  const initials = name.split(' ').map(n => n[0]).join('');
  return <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg,${MOSS},${MOSS2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17, flex: 'none' }}>{initials}</div>;
}
function StatTile({ label, value, sub, accent }) {
  return <div style={{ background: accent ? MOSS : '#fff', color: accent ? '#fff' : INK, border: `1px solid ${accent ? MOSS : LINE}`, borderRadius: 15, padding: '18px 20px' }}>
    <div style={{ fontSize: 12.5, color: accent ? 'rgba(246,243,236,.7)' : MUTED, fontWeight: 500 }}>{label}</div>
    <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 28, margin: '5px 0 2px', letterSpacing: '-.01em' }}>{value}</div>
    <div style={{ fontSize: 12, color: accent ? 'rgba(246,243,236,.6)' : MUTED }}>{sub}</div>
  </div>;
}
function Btn({ children, onClick, primary }) {
  return <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 9, border: primary ? 'none' : `1px solid ${LINE}`, background: primary ? MOSS : '#fff', color: primary ? '#fff' : INK, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{children}</button>;
}
function Label({ children }) { return <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{children}</label>; }
function Inp({ placeholder }) { return <input placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: `1px solid ${LINE}`, background: '#fff', fontSize: 14.5, fontFamily: 'inherit', color: INK, outline: 'none', marginBottom: 16 }} />; }
