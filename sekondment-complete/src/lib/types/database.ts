// =============================================================================
// Sekondment — database types
// Mirrors the SQL schema. Regenerate with `supabase gen types typescript`
// once linked to a project; this hand-written version unblocks development.
// =============================================================================

export type AccountType = 'business' | 'expert' | 'admin' | 'employer_partner';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type WorkMode = 'remote' | 'hybrid' | 'on_site';
export type PayeeType = 'expert' | 'business' | 'employer_partner';
export type RateType = 'fixed' | 'hourly' | 'daily' | 'retainer';
export type EmployeeApprovalStatus = 'pending' | 'approved' | 'suspended' | 'revoked';
export type ProposalStatus = 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

export type ExpertCategory =
  | 'fractional' | 'consultant' | 'advisor' | 'interim'
  | 'specialist' | 'project_based' | 'company_resource' | 'seconded_resource';

export type AvailabilityType =
  | 'available_now' | 'available_from' | 'project_only'
  | 'fractional_only' | 'advisory_only';

export type OutcomeType =
  | 'launch_product' | 'deliver_project' | 'improve_marketing' | 'improve_operations'
  | 'fill_leadership_gap' | 'reduce_costs' | 'improve_compliance'
  | 'digital_transformation' | 'growth_initiative';

export type OpportunityStatus = 'draft' | 'open' | 'in_engagement' | 'closed' | 'cancelled';
export type OpportunityVisibility = 'public' | 'private';
export type ProfileVisibility = 'listed' | 'unlisted';
export type InterestStatus = 'expressed' | 'shortlisted' | 'declined' | 'agreed' | 'withdrawn';
export type EngagementStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
export type MilestoneStatus =
  | 'pending' | 'funded' | 'submitted' | 'approved' | 'released' | 'disputed' | 'refunded';
export type DisputeStatus =
  | 'open' | 'under_review' | 'resolved_release' | 'resolved_refund' | 'resolved_split';

export interface Account {
  id: string;
  account_type: AccountType;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  mfa_enabled: boolean;
  stripe_account_id: string | null;
  stripe_onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  account_id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  company_size: string | null;
  verification_status: VerificationStatus;
  email_verified: boolean;
  company_verified: boolean;
  director_verified: boolean;
  trust_score: number;
  created_at: string;
  updated_at: string;
}

export interface ExpertProfile {
  id: string;
  account_id: string;
  name: string;
  photo_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  expertise_areas: string[];
  industries: string[];
  experience: string | null;
  certifications: string[];
  portfolio_url: string | null;
  linkedin_url: string | null;
  website: string | null;
  hourly_rate: number | null;
  daily_rate: number | null;
  categories: ExpertCategory[];
  /** When set, this expert is a Company Resource deployed by a business. */
  employing_business_id: string | null;
  verification_status: VerificationStatus;
  email_verified: boolean;
  identity_verified: boolean;
  linkedin_verified: boolean;
  certification_verified: boolean;
  trust_score: number;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  desired_outcome: OutcomeType | null;
  required_expertise: string[];
  industry: string | null;
  budget_min: number | null;
  budget_max: number | null;
  duration: string | null;
  start_date: string | null;
  location: string | null;
  work_mode: WorkMode | null;
  status: OpportunityStatus;
  visibility: OpportunityVisibility;
  currency: string;
  rate_type: RateType;
  rate_amount: number | null;
  est_units: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmployerPartner {
  id: string;
  account_id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  company_size: string | null;
  /** Commission the partner takes from an employee's net earnings (0..1). */
  default_commission_pct: number;
  verification_status: VerificationStatus;
  email_verified: boolean;
  company_verified: boolean;
  director_verified: boolean;
  trust_score: number;
  created_at: string;
  updated_at: string;
}

export interface EmployerEmployee {
  id: string;
  employer_id: string;
  expert_id: string;
  approval_status: EmployeeApprovalStatus;
  commission_pct: number | null;
  invited_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface Proposal {
  id: string;
  opportunity_id: string;
  expert_id: string;
  cover_message: string | null;
  rate_type: RateType;
  price: number | null;
  est_units: number | null;
  timeline: string | null;
  proposed_start: string | null;
  payee_type: PayeeType | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}

export interface Engagement {
  id: string;
  opportunity_id: string | null;
  business_id: string;
  expert_id: string;
  payee_type: PayeeType;
  payee_account_id: string;
  resource_split_to_expert: number | null;
  title: string;
  total_amount: number;
  platform_fee_pct: number;
  currency: string;
  status: EngagementStatus;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  engagement_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  amount: number;
  status: MilestoneStatus;
  payment_intent_id: string | null;
  funded_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  created_at: string;
}

// Human-readable labels for enums used across the UI.
export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  launch_product: 'Launch a product',
  deliver_project: 'Deliver a project',
  improve_marketing: 'Improve marketing',
  improve_operations: 'Improve operations',
  fill_leadership_gap: 'Fill a leadership gap',
  reduce_costs: 'Reduce costs',
  improve_compliance: 'Improve compliance',
  digital_transformation: 'Digital transformation',
  growth_initiative: 'Growth initiative',
};

export const CATEGORY_LABELS: Record<ExpertCategory, string> = {
  fractional: 'Fractional',
  consultant: 'Consultant',
  advisor: 'Advisor',
  interim: 'Interim',
  specialist: 'Specialist',
  project_based: 'Project-Based',
  company_resource: 'Company Resource',
  seconded_resource: 'Seconded Resource',
};
