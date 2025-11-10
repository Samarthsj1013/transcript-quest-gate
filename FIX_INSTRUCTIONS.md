# Branch/Batch Assignment Fix - Implementation Guide

## 🔍 Problem Identified

Students could NOT save their branch and batch selections because the database Row Level Security (RLS) policies only allowed COE to modify the `student_profiles` table.

## ✅ Solution Applied

### 1. Database Migration (MUST BE APPLIED)

**File:** `supabase/migrations/20251106_allow_students_manage_profiles.sql`

**What it does:**
- Adds RLS policy allowing students to INSERT their own profile
- Adds RLS policy allowing students to UPDATE their own profile
- COE retains full override capability

**How to apply:**

#### Option A: Supabase CLI
```bash
cd /path/to/transcript-quest-gate
supabase db push
```

#### Option B: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy and paste the contents of `supabase/migrations/20251106_allow_students_manage_profiles.sql`
5. Click "Run"

#### Option C: Direct SQL
```sql
-- Run this directly in your Supabase SQL editor:

DROP POLICY IF EXISTS "Students can view own profile" ON student_profiles;

CREATE POLICY "Students can view own profile"
    ON student_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own profile"
    ON student_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own profile"
    ON student_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

### 2. Code Changes (Already in Git)

**Files modified:**
- `src/pages/student/StudentDashboard.tsx` - Student profile save
- `src/pages/coe/StudentDetailPage.tsx` - COE profile override

**Key improvements:**
- Replaced manual INSERT/UPDATE logic with Supabase `.upsert()`
- Better error handling and logging
- Atomic operations prevent race conditions
- Consistent behavior across student and COE

## 🧪 Testing Instructions

### Test 1: Student Can Set Branch/Batch

1. **Log in as a student account**
2. Go to Dashboard
3. Look for the profile card with branch and batch fields
4. **Expected:** See "Action Required: Please set your branch and batch"
5. Click "Click here to set them now"
6. **Expected:** Dropdowns appear for Branch and Academic Batch
7. Select a branch (e.g., "Computer Science")
8. Select a batch (e.g., "2020-2024")
9. Click "Save Profile"
10. **Expected:**
    - Success toast: "Your branch and batch have been saved"
    - Profile card updates immediately showing selections
    - Edit button appears: "Edit Branch & Batch"

**Console check:**
```
[Student Profile] Attempting to save: {user_id: "...", branch_id: "...", batch_id: "..."}
[Student Profile] Save successful: [...]
```

### Test 2: COE Can Override Student Selection

1. **Log in as COE account**
2. Go to Requests page
3. Click "Assign & Mark" on a pending request
4. **Expected:** See branch and batch dropdowns (may be pre-filled if student already set)
5. Change branch or batch to different values
6. Click "Save Profile"
7. **Expected:**
    - Success toast: "Profile updated successfully"
    - Curriculum auto-loads (if available for that branch/batch)

**Console check:**
```
[COE Profile] Attempting to save: {user_id: "...", branch_id: "...", batch_id: "..."}
[COE Profile] Save successful: [...]
```

### Test 3: Data Consistency

1. Student sets branch="CS" and batch="2020"
2. Verify in database:
```sql
SELECT
    u.name,
    u.email,
    b.branch_name,
    ab.batch_year,
    sp.assigned_at
FROM student_profiles sp
JOIN users u ON u.id = sp.user_id
LEFT JOIN branches b ON b.id = sp.branch_id
LEFT JOIN academic_batches ab ON ab.id = sp.batch_id
WHERE u.role = 'STUDENT';
```

3. COE changes to branch="ECE" and batch="2021"
4. Student refreshes dashboard
5. **Expected:** Student sees updated values (COE override worked)

### Test 4: Marks Entry Without Batch/Branch

1. COE clicks "Assign & Mark"
2. **Skip** setting branch and batch
3. Scroll down to "Semester Marks" section
4. **Expected:** Marks section is visible
5. Click "Add Course"
6. Enter course details manually
7. Click "Save Marks"
8. **Expected:** Marks save successfully even without branch/batch

### Test 5: Approval Without Batch/Branch

1. COE enters marks for a student (without setting branch/batch)
2. Click "Return to Requests"
3. Click "Approve" on the request
4. **Expected:** Approval succeeds (only checks for marks, not branch/batch)

## 🐛 Troubleshooting

### Error: "Failed to save profile: new row violates row-level security policy"

**Cause:** Database migration not applied

**Fix:** Apply the migration from `supabase/migrations/20251106_allow_students_manage_profiles.sql`

### Error: "Failed to save profile: duplicate key value violates unique constraint"

**Cause:** Rare race condition or multiple profile records

**Fix:**
```sql
-- Check for duplicates
SELECT user_id, COUNT(*)
FROM student_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- If found, keep one and delete others
DELETE FROM student_profiles
WHERE id NOT IN (
    SELECT MIN(id) FROM student_profiles GROUP BY user_id
);
```

### Student selections not appearing in COE view

**Cause:** Query cache issue

**Fix:**
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for errors
- Verify data in database with SQL query above

### COE changes not reflecting immediately

**Cause:** Query invalidation timing

**Fix:** Already implemented - queries are invalidated after save. If still not working, check browser console for query refetch logs.

## 📊 Verification Checklist

- [ ] Database migration applied successfully
- [ ] Student can select and save branch/batch
- [ ] Success toast appears after student saves
- [ ] Profile card updates immediately
- [ ] COE can see student's selections
- [ ] COE can override student's selections
- [ ] Curriculum auto-loads after COE sets branch/batch
- [ ] Marks can be entered without branch/batch
- [ ] Approval works with only marks (no branch/batch required)
- [ ] PDF generation includes branch/batch if set, or "N/A" if not

## 🎯 Key Features

✅ **Student Empowerment:** Students can set their own branch and batch
✅ **COE Override:** COE retains full control to modify any student profile
✅ **Optional Workflow:** Batch/branch are optional - marks are sufficient
✅ **Atomic Operations:** `.upsert()` prevents race conditions
✅ **Audit Trail:** `assigned_at` timestamp tracks all changes
✅ **Consistent Data:** Same table used by both student and COE
✅ **Better UX:** Clear success/error messages and immediate UI updates

## 📝 Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Student   │────────▶│ student_profiles │◀────────│     COE     │
│  Dashboard  │ INSERT/ │      Table       │ INSERT/ │StudentDetail│
│             │ UPDATE  │                  │ UPDATE  │    Page     │
└─────────────┘         └──────────────────┘         └─────────────┘
                               │
                               │ RLS Policies:
                               │ • Students: SELECT, INSERT, UPDATE (own)
                               │ • COE: ALL (everyone)
                               │
                        ┌──────┴──────┐
                        │             │
                  ┌─────▼─────┐ ┌────▼─────┐
                  │  branches │ │  batches │
                  │   Table   │ │  Table   │
                  └───────────┘ └──────────┘
```

## 🚀 Next Steps

1. Apply the database migration
2. Deploy the code changes
3. Test with both student and COE accounts
4. Monitor browser console for any errors
5. Verify data integrity in database

---

**Need help?** Check browser console logs - all operations are logged with clear prefixes:
- `[Student Profile]` - Student dashboard operations
- `[COE Profile]` - COE operations
- Look for "Save successful" or error messages
