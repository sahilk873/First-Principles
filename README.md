# First Principles

A secure B2B web application for spine surgery appropriateness review. Clinicians submit cases for blinded expert review, and the system aggregates expert scores into consensus-based appropriateness results.

## Features

### Core Workflow
- **Case Submission**: Clinicians submit spine surgery cases with clinical details, imaging, and procedure proposals
- **Blinded Review**: Expert reviewers score cases (1-9 appropriateness scale) without knowing other reviewers' identities
- **Result Aggregation**: System aggregates scores when 5+ reviews are submitted, classifying as APPROPRIATE/UNCERTAIN/INAPPROPRIATE
- **Multi-tenancy**: Organization-based access control with role-based permissions

### User Roles
| Role | Capabilities |
|------|-------------|
| `CLINICIAN` | Submit cases, view own cases and results |
| `EXPERT_REVIEWER` | Review assigned cases, view performance metrics |
| `ORG_ADMIN` | Manage organization users, view org-wide analytics |
| `SYS_ADMIN` | Full system access, manage all organizations and users |

### Key Features by Module
- **Dashboard**: Role-specific views with relevant stats and quick actions
- **Cases**: Submit, track, and view case results
- **Reviews**: Complete assigned reviews with clinical scoring
- **Notifications**: Real-time notifications for case assignments and results
- **Admin**: User and organization management (role-based)
- **Performance**: Reviewer concordance tracking (experts only)

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase
  - Authentication (email/password)
  - PostgreSQL database with Row Level Security
  - Realtime subscriptions
  - Storage (for imaging files)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+
- A Supabase project (free tier works)

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd first-principles
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in: Supabase Dashboard → Settings → API

### 3. Set Up Database

Run the SQL migrations in order via Supabase SQL Editor:

```
1. supabase/migrations/001_initial_schema.sql    - Creates tables, indexes, RLS policies
2. supabase/migrations/002_seed_data.sql         - Creates sample organizations
3. supabase/migrations/003_storage_bucket.sql    - Creates storage bucket for images
4. supabase/migrations/004_review_workflow_policies.sql - Additional RLS policies
5. supabase/migrations/005_comprehensive_seed_data.sql - Demo data helpers
```

### 4. Create Demo Users (Quick Start)

#### Step A: Create Auth Users

In Supabase Dashboard → Authentication → Users → Add User:

| Email | Role | Organization |
|-------|------|--------------|
| `sysadmin@demo.io` | SYS_ADMIN | Alpha Spine |
| `admin@alphaspine.io` | ORG_ADMIN | Alpha Spine |
| `admin@betahealth.io` | ORG_ADMIN | Beta Health |
| `clinician@alphaspine.io` | CLINICIAN | Alpha Spine |
| `clinician@betahealth.io` | CLINICIAN | Beta Health |
| `expert1@demo.io` | EXPERT_REVIEWER | Beta Health |
| `expert2@demo.io` | EXPERT_REVIEWER | Beta Health |
| `expert3@demo.io` | EXPERT_REVIEWER | Beta Health |
| `expert4@demo.io` | EXPERT_REVIEWER | Beta Health |
| `expert5@demo.io` | EXPERT_REVIEWER | Beta Health |

**Tip**: Use "Auto Confirm User" and a simple password like `Demo2024!`

#### Step B: Create Profiles

For each user created above, run in SQL Editor:

```sql
-- System Admin
SELECT create_demo_profile(
  '<auth_user_uuid>', 
  'sysadmin@demo.io', 
  'System Administrator', 
  'SYS_ADMIN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);

-- Org Admin (Alpha)
SELECT create_demo_profile(
  '<auth_user_uuid>', 
  'admin@alphaspine.io', 
  'Dr. Alice Admin', 
  'ORG_ADMIN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);

-- Org Admin (Beta)
SELECT create_demo_profile(
  '<auth_user_uuid>', 
  'admin@betahealth.io', 
  'Dr. Bob Boss', 
  'ORG_ADMIN', 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  false
);

-- Clinician (Alpha)
SELECT create_demo_profile(
  '<auth_user_uuid>', 
  'clinician@alphaspine.io', 
  'Dr. Charles Clinician', 
  'CLINICIAN', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  false
);

-- Clinician (Beta)
SELECT create_demo_profile(
  '<auth_user_uuid>', 
  'clinician@betahealth.io', 
  'Dr. Diana Doctor', 
  'CLINICIAN', 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  false
);

-- Expert Reviewers (5 required for full workflow)
SELECT create_demo_profile('<uuid>', 'expert1@demo.io', 'Dr. Expert One', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert2@demo.io', 'Dr. Expert Two', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert3@demo.io', 'Dr. Expert Three', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert4@demo.io', 'Dr. Expert Four', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT create_demo_profile('<uuid>', 'expert5@demo.io', 'Dr. Expert Five', 'EXPERT_REVIEWER', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
```

