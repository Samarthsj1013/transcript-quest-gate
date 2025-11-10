-- Fix RLS policies for COE to insert and update student marks

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "COE can manage marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can view all marks" ON public.student_marks;
DROP POLICY IF EXISTS "Students can view own marks" ON public.student_marks;

-- Recreate policies with proper permissions
-- Allow students to view their own marks
CREATE POLICY "Students can view own marks"
ON public.student_marks
FOR SELECT
USING (auth.uid() = student_id);

-- Allow COE to view all marks
CREATE POLICY "COE can view all marks"
ON public.student_marks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- Allow COE to insert marks
CREATE POLICY "COE can insert marks"
ON public.student_marks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- Allow COE to update marks
CREATE POLICY "COE can update marks"
ON public.student_marks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- Allow COE to delete marks
CREATE POLICY "COE can delete marks"
ON public.student_marks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- Also fix student_profiles policies
DROP POLICY IF EXISTS "COE can manage profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can view all profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;

-- Students can view their own profile
CREATE POLICY "Students can view own profile"
ON public.student_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- COE can view all profiles
CREATE POLICY "COE can view all profiles"
ON public.student_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- COE can insert profiles
CREATE POLICY "COE can insert profiles"
ON public.student_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- COE can update profiles
CREATE POLICY "COE can update profiles"
ON public.student_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);

-- COE can delete profiles
CREATE POLICY "COE can delete profiles"
ON public.student_profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'COE'
  )
);
