import React, { useEffect, useState } from "react";
import { uid, ensureQuizzes } from "../utils/helpers.js";
import ImportModal from "./ImportModal.jsx";
import {
  listCoursesWithCounts,
  createCourse,
  deleteCourse as dbDeleteCourse,
  isSupabaseEnabled,
} from "../services/supabase.js";

export default function Courses({ state, update, go, doToast }) {
  const [showImport, setShowImport] = useState(false);
  const openCourse = (id) => {
    update({ ...state, activeCourseId: id });
    go("roster");
  };
  const openImportFor = (id) => {
    update({ ...state, activeCourseId: id });
    setShowImport(true);
  };

  useEffect(() => {
    const handler = () => setShowImport(true);
    document.addEventListener("open-import", handler);
    return () => document.removeEventListener("open-import", handler);
  }, []);

  useEffect(() => {
    (async () => {
      if (!isSupabaseEnabled()) return;
      try {
        const data = await listCoursesWithCounts();
        const merged = data.map((c) => ({
          ...c,
          students: [], // UI compatibility (roster still uses this array)
          quizMax: ensureQuizzes([], 10),
        }));
        update((prev) => ({
          ...prev,
          courses: merged,
          activeCourseId: merged[0]?.id ?? null,
        }));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <section id="courses">
      <div className="card pad">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Courses</h2>
          <div className="row">
            <button
              className="btn ok"
              onClick={async () => {
                const title = prompt("Course title (e.g., CS101)");
                if (!title) return;
                const term = prompt("Term (e.g., Fall 2025)") || "";

                if (isSupabaseEnabled()) {
                  try {
                    const c = await createCourse({ title, term });
                    const newCourse = {
                      ...c,
                      students: [],
                      quizMax: ensureQuizzes([], 10),
                    };
                    update({
                      ...state,
                      courses: [...state.courses, newCourse],
                      activeCourseId: c.id,
                    });
                  } catch (e) {
                    console.error(e);
                  }
                } else {
                  const c = {
                    id: uid(),
                    title,
                    term,
                    students: [],
                    quizMax: ensureQuizzes([], 10),
                  };
                  update({
                    ...state,
                    courses: [...state.courses, c],
                    activeCourseId: c.id,
                  });
                }
              }}
            >
              + Add Course
            </button>
          </div>
        </div>

        {state.courses.length === 0 ? (
          <div className="empty-card">
            <p className="hint">
              No courses yet. Use <b>+ Add Course</b> to create one.
            </p>
          </div>
        ) : (
          <div className="cards-grid">
            {state.courses.map((c) => (
              <div key={c.id} className="card course-card">
                <div className="course-head">
                  <div className="course-title">{c.title}</div>
                  <div className="course-term">{c.term || "—"}</div>
                </div>
                <div className="course-body">
                  <div className="course-stat">
                    <span className="stat-label">Students</span>
                    <span className="stat-value">
                      {isSupabaseEnabled()
                        ? c.studentCount ?? 0
                        : c.students.length}
                    </span>
                  </div>
                </div>
                <div className="course-actions">
                  <button className="btn ok" onClick={() => openCourse(c.id)}>
                    Open
                  </button>
                  <button className="btn" onClick={() => openImportFor(c.id)}>
                    Import
                  </button>
                  <button
                    className="btn ghost"
                    onClick={async () => {
                      if (!confirm("Delete this course?")) return;

                      if (isSupabaseEnabled()) {
                        try {
                          await dbDeleteCourse(c.id);
                        } catch (e) {
                          console.error(e);
                          return;
                        }
                      }
                      const filtered = state.courses.filter(
                        (x) => x.id !== c.id
                      );
                      const nextActive =
                        state.activeCourseId === c.id
                          ? null
                          : state.activeCourseId;
                      update({
                        ...state,
                        courses: filtered,
                        activeCourseId: nextActive,
                      });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          state={state}
          update={update}
          activeCourseId={state.activeCourseId}
          doToast={doToast} // <-- REQUIRED
        />
      )}
    </section>
  );
}
