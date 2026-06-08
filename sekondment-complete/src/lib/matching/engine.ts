/* ============================================================================
   Rule-based expertise matching. Pure, unit-testable scoring. No AI — this is
   the structured-data moat the prompt asks for first. Produces a 0-100 score
   plus human-readable reasons and a list of missing requirements.
   ========================================================================== */

export type Importance = 'required' | 'preferred' | 'optional';
export type VerificationLevel = 'declared' | 'verified' | 'proven';

export interface Requirement {
  expertiseId: string;
  name: string;
  importance: Importance;
  requiredLevel: number;            // 1-5
  requiredVerification: VerificationLevel;
}

export interface CandidateExpertise {
  expertiseId: string;
  declaredLevel: number;            // 1-5
  verificationLevel: VerificationLevel;
}

export interface CandidateSignals {
  expertise: CandidateExpertise[];
  relatedExpertiseIds?: string[];   // related (not exact) the candidate holds
  trustScore?: number;              // 0-100
  completedProjects?: number;
  reviewScore?: number;             // 0-5
  availabilityOk?: boolean;
  rateWithinBudget?: boolean;
  workModeOk?: boolean;
  timezoneOk?: boolean;
  verified?: boolean;
  employerApproved?: boolean | null; // null = N/A (not a resource)
  disputeCount?: number;
}

export interface MatchResult {
  score: number;                    // 0-100
  reasons: { factor: string; detail: string }[];
  missing: { name: string; detail: string }[];
}

const IMPORTANCE_WEIGHT: Record<Importance, number> = { required: 1, preferred: 0.6, optional: 0.3 };
const VERIF_RANK: Record<VerificationLevel, number> = { declared: 1, verified: 2, proven: 3 };

export function computeMatch(reqs: Requirement[], c: CandidateSignals): MatchResult {
  const reasons: { factor: string; detail: string }[] = [];
  const missing: { name: string; detail: string }[] = [];

  const held = new Map(c.expertise.map((e) => [e.expertiseId, e]));
  const related = new Set(c.relatedExpertiseIds ?? []);

  // ── Expertise coverage (the dominant factor: up to 60 pts) ────────────────
  let reqWeightTotal = 0;
  let reqWeightMet = 0;
  for (const r of reqs) {
    const w = IMPORTANCE_WEIGHT[r.importance];
    reqWeightTotal += w;
    const match = held.get(r.expertiseId);
    if (match) {
      const levelOk = match.declaredLevel >= r.requiredLevel;
      const verifOk = VERIF_RANK[match.verificationLevel] >= VERIF_RANK[r.requiredVerification];
      if (levelOk && verifOk) {
        reqWeightMet += w;
        reasons.push({ factor: 'expertise', detail: `Has ${r.name} (${match.verificationLevel})` });
      } else {
        reqWeightMet += w * 0.6; // has it but below required level/verification
        reasons.push({ factor: 'expertise', detail: `Has ${r.name} but below required level/verification` });
        if (!verifOk) missing.push({ name: r.name, detail: `Needs ${r.requiredVerification}, has ${match.verificationLevel}` });
      }
    } else if (related.has(r.expertiseId)) {
      reqWeightMet += w * 0.4; // related expertise partial credit
      reasons.push({ factor: 'related', detail: `Related experience to ${r.name}` });
      missing.push({ name: r.name, detail: 'Related, not exact' });
    } else {
      if (r.importance === 'required') missing.push({ name: r.name, detail: 'Not held' });
    }
  }
  const expertiseScore = reqWeightTotal > 0 ? (reqWeightMet / reqWeightTotal) * 60 : 30;

  // ── Quality & fit signals (up to 40 pts) ──────────────────────────────────
  let fit = 0;
  const add = (cond: boolean | undefined, pts: number, factor: string, detail: string) => {
    if (cond) { fit += pts; reasons.push({ factor, detail }); }
  };
  add((c.trustScore ?? 0) >= 70, 8, 'trust', `Strong Trust Score (${c.trustScore})`);
  add((c.completedProjects ?? 0) >= 3, 6, 'track_record', `${c.completedProjects} completed projects`);
  add((c.reviewScore ?? 0) >= 4, 6, 'reviews', `High review score (${c.reviewScore}/5)`);
  add(c.availabilityOk, 5, 'availability', 'Available for the timeframe');
  add(c.rateWithinBudget, 5, 'budget', 'Rate fits budget');
  add(c.workModeOk, 3, 'work_mode', 'Work mode matches');
  add(c.timezoneOk, 3, 'timezone', 'Timezone overlap works');
  add(c.verified, 2, 'verified', 'Verified account');
  add(c.employerApproved === true, 2, 'employer', 'Employer-approved resource');

  // Penalties.
  if ((c.disputeCount ?? 0) > 0) {
    fit -= Math.min(10, c.disputeCount! * 5);
    reasons.push({ factor: 'dispute', detail: `${c.disputeCount} prior dispute(s)` });
  }
  if (c.rateWithinBudget === false) missing.push({ name: 'Budget', detail: 'Rate above budget' });
  if (c.availabilityOk === false) missing.push({ name: 'Availability', detail: 'Not available' });

  const score = Math.max(0, Math.min(100, Math.round(expertiseScore + fit)));
  return { score, reasons, missing };
}
