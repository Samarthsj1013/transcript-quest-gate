-- Create security definer function to check user role without triggering RLS recursion
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

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "COE can update users" ON public.users;
DROP POLICY IF EXISTS "COE can view all users" ON public.users;

-- Recreate users policies with security definer function
CREATE POLICY "COE can update users" 
ON public.users 
FOR UPDATE 
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can view all users" 
ON public.users 
FOR SELECT 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Update all other table policies to use the security definer function

-- Academic batches
DROP POLICY IF EXISTS "COE can manage batches" ON public.academic_batches;
CREATE POLICY "COE can manage batches" 
ON public.academic_batches 
FOR ALL 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Branches
DROP POLICY IF EXISTS "COE can manage branches" ON public.branches;
CREATE POLICY "COE can manage branches" 
ON public.branches 
FOR ALL 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Curriculum
DROP POLICY IF EXISTS "COE can manage curriculum" ON public.curriculum;
CREATE POLICY "COE can manage curriculum" 
ON public.curriculum 
FOR ALL 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Student marks
DROP POLICY IF EXISTS "COE can manage marks" ON public.student_marks;
DROP POLICY IF EXISTS "COE can view all marks" ON public.student_marks;
CREATE POLICY "COE can manage marks" 
ON public.student_marks 
FOR ALL 
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can view all marks" 
ON public.student_marks 
FOR SELECT 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Student profiles
DROP POLICY IF EXISTS "COE can manage profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "COE can view all profiles" ON public.student_profiles;
CREATE POLICY "COE can manage profiles" 
ON public.student_profiles 
FOR ALL 
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can view all profiles" 
ON public.student_profiles 
FOR SELECT 
USING (public.check_user_role(auth.uid(), 'COE'));

-- Transcript requests
DROP POLICY IF EXISTS "COE can update requests" ON public.transcript_requests;
DROP POLICY IF EXISTS "COE can view all requests" ON public.transcript_requests;
CREATE POLICY "COE can update requests" 
ON public.transcript_requests 
FOR UPDATE 
USING (public.check_user_role(auth.uid(), 'COE'));

CREATE POLICY "COE can view all requests" 
ON public.transcript_requests 
FOR SELECT 
USING (public.check_user_role(auth.uid(), 'COE'));