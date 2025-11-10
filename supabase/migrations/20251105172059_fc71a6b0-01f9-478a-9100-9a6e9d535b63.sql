-- Allow the handle_new_user function to insert new users by creating a policy
-- that permits inserts where the id matches an auth.users id that doesn't yet exist in public.users
CREATE POLICY "Allow user creation during signup" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow insert if this user_id exists in auth.users but not yet in public.users
  EXISTS (
    SELECT 1 FROM auth.users WHERE id = users.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = users.id
  )
);