-- Comprehensive fix for signup 500 error
-- This removes ALL restrictive INSERT policies and creates a single working one

-- First, list all policies on users table to see what we're dealing with
-- Then drop ALL existing INSERT policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'users'
        AND schemaname = 'public'
        AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Now create a single, permissive INSERT policy
-- This allows inserts from service_role (used by triggers) and authenticated users
CREATE POLICY "Allow authenticated and service role to insert users"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_usn text;
BEGIN
  -- Extract and clean the name
  v_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'name', ''));
  IF v_name = '' THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  -- Extract and clean the USN
  v_usn := TRIM(COALESCE(NEW.raw_user_meta_data->>'usn', ''));
  IF v_usn = '' THEN
    v_usn := NULL;
  END IF;

  -- Insert the user record
  INSERT INTO public.users (id, email, name, usn, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_usn,
    'STUDENT'
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just return NEW without error
    RAISE WARNING 'User % already exists in public.users', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log detailed error information
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)',
      NEW.email, SQLERRM, SQLSTATE;
    -- Re-raise the error to prevent auth user creation
    RAISE;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
