import React, { useState } from 'react';

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', MOSSDK = '#143329', SAND = '#c9a86a';
const INK = '#0c1f1a', PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';

const OUTCOMES = [
  { v: 'launch_product', l: 'Launch a product', d: 'Bring something new to market', icon: 'M12 2l2 5 5 .5-4 3.5 1.5 5L12 18l-4.5 3 1.5-5-4-3.5 5-.5z' },
  { v: 'deliver_project', l: 'Deliver a project', d: 'Ship a defined piece of work', icon: 'M4 7h16M4 12h16M4 17h10' },
  { v: 'improve_marketing', l: 'Improve marketing', d: 'Grow reach, demand and brand', icon: 'M3 17l5-5 4 4 8-8M21 8v5h-5' },
  { v: 'improve_operations', l: 'Improve operations', d: 'Make the business run better', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3' },
  { v: 'fill_leadership_gap', l: 'Fill a leadership gap', d: 'Interim or fractional leadership', icon: 'M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z' },
  { v: 'reduce_costs', l: 'Reduce costs', d: 'Find efficiency and savings', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { v: 'improve_compliance', l: 'Improve compliance', d: 'Risk, governance, regulation', icon: 'M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z' },
  { v: 'digital_transformation', l: 'Digital transformation', d: 'Modernise systems and ways of working', icon: 'M9 3H4v5M20 8V3h-5M4 16v5h5M15 21h5v-5' },
  { v: 'growth_initiative', l: 'Growth initiative', d: 'Scale revenue or expand', icon: 'M3 17l6-6 4 4 8-8' },
];

const EXPERTISE_SUGGEST = ['Brand Strategy', 'Demand Gen', 'Product Design', 'Fundraising', 'FP&A', 'Operations', 'Change Management', 'Paid Social', 'SEO', 'Compliance', 'Cloud', 'Data'];

export default function OpportunityCreate() {
  const [step, setStep] = useState(1);
  const [outcome, setOutcome] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', expertise: [], industry: '', budgetMin: '', budgetMax: '', duration: '', startDate: '', mode: 'remote', location: '' });
  const [published, setPublished] = useState(false);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleExp = v => setForm(f => ({ ...f, expertise: f.expertise.includes(v) ? f.expertise.filter(x => x !== v) : [...f.expertise, v] }));

  const canNext = step === 1 ? !!outcome : step === 2 ? form.title.trim().length > 2 : true;
  const outcomeObj = OUTCOMES.find(o => o.v === outcome);

  if (published) return <Published form={form} outcome={outcomeObj} onReset={() => { setPublished(false); setStep(1); setOutcome(null); setForm({ title: '', description: '', expertise: [], industry: '', budgetMin: '', budgetMax: '', duration: '', startDate: '', mode: 'remote', location: '' }); }} />;

  return (
    <Shell step={step}>
      {step === 1 && (
        <Fade key="s1">
          <Kicker>Start with the outcome</Kicker>
          <H1>What are you trying to <em>achieve?</em></H1>
          <Sub>We match on outcomes, not keywords. Pick the goal closest to your need — the right expertise follows.</Sub>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(225px,1fr))', gap: 13, marginTop: 30 }}>
            {OUTCOMES.map((o, i) => {
              const active = outcome === o.v;
              return (
                <button key={o.v} onClick={() => setOutcome(o.v)} style={{
                  textAlign: 'left', cursor: 'pointer', padding: 19, borderRadius: 15, fontFamily: 'inherit',
                  border: `1.5px solid ${active ? MOSS : LINE}`, background: active ? MOSS : '#fff',
                  color: active ? '#fff' : INK, transition: 'all .18s cubic-bezier(.2,.7,.2,1)',
                  transform: active ? 'translateY(-2px)' : 'none', boxShadow: active ? '0 14px 36px -14px rgba(31,77,63,.6)' : 'none',
                  animation: `rise .5s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${i * 0.03}s`,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: active ? 'rgba(255,255,255,.16)' : 'rgba(31,77,63,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: active ? '#fff' : MOSS, fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d={o.icon} /></svg>
                  </div>
                  <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 16.5, marginBottom: 3 }}>{o.l}</div>
                  <div style={{ fontSize: 13, color: active ? 'rgba(255,255,255,.7)' : MUTED, lineHeight: 1.45 }}>{o.d}</div>
                </button>
              );
            })}
          </div>
        </Fade>
      )}

      {step === 2 && (
        <Fade key="s2">
          <Kicker>Describe the work</Kicker>
          <H1>Tell experts <em>what you need.</em></H1>
          <Sub>You're posting under <b style={{ color: MOSS }}>{outcomeObj.l}</b>. Give it a clear title and outcome.</Sub>
          <div style={{ marginTop: 28, display: 'grid', gap: 20 }}>
            <Field label="Opportunity title *">
              <Input value={form.title} onChange={v => up('title', v)} placeholder="e.g. Fractional CMO to lead our Q3 product launch" />
            </Field>
            <Field label="What does success look like?">
              <textarea value={form.description} onChange={e => up('description', e.target.value)} rows={4}
                placeholder="Describe the desired outcome, context and any constraints…"
                style={inputStyle(true)} />
            </Field>
            <Field label="Required expertise">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EXPERTISE_SUGGEST.map(x => {
                  const on = form.expertise.includes(x);
                  return <button key={x} onClick={() => toggleExp(x)} style={{ padding: '8px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${on ? MOSS : LINE}`, background: on ? MOSS : '#fff', color: on ? '#fff' : MUTED, transition: 'all .15s' }}>{on ? '✓ ' : ''}{x}</button>;
                })}
              </div>
            </Field>
            <Field label="Industry">
              <Input value={form.industry} onChange={v => up('industry', v)} placeholder="e.g. B2B SaaS" />
            </Field>
          </div>
        </Fade>
      )}

      {step === 3 && (
        <Fade key="s3">
          <Kicker>Budget & logistics</Kicker>
          <H1>Set the <em>terms.</em></H1>
          <Sub>Experts filter by budget and availability, so realistic numbers get you better matches.</Sub>
          <div style={{ marginTop: 28, display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Budget from (£)"><Input type="number" value={form.budgetMin} onChange={v => up('budgetMin', v)} placeholder="3000" /></Field>
              <Field label="Budget to (£)"><Input type="number" value={form.budgetMax} onChange={v => up('budgetMax', v)} placeholder="8000" /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Duration"><Input value={form.duration} onChange={v => up('duration', v)} placeholder="e.g. 3 months" /></Field>
              <Field label="Ideal start date"><Input type="date" value={form.startDate} onChange={v => up('startDate', v)} /></Field>
            </div>
            <Field label="Work mode">
              <div style={{ display: 'flex', gap: 9 }}>
                {[['remote', 'Remote'], ['hybrid', 'Hybrid'], ['on_site', 'On-site']].map(([v, l]) => (
                  <button key={v} onClick={() => up('mode', v)} style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${form.mode === v ? MOSS : LINE}`, background: form.mode === v ? MOSS : '#fff', color: form.mode === v ? '#fff' : MUTED, transition: 'all .15s' }}>{l}</button>
                ))}
              </div>
            </Field>
            {form.mode !== 'remote' && <Field label="Location"><Input value={form.location} onChange={v => up('location', v)} placeholder="e.g. Jersey, Channel Islands" /></Field>}
          </div>
        </Fade>
      )}

      {step === 4 && (
        <Fade key="s4">
          <Kicker>Review</Kicker>
          <H1>Ready to <em>go live?</em></H1>
          <Sub>This is what experts will see. You can edit anything after publishing.</Sub>
          <div style={{ marginTop: 26 }}>
            <OppPreview form={form} outcome={outcomeObj} />
          </div>
        </Fade>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, paddingTop: 24, borderTop: `1px solid ${LINE}` }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          style={{ padding: '12px 18px', borderRadius: 11, border: `1px solid ${LINE}`, background: 'transparent', color: step === 1 ? 'rgba(90,107,99,.4)' : INK, fontSize: 15, fontWeight: 500, cursor: step === 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>← Back</button>
        {step < 4
          ? <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} style={primaryBtn(!canNext)}>Continue →</button>
          : <button onClick={() => setPublished(true)} style={primaryBtn(false)}>Publish Opportunity →</button>}
      </div>
    </Shell>
  );
}

// ---- chrome ----
function Shell({ step, children }) {
  const steps = ['Outcome', 'Details', 'Terms', 'Review'];
  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, color: INK, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spline+Sans:wght@400;500;600&display=swap');
        @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        *::selection{background:${SAND}55}
        .opp-h1 em{font-style:italic;color:${MOSS}}`}</style>
      {/* atmosphere */}
      <div style={{ position: 'absolute', top: -200, right: -150, width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle,rgba(31,77,63,.10),transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -180, left: -120, width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle,rgba(201,168,106,.13),transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, opacity: .035, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: MOSS, position: 'relative' }}><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>
          <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>Sekondment</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 14, color: MUTED }}>New Opportunity</span>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '34px 24px 70px', position: 'relative', zIndex: 2 }}>
        {/* stepper */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 34 }}>
          {steps.map((s, i) => {
            const n = i + 1, done = n < step, cur = n === step;
            return (
              <div key={s} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 4, background: done || cur ? MOSS : PAPER2, transition: 'background .3s' }} />
                <div style={{ fontSize: 12.5, marginTop: 8, fontWeight: cur ? 600 : 500, color: done || cur ? MOSS : MUTED, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {done ? '✓' : `${n}.`} {s}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 22, padding: '36px 38px', boxShadow: '0 1px 2px rgba(12,31,26,.05),0 24px 60px -28px rgba(12,31,26,.22)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const Fade = ({ children }) => <div style={{ animation: 'fade .35s ease both' }}>{children}</div>;
const Kicker = ({ children }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: MOSS, background: 'rgba(31,77,63,.08)', padding: '6px 13px', borderRadius: 100, marginBottom: 18 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: MOSS }} />{children}</span>;
const H1 = ({ children }) => <h1 className="opp-h1" style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 36, letterSpacing: '-.025em', lineHeight: 1.08, margin: 0 }}>{children}</h1>;
const Sub = ({ children }) => <p style={{ color: MUTED, fontSize: 16.5, lineHeight: 1.5, margin: '12px 0 0', maxWidth: '54ch' }}>{children}</p>;
const Field = ({ label, children }) => <div><label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{label}</label>{children}</div>;
const inputStyle = (area) => ({ width: '100%', boxSizing: 'border-box', padding: '12px 15px', borderRadius: 11, border: `1px solid ${LINE}`, background: '#fff', fontSize: 15, fontFamily: 'inherit', color: INK, outline: 'none', resize: area ? 'none' : undefined, lineHeight: 1.5 });
const Input = ({ value, onChange, placeholder, type = 'text' }) => <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle(false)} onFocus={e => { e.target.style.borderColor = MOSS; e.target.style.boxShadow = `0 0 0 3px rgba(31,77,63,.13)`; }} onBlur={e => { e.target.style.borderColor = LINE; e.target.style.boxShadow = 'none'; }} />;
const primaryBtn = (disabled) => ({ padding: '13px 24px', borderRadius: 12, border: 'none', background: disabled ? 'rgba(31,77,63,.35)' : MOSS, color: '#fff', fontSize: 15, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all .15s' });

function OppPreview({ form, outcome }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
      <div style={{ background: MOSSDK, padding: '20px 22px', color: PAPER, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,106,.3),transparent 70%)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: SAND }}>{outcome.l}</span>
        <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 21, marginTop: 5 }}>{form.title || 'Untitled opportunity'}</div>
      </div>
      <div style={{ padding: 22 }}>
        {form.description && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: INK, marginTop: 0 }}>{form.description}</p>}
        {form.expertise.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>{form.expertise.map(x => <span key={x} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 7, background: PAPER2, fontWeight: 500 }}>{x}</span>)}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
          <Meta label="Budget" value={form.budgetMin || form.budgetMax ? `£${form.budgetMin || '?'}–£${form.budgetMax || '?'}` : 'Not set'} />
          <Meta label="Duration" value={form.duration || 'Flexible'} />
          <Meta label="Start" value={form.startDate || 'Flexible'} />
          <Meta label="Mode" value={form.mode === 'on_site' ? 'On-site' : form.mode[0].toUpperCase() + form.mode.slice(1)} />
        </div>
      </div>
    </div>
  );
}
const Meta = ({ label, value }) => <div><div style={{ fontSize: 11.5, color: MUTED, textTransform: 'uppercase', letterSpacing: '.03em', fontWeight: 600 }}>{label}</div><div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 3 }}>{value}</div></div>;

