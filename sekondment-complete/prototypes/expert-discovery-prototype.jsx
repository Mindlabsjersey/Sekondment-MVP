import React, { useState, useMemo } from 'react';

const MOSS = '#1f4d3f', MOSS2 = '#2d6a55', SAND = '#c9a86a', INK = '#0c1f1a',
  PAPER = '#f6f3ec', PAPER2 = '#efe9dd', MUTED = '#5a6b63', LINE = 'rgba(12,31,26,.12)';

const EXPERTS = [
  { id: 1, name: 'Eleanor Voss', headline: 'Fractional Marketing Director', cats: ['Fractional'], skills: ['Brand Strategy', 'Demand Gen', 'Positioning'], industries: ['B2B SaaS'], daily: 850, trust: 94, avail: 'available_now', modes: ['Remote', 'Hybrid'], verified: true, company: null, reviews: 23 },
  { id: 2, name: 'Marcus Chen', headline: 'Interim CFO & Finance Advisor', cats: ['Interim', 'Advisor'], skills: ['Fundraising', 'FP&A', 'Cost Reduction'], industries: ['Finance', 'SaaS'], daily: 1100, trust: 91, avail: 'available_from', modes: ['Remote'], verified: true, company: null, reviews: 17 },
  { id: 3, name: 'Priya Anand', headline: 'Senior Product Designer', cats: ['Specialist', 'Company Resource'], skills: ['UX', 'Design Systems', 'Prototyping'], industries: ['SaaS', 'Fintech'], daily: 640, trust: 88, avail: 'available_now', modes: ['Remote', 'On-site'], verified: true, company: 'Northpoint Studio', reviews: 11 },
  { id: 4, name: 'James Okafor', headline: 'Digital Transformation Consultant', cats: ['Consultant'], skills: ['Operations', 'Change Mgmt', 'ERP'], industries: ['Manufacturing'], daily: 950, trust: 86, avail: 'project_only', modes: ['Hybrid', 'On-site'], verified: true, company: null, reviews: 29 },
  { id: 5, name: 'Sofia Reyes', headline: 'Growth & Performance Marketing', cats: ['Fractional', 'Consultant'], skills: ['Paid Social', 'SEO', 'CRO'], industries: ['Retail', 'D2C'], daily: 580, trust: 79, avail: 'fractional_only', modes: ['Remote'], verified: false, company: null, reviews: 6 },
  { id: 6, name: 'Tom Belmont', headline: 'Compliance & Risk Advisor', cats: ['Advisor'], skills: ['Compliance', 'Risk', 'Governance'], industries: ['Finance'], daily: 1250, trust: 96, avail: 'advisory_only', modes: ['Remote', 'Hybrid'], verified: true, company: null, reviews: 34 },
  { id: 7, name: 'Aoife Brennan', headline: 'Lead Engineer (Seconded)', cats: ['Company Resource', 'Specialist'], skills: ['React', 'Node', 'Cloud'], industries: ['SaaS'], daily: 720, trust: 83, avail: 'available_now', modes: ['Remote'], verified: true, company: 'Atlas Digital', reviews: 9 },
  { id: 8, name: 'David Klein', headline: 'Interim Operations Director', cats: ['Interim'], skills: ['Operations', 'Logistics', 'Cost Reduction'], industries: ['Manufacturing', 'Retail'], daily: 880, trust: 72, avail: 'available_from', modes: ['On-site', 'Hybrid'], verified: false, company: null, reviews: 4 },
];

const ALL_CATS = ['Fractional', 'Consultant', 'Advisor', 'Interim', 'Specialist', 'Company Resource'];
const ALL_EXPERTISE = ['Brand Strategy', 'Demand Gen', 'Fundraising', 'FP&A', 'UX', 'Design Systems', 'Operations', 'Change Mgmt', 'Paid Social', 'SEO', 'Compliance', 'Risk', 'React', 'Cloud', 'Cost Reduction'];
const AVAIL_LABELS = { available_now: 'Available now', available_from: 'Available soon', project_only: 'Project only', fractional_only: 'Fractional only', advisory_only: 'Advisory only' };
const AVAIL_FILTERS = [['available_now', 'Available now'], ['fractional_only', 'Fractional'], ['advisory_only', 'Advisory'], ['project_only', 'Project']];

