// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";
import { WEEKS, QUIZZES } from "../utils/constants.js";
import { ensureWeeks, ensureQuizzes } from "../utils/helpers.js";

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === "true";
export const isSupabaseEnabled = () => USE_SUPABASE;

export const supabase = USE_SUPABASE
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  : null;

/* ------------------------ AUTH ------------------------ */
export async function signIn(email, password) {
  if (!USE_SUPABASE) throw new Error("Supabase disabled");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  if (!USE_SUPABASE) throw new Error("Supabase disabled");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!USE_SUPABASE) return;
  await supabase.auth.signOut();
}

export function onAuth(cb) {
  if (!USE_SUPABASE) return () => {};
  const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) =>
    cb(session?.user || null)
  );
  return () => sub.subscription?.unsubscribe();
}

export async function getUser() {
  if (!USE_SUPABASE) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/* ------------------------ COURSES ------------------------ */
export async function listCoursesWithCounts() {
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,term,created_at,enrollments(count)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((c) => ({
    ...c,
    studentCount: c.enrollments?.[0]?.count ?? 0,
  }));
}

export async function createCourse({ title, term }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("Not authenticated");
  // owner is auto-set by trigger; no need to pass it
  const { data, error } = await supabase
    .from("courses")
    .insert({ title, term }, { returning: "representation" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourse(id) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------ STUDENTS / ENROLLMENTS ------------------------ */
// Secure bulk import via RPC (sets students + enrollments.section)
export async function upsertStudents(course_id, rows) {
  if (!rows?.length) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("import_students", {
    p_course: course_id,
    p_rows: rows, // [{ student_id, full_name, pin?, section? }]
  });
  if (error) throw error;
}

// Update a student's section within a course
export async function updateEnrollmentSection(course_id, student_id, section) {
  const { error } = await supabase
    .from("enrollments")
    .update({ section }, { returning: "minimal" })
    .match({ course_id, student_id });
  if (error) throw error;
}

// Cleanly remove a student from a course (and all related rows)
export async function unenrollStudent(course_id, student_id) {
  const { error } = await supabase.rpc("unenroll_student", {
    p_course: course_id,
    p_student: student_id,
  });
  if (error) throw error;
}

// List roster, including section
export async function listEnrolledStudents(course_id) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("student_id, section, students!inner(full_name,pin)")
    .eq("course_id", course_id);
  if (error) throw error;
  return (data || []).map((r) => ({
    student_id: r.student_id,
    full_name: r.students.full_name,
    pin: r.students.pin,
    section: r.section || "",
  }));
}

/* ------------------------ Attendance / Quizzes / Comments ------------------------ */
export async function setAttendance(course_id, student_id, week, status) {
  const { error } = await supabase
    .from("attendance")
    .upsert({ course_id, student_id, week, status }, { returning: "minimal" });
  if (error) throw error;
}

export async function setQuizScore(course_id, student_id, quiz_index, score) {
  const { error } = await supabase
    .from("quizzes")
    .upsert(
      { course_id, student_id, quiz_index, score },
      { returning: "minimal" }
    );
  if (error) throw error;
}

export async function setComment(course_id, student_id, text) {
  const { error } = await supabase
    .from("comments")
    .upsert({ course_id, student_id, text }, { returning: "minimal" });
  if (error) throw error;
}

/* ------------------------ Hydration (DB -> UI) ------------------------ */
export async function hydrateRoster(course_id) {
  const base = await listEnrolledStudents(course_id);

  const { data: att, error: aErr } = await supabase
    .from("attendance")
    .select("student_id, week, status")
    .eq("course_id", course_id);
  if (aErr) throw aErr;

  const { data: qz, error: qErr } = await supabase
    .from("quizzes")
    .select("student_id, quiz_index, score")
    .eq("course_id", course_id);
  if (qErr) throw qErr;

  const { data: cm, error: cErr } = await supabase
    .from("comments")
    .select("student_id, text")
    .eq("course_id", course_id);
  if (cErr) throw cErr;

  const byId = new Map(base.map((s) => [s.student_id, { ...s }]));

  for (const r of att || []) {
    const s = byId.get(r.student_id);
    if (!s) continue;
    s.attendance = ensureWeeks(s.attendance, "A", WEEKS);
    s.attendance[r.week - 1] = r.status;
  }
  for (const r of qz || []) {
    const s = byId.get(r.student_id);
    if (!s) continue;
    s.quizzes = ensureQuizzes(s.quizzes, 0, QUIZZES);
    s.quizzes[r.quiz_index - 1] = r.score ?? "";
  }
  for (const r of cm || []) {
    const s = byId.get(r.student_id);
    if (!s) continue;
    s.comment = r.text || "";
  }
  return Array.from(byId.values());
}
