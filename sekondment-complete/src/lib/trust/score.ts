/* ============================================================================
   Trust Score engine.

   Score = 0–100, computed from these weighted factors:
     Verification level    25 pts   (email 5, identity 10, linkedin 5, certs 5)
     Profile completeness  15 pts
     Review average        25 pts   (5-star avg mapped to 0–25)
     Completion rate       20 pts   (completed / accepted engagements)
     Repeat engagements    10 pts   (capped at 10, 2pts each)
     Dispute penalty        -5 pts  per unresolved or upheld dispute (capped -15)
     Response speed         5 pts   (placeholder; needs message timestamps)

   Stored in trust_score_factors (factors) and the score on the profile table.
   Called from review-actions.ts after a review, and can be called on any
   profile update. Pure computation: no Supabase calls here.
   ========================================================================== */

export interface TrustFactors {
  // verification
  emailVerified: boolean;
  identityVerified: boolean;
  linkedinVerified: boolean;
  certificationVerified: boolean;
  // profile
  profileCompleteness: number; // 0..1
  // engagement history
  completedEngagements: number;
  totalAcceptedEngagements: number;
  repeatEngagements: number; // distinct businesses / experts who engaged more than once
  // reviews
  avgReview: number; // 0..5
  reviewCount: number;
  // disputes
  disputesAgainst: number; // disputes raised against this account, resolved against them
}

export interface TrustScoreBreakdown {
  score: number; // 0–100 final
  verification: number;
  profileCompleteness: number;
  reviews: number;
  completionRate: number;
  repeatEngagements: number;
  disputePenalty: number;
}

export function computeTrustScore(f: TrustFactors): TrustScoreBreakdown {
  // Verification — up to 25 pts
  const verification = Math.min(25,
    (f.emailVerified ? 5 : 0) +
    (f.identityVerified ? 10 : 0) +
    (f.linkedinVerified ? 5 : 0) +
    (f.certificationVerified ? 5 : 0)
  );

  // Profile completeness — up to 15 pts
  const profileCompleteness = Math.round(Math.min(15, f.profileCompleteness * 15));

  // Review average — up to 25 pts (5-star maps to 25)
  const reviews = f.reviewCount > 0
    ? Math.round(Math.min(25, (f.avgReview / 5) * 25))
    : 0;

  // Completion rate — up to 20 pts
  const completionRate = f.totalAcceptedEngagements > 0
    ? Math.round(Math.min(20, (f.completedEngagements / f.totalAcceptedEngagements) * 20))
    : 0;

  // Repeat engagements — up to 10 pts, 2 pts each
  const repeatEngagements = Math.min(10, f.repeatEngagements * 2);

  // Dispute penalty — -5 per upheld dispute, capped at -15
  const disputePenalty = Math.max(-15, -(f.disputesAgainst * 5));

  const score = Math.max(0, Math.min(100,
    verification + profileCompleteness + reviews + completionRate + repeatEngagements + disputePenalty
  ));

  return { score, verification, profileCompleteness, reviews, completionRate, repeatEngagements, disputePenalty };
}

/** How complete is an expert profile? Checks which fields are populated. */
export function expertProfileCompleteness(profile: {
  headline: string | null;
  bio: string | null;
  skills: string[];
  expertise_areas: string[];
  industries: string[];
  photo_url: string | null;
  linkedin_url: string | null;
  daily_rate: number | null;
  categories: string[];
}): number {
  const checks = [
    !!profile.headline,
    !!profile.bio,
    profile.skills.length > 0,
    profile.expertise_areas.length > 0,
    profile.industries.length > 0,
    !!profile.photo_url,
    !!profile.linkedin_url,
    profile.daily_rate != null,
    profile.categories.length > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** How complete is a business profile? */
export function businessProfileCompleteness(profile: {
  description: string | null;
  logo_url: string | null;
  website: string | null;
  location: string | null;
  company_size: string | null;
  industry: string | null;
}): number {
  const checks = [
    !!profile.description,
    !!profile.logo_url,
    !!profile.website,
    !!profile.location,
    !!profile.company_size,
    !!profile.industry,
  ];
  return checks.filter(Boolean).length / checks.length;
}