export default function ExpertDiscovery() {
  const [q, setQ] = useState('');
  const [cats, setCats] = useState([]);
  const [expertise, setExpertise] = useState([]);
  const [avail, setAvail] = useState([]);
  const [minTrust, setMinTrust] = useState(0);
  const [maxDaily, setMaxDaily] = useState(1500);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState('trust');
  const [saved, setSaved] = useState({});
  const [selected, setSelected] = useState(null);

  const toggle = (list, set, v) => set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const results = useMemo(() => {
    let r = EXPERTS.filter(e => {
      if (q && !(`${e.name} ${e.headline} ${e.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (cats.length && !cats.some(c => e.cats.includes(c))) return false;
      if (expertise.length && !expertise.some(x => e.skills.includes(x))) return false;
      if (avail.length && !avail.includes(e.avail)) return false;
      if (e.trust < minTrust) return false;
      if (e.daily > maxDaily) return false;
      if (verifiedOnly && !e.verified) return false;
      return true;
    });
    r.sort((a, b) => sort === 'trust' ? b.trust - a.trust : sort === 'rate_low' ? a.daily - b.daily : b.daily - a.daily);
    return r;
  }, [q, cats, expertise, avail, minTrust, maxDaily, verifiedOnly, sort]);

  const activeCount = cats.length + expertise.length + avail.length + (minTrust > 0 ? 1 : 0) + (maxDaily < 1500 ? 1 : 0) + (verifiedOnly ? 1 : 0);
  const clearAll = () => { setCats([]); setExpertise([]); setAvail([]); setMinTrust(0); setMaxDaily(1500); setVerifiedOnly(false); };

  const Avatar = ({ name, size = 52 }) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return <div style={{ width: size, height: size, borderRadius: size * 0.27, background: `linear-gradient(135deg,${MOSS},${MOSS2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: size * 0.36, flex: 'none' }}>{initials}</div>;
  };

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? MOSS : LINE}`, background: active ? MOSS : '#fff', color: active ? '#fff' : MUTED, transition: 'all .15s', fontFamily: 'inherit' }}>{children}</button>
  );

  return (
    <div style={{ fontFamily: 'Spline Sans, system-ui, sans-serif', background: PAPER, color: INK, minHeight: '100vh', padding: '0 0 60px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap');`}</style>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(246,243,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 18 }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: MOSS, position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 2, background: SAND }} /></span>
            Sekondment
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 14, color: MUTED }}>Find Experts</div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 0' }}>
        <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 500, fontSize: 38, letterSpacing: '-.02em', margin: '0 0 6px' }}>Find expertise</h1>
        <p style={{ color: MUTED, fontSize: 17, margin: '0 0 24px' }}>Browse verified experts, advisors and company resources. Filter by what you need.</p>

        {/* search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 16, top: 15, width: 20, height: 20, stroke: MUTED, fill: 'none', strokeWidth: 2 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, role or skill…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px 14px 46px', borderRadius: 12, border: `1px solid ${LINE}`, background: '#fff', fontSize: 15, fontFamily: 'inherit', color: INK, outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '278px 1fr', gap: 28, alignItems: 'start' }}>
          {/* filters */}
          <aside style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, padding: 22, position: 'sticky', top: 78 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>Filters</span>
              {activeCount > 0 && <button onClick={clearAll} style={{ fontSize: 13, color: MOSS, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Clear ({activeCount})</button>}
            </div>

            <FilterGroup label="Category">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {ALL_CATS.map(c => <Chip key={c} active={cats.includes(c)} onClick={() => toggle(cats, setCats, c)}>{c}</Chip>)}
              </div>
            </FilterGroup>

            <FilterGroup label="Availability">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {AVAIL_FILTERS.map(([v, l]) => <Chip key={v} active={avail.includes(v)} onClick={() => toggle(avail, setAvail, v)}>{l}</Chip>)}
              </div>
            </FilterGroup>

            <FilterGroup label={`Min Trust Score · ${minTrust}`}>
              <input type="range" min="0" max="100" value={minTrust} onChange={e => setMinTrust(+e.target.value)} style={{ width: '100%', accentColor: MOSS }} />
            </FilterGroup>

            <FilterGroup label={`Max day rate · £${maxDaily}`}>
              <input type="range" min="400" max="1500" step="50" value={maxDaily} onChange={e => setMaxDaily(+e.target.value)} style={{ width: '100%', accentColor: MOSS }} />
            </FilterGroup>

            <FilterGroup label="Expertise">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 132, overflowY: 'auto' }}>
                {ALL_EXPERTISE.map(x => <Chip key={x} active={expertise.includes(x)} onClick={() => toggle(expertise, setExpertise, x)}>{x}</Chip>)}
              </div>
            </FilterGroup>

            <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} style={{ accentColor: MOSS, width: 16, height: 16 }} />
              Verified experts only
            </label>
          </aside>

          {/* results */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: MUTED, fontSize: 14.5 }}><b style={{ color: INK }}>{results.length}</b> expert{results.length !== 1 ? 's' : ''} found</span>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', fontSize: 14, fontFamily: 'inherit', color: INK, cursor: 'pointer' }}>
                <option value="trust">Highest Trust Score</option>
                <option value="rate_low">Day rate: low to high</option>
                <option value="rate_high">Day rate: high to low</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {results.map(e => (
                <div key={e.id} onClick={() => setSelected(e)} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'box-shadow .2s, transform .15s', display: 'flex', gap: 16 }}
                  onMouseEnter={ev => { ev.currentTarget.style.boxShadow = '0 12px 40px -12px rgba(12,31,26,.18)'; ev.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.transform = 'none'; }}>
                  <Avatar name={e.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.name}</span>
                      {e.verified && <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', color: MOSS, background: 'rgba(31,77,63,.1)', padding: '3px 8px', borderRadius: 5 }}>✓ VERIFIED</span>}
                      {e.company && <span style={{ fontSize: 11.5, color: SAND, fontWeight: 600 }}>via {e.company}</span>}
                    </div>
                    <div style={{ color: MUTED, fontSize: 14, margin: '2px 0 10px' }}>{e.headline}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {e.skills.slice(0, 3).map(s => <span key={s} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 6, background: PAPER2, fontWeight: 500 }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.trust >= 90 ? MOSS : e.trust >= 80 ? SAND : '#c98a6a' }} />
                        <span style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 17 }}>{e.trust}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: MUTED }}>Trust · {e.reviews} reviews</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>£{e.daily}<span style={{ fontSize: 12, color: MUTED, fontWeight: 400 }}>/day</span></div>
                      <div style={{ fontSize: 11.5, color: e.avail === 'available_now' ? MOSS : MUTED, fontWeight: 500 }}>{AVAIL_LABELS[e.avail]}</div>
                    </div>
                  </div>
                  <button onClick={ev => { ev.stopPropagation(); setSaved(s => ({ ...s, [e.id]: !s[e.id] })); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: saved[e.id] ? SAND : LINE, alignSelf: 'flex-start', padding: 0 }} title="Save expert">
                    {saved[e.id] ? '★' : '☆'}
                  </button>
                </div>
              ))}
              {results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: MUTED, background: '#fff', borderRadius: 16, border: `1px solid ${LINE}` }}>
                  <p style={{ fontFamily: 'Fraunces,serif', fontSize: 19, color: INK, margin: '0 0 6px' }}>No experts match these filters</p>
                  <p style={{ margin: 0, fontSize: 14 }}>Try widening your budget or trust score, or <button onClick={clearAll} style={{ color: MOSS, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500 }}>clear all filters</button>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* profile drawer */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(12,31,26,.35)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px,100%)', background: PAPER, height: '100%', overflowY: 'auto', boxShadow: '-20px 0 60px rgba(12,31,26,.2)', animation: 'slidein .25s ease' }}>
            <style>{`@keyframes slidein{from{transform:translateX(30px);opacity:.6}to{transform:none;opacity:1}}`}</style>
            <div style={{ padding: 28 }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, float: 'right' }}>×</button>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
                <Avatar name={selected.name} size={64} />
                <div>
                  <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22 }}>{selected.name}</div>
                  <div style={{ color: MUTED, fontSize: 14.5 }}>{selected.headline}</div>
                </div>
              </div>
              {selected.company && <div style={{ background: 'rgba(201,168,106,.14)', border: `1px solid ${SAND}55`, borderRadius: 10, padding: '11px 14px', fontSize: 13.5, marginBottom: 18 }}><b>Company Resource</b> — deployed via {selected.company}, who receives payment for this engagement.</div>}
              <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
                <Stat label="Trust Score" value={selected.trust} />
                <Stat label="Day rate" value={`£${selected.daily}`} />
                <Stat label="Reviews" value={selected.reviews} />
              </div>
              <Section title="Availability"><span style={{ color: selected.avail === 'available_now' ? MOSS : INK, fontWeight: 500 }}>{AVAIL_LABELS[selected.avail]}</span> · {selected.modes.join(', ')}</Section>
              <Section title="Skills"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{selected.skills.map(s => <span key={s} style={{ fontSize: 13, padding: '5px 11px', borderRadius: 7, background: '#fff', border: `1px solid ${LINE}` }}>{s}</span>)}</div></Section>
              <Section title="Industries">{selected.industries.join(' · ')}</Section>
              <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
                <button style={{ flex: 1, padding: '13px', borderRadius: 11, background: MOSS, color: '#fff', border: 'none', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Engage Expert →</button>
                <button onClick={() => setSaved(s => ({ ...s, [selected.id]: !s[selected.id] }))} style={{ padding: '13px 18px', borderRadius: 11, background: '#fff', border: `1px solid ${LINE}`, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>{saved[selected.id] ? '★ Saved' : '☆ Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${LINE}` }}>
    <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: MUTED, marginBottom: 11 }}>{label}</div>
    {children}
  </div>;
}
function Stat({ label, value }) {
  return <div style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '12px 14px', textAlign: 'center' }}>
    <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 20 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: MUTED }}>{label}</div>
  </div>;
}
function Section({ title, children }) {
  return <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{children}</div>
  </div>;
}