function Published({ form, outcome, onReset }) {
  return (
    <div style={{ fontFamily: 'Spline Sans,system-ui,sans-serif', background: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap');@keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(31,77,63,.1),transparent 65%)' }} />
      <div style={{ textAlign: 'center', maxWidth: 460, position: 'relative', zIndex: 2 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: MOSS, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pop .5s cubic-bezier(.2,.9,.3,1.4) both', boxShadow: '0 20px 50px -16px rgba(31,77,63,.6)' }}>
          <svg viewBox="0 0 24 24" style={{ width: 34, height: 34, stroke: '#fff', fill: 'none', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div style={{ animation: 'rise .5s ease both', animationDelay: '.15s' }}>
          <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 34, letterSpacing: '-.02em', margin: '0 0 10px' }}>Your opportunity is live</h1>
          <p style={{ color: MUTED, fontSize: 16.5, lineHeight: 1.55, margin: '0 0 8px' }}><b style={{ color: INK }}>{form.title}</b></p>
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.55, margin: '0 0 28px' }}>We're surfacing it to verified experts in {outcome.l.toLowerCase()}. You'll be notified when someone expresses interest.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{ padding: '13px 22px', borderRadius: 12, background: MOSS, color: '#fff', border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>View matched experts →</button>
            <button onClick={onReset} style={{ padding: '13px 20px', borderRadius: 12, background: '#fff', border: `1px solid ${LINE}`, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Post another</button>
          </div>
        </div>
      </div>
    </div>
  );
}
