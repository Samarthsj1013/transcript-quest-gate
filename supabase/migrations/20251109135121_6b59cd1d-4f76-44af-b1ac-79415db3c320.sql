-- Ensure relational integrity and enable PostgREST embeddings for profiles and requests

-- 1) Link student_profiles.user_id -> public.users.id (and make it unique for upsert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.student_profiles
      ADD CONSTRAINT student_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.student_profiles
      ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2) Link student_profiles.branch_id -> public.branches.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_branch_id_fkey'
  ) THEN
    ALTER TABLE public.student_profiles
      ADD CONSTRAINT student_profiles_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Link student_profiles.batch_id -> public.academic_batches.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_batch_id_fkey'
  ) THEN
    ALTER TABLE public.student_profiles
      ADD CONSTRAINT student_profiles_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.academic_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_branch ON public.student_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_batch ON public.student_profiles(batch_id);

-- 4) Link transcript_requests.student_id -> public.users.id so /verify can embed the user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transcript_requests_student_id_fkey'
  ) THEN
    ALTER TABLE public.transcript_requests
      ADD CONSTRAINT transcript_requests_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;