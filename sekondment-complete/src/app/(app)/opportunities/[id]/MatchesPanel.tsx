import Link from 'next/link';

const FACTOR_LABEL: Record<string, string> = {
  expertise: 'Expertise', related: 'Related experience', trust: 'Trust',
  track_record: 'Track record', reviews: 'Reviews', availability: 'Availability',
  budget: 'Budget fit', work_mode: 'Work mode', timezone: 'Timezone',
  verified: 'Verified', employer: 'Employer-approved', dispute: 'Dispute history',
};

function scoreColor(s: number) {
  if (s >= 80) return 'var(--c-blue)';
  if (s >= 60) return 'var(--c-gold)';
  return 'var(--c-muted)';
}

export default function MatchesPanel({ matches }: { matches: any[] }) {
  if (matches.length === 0) {
    return (
      <div className="card mb-6 text-center py-8 text-muted">
        <p className="text-sm">No matches computed yet. Add required expertise and tap <strong>Find matches</strong>.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="font-serif text-lg mb-3">Recommended matches</h3>
      <div className="grid gap-3">
        {matches.map((m) => {
          const reasons = (m.reasons ?? []) as { factor: string; detail: string }[];
          const missing = (m.missing ?? []) as { name: string; detail: string }[];
          return (
            <div key={m.profile_id} className="bg-surface border border-[var(--line)] rounded-xl p-5">
              <div className="flex items-start gap-4">
                {/* score dial */}
                <div className="flex-none text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-serif font-semibold text-lg text-white"
                    style={{ background: scoreColor(m.score) }}>
                    {m.score}
                  </div>
                  <p className="text-[10px] text-muted mt-1">match</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/experts/${m.profile_id}`} className="font-serif font-semibold text-lg hover:text-moss">
                      {m.expert_profiles?.name ?? 'Expert'}
                    </Link>
                    <span className="text-xs text-muted">Trust {m.expert_profiles?.trust_score ?? '—'}</span>
                  </div>
                  {m.expert_profiles?.headline && <p className="text-muted text-sm mb-2">{m.expert_profiles.headline}</p>}

                  {/* reasons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {reasons.slice(0, 5).map((r, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-moss/8 text-moss" title={r.detail}>
                        {FACTOR_LABEL[r.factor] ?? r.factor}
                      </span>
                    ))}
                  </div>

                  {/* missing */}
                  {missing.length > 0 && (
                    <p className="text-xs text-muted">
                      <span className="text-[#a14b3d] font-medium">Gaps:</span>{' '}
                      {missing.slice(0, 3).map((x) => x.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
