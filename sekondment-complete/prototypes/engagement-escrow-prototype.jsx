import React, { useState } from 'react';

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', MOSSDK = '#143329', SAND = '#c9a86a';
const INK = '#0c1f1a', PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';
const GREEN = '#1f4d3f', AMBER = '#b8862f', SLATE = '#5a6b63';

const FEE_PCT = 15;

// Two scenarios to demonstrate both payout shapes.
const SCENARIOS = {
  direct: {
    label: 'Direct expert',
    expert: { name: 'Eleanor Voss', headline: 'Fractional Marketing Director', company: null },
    payeeType: 'expert',
    splitToExpert: null,
  },
  resource: {
    label: 'Company Resource',
    expert: { name: 'Priya Anand', headline: 'Senior Product Designer', company: 'Northpoint Studio' },
    payeeType: 'business',
    splitToExpert: 0.2, // employer passes 20% of post-fee to the individual
  },
};

const INITIAL_MILESTONES = [
  { id: 1, title: 'Discovery & audit', amount: 1000, status: 'pending' },
  { id: 2, title: 'Strategy & delivery', amount: 2000, status: 'pending' },
  { id: 3, title: 'Handover & completion', amount: 2000, status: 'pending' },
];

const STATUS_META = {
  pending: { label: 'Not funded', color: SLATE, bg: 'rgba(90,107,99,.1)' },
  funded: { label: 'In escrow', color: AMBER, bg: 'rgba(184,134,47,.12)' },
  submitted: { label: 'Awaiting approval', color: AMBER, bg: 'rgba(184,134,47,.12)' },
  released: { label: 'Released', color: GREEN, bg: 'rgba(31,77,63,.1)' },
};

