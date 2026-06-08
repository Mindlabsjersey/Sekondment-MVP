'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitReview } from '../review-actions';

const BUSINESS_CATEGORIES = [
  { key: 'r_expertise', label: 'Expertise' },
  { key: 'r_communication', label: 'Communication' },
  { key: 'r_reliability', label: 'Reliability' },
  { key: 'r_outcome_achievement', label: 'Outcome achievement' },
  { key: 'r_value_delivered', label: 'Value delivered' },
];
const EXPERT_CATEGORIES = [
  { key: 'r_communication', label: 'Communication' },
  { key: 'r_payment_reliability', label: 'Payment reliability' },
  { key: 'r_professionalism', label: 'Professionalism' },
  { key: 'r_scope_clarity', label: 'Scope clarity' },
  { key: 'r_responsiveness', label: 'Responsiveness' },
];

export default function ReviewForm({
  engagementId,
  isBusiness,
  revieweeName,
}: {
  engagementId: string;
  isBusiness: boolean;
  revieweeName: string;
}) {
  const router = useRouter();
  const categories = isBusiness ? BUSINESS_CATEGORIES : EXPERT_CATEGORIES;
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    if (Object.keys(ratings).length < categories.length) {
      return setError('Please rate every category.');
    }
    setPending(true);
    setError(null);
    Object.entries(ratings).forEach(([k, v]) => formData.set(k, String(v)));
    const res = await submitReview(engagementId, formData);
    if (res?.error) { setError(res.error); setPending(false); }
    else router.refresh();
  }

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl2 p-7 shadow-soft">
      <h3 className="font-serif text-xl mb-1">Review {revieweeName}</h3>
      <p className="text-muted text-sm mb-6">Your honest feedback builds trust across the platform.</p>
      <form action={action}>
        <div className="space-y-4">
          {categories.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{label}</span>
              <StarRating value={ratings[key] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [key]: v }))} />
            </div>
          ))}
        </div>
        <div className="mt-5">
          <label className="label">Comment <span className="text-muted font-normal">(optional)</span></label>
          <textarea name="comment" rows={3} className="field resize-none"
            placeholder={`Share what it was like working ${isBusiness ? 'with' : 'for'} ${revieweeName}…`} />
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full mt-6 disabled:opacity-60">
          {pending ? 'Submitting…' : 'Submit review →'}
        </button>
      </form>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="text-2xl leading-none transition-colors"
          style={{ color: n <= (hover || value) ? '#c8a24a' : 'rgba(12,31,26,.15)' }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          ★
        </button>
      ))}
    </div>
  );
}
