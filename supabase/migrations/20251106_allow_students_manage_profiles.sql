-- Allow students to insert and update their own profiles
-- This enables students to set their branch and batch themselves

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Students can view own profile" ON student_profiles;

-- Recreate SELECT policy
CREATE POLICY "Students can view own profile"
    ON student_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Add INSERT policy for students
CREATE POLICY "Students can insert own profile"
    ON student_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for students
CREATE POLICY "Students can update own profile"
    ON student_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- COE policies remain unchanged - they can still override everything
