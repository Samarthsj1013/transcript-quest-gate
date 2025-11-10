-- =====================================================
-- REMOVE ALL DUPLICATE FOREIGN KEYS
-- =====================================================
-- This script removes ALL duplicate foreign keys that were
-- created by FIXED_MIGRATION.sql, which caused PostgREST
-- relationship ambiguity errors (PGRST201).
--
-- Run this in your Supabase SQL Editor.
-- =====================================================

-- Step 1: Remove duplicate foreign keys from student_profiles table
-- These were added by FIXED_MIGRATION.sql and conflict with Supabase's auto-generated constraints

ALTER TABLE IF EXISTS public.student_profiles
DROP CONSTRAINT IF EXISTS fk_student_profiles_user;

ALTER TABLE IF EXISTS public.student_profiles
DROP CONSTRAINT IF EXISTS fk_student_profiles_branch;

ALTER TABLE IF EXISTS public.student_profiles
DROP CONSTRAINT IF EXISTS fk_student_profiles_batch;

-- Step 2: Remove duplicate foreign keys from transcript_requests table

ALTER TABLE IF EXISTS public.transcript_requests
DROP CONSTRAINT IF EXISTS fk_transcript_requests_student;

-- Step 3: Remove duplicate foreign keys from student_marks table

ALTER TABLE IF EXISTS public.student_marks
DROP CONSTRAINT IF EXISTS fk_student_marks_student;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check remaining foreign keys on student_profiles (should show only 3 original constraints)
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.student_profiles'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Expected results for student_profiles:
-- 1. student_profiles_batch_id_fkey   | student_profiles | academic_batches
-- 2. student_profiles_branch_id_fkey  | student_profiles | branches
-- 3. student_profiles_user_id_fkey    | student_profiles | users

-- Check remaining foreign keys on transcript_requests
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.transcript_requests'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Expected result for transcript_requests:
-- 1. transcript_requests_student_id_fkey | transcript_requests | users

-- Check remaining foreign keys on student_marks
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.student_marks'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Expected result for student_marks:
-- 1. student_marks_student_id_fkey | student_marks | users

-- =====================================================
-- CHECK ALL DATABASE FOREIGN KEYS (OPTIONAL)
-- =====================================================
-- Run this to see ALL foreign keys in your database

SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script removes these 5 duplicate foreign keys:
--
-- 1. fk_student_profiles_user      (duplicate of student_profiles_user_id_fkey)
-- 2. fk_student_profiles_branch    (duplicate of student_profiles_branch_id_fkey)
-- 3. fk_student_profiles_batch     (duplicate of student_profiles_batch_id_fkey)
-- 4. fk_transcript_requests_student (duplicate of transcript_requests_student_id_fkey)
-- 5. fk_student_marks_student      (duplicate of student_marks_student_id_fkey)
--
-- After running this script:
-- - PostgREST will no longer encounter relationship ambiguity errors
-- - All queries will work without explicit foreign key notation
-- - Your application should function normally
-- =====================================================
