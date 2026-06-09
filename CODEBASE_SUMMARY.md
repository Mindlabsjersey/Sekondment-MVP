# Sekondment MVP - Codebase Summary
**Generated:** June 9, 2026
**Branch:** main
**Last Commit:** 18c701e - Platform vision: Employee vs Expert badges

---

## TECH STACK

- **Framework:** Next.js 15.5.19 (App Router)
- **Runtime:** React 19 (RC)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS 4.x with custom CSS variables
- **Database:** Supabase (Postgres) with migrations
- **Auth:** Supabase Auth (email + Google OAuth ready)
- **Storage:** Supabase Storage (public 'logos' bucket)

---

## PROJECT STRUCTURE

```
sekondment-complete/
├── src/
│   ├── app/
│   │   ├── (app)/           # Protected app routes
│   │   │   ├── dashboard/
│   │   │   ├── experts/     # Talent search + profiles
│   │   │   ├── opportunities/
│   │   │   ├── engagements/
│   │   │   ├── employees/   # Employee management
│   │   │   ├── teams/       # Business team search
│   │   │   ├── capacity/    # Workforce capacity
│   │   │   ├── saved/       # Saved experts/opportunities
│   │   │   ├── settings/    # Profile + EmployerSettings
│   │   │   ├── messages/
│   │   │   └── admin/       # Ops Centre (platform_owner)
│   │   ├── (auth)/          # Public auth routes
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/     # 3 personas: Business/Expert/Employee
│   │   │   └── onboarding/
│   │   ├── auth/callback/   # OAuth callback
│   │   ├── browse/
│   │   └── api/             # API routes (webhooks)
│   ├── components/
│   │   ├── AppShell.tsx     # Main layout + NAV/MORE constants
│   │   ├── AppNav.tsx       # Navigation with More dropdown
│   │   ├── LogoUpload.tsx   # Image upload to Supabase
│   │   └── ui/              # Shadcn/ui components
│   ├── lib/
│   │   ├── supabase/        # Client + server clients
│   │   ├── types/
│   │   │   └── database.ts  # DB types + ExpertCategory
│   │   └── currency.ts
│   └── styles/
├── supabase/
│   └── migrations/            # 0030-0034 applied
└── scripts/
    ├── seed-demo.mjs          # Idempotent demo data
    └── apply-migrations.mjs   # Migration runner
```

---

## KEY ARCHITECTURAL PATTERNS

### Account Types (3 Personas)
```typescript
// account_type stored in accounts table
// signup_intent in auth.users.raw_user_meta_data

type AccountType = 'business' | 'expert' | 'admin';
type SignupIntent = 'hire' | 'work' | 'employee';

// Employee detection:
const isEmployee = !!expert.employing_business_id;
```

### Navigation Structure (6 core + More)
```typescript
// AppShell.tsx defines NAV and MORE constants
const NAV = {
  business: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/experts', label: 'Find Experts', icon: 'search' },
    { href: '/opportunities', label: 'Opportunities', icon: 'briefcase' },
    { href: '/engagements', label: 'Engagements', icon: 'chart' },
    { href: '/messages', label: 'Messages', icon: 'message' },
    { href: '/employees', label: 'My Team', icon: 'users' },
  ],
  // ... expert, admin
};

const MORE = {
  business: [
    { href: '/teams', label: 'Find a Team', icon: 'users' },
    { href: '/saved', label: 'Saved', icon: 'bookmark' },
    { href: '/capacity', label: 'Capacity', icon: 'chart' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ],
  // ... expert, admin
};
```

### Server Actions Pattern
```typescript
// File: src/app/(app)/[feature]/actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';

export async function actionName(data: Type) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  
  // ... logic
  
  revalidatePath('/path');
  return { success: true };
}
```

---

## DATABASE SCHEMA (Critical Tables)

### accounts
```sql
id: uuid (PK, auth.users.id)
account_type: enum('business', 'expert', 'admin', 'employer_partner') -- 'employer_partner' retired
email: text
```

### business_profiles
```sql
id: uuid (PK)
account_id: uuid (FK -> accounts.id)
company_name: text
logo_url: text
contact_email: text
phone: text
bio: text
website: text
linkedin_url: text
-- NEW: Employer control settings (may need migration)
default_approval_required: boolean
default_revenue_share_employer_pct: integer
default_revenue_share_employee_pct: integer
max_hours_per_week: integer
allow_external_projects: boolean
```

### expert_profiles
```sql
id: uuid (PK)
account_id: uuid (FK -> accounts.id)
name: text
headline: text
bio: text
photo_url: text
skills: text[]
categories: enum[] -- includes 'company_resource' for employees
industries: text[]
employing_business_id: uuid (FK -> business_profiles.id) -- NULL = independent expert
certifications: jsonb
portfolio_url: text
linkedin_url: text
website: text
hourly_rate: numeric
daily_rate: numeric
trust_score: numeric
verification_status: enum('unverified', 'pending', 'verified')
employment_status: text -- 'pending' | 'approved' | etc.
payment_preference: text
```

### expert_availability (linked to expert_profiles)
```sql
id: uuid (PK)
expert_id: uuid (FK)
availability_type: enum('available_now', 'available_from', 'fractional_only', 'advisory_only', 'project_only')
work_modes: text[] -- ['remote', 'hybrid', 'on_site']
hours_per_week: integer
days_per_month: integer
```

### engagements (escrow + milestone system)
```sql
id: uuid (PK)
client_id: uuid (FK -> accounts.id)
expert_id: uuid (FK -> expert_profiles.id)
opportunity_id: uuid (FK)
status: enum('proposed', 'accepted', 'in_escrow', 'in_progress', 'awaiting_release', 'complete', 'disputed', 'cancelled')
milestone_count: integer
total_value: numeric
commission_pct: numeric
employer_share_pct: numeric -- for employee engagements
employee_share_pct: numeric
```

### milestones
```sql
id: uuid (PK)
engagement_id: uuid (FK)
description: text
percent: numeric -- 0-100
status: enum('pending', 'submitted', 'approved', 'released', 'disputed')
amount: numeric
```

### platform_team_members (Ops Centre access)
```sql
account_id: uuid (FK)
role: enum('platform_owner', 'platform_admin', 'support')
```

---

## SERVER ACTIONS API

### Auth
- `signInWithOAuth(provider, accountType, signupIntent)` - OAuth with metadata
- `signInWithPassword(email, password)`
- `signUp(email, password, accountType, signupIntent)`

### Employees
- `respondToEmployee(employeeId, status)` - approve/reject employee
- `inviteEmployee(email, name)` - create employee account

### Settings
- `saveProfileImage(formData)` - upload to Supabase Storage
- `saveEmployerSettings(settings)` - business employee controls

### Engagements
- `createEngagement(data)`
- `updateEngagementStatus(id, status)`
- `submitMilestone(engagementId, milestoneIndex)`
- `releaseMilestone(engagementId, milestoneIndex)`

---

## COMPONENT HIERARCHY

```
AppShell (server)
├── AppNav (client) - navigation with More dropdown
├── Logo (Link to /)
├── OpsCentreLink (conditional on platform role)
└── ProfileChip (logo/photo + name)

Page Components (server unless marked):
├── page.tsx (server)
├── actions.ts (server)
├── ClientComponent.tsx (client - 'use client')
└── StartConversationButton.tsx (client)
```

---

## KEY UI PATTERNS

### Employee vs Expert Badges
```tsx
const isEmployee = !!expert.employing_business_id;

{isEmployee ? (
  <span className="badge-employee">EMPLOYEE</span> // sand color
) : (
  <span className="badge-expert">INDEPENDENT EXPERT</span> // moss color
)}
```

### Card Styling
```tsx
// Standard card
<div className="card">

// Card with industry accent border
<div className="card" style={{ borderLeft: '4px solid var(--c-industry)' }}>
```

### CSS Variables (from globals.css)
```css
--c-moss: primary green
--c-sand: secondary orange/brown (for employees)
--c-blue: accent
--c-industry-*: dynamic industry colors
```

---

## CRITICAL RECENT CHANGES

1. **employer_partner RETIRED** - normalized to `business`
   - Old `employer_partner` account type redirects to `business`
   - `employer_partners` table references removed from UI

2. **Employee Model Active**
   - `expert_profiles.employing_business_id` links employee to business
   - `categories[]` includes 'company_resource' for employees
   - Revenue share stored on engagements

3. **Navigation Restructured**
   - Max 6 core items in NAV
   - Overflow in MORE dropdown
   - Icons required for all nav items

4. **Employer Settings Added**
   - New component: `EmployerSettings.tsx`
   - New action: `saveEmployerSettings()`
   - May require DB columns on `business_profiles`

---

## INTEGRATION CHECKPOINTS

When importing updates, verify:

1. **NAV/MORE constants** - AppShell.tsx must export both
2. **Account type handling** - No `employer_partner` references
3. **Employee detection** - Uses `employing_business_id` only
4. **Database columns** - Employer settings columns exist
5. **Server Actions** - Return `{ success: true }` or `{ error: string }`
6. **Supabase clients** - Use `createClient()` from `@/lib/supabase/server`

---

## DEMO DATA

**Login:** `*@demo.sekondment.dev` / `Demo!2026Sekondment`

**Sample accounts:**
- `lumio@demo.sekondment.dev` (Business)
- `priya@demo.sekondment.dev` (Expert)
- `marcus@demo.sekondment.dev` (Employee)

**User with Ops Centre:**
- `joe@mindlabs.je` (platform_owner role)

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## BUILD & DEPLOY

```bash
# Dev (required for Server Actions)
npm run dev
# Test at http://localhost:3000 directly
# (NOT via preview proxy - breaks Server Actions)

# Build
npm run build

# Deploy
# - Framework: Next.js
# - Build command: npm run build
# - Output: .next
```
