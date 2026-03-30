# TA App (React + Supabase)

Features:
- Per-course student lists (via `enrollments`), optional `section` for filtering
- Attendance by week (toggle A/P), quizzes with scores, per-student comment
- Import CSV/XLSX; export roster and attendance summary to XLSX
- Student self-view (by student_id + optional PIN)
- QR scan simulator to mark Present
- Supabase-backed with RLS policies; cascade delete of courses cleans everything
- Works offline/local if `VITE_USE_SUPABASE` != 'true'

## Quick start
1. `cp .env.example .env` and fill in Supabase env vars.
2. Create the DB schema with `supabase/schema.sql` (run it once in Supabase SQL editor).
3. `npm i`
4. `npm run dev`

## CSV/XLSX columns
Required: `student_id`, `full_name`  
Optional: `pin`, `section`

## Sections filter
If you include a `section` column during import, the Roster will show a dropdown to filter students by section.
