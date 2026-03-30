-- ====== Schema for TA App (owner-scoped, cascade deletes) ======
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname='attendance_status') then
    create type attendance_status as enum ('P','A','L');
  end if;
end $$;

create table if not exists courses(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  term text,
  created_at timestamptz default now()
);

create table if not exists students(
  student_id text primary key,
  full_name  text not null,
  pin        text,
  created_at timestamptz default now()
);

create table if not exists enrollments(
  course_id  uuid not null references courses(id) on delete cascade,
  student_id text not null references students(student_id) on delete cascade,
  section    text,
  joined_at  timestamptz default now(),
  primary key(course_id, student_id)
);

create table if not exists attendance(
  course_id  uuid not null references courses(id) on delete cascade,
  student_id text not null references students(student_id) on delete cascade,
  week       int  not null check (week >= 1),
  status     attendance_status not null default 'A',
  marked_at  timestamptz default now(),
  primary key(course_id, student_id, week)
);

create table if not exists quizzes(
  course_id  uuid not null references courses(id) on delete cascade,
  student_id text not null references students(student_id) on delete cascade,
  quiz_index int  not null check (quiz_index >= 1),
  score      numeric(6,2),
  graded_at  timestamptz default now(),
  primary key(course_id, student_id, quiz_index)
);

create table if not exists comments(
  course_id  uuid not null references courses(id) on delete cascade,
  student_id text not null references students(student_id) on delete cascade,
  text       text,
  updated_at timestamptz default now(),
  primary key(course_id, student_id)
);

-- RLS
alter table courses     enable row level security;
alter table students    enable row level security;
alter table enrollments enable row level security;
alter table attendance  enable row level security;
alter table quizzes     enable row level security;
alter table comments    enable row level security;

drop policy if exists "courses_owner" on courses;
create policy "courses_owner" on courses
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

drop policy if exists "enrollments_by_owner" on enrollments;
create policy "enrollments_by_owner" on enrollments
  using (exists (select 1 from courses c where c.id = enrollments.course_id and c.owner = auth.uid()))
  with check (exists (select 1 from courses c where c.id = enrollments.course_id and c.owner = auth.uid()));

drop policy if exists "students_by_owner" on students;
create policy "students_by_owner" on students
  using (exists (select 1
                 from enrollments e join courses c on c.id = e.course_id
                 where e.student_id = students.student_id and c.owner = auth.uid()))
  with check (true);

drop policy if exists "attendance_by_owner" on attendance;
create policy "attendance_by_owner" on attendance
  using (exists (select 1 from courses c where c.id = attendance.course_id and c.owner = auth.uid()))
  with check (exists (select 1 from courses c where c.id = attendance.course_id and c.owner = auth.uid()));

drop policy if exists "quizzes_by_owner" on quizzes;
create policy "quizzes_by_owner" on quizzes
  using (exists (select 1 from courses c where c.id = quizzes.course_id and c.owner = auth.uid()))
  with check (exists (select 1 from courses c where c.id = quizzes.course_id and c.owner = auth.uid()));

drop policy if exists "comments_by_owner" on comments;
create policy "comments_by_owner" on comments
  using (exists (select 1 from courses c where c.id = comments.course_id and c.owner = auth.uid()))
  with check (exists (select 1 from courses c where c.id = comments.course_id and c.owner = auth.uid()));

-- Realtime (optional)
do $$
begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime for table courses, enrollments, students, attendance, quizzes, comments;
  else
    alter publication supabase_realtime add table enrollments, students, attendance, quizzes, comments;
  end if;
end $$;
