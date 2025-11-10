-- Fix grade_point field precision to allow values up to 10.00
-- The field is currently DECIMAL(3,2) which only allows up to 9.99
-- Need to change to DECIMAL(4,2) to allow 0.00 to 10.00

ALTER TABLE public.student_marks
ALTER COLUMN grade_point TYPE DECIMAL(4,2);

-- Update the check constraint to match
ALTER TABLE public.student_marks
DROP CONSTRAINT IF EXISTS student_marks_grade_point_check;

ALTER TABLE public.student_marks
ADD CONSTRAINT student_marks_grade_point_check
CHECK (grade_point >= 0 AND grade_point <= 10);