export default function EngagementFlow() {
  const [scenario, setScenario] = useState('direct');
  const [milestones, setMilestones] = useState(INITIAL_MILESTONES);
  const [role, setRole] = useState('business'); // viewing as business or expert
  const [ledger, setLedger] = useState([]);
  const [toast, setToast] = useState(null);

  const s = SCENARIOS[scenario];
  const total = milestones.reduce((a, m) => a + m.amount, 0);
  const inEscrow = milestones.filter(m => ['funded', 'submitted'].includes(m.status)).reduce((a, m) => a + m.amount, 0);
  const released = milestones.filter(m => m.status === 'released').reduce((a, m) => a + m.amount, 0);

  const reset = (sc) => { setScenario(sc); setMilestones(INITIAL_MILESTONES.map(m => ({ ...m }))); setLedger([]); };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const addLedger = (entries) => setLedger(l => [...entries.map((e, i) => ({ ...e, id: Date.now() + i })), ...l]);

  // BUSINESS funds a milestone -> money enters escrow (platform balance)
  const fund = (id) => {
    const m = milestones.find(x => x.id === id);
    setMilestones(ms => ms.map(x => x.id === id ? { ...x, status: 'funded' } : x));
    addLedger([{ type: 'fund', label: `Funded "${m.title}" into escrow`, amount: m.amount, dir: 'in' }]);
    flash(`£${m.amount.toLocaleString()} funded into escrow`);
  };

  // EXPERT submits work for a funded milestone
  const submit = (id) => {
    const m = milestones.find(x => x.id === id);
    setMilestones(ms => ms.map(x => x.id === id ? { ...x, status: 'submitted' } : x));
    flash(`Work submitted for "${m.title}"`);
  };

  // BUSINESS approves -> funds release, split computed here
  const release = (id) => {
    const m = milestones.find(x => x.id === id);
    const fee = +(m.amount * FEE_PCT / 100).toFixed(2);
    const net = +(m.amount - fee).toFixed(2);
    const entries = [{ type: 'fee', label: `Platform fee (${FEE_PCT}%)`, amount: fee, dir: 'fee' }];

    if (s.payeeType === 'business' && s.splitToExpert) {
      const toExpert = +(net * s.splitToExpert).toFixed(2);
      const toBiz = +(net - toExpert).toFixed(2);
      entries.push({ type: 'transfer_business', label: `Transfer to ${s.expert.company}`, amount: toBiz, dir: 'out' });
      entries.push({ type: 'transfer_expert', label: `Split to ${s.expert.name}`, amount: toExpert, dir: 'out' });
    } else if (s.payeeType === 'business') {
      entries.push({ type: 'transfer_business', label: `Transfer to ${s.expert.company}`, amount: net, dir: 'out' });
    } else {
      entries.push({ type: 'transfer_expert', label: `Transfer to ${s.expert.name}`, amount: net, dir: 'out' });
    }
    setMilestones(ms => ms.map(x => x.id === id ? { ...x, status: 'released' } : x));
    addLedger(entries.reverse());
    flash(`£${m.amount.toLocaleString()} released`);
  };

  const allDone = milestones.every(m => m.status === 'released');

  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');
        @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes slidein{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes toastin{from{opacity:0}to{opacity:1}}
        *::selection{background:${SAND}55}`}</style>
      <div style={{ position: 'absolute', top: -200, right: -150, width: 540, height: 540, borderRadius: '50%', background: `radial-gradient(circle,rgba(31,77,63,.09),transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: MOSS, position: 'relative' }}><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>
          <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>Sekondment</span>
          <span style={{ flex: 1 }} />
          {/* view-as toggle */}
          <div style={{ display: 'flex', gap: 4, background: PAPER2, padding: 4, borderRadius: 10 }}>
            {[['business', 'View as Business'], ['expert', s.payeeType === 'business' ? 'View as Resource' : 'View as Expert']].map(([v, l]) => (
              <button key={v} onClick={() => setRole(v)} style={{ padding: '7px 13px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: role === v ? '#fff' : 'transparent', color: role === v ? INK : MUTED, boxShadow: role === v ? '0 1px 2px rgba(12,31,26,.1)' : 'none' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 24px 70px', position: 'relative', zIndex: 2 }}>
        {/* scenario switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>Engagement type:</span>
          {Object.entries(SCENARIOS).map(([k, v]) => (
            <button key={k} onClick={() => reset(k)} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${scenario === k ? MOSS : LINE}`, background: scenario === k ? MOSS : '#fff', color: scenario === k ? '#fff' : MUTED }}>{v.label}</button>
          ))}
          {scenario === 'resource' && <span style={{ fontSize: 12.5, color: AMBER, fontWeight: 500, background: 'rgba(184,134,47,.1)', padding: '5px 10px', borderRadius: 7 }}>Payment routes to the employer, with a {Math.round(s.splitToExpert * 100)}% split to the individual</span>}
        </div>

        {/* header card */}
        <div style={{ background: MOSSDK, color: PAPER, borderRadius: 20, padding: '26px 28px', position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,106,.28),transparent 70%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: SAND }}>Active Engagement</span>
              <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 23, marginTop: 5 }}>Q3 Product Launch — Fractional Marketing</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 14 }}>
                <Avatar name={s.expert.name} size={34} />
                <div>
                  <div style={{ fontWeight: 500 }}>{s.expert.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(246,243,236,.6)' }}>
                    {s.expert.headline}{s.expert.company && <> · <span style={{ color: SAND }}>via {s.expert.company}</span></>}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22 }}>
              <HeaderStat label="Total" value={`£${total.toLocaleString()}`} />
              <HeaderStat label="In escrow" value={`£${inEscrow.toLocaleString()}`} accent={AMBER} />
              <HeaderStat label="Released" value={`£${released.toLocaleString()}`} accent={SAND} />
            </div>
          </div>
          {/* progress bar */}
          <div style={{ position: 'relative', marginTop: 22, height: 8, borderRadius: 8, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${(released / total) * 100}%`, background: `linear-gradient(90deg,${MOSS2},${SAND})`, borderRadius: 8, transition: 'width .5s cubic-bezier(.2,.7,.2,1)' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          {/* milestones */}
          <div>
            <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 19, margin: '4px 0 14px' }}>Milestones</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {milestones.map((m, i) => {
                const meta = STATUS_META[m.status];
                const isFunder = role === 'business';
                return (
                  <div key={m.id} style={{ background: '#fff', border: `1px solid ${m.status === 'released' ? 'rgba(31,77,63,.3)' : LINE}`, borderRadius: 15, padding: '18px 20px', animation: 'rise .4s ease both', animationDelay: `${i * 0.05}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 13 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', background: m.status === 'released' ? MOSS : PAPER2, color: m.status === 'released' ? '#fff' : MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 14 }}>
                          {m.status === 'released' ? '✓' : i + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15.5 }}>{m.title}</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600, color: meta.color, background: meta.bg, padding: '4px 9px', borderRadius: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />{meta.label}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>£{m.amount.toLocaleString()}</div>
                      </div>
                    </div>
                    {/* actions depend on role + status */}
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {isFunder && m.status === 'pending' && <Action onClick={() => fund(m.id)} primary>Fund into escrow →</Action>}
                      {!isFunder && m.status === 'pending' && <Hint>Waiting for the business to fund this milestone</Hint>}
                      {!isFunder && m.status === 'funded' && <Action onClick={() => submit(m.id)} primary>Submit work →</Action>}
                      {isFunder && m.status === 'funded' && <Hint>Funded — waiting for {s.expert.name.split(' ')[0]} to submit</Hint>}
                      {isFunder && m.status === 'submitted' && <Action onClick={() => release(m.id)} primary>Approve & release →</Action>}
                      {!isFunder && m.status === 'submitted' && <Hint>Submitted — awaiting approval</Hint>}
                      {m.status === 'released' && <Hint done>Funds released{s.payeeType === 'business' ? ` to ${s.expert.company}` : ''}</Hint>}
                    </div>
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div style={{ marginTop: 16, background: 'rgba(31,77,63,.06)', border: `1px solid rgba(31,77,63,.25)`, borderRadius: 15, padding: '20px 22px', textAlign: 'center', animation: 'rise .4s ease both' }}>
                <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18, color: MOSS }}>Engagement complete</div>
                <div style={{ fontSize: 14, color: MUTED, margin: '4px 0 14px' }}>All milestones released. Time to exchange reviews.</div>
                <button style={{ padding: '11px 20px', borderRadius: 11, background: MOSS, color: '#fff', border: 'none', fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Leave a review →</button>
              </div>
            )}
          </div>

          {/* right column: escrow breakdown + ledger */}
          <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 78 }}>
            {/* split explainer */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16, margin: '0 0 14px' }}>How a milestone splits</h3>
              {(() => {
                const ex = 2000;
                const fee = ex * FEE_PCT / 100;
                const net = ex - fee;
                const rows = [{ l: 'Client pays', v: ex, c: INK, w: 600 }, { l: `Platform fee (${FEE_PCT}%)`, v: -fee, c: MUTED }];
                if (s.payeeType === 'business' && s.splitToExpert) {
                  rows.push({ l: `${s.expert.company}`, v: net * (1 - s.splitToExpert), c: MOSS });
                  rows.push({ l: `${s.expert.name} (split)`, v: net * s.splitToExpert, c: MOSS });
                } else if (s.payeeType === 'business') {
                  rows.push({ l: `${s.expert.company}`, v: net, c: MOSS });
                } else {
                  rows.push({ l: `${s.expert.name}`, v: net, c: MOSS });
                }
                return rows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, fontSize: 14 }}>
                    <span style={{ color: r.c === INK ? INK : MUTED, fontWeight: r.w || 400 }}>{r.l}</span>
                    <span style={{ fontWeight: 600, color: r.c, fontVariantNumeric: 'tabular-nums' }}>{r.v < 0 ? '−' : ''}£{Math.abs(r.v).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ));
              })()}
              <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.5, marginTop: 12, marginBottom: 0 }}>Example on a £2,000 milestone. {s.payeeType === 'business' ? 'Funds route to the employing business, who remains the deployed expert’s employer.' : 'Funds route directly to the expert.'}</p>
            </div>

            {/* ledger */}
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Escrow ledger</h3>
              <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>Every movement, on the record.</p>
              {ledger.length === 0 && <p style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', margin: 0 }}>No activity yet. Fund a milestone to begin.</p>}
              <div style={{ display: 'grid', gap: 8 }}>
                {ledger.map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, animation: 'slidein .3s ease both' }}>
                    <span style={{ color: MUTED, lineHeight: 1.3 }}>{e.label}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flex: 'none', color: e.dir === 'in' ? AMBER : e.dir === 'fee' ? MUTED : MOSS }}>
                      {e.dir === 'in' ? '+' : e.dir === 'fee' ? '−' : '→'}£{e.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: INK, color: PAPER, padding: '13px 22px', borderRadius: 12, fontSize: 14.5, fontWeight: 500, zIndex: 80, boxShadow: '0 16px 40px -12px rgba(12,31,26,.5)', animation: 'toastin .3s ease' }}>{toast}</div>}
    </div>
  );
}

function Avatar({ name, size = 40 }) {
  const initials = name.split(' ').map(n => n[0]).join('');
  return <div style={{ width: size, height: size, borderRadius: size * 0.27, background: `linear-gradient(135deg,${SAND},#d8bd86)`, color: MOSSDK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size * 0.36, flex: 'none' }}>{initials}</div>;
}
function HeaderStat({ label, value, accent }) {
  return <div><div style={{ fontSize: 11.5, color: 'rgba(246,243,236,.55)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</div><div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22, marginTop: 3, color: accent || PAPER }}>{value}</div></div>;
}
function Action({ children, onClick, primary }) {
  return <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 10, border: primary ? 'none' : `1px solid ${LINE}`, background: primary ? MOSS : '#fff', color: primary ? '#fff' : INK, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
    onMouseEnter={e => { if (primary) e.currentTarget.style.background = MOSS2; }}
    onMouseLeave={e => { if (primary) e.currentTarget.style.background = MOSS; }}>{children}</button>;
}
function Hint({ children, done }) {
  return <span style={{ fontSize: 13, color: done ? MOSS : MUTED, fontWeight: done ? 500 : 400, fontStyle: done ? 'normal' : 'italic' }}>{done ? '✓ ' : ''}{children}</span>;
}
