-- Harden handle_new_user and fix INSERT permissions to stop 500s on signup

-- 1) Replace function to ensure NOT NULL name and safe metadata access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, usn, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'usn', ''),
    'STUDENT'
  );
  RETURN NEW;
END;
$$;

-- 2) Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Fix RLS: allow system roles to insert into public.users (trigger runs as definer)
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
CREATE POLICY "System can create users"
ON public.users
FOR INSERT
TO supabase_admin, supabase_auth_admin, postgres
WITH CHECK (true);