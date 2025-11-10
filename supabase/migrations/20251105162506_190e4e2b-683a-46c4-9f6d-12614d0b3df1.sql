-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE app_role AS ENUM ('STUDENT', 'COE', 'ADMIN');

-- Create transcript_status enum
CREATE TYPE transcript_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    usn VARCHAR(50) UNIQUE,
    role app_role NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Branches Table
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Academic Batches Table
CREATE TABLE academic_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_year VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Curriculum Table
CREATE TABLE curriculum (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES academic_batches(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, batch_id, semester, course_code)
);

-- Create Student Profiles Table
CREATE TABLE student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES academic_batches(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE
);

-- Create Student Marks Table
CREATE TABLE student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    serial_no INT NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    cie_marks DECIMAL(5,2) CHECK (cie_marks >= 0 AND cie_marks <= 50),
    see_marks DECIMAL(5,2) CHECK (see_marks >= 0 AND see_marks <= 100),
    total_marks DECIMAL(5,2) CHECK (total_marks >= 0 AND total_marks <= 150),
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 10),
    grade VARCHAR(5),
    grade_point DECIMAL(3,2) CHECK (grade_point >= 0 AND grade_point <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, semester, course_code)
);

-- Create Transcript Requests Table
CREATE TABLE transcript_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status transcript_status DEFAULT 'PENDING',
    rejection_reason TEXT,
    verification_token VARCHAR(255) UNIQUE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_student_marks_student_semester ON student_marks(student_id, semester);
CREATE INDEX idx_transcript_requests_student ON transcript_requests(student_id);
CREATE INDEX idx_transcript_requests_status ON transcript_requests(status);
CREATE INDEX idx_curriculum_branch_batch_sem ON curriculum(branch_id, batch_id, semester);
CREATE INDEX idx_student_profiles_branch_batch ON student_profiles(branch_id, batch_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for student_marks updated_at
CREATE TRIGGER update_student_marks_updated_at
    BEFORE UPDATE ON student_marks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "COE can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

CREATE POLICY "COE can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for branches (COE only)
CREATE POLICY "Anyone can view branches"
    ON branches FOR SELECT
    USING (true);

CREATE POLICY "COE can manage branches"
    ON branches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for academic_batches (COE only)
CREATE POLICY "Anyone can view batches"
    ON academic_batches FOR SELECT
    USING (true);

CREATE POLICY "COE can manage batches"
    ON academic_batches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for curriculum (COE only)
CREATE POLICY "Anyone can view curriculum"
    ON curriculum FOR SELECT
    USING (true);

CREATE POLICY "COE can manage curriculum"
    ON curriculum FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for student_profiles
CREATE POLICY "Students can view own profile"
    ON student_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "COE can view all profiles"
    ON student_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

CREATE POLICY "COE can manage profiles"
    ON student_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for student_marks
CREATE POLICY "Students can view own marks"
    ON student_marks FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "COE can view all marks"
    ON student_marks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

CREATE POLICY "COE can manage marks"
    ON student_marks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

-- RLS Policies for transcript_requests
CREATE POLICY "Students can view own requests"
    ON transcript_requests FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can create requests"
    ON transcript_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "COE can view all requests"
    ON transcript_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );

CREATE POLICY "COE can update requests"
    ON transcript_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'COE'
        )
    );