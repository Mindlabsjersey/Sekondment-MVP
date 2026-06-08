import React, { useState, useMemo, useRef } from 'react';

/**
 * Sekondment — Expertise Matching prototype (enriched).
 * Multi-industry taxonomy with aliases + autosuggestion, a richer expert pool,
 * and tunable controls (budget, work mode, verification). Mirrors the real
 * rule-based engine in src/lib/matching/engine.ts. Mock data; fully interactive.
 */

const TAXONOMY = [
  { id: 'trust', name: 'Trust Administration', industry: 'Finance', aliases: ['trustee', 'fiduciary'] },
  { id: 'fund', name: 'Fund Administration', industry: 'Finance', aliases: ['fund admin'] },
  { id: 'aml', name: 'AML Review', industry: 'Finance', aliases: ['anti money laundering', 'aml/cft'] },
  { id: 'kyc', name: 'KYC Review', industry: 'Finance', aliases: ['know your customer', 'onboarding'] },
  { id: 'cdd', name: 'Client Due Diligence', industry: 'Finance', aliases: ['due diligence'] },
  { id: 'regrep', name: 'Regulatory Reporting', industry: 'Finance', aliases: [] },
  { id: 'fcfo', name: 'Fractional CFO', industry: 'Leadership', aliases: ['part-time cfo', 'interim cfo'] },
  { id: 'cloud', name: 'Cloud Architecture', industry: 'Technology', aliases: ['cloud architect'] },
  { id: 'aws', name: 'AWS Architecture', industry: 'Technology', aliases: ['amazon web services'] },
  { id: 'azure', name: 'Azure Administration', industry: 'Technology', aliases: [] },
  { id: 'm365', name: 'Microsoft 365 Migration', industry: 'Technology', aliases: ['m365', 'office 365', 'tenant migration', 'exchange migration'] },
  { id: 'iso', name: 'ISO27001 Implementation', industry: 'Technology', aliases: ['iso 27001', 'isms', 'information security'] },
  { id: 'soc2', name: 'SOC2 Readiness', industry: 'Technology', aliases: ['soc 2', 'soc2 type ii'] },
  { id: 'stripe', name: 'Stripe Connect Implementation', industry: 'Technology', aliases: ['stripe', 'marketplace payments', 'connected accounts'] },
  { id: 'api', name: 'API Integration', industry: 'Technology', aliases: ['api', 'integrations'] },
  { id: 'powerbi', name: 'Power BI Dashboarding', industry: 'Technology', aliases: ['power bi', 'powerbi', 'bi dashboards'] },
  { id: 'dbmig', name: 'Database Migration', industry: 'Technology', aliases: ['db migration'] },
  { id: 'seo', name: 'SEO', industry: 'Marketing', aliases: ['search engine optimisation'] },
  { id: 'meta', name: 'Meta Ads Lead Generation', industry: 'Marketing', aliases: ['facebook ads', 'meta ads'] },
  { id: 'gads', name: 'Google Ads', industry: 'Marketing', aliases: ['adwords', 'ppc'] },
  { id: 'hubspot', name: 'HubSpot Automation', industry: 'Marketing', aliases: ['hubspot', 'crm automation'] },
  { id: 'ga4', name: 'GA4 Setup', industry: 'Marketing', aliases: ['google analytics', 'ga4'] },
  { id: 'cro', name: 'CRO', industry: 'Marketing', aliases: ['conversion rate optimisation'] },
  { id: 'pm', name: 'Project Management', industry: 'Operations', aliases: ['project manager', 'pmo'] },
  { id: 'change', name: 'Change Management', industry: 'Operations', aliases: [] },
  { id: 'procurement', name: 'Procurement', industry: 'Operations', aliases: ['purchasing'] },
  { id: 'transform', name: 'Business Transformation', industry: 'Operations', aliases: ['transformation'] },
  { id: 'hr', name: 'HR Advisory', industry: 'Professional', aliases: ['human resources'] },
  { id: 'legal', name: 'Legal Support', industry: 'Professional', aliases: ['legal counsel'] },
  { id: 'fcoo', name: 'Fractional COO', industry: 'Leadership', aliases: ['part-time coo'] },
  { id: 'commstrat', name: 'Commercial Strategy', industry: 'Leadership', aliases: ['go to market'] },
];

const RELATED = {
  stripe: ['api'], iso: ['soc2'], soc2: ['iso'], m365: ['azure'], aws: ['cloud'], azure: ['cloud'],
  kyc: ['aml', 'cdd'], aml: ['kyc'], fund: ['trust'], gads: ['meta'], meta: ['gads'],
  hubspot: ['ga4'], cro: ['seo'], fcfo: ['regrep'], fcoo: ['transform'], change: ['transform'],
};

