-- Fix RLS policy for user creation during signup
-- The issue is that SECURITY DEFINER function still needs proper RLS policy

-- Drop conflicting policies
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "System can create users" ON public.users;

-- Create a policy that allows INSERT when triggered by auth.users
-- This works because the trigger runs as SECURITY DEFINER with postgres role
CREATE POLICY "Enable insert for service role"
ON public.users
FOR INSERT
TO service_role, authenticated, anon
WITH CHECK (true);

-- Ensure the handle_new_user function is correctly set up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use COALESCE to ensure name is never null
  INSERT INTO public.users (id, email, name, usn, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'usn'), ''),
    'STUDENT'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
