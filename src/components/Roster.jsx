import React, { useEffect, useState } from "react";
import { QUIZZES, WEEKS } from "../utils/constants.js";
import { ensureQuizzes, ensureWeeks } from "../utils/helpers.js";
import ColumnsModal from "./ColumnsModal.jsx";
import ImportModal from "./ImportModal.jsx";
import {
  hydrateRoster,
  isSupabaseEnabled,
  setAttendance,
  setQuizScore,
  setComment as setCommentDb,
} from "../services/supabase.js";

export default function Roster({ state, update, activeCourse, go, doToast }) {
  const [weekSel, setWeekSel] = useState("all");
  const [term, setTerm] = useState("");
  const [showCols, setShowCols] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [section, setSection] = useState("all");

  useEffect(() => {
    setWeekSel("all");
    setSection("all");
  }, [activeCourse?.id]);

  // hydrate from DB on course change
  useEffect(() => {
    if (!activeCourse?.id || !isSupabaseEnabled()) return;
    (async () => {
      try {
        const students = await hydrateRoster(activeCourse.id);
        update(
          (prev) => ({
            ...prev,
            courses: prev.courses.map((c) =>
              c.id === activeCourse.id ? { ...c, students } : c
            ),
          }),
          false
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, [activeCourse?.id]);

  if (!activeCourse) {
    return (
      <section id="roster">
        <div className="card pad">
          <h2>Roster (no course selected)</h2>
        </div>
      </section>
    );
  }

  const v = state.settings.visible;
  const students = activeCourse.students || [];

  // compute sticky left for NAME (depends on which columns are shown to its left)
  const stickyLeft = (v.id ? 0 : 0) + (v.section ? 0 : 0);

  const sections = Array.from(
    new Set((students || []).map((s) => s.section || "").filter(Boolean))
  );

  const rows = students.filter((s) => {
    const q = term.toLowerCase();
    const matchesText =
      !q ||
      s.student_id.toLowerCase().includes(q) ||
      s.full_name.toLowerCase().includes(q) ||
      (s.section || "").toLowerCase().includes(q); // <- search by section too
    const matchesSection = section === "all" || (s.section || "") === section;
    return matchesText && matchesSection;
  });

  const toggleAtt = (stuId, wIdx) => {
    const nextCourses = state.courses.map((c) => {
      if (c.id !== activeCourse.id) return c;
      const next = { ...c, students: c.students.map((s) => ({ ...s })) };
      const s = next.students.find((x) => x.student_id === stuId);
      const cur = s.attendance?.[wIdx] || "A";
      s.attendance = ensureWeeks(s.attendance, "A", WEEKS);
      s.attendance[wIdx] = cur === "A" ? "P" : "A";
      return next;
    });
    update({ ...state, courses: nextCourses });

    if (isSupabaseEnabled()) {
      const s = activeCourse.students.find((x) => x.student_id === stuId);
      const newVal = (s?.attendance?.[wIdx] || "A") === "A" ? "P" : "A";
      setAttendance(activeCourse.id, stuId, wIdx + 1, newVal).catch(
        console.error
      );
    }
  };

  const setQuiz = (stuId, qIdx, val) => {
    const nextCourses = state.courses.map((c) => {
      if (c.id !== activeCourse.id) return c;
      const next = { ...c, students: c.students.map((s) => ({ ...s })) };
      const s = next.students.find((x) => x.student_id === stuId);
      s.quizzes = ensureQuizzes(s.quizzes, 0, QUIZZES);
      s.quizzes[qIdx] = val === "" ? "" : Number(val);
      return next;
    });
    update({ ...state, courses: nextCourses });

    if (isSupabaseEnabled()) {
      const score = val === "" ? null : Number(val);
      setQuizScore(activeCourse.id, stuId, qIdx + 1, score).catch(
        console.error
      );
    }
  };

  const setComment = (stuId, txt) => {
    const nextCourses = state.courses.map((c) => {
      if (c.id !== activeCourse.id) return c;
      const next = { ...c, students: c.students.map((s) => ({ ...s })) };
      const s = next.students.find((x) => x.student_id === stuId);
      s.comment = txt;
      return next;
    });
    update({ ...state, courses: nextCourses });

    if (isSupabaseEnabled()) {
      setCommentDb(activeCourse.id, stuId, txt).catch(console.error);
    }
  };

  const markAllPresent = () => {
    if (weekSel === "all") return doToast("Pick a specific week first");
    const w = Number(weekSel) - 1;

    const nextCourses = state.courses.map((c) => {
      if (c.id !== activeCourse.id) return c;
      const next = { ...c, students: c.students.map((s) => ({ ...s })) };
      next.students.forEach((s) => {
        s.attendance = ensureWeeks(s.attendance, "A", WEEKS);
        s.attendance[w] = "P";
      });
      return next;
    });
    update({ ...state, courses: nextCourses });

    if (isSupabaseEnabled()) {
      Promise.all(
        (activeCourse.students || []).map((s) =>
          setAttendance(activeCourse.id, s.student_id, Number(weekSel), "P")
        )
      ).catch(console.error);
    }
  };

  const exportVisibleXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const headers = [];
      if (v.id) headers.push("student_id");
      if (v.name) headers.push("full_name");
      if (v.section) headers.push("section"); // <- use v.section, not v.name
      for (let i = 0; i < WEEKS; i++)
        if (v.att[i]) headers.push("att_w" + (i + 1));
      for (let i = 0; i < QUIZZES; i++)
        if (v.quiz[i]) headers.push("quiz_w" + (i + 1));
      if (v.comment) headers.push("comment");

      const data = [headers];
      for (const s of rows) {
        const row = [];
        if (v.id) row.push(s.student_id);
        if (v.name) row.push(s.full_name);
        if (v.section) row.push(s.section || "");
        const att = ensureWeeks(s.attendance, "", WEEKS);
        const qz = ensureQuizzes(s.quizzes, 0, QUIZZES);
        for (let i = 0; i < WEEKS; i++) if (v.att[i]) row.push(att[i] || "");
        for (let i = 0; i < QUIZZES; i++) if (v.quiz[i]) row.push(qz[i] ?? "");
        if (v.comment) row.push(s.comment || "");
        data.push(row);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Roster");
      XLSX.writeFile(wb, (activeCourse.title || "course") + "_roster.xlsx");
    } catch {
      doToast("XLSX library unavailable");
    }
  };

  // Summary now includes attendance counts + quiz score count and sum
  const exportAttendanceSummary = async () => {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "student_id",
        "full_name",
        "section",
        "present_count",
        "absent_count",
        "late_count",
        "attendance_%",
        "quiz_entered_count",
        "quiz_total",
      ];
      const data = [headers];

      for (const s of rows) {
        const att = ensureWeeks(s.attendance, "A", WEEKS);
        let present = 0,
          absent = 0,
          late = 0;
        for (const v of att) {
          if (v === "P") present++;
          else if (v === "L") late++;
          else absent++;
        }
        const rate = ((present / WEEKS) * 100).toFixed(1);

        // Count how many quiz scores were actually entered + sum
        let qCount = 0,
          qSum = 0;
        const rawQ = Array.isArray(s.quizzes) ? s.quizzes : [];
        for (let i = 0; i < QUIZZES; i++) {
          const val = rawQ[i];
          if (val === "" || val === null || typeof val === "undefined")
            continue;
          const num = Number(val);
          if (!Number.isNaN(num)) {
            qCount++;
            qSum += num;
          }
        }

        data.push([
          s.student_id,
          s.full_name,
          s.section || "",
          present,
          absent,
          late,
          rate,
          qCount,
          qSum,
        ]);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");
      XLSX.writeFile(
        wb,
        (activeCourse.title || "course") + "_attendance_summary.xlsx"
      );
    } catch {
      doToast("XLSX library unavailable");
    }
  };

  return (
    <section id="roster">
      <div className="card pad">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="rosterTitle">{activeCourse.title} – Roster</h2>
          <div className="roster-toolbar">
            <button className="btn" onClick={() => setShowImport(true)}>
              Import Students
            </button>
            <button className="btn" onClick={exportVisibleXLSX}>
              Export XLSX
            </button>
            <button className="btn" onClick={exportAttendanceSummary}>
              Attendance Summary
            </button>
            <button className="btn" onClick={() => setShowCols(true)}>
              Columns
            </button>
          </div>
        </div>

        <div className="roster-controls">
          <div>
            <label>Week</label>
            <select
              value={weekSel}
              onChange={(e) => setWeekSel(e.target.value)}
            >
              <option value="all">All</option>
              {Array.from({ length: WEEKS }, (_, i) => (
                <option key={i} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="all">All</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="rosterSearch">
              Search
            </label>
            <input
              id="rosterSearch"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by name, ID, or section"
              autoComplete="off"
              inputMode="search"
            />
          </div>
        </div>

        <div className="row" style={{ alignItems: "center" }}>
          <button className="btn" onClick={markAllPresent}>
            Mark All Present (week)
          </button>
          <span className="hint roster-hint">
            Click attendance to toggle A ↔ P
          </span>
        </div>

        <div
          className={
            "table-wrap roster-table fit" + (weekSel !== "all" ? " narrow" : "")
          }
        >
          <table id="rosterTable">
            <thead>
              <tr>
                {weekSel === "all" ? (
                  <>
                    {v.id && <th className="id-col">STUDENT ID</th>}
                    {v.section && <th className="section-col">SECTION</th>}
                    {v.name && (
                      <th
                        className="sticky-col name-col"
                        style={{ left: stickyLeft }}
                      >
                        NAME
                      </th>
                    )}
                    {Array.from(
                      { length: WEEKS },
                      (_, i) =>
                        v.att[i] && (
                          <th key={i} className="att-col">{`ATT ${i + 1}`}</th>
                        )
                    )}
                    {Array.from(
                      { length: QUIZZES },
                      (_, i) =>
                        v.quiz[i] && (
                          <th key={i} className="quiz-col">{`Q${i + 1}`}</th>
                        )
                    )}
                    {v.comment && <th style={{ minWidth: 220 }}>COMMENT</th>}
                    {v.actions && <th>ACTIONS</th>}
                  </>
                ) : (
                  <>
                    {v.id && <th className="id-col">STUDENT ID</th>}
                    {v.section && <th className="section-col">SECTION</th>}
                    {v.name && (
                      <th
                        className="sticky-col name-col"
                        style={{ left: stickyLeft }}
                      >
                        NAME
                      </th>
                    )}
                    <th className="att-col">{`ATT ${Number(weekSel)}`}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const att = ensureWeeks(s.attendance, "A", WEEKS);
                const qz = ensureQuizzes(s.quizzes, 0, QUIZZES);

                if (weekSel === "all") {
                  return (
                    <tr key={s.student_id}>
                      {v.id && <td className="id-col">{s.student_id}</td>}
                      {v.section && (
                        <td className="section-col">{s.section || "—"}</td>
                      )}
                      {v.name && (
                        <td
                          className="sticky-col name-col"
                          style={{ left: stickyLeft }}
                        >
                          {s.full_name}
                        </td>
                      )}
                      {Array.from(
                        { length: WEEKS },
                        (_, i) =>
                          v.att[i] && (
                            <td key={i} className="att-col">
                              <div
                                className={`status ${
                                  att[i] === "P" ? "present" : "absent"
                                }`}
                                onClick={() => toggleAtt(s.student_id, i)}
                              >
                                {att[i]}
                              </div>
                            </td>
                          )
                      )}
                      {Array.from(
                        { length: QUIZZES },
                        (_, i) =>
                          v.quiz[i] && (
                            <td key={i} className="quiz-col">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={qz[i] ?? ""}
                                onChange={(e) =>
                                  setQuiz(s.student_id, i, e.target.value)
                                }
                              />
                            </td>
                          )
                      )}
                      {v.comment && (
                        <td>
                          <input
                            type="text"
                            style={{ width: "100%" }}
                            value={s.comment || ""}
                            onChange={(e) =>
                              setComment(s.student_id, e.target.value)
                            }
                          />
                        </td>
                      )}
                      {v.actions && (
                        <td>
                          <button
                            className="btn"
                            onClick={() => {
                              sessionStorage.setItem("_sd_sel", s.student_id);
                              go("studentDetail");
                            }}
                          >
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                } else {
                  const wIdx = Number(weekSel) - 1;
                  return (
                    <tr key={s.student_id}>
                      {v.id && <td className="id-col">{s.student_id}</td>}
                      {v.section && (
                        <td className="section-col">{s.section || "—"}</td>
                      )}
                      {v.name && (
                        <td
                          className="sticky-col name-col"
                          style={{ left: stickyLeft }}
                        >
                          {s.full_name}
                        </td>
                      )}
                      <td className="att-col">
                        <div
                          className={`status ${
                            att[wIdx] === "P" ? "present" : "absent"
                          }`}
                          onClick={() => toggleAtt(s.student_id, wIdx)}
                        >
                          {att[wIdx] || "A"}
                        </div>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCols && (
        <ColumnsModal
          onClose={() => setShowCols(false)}
          state={state}
          update={update}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          state={state}
          update={update}
          activeCourseId={state.activeCourseId}
          doToast={doToast}
        />
      )}
    </section>
  );
}
