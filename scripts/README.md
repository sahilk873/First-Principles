# Setup Scripts

## create-demo-users.js

Automatically creates all demo users and their profiles in Supabase.

## list-users.js

Lists all users in Supabase Auth and their profiles with detailed information.

### Usage

```bash
# Using the helper script (prompts for credentials)
./scripts/list-users.sh

# Or with environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
node scripts/list-users.js
```

### What It Shows

- All auth users with their IDs
- Profile information (name, role, organization)
- Users grouped by role
- Users without profiles (missing profile records)
- Summary statistics
- CSV format export

---

### Prerequisites

You need:
1. **SUPABASE_URL** - Your project URL (e.g., `https://xxxxx.supabase.co`)
2. **SUPABASE_SERVICE_ROLE_KEY** - Service role key (⚠️ NOT the anon key!)

### Get Your Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → This is your `SUPABASE_URL`
   - **service_role key** (secret) → This is your `SUPABASE_SERVICE_ROLE_KEY`
     - ⚠️ **Important**: Use the `service_role` key, NOT the `anon` key!
     - The service_role key bypasses RLS and is needed for admin operations

### Usage

#### Option 1: Set environment variables and run

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

node scripts/create-demo-users.js
```

#### Option 2: Run with inline environment variables

```bash
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
node scripts/create-demo-users.js
```

#### Option 3: Create a .env.local file (if you prefer)

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Then run:
```bash
source .env.local
node scripts/create-demo-users.js
```

### What It Does

1. Creates 23 auth users in Supabase Auth
2. Auto-confirms all users (no email verification needed)
3. Creates profiles for each user using the `create_demo_profile` function
4. Sets default password: `Demo2024!` for all users
5. Prints all user IDs for reference

### Users Created

**Administrators:**
- `sysadmin@demo.io` - System Administrator
- `admin@alphaspine.io` - Org Admin (Alpha Spine)
- `admin@betahealth.io` - Org Admin (Beta Health)

**Clinicians (5 total):**
- `clinician@alphaspine.io` - Clinician (Alpha Spine)
- `clinician2@alphaspine.io` - Clinician (Alpha Spine)
- `clinician3@alphaspine.io` - Clinician (Alpha Spine)
- `clinician@betahealth.io` - Clinician (Beta Health)
- `clinician2@betahealth.io` - Clinician (Beta Health)

**Expert Reviewers (15 total, all certified):**
- `expert1@demo.io` through `expert15@demo.io` - Expert Reviewers (15 users)

### After Running

Once users are created, run this SQL to create demo cases:

```sql
SELECT create_demo_cases();
```

This will create sample cases with different statuses for testing.

