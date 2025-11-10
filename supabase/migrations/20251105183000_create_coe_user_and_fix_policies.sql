-- Create a COE user or update existing user to COE role
-- First, let's update the current user to be COE (replace the email with your test user email)
-- UPDATE public.users SET role = 'COE' WHERE email = 'YOUR_EMAIL@example.com';

-- Or create a dedicated COE user in auth.users first, then run this
-- For now, we'll just ensure the RLS policies work correctly

-- Make sure we have the check_user_role function for better performance
CREATE OR REPLACE FUNCTION public.check_user_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role TO service_role;

-- Now recreate all policies using the security definer function
-- This is more efficient and avoids recursive RLS issues

-- Student Marks Policies
DROP POLICY IF EXISTS "Students can view own marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can view all marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can insert marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can update marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can delete marks" ON public.student_marks;

CREATE POLICY "Students can view own marks"
ON public.student_marks
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "COE can view all marks"
ON public.student_marks
FOR SELECT
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can insert marks"
ON public.student_marks
FOR INSERT
WITH CHECK (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can update marks"
ON public.student_marks
FOR UPDATE
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can delete marks"
ON public.student_marks
FOR DELETE
USING (public.check_user_role(auth.uid(), 'COE'));

-- Student Profiles Policies
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can view all profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can insert profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can update profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can delete profiles" ON public.student_profiles;

CREATE POLICY "Students can view own profile"
ON public.student_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "COE can view all profiles"
ON public.student_profiles
FOR SELECT
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can insert profiles"
ON public.student_profiles
FOR INSERT
WITH CHECK (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can update profiles"
ON public.student_profiles
FOR UPDATE
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can delete profiles"
ON public.student_profiles
FOR DELETE
USING (public.check_user_role(auth.uid(), 'COE'));

-- Transcript Requests - COE needs to be able to update
DROP POLICY IF EXISTS "COE can update requests" ON public.transcript_requests;
CREATE POLICY "COE can update requests"
ON public.transcript_requests
FOR UPDATE
USING (public.check_user_role(auth.uid(), 'COE'));