const INDUSTRY_COLOR = {
  Finance: '#2f8f6b', Technology: '#4f6bed', Marketing: '#c2557a',
  Operations: '#2e8aa0', Professional: '#7c5cc4', Leadership: '#c08a3e',
};

const EXPERTS = [
  { id: 'e1', name: 'Priya N.', headline: 'Fractional payments architect', industry: 'Technology', trust: 92, projects: 7, reviews: 4.9, verified: true, dayRate: 750, remote: true,
    expertise: [['stripe', 5, 'proven'], ['api', 5, 'verified'], ['cloud', 4, 'verified']] },
  { id: 'e2', name: 'Tom R.', headline: 'Security & compliance lead', industry: 'Technology', trust: 85, projects: 4, reviews: 4.6, verified: true, dayRate: 680, remote: true,
    expertise: [['iso', 4, 'verified'], ['soc2', 4, 'declared'], ['cloud', 3, 'declared']] },
  { id: 'e3', name: 'Maria S.', headline: 'M365 & cloud migration specialist', industry: 'Technology', trust: 78, projects: 5, reviews: 4.4, verified: true, dayRate: 600, remote: true,
    expertise: [['m365', 5, 'proven'], ['azure', 4, 'verified']] },
  { id: 'e4', name: 'James K.', headline: 'Generalist consultant', industry: 'Operations', trust: 60, projects: 1, reviews: 4.0, verified: false, dayRate: 400, remote: true,
    expertise: [['api', 3, 'declared'], ['pm', 3, 'declared']] },
  { id: 'e5', name: 'Aisha B.', headline: 'Trust & fund administration', industry: 'Finance', trust: 88, projects: 6, reviews: 4.8, verified: true, dayRate: 650, remote: false,
    expertise: [['trust', 5, 'proven'], ['aml', 4, 'verified'], ['fund', 4, 'verified']] },
  { id: 'e6', name: 'David L.', headline: 'AML / KYC compliance specialist', industry: 'Finance', trust: 81, projects: 5, reviews: 4.5, verified: true, dayRate: 580, remote: true,
    expertise: [['aml', 5, 'proven'], ['kyc', 5, 'proven'], ['cdd', 4, 'verified']] },
  { id: 'e7', name: 'Sofia M.', headline: 'Growth marketer — paid + lifecycle', industry: 'Marketing', trust: 76, projects: 8, reviews: 4.7, verified: true, dayRate: 520, remote: true,
    expertise: [['meta', 5, 'proven'], ['gads', 4, 'verified'], ['hubspot', 4, 'verified'], ['ga4', 3, 'declared']] },
  { id: 'e8', name: 'Ren T.', headline: 'SEO & CRO consultant', industry: 'Marketing', trust: 70, projects: 3, reviews: 4.3, verified: false, dayRate: 450, remote: true,
    expertise: [['seo', 4, 'verified'], ['cro', 4, 'declared']] },
  { id: 'e9', name: 'Helena V.', headline: 'Transformation & change lead', industry: 'Operations', trust: 90, projects: 9, reviews: 4.9, verified: true, dayRate: 820, remote: false,
    expertise: [['transform', 5, 'proven'], ['change', 5, 'proven'], ['pm', 4, 'verified']] },
  { id: 'e10', name: 'Marcus A.', headline: 'Fractional CFO — scale-ups', industry: 'Leadership', trust: 94, projects: 11, reviews: 5.0, verified: true, dayRate: 950, remote: true,
    expertise: [['fcfo', 5, 'proven'], ['regrep', 4, 'verified'], ['commstrat', 4, 'verified']] },
  { id: 'e11', name: 'Nadia H.', headline: 'People & HR advisor', industry: 'Professional', trust: 73, projects: 4, reviews: 4.4, verified: true, dayRate: 480, remote: true,
    expertise: [['hr', 5, 'verified'], ['change', 3, 'declared']] },
  { id: 'e12', name: 'Olu F.', headline: 'Cloud & data engineer', industry: 'Technology', trust: 82, projects: 6, reviews: 4.6, verified: true, dayRate: 700, remote: true,
    expertise: [['aws', 5, 'proven'], ['cloud', 5, 'verified'], ['dbmig', 4, 'verified'], ['powerbi', 3, 'declared']] },
];

const IMPORTANCE_WEIGHT = { required: 1, preferred: 0.6, optional: 0.3 };
const VERIF_RANK = { declared: 1, verified: 2, proven: 3 };

function computeMatch(reqs, c, opts) {
  const reasons = [], missing = [];
  const held = new Map(c.expertise.map(([id, level, verification]) => [id, { level, verification }]));
  let tot = 0, met = 0;
  for (const r of reqs) {
    const w = IMPORTANCE_WEIGHT[r.importance]; tot += w;
    const m = held.get(r.id);
    if (m) {
      const lvlOk = m.level >= r.level;
      const vfOk = VERIF_RANK[m.verification] >= VERIF_RANK[r.verification];
      if (lvlOk && vfOk) { met += w; reasons.push(`Has ${r.name} (${m.verification})`); }
      else { met += w * 0.6; reasons.push(`Has ${r.name}, below required`); if (!vfOk) missing.push(`${r.name}: needs ${r.verification}`); }
    } else if ((RELATED[r.id] || []).some((rel) => held.has(rel))) {
      met += w * 0.4; reasons.push(`Related to ${r.name}`); missing.push(`${r.name} (related only)`);
    } else if (r.importance === 'required') { missing.push(`${r.name}: not held`); }
  }
  const expScore = tot > 0 ? (met / tot) * 60 : 30;
  let fit = 0;
  if (c.trust >= 70) { fit += 8; reasons.push(`Strong Trust (${c.trust})`); }
  if (c.projects >= 3) { fit += 6; reasons.push(`${c.projects} projects`); }
  if (c.reviews >= 4) { fit += 6; reasons.push(`Reviews ${c.reviews}/5`); }
  if (opts.budget && c.dayRate <= opts.budget) { fit += 5; reasons.push('Within budget'); }
  else if (opts.budget && c.dayRate > opts.budget) { missing.push(`Day rate £${c.dayRate} over budget`); }
  if (opts.remoteOnly && c.remote) { fit += 3; reasons.push('Remote'); }
  else if (opts.remoteOnly && !c.remote) { missing.push('Not available remotely'); }
  if (c.verified) { fit += 2; reasons.push('Verified'); }
  return { score: Math.max(0, Math.min(100, Math.round(expScore + fit))), reasons, missing };
}

const BLUE = '#1d4ed8', GOLD = '#c8a24a', INK = '#0f1419', MUTED = '#5b6573';

