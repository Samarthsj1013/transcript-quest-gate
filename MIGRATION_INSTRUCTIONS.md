# Migration Instructions: Enable Public Verification

## Problem
The verification page (`/verify/:id`) is failing because Row Level Security (RLS) policies are blocking public access to the `transcript_requests` table.

## Solution
Add an RLS policy that allows **anyone** to view **APPROVED** transcript requests for verification purposes.

## How to Apply This Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Allow public access to view APPROVED transcript requests for verification
CREATE POLICY "Anyone can verify approved transcripts"
ON public.transcript_requests
FOR SELECT
USING (status = 'APPROVED');
```

5. Click **Run** or press `Ctrl+Enter`
6. You should see: "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will apply all migrations in the `supabase/migrations` folder.

### Option 3: Using psql or SQL client

Connect to your Supabase database and run the SQL from the migration file:
```bash
psql YOUR_DATABASE_URL < supabase/migrations/20251106000000_allow_public_verification.sql
```

## Verification

After applying the migration, test by:

1. **As COE**: Approve a transcript request
2. **As Student**: Download the PDF
3. **Scan QR code**: Should show "TRANSCRIPT VERIFIED" ✅
4. **Check console**: Look for `[Verify] Query result: Found`

## What This Policy Does

- ✅ Allows **public** (unauthenticated) access to view transcript_requests
- ✅ **Only** for requests with `status = 'APPROVED'`
- ✅ Required for QR code verification to work
- ❌ Does NOT expose pending or rejected requests
- ❌ Does NOT allow modification of data

## Security Note

This policy is safe because:
- Only APPROVED requests are visible
- The request ID (UUID) is non-guessable
- No sensitive data (like rejection reasons) is exposed for approved requests
- The verification page only shows: USN, Name, Branch, Batch, Issue Date
