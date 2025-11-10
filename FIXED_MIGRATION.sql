-- Safe migration: Add missing foreign keys and constraints
-- This version checks for existing constraints before creating them

-- Helper function to check if constraint exists
DO $$
BEGIN
    -- 1) Add foreign key: student_profiles.user_id -> users.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_profiles_user'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT fk_student_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_student_profiles_user';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_student_profiles_user';
    END IF;

    -- 2) Add foreign key: student_profiles.branch_id -> branches.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_profiles_branch'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT fk_student_profiles_branch
        FOREIGN KEY (branch_id)
        REFERENCES public.branches(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Created constraint: fk_student_profiles_branch';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_student_profiles_branch';
    END IF;

    -- 3) Add foreign key: student_profiles.batch_id -> academic_batches.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_profiles_batch'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT fk_student_profiles_batch
        FOREIGN KEY (batch_id)
        REFERENCES public.academic_batches(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Created constraint: fk_student_profiles_batch';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_student_profiles_batch';
    END IF;

    -- 4) Add unique constraint: student_profiles.user_id (one profile per user)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_key'
    ) THEN
        ALTER TABLE public.student_profiles
        ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);
        RAISE NOTICE 'Created constraint: student_profiles_user_id_key';
    ELSE
        RAISE NOTICE 'Constraint already exists: student_profiles_user_id_key';
    END IF;

    -- 5) Add foreign key: transcript_requests.student_id -> users.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_transcript_requests_student'
    ) THEN
        ALTER TABLE public.transcript_requests
        ADD CONSTRAINT fk_transcript_requests_student
        FOREIGN KEY (student_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_transcript_requests_student';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_transcript_requests_student';
    END IF;

    -- 6) Add foreign key: student_marks.student_id -> users.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_marks_student'
    ) THEN
        ALTER TABLE public.student_marks
        ADD CONSTRAINT fk_student_marks_student
        FOREIGN KEY (student_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_student_marks_student';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_student_marks_student';
    END IF;
END $$;

-- Create helpful indexes (IF NOT EXISTS is supported for indexes)
CREATE INDEX IF NOT EXISTS idx_student_profiles_branch ON public.student_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_batch ON public.student_profiles(batch_id);
CREATE INDEX IF NOT EXISTS idx_transcript_requests_student ON public.transcript_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON public.student_marks(student_id);

-- Drop existing policies before recreating (safe to run multiple times)
DROP POLICY IF EXISTS "Public can view users for approved transcript verification" ON public.users;
DROP POLICY IF EXISTS "Public can view student_profiles for approved transcript verification" ON public.student_profiles;

-- Users table: allow SELECT for users that have at least one APPROVED transcript request
CREATE POLICY "Public can view users for approved transcript verification"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transcript_requests tr
    WHERE tr.student_id = id AND tr.status = 'APPROVED'
  )
);

-- Student profiles: allow SELECT for the same approved users
CREATE POLICY "Public can view student_profiles for approved transcript verification"
ON public.student_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transcript_requests tr
    WHERE tr.student_id = user_id AND tr.status = 'APPROVED'
  )
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'All foreign keys, constraints, indexes, and policies are now in place.';
END $$;