export default function MatchingPrototype() {
  const [reqs, setReqs] = useState([{ id: 'stripe', name: 'Stripe Connect Implementation', importance: 'required', level: 3, verification: 'verified' }]);
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFocus, setShowFocus] = useState(false);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TAXONOMY.filter((t) => !reqs.some((r) => r.id === t.id))
      .filter((t) => t.name.toLowerCase().includes(q) || t.aliases.some((a) => a.includes(q)))
      .slice(0, 6);
  }, [query, reqs]);

  const ranked = useMemo(() => {
    let pool = EXPERTS;
    if (verifiedOnly) pool = pool.filter((e) => e.verified);
    return pool.map((e) => ({ ...e, ...computeMatch(reqs, e, { budget, remoteOnly }) }))
      .sort((a, b) => b.score - a.score);
  }, [reqs, budget, remoteOnly, verifiedOnly]);

  function addReq(t) {
    if (reqs.some((r) => r.id === t.id)) return;
    setReqs([...reqs, { id: t.id, name: t.name, importance: 'required', level: 3, verification: 'verified' }]);
    setQuery(''); setShowFocus(false);
    inputRef.current && inputRef.current.blur();
  }
  function removeReq(id) { setReqs(reqs.filter((r) => r.id !== id)); }
  function cycleImportance(id) {
    const order = ['required', 'preferred', 'optional'];
    setReqs(reqs.map((r) => r.id === id ? { ...r, importance: order[(order.indexOf(r.importance) + 1) % 3] } : r));
  }
  function cycleVerif(id) {
    const order = ['declared', 'verified', 'proven'];
    setReqs(reqs.map((r) => r.id === id ? { ...r, verification: order[(order.indexOf(r.verification) + 1) % 3] } : r));
  }

  const scoreColor = (s) => s >= 80 ? BLUE : s >= 60 ? GOLD : MUTED;
  const card = { background: '#fff', border: '1px solid rgba(15,20,25,.1)', borderRadius: 16, padding: 18 };
  const pill = (bg, color) => ({ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: bg, color });

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f7f8fa', minHeight: '100vh', padding: 24, color: INK }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 2, background: GOLD }} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 20 }}>Sekondment</span>
        </div>
        <h1 style={{ fontSize: 26, margin: '8px 0 4px' }}>Expertise matching</h1>
        <p style={{ color: MUTED, marginTop: 0 }}>Search any industry — finance, tech, marketing, ops, leadership. Type to autosuggest (try "m365", "aml", "stripe"). Tap pills to tune importance & verification.</p>

        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ fontWeight: 600, margin: '0 0 10px' }}>Required expertise</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {reqs.map((r) => {
              const tax = TAXONOMY.find((t) => t.id === r.id);
              const ic = INDUSTRY_COLOR[tax?.industry] || BLUE;
              return (
                <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${ic}40`, borderLeft: `3px solid ${ic}`, borderRadius: 9, padding: '6px 8px 6px 10px', fontSize: 13 }}>
                  {r.name}
                  <button onClick={() => cycleImportance(r.id)} style={pill(r.importance === 'required' ? 'rgba(161,75,61,.1)' : r.importance === 'preferred' ? 'rgba(184,134,47,.12)' : 'rgba(91,101,115,.12)', r.importance === 'required' ? '#a14b3d' : r.importance === 'preferred' ? '#b8862f' : MUTED)}>{r.importance}</button>
                  <button onClick={() => cycleVerif(r.id)} style={pill('rgba(29,78,216,.08)', BLUE)}>{r.verification}</button>
                  <button onClick={() => removeReq(r.id)} style={{ border: 'none', background: 'none', color: MUTED, cursor: 'pointer' }}>✕</button>
                </span>
              );
            })}
          </div>
          <div style={{ position: 'relative' }}>
            <input ref={inputRef} value={query} onFocus={() => setShowFocus(true)} onChange={(e) => { setQuery(e.target.value); setShowFocus(true); }}
              placeholder="Search expertise or alias — e.g. m365, aml, stripe, seo…"
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(15,20,25,.12)', fontSize: 14, boxSizing: 'border-box' }} />
            {showFocus && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 44, left: 0, right: 0, background: '#fff', border: '1px solid rgba(15,20,25,.12)', borderRadius: 10, overflow: 'hidden', zIndex: 10, boxShadow: '0 10px 30px -10px rgba(0,0,0,.2)' }}>
                {suggestions.map((t) => (
                  <button key={t.id} onClick={() => addReq(t)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(15,20,25,.06)', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t.name}</span>
                    <span style={{ fontSize: 11, color: '#fff', background: INDUSTRY_COLOR[t.industry], padding: '2px 7px', borderRadius: 5 }}>{t.industry}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...card, marginBottom: 18, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: MUTED }}>Max day rate: {budget ? `£${budget}` : 'any'}</span>
            <input type="range" min="0" max="1000" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: 180, accentColor: BLUE }} />
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} style={{ accentColor: BLUE }} /> Remote only
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} style={{ accentColor: BLUE }} /> Verified only
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <p style={{ fontWeight: 600, margin: 0 }}>Recommended matches</p>
          <span style={{ fontSize: 13, color: MUTED }}>{ranked.length} candidates</span>
        </div>
        {ranked.map((e) => (
          <div key={e.id} style={{ ...card, padding: 16, marginBottom: 12, display: 'flex', gap: 14 }}>
            <div style={{ textAlign: 'center', flex: 'none' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: scoreColor(e.score), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17 }}>{e.score}</div>
              <p style={{ fontSize: 10, color: MUTED, margin: '4px 0 0' }}>match</p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{e.name}
                  <span style={{ fontSize: 11, color: '#fff', background: INDUSTRY_COLOR[e.industry], padding: '2px 7px', borderRadius: 5, marginLeft: 8, verticalAlign: 'middle' }}>{e.industry}</span>
                </span>
                <span style={{ fontSize: 12, color: MUTED }}>£{e.dayRate}/day · Trust {e.trust}</span>
              </div>
              <p style={{ color: MUTED, fontSize: 13, margin: '2px 0 8px' }}>{e.headline}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: e.missing.length ? 6 : 0 }}>
                {e.reasons.slice(0, 5).map((r, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'rgba(29,78,216,.08)', color: BLUE }}>{r}</span>
                ))}
              </div>
              {e.missing.length > 0 && (
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}><span style={{ color: '#a14b3d', fontWeight: 600 }}>Gaps:</span> {e.missing.slice(0, 3).join(', ')}</p>
              )}
            </div>
          </div>
        ))}
        {ranked.length === 0 && <div style={{ ...card, textAlign: 'center', color: MUTED }}>No candidates match these filters.</div>}
      </div>
    </div>
  );
}