#### Step C: Create Demo Cases

Once profiles are set up, run:

```sql
SELECT create_demo_cases();
```

This creates:
- 1 DRAFT case (incomplete, not submitted)
- 1 UNDER_REVIEW case (5 reviewers assigned, 2 submitted)
- 1 COMPLETED case (full results available)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the Complete Workflow

### Clinician Flow
1. Login as `clinician@alphaspine.io`
2. Go to Dashboard → see cases stats
3. Cases → view existing cases
4. New Case → submit a new case for review
5. Wait for notifications when results ready

### Expert Reviewer Flow
1. Login as `expert1@demo.io`
2. Dashboard → see pending reviews count
3. Reviews → view assigned reviews
4. Click a review → complete the review form
5. Performance → view concordance metrics

### Admin Flows
1. **Org Admin** (`admin@alphaspine.io`):
   - Admin → Users → manage users in your org
   - Change roles, toggle expert certification

2. **System Admin** (`sysadmin@demo.io`):
   - Admin → Users → manage all users across orgs
   - Admin → Organizations → create/edit organizations
   - Change user organizations, assign any role

## Project Structure

```
first-principles/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin pages
│   │   │   ├── orgs/          # Organization management
│   │   │   └── users/         # User management
│   │   ├── cases/              # Case management
│   │   │   ├── new/           # Case wizard
│   │   │   └── [caseId]/      # Case details & results
│   │   ├── dashboard/          # Role-specific dashboards
│   │   ├── notifications/      # Notifications page
│   │   ├── reviews/            # Review pages
│   │   │   ├── performance/   # Reviewer performance
│   │   │   └── [reviewId]/    # Review workspace
│   │   └── login/              # Authentication
│   ├── components/
│   │   ├── layout/             # AppLayout, Navbar, NotificationBell
│   │   └── ui/                 # Reusable UI components
│   ├── lib/
│   │   ├── actions/            # Server actions
│   │   ├── supabase/           # Supabase client config
│   │   └── utils/              # Utilities
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   └── migrations/             # SQL migrations
└── README.md
```

## Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| `organizations` | Healthcare organizations (multi-tenant) |
| `profiles` | User profiles (extends auth.users) |
| `cases` | Spine surgery cases |
| `reviews` | Expert reviews of cases |
| `case_results` | Aggregated results per case |
| `notifications` | User notifications |
| `audit_logs` | Compliance audit trail |

### Key Relationships
- `profiles.org_id` → `organizations.id`
- `cases.org_id` → `organizations.id`
- `cases.submitter_id` → `profiles.id`
- `reviews.case_id` → `cases.id`
- `reviews.reviewer_id` → `profiles.id`
- `case_results.case_id` → `cases.id`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public API key | Yes |

## Key Implementation Details

### Security
- **Row Level Security (RLS)**: All tables have RLS policies ensuring users only access authorized data
- **Blinded Reviews**: Reviewers cannot see other reviewers' identities or scores
- **Role-Based Access**: UI and API endpoints check user roles before allowing actions

### Result Aggregation
Results are generated when:
1. A case has 5+ submitted reviews
2. Scores are aggregated: mean, standard deviation
3. Final classification:
   - Mean ≥ 7 → APPROPRIATE
   - Mean 4-6 → UNCERTAIN  
   - Mean < 4 → INAPPROPRIATE

### Notifications
Notifications are created for:
- `CASE_ASSIGNED`: When a reviewer is assigned a case
- `CASE_RESULT_READY`: When aggregated results are available
- Real-time updates via Supabase Realtime

## Troubleshooting

### "Profile not found" after login
Your auth user exists but has no profile. Run:
```sql
SELECT create_demo_profile('<your_auth_uuid>', 'your@email.com', 'Your Name', 'CLINICIAN', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
```

### "Not enough expert reviewers"
Case submission requires 5+ certified expert reviewers. Ensure you have created profiles with:
- `role = 'EXPERT_REVIEWER'`
- `is_expert_certified = true`

### Reviews not appearing
Check that reviewers are from a different organization than the case submitter (for blinded review).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run `npm run lint` and `npm run build`
5. Submit a pull request

## License

Proprietary - All rights reserved
