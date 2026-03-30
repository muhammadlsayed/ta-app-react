import React, { useRef, useState } from "react";
import { ensureQuizzes, ensureWeeks } from "../utils/helpers.js";
import { isSupabaseEnabled, upsertStudents } from "../services/supabase.js";
export default function ImportModal({
  onClose,
  state,
  update,
  activeCourseId,
  doToast,
}) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [textarea, setTextarea] = useState("");
  const fileRef = useRef(null);
  const rowsRef = useRef([]);
  const course = state.courses.find((c) => c.id === activeCourseId);
  const toast = (msg) =>
    typeof doToast === "function" ? doToast(msg) : console.log(msg);
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((x) => x.trim().length);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = {
      student_id: headers.indexOf("student_id"),
      full_name: headers.indexOf("full_name"),
      pin: headers.indexOf("pin"),
      section: headers.indexOf("section"),
    };
    if (idx.student_id === -1 || idx.full_name === -1) return null;
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      out.push({
        student_id: (cols[idx.student_id] || "").trim(),
        full_name: (cols[idx.full_name] || "").trim(),
        pin: idx.pin === -1 ? "" : (cols[idx.pin] || "").trim(),
        section: idx.section === -1 ? "" : (cols[idx.section] || "").trim(),
      });
    }
    return out;
  };

  const calcSummary = (rows) => {
    if (!course) return;
    if (rows === null) {
      setSummary({ error: true });
      return;
    }
    let total = (rows || []).length,
      valid = 0,
      updates = 0,
      newAdds = 0,
      invalid = 0;
    for (const r of rows || []) {
      const ok = r.student_id && r.full_name;
      if (!ok) {
        invalid++;
        continue;
      }
      valid++;
      const exists = course.students.some(
        (s) => s.student_id === (r.student_id || "")
      );
      if (exists) updates++;
      else newAdds++;
    }
    setSummary({ total, valid, updates, newAdds, invalid });
  };

  const onFile = async (file) => {
    rowsRef.current = [];
    setSummary(null);
    if (!file) return;
    setBusy(true);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv")) {
        const text = await file.text();
        rowsRef.current = parseCSV(text) || [];
        calcSummary(rowsRef.current);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
        const normalized = json.map((r) => ({
          student_id: (
            r.student_id ?? r.Student_ID ?? r.StudentId ?? r.ID ?? r.id ?? ""
          )
            .toString()
            .trim(),
          full_name: (r.full_name ?? r.Full_Name ?? r.Name ?? r.name ?? "")
            .toString()
            .trim(),
          pin: (r.pin ?? r.PIN ?? "").toString().trim(),
          section: (r.section ?? r.Section ?? r.SECTION ?? "").toString().trim(),
        }));
        if (
          normalized.length &&
          (!normalized[0].student_id || !normalized[0].full_name)
        ) {
          const csv = XLSX.utils.sheet_to_csv(ws);
          rowsRef.current = parseCSV(csv) || [];
        } else {
          rowsRef.current = normalized;
        }
        calcSummary(rowsRef.current);
      } else {
        toast("Unsupported file type");
      }
    } catch (e) {
      console.error(e);
      toast("Failed to read file");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    const toast = (msg) =>
      typeof doToast === "function" ? doToast(msg) : console.log(msg);

    if (!course) return doToast("Open a course first");
    let rows =
      rowsRef.current && rowsRef.current.length
        ? rowsRef.current
        : parseCSV(textarea);
    if (rows === null) {
      setSummary({ error: true });
      return;
    }
    if (!rows || rows.length === 0) {
      toast("No rows to import");
      return;
    }

    const nextCourses = state.courses.map((c) => {
      if (c.id !== course.id) return c;
      const next = { ...c, students: [...c.students] };
      let count = 0;
      for (const r of rows) {
        if (!r.student_id || !r.full_name) continue;
        let s = next.students.find((x) => x.student_id === r.student_id);
        if (!s) {
          s = {
            student_id: r.student_id,
            full_name: r.full_name,
            pin: r.pin || "",
            section: r.section || "",
            attendance: ensureWeeks([], "A"),
            quizzes: ensureQuizzes([], ""),
            comment: "",
          };
          next.students.push(s);
        } else {
          s.full_name = r.full_name;
          if (r.pin) s.pin = r.pin;
          if (typeof r.section !== 'undefined') s.section = r.section;
        }
        count++;
      }
      return next;
    });

    if (isSupabaseEnabled()) {
      try {
        await upsertStudents(course.id, rows);
      } catch (e) {
        console.error(e);
        toast("Failed to save students to database");
      }
    }
    update({ ...state, courses: nextCourses });
    onClose();
    toast("Import complete");
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div
        className="panel card pad"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Import Students (CSV/XLSX)</h2>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="row">
          <div className="col">
            <label>Upload file (.csv, .xlsx)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>

        <details>
          <summary className="hint">Or paste CSV manually</summary>
          <textarea
            rows={6}
            value={textarea}
            onChange={(e) => setTextarea(e.target.value)}
            placeholder={"student_id,full_name,section\n1001,Ali Ahmed,A\n1002,Sara Ali,B"}
          />
        </details>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <button
            className="btn"
            onClick={() => {
              const csv = "student_id,full_name,section\n1001,Ali Ahmed,A\n1002,Sara Ali,B";
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "students_template.csv";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download Template
          </button>
          <button className="btn primary" onClick={runImport} disabled={busy}>
            Import
          </button>
        </div>

        {busy && (
          <div className="mt16 center" aria-live="polite">
            <div className="spinner" />
            <div className="hint">Parsing file…</div>
          </div>
        )}
        {summary && !summary.error && (
          <div className="card pad mt16">
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <div className="hint">File parsed successfully</div>
                <div>
                  <b>Total rows:</b> {summary.total}
                </div>
                <div>
                  <b>Valid:</b> {summary.valid} &nbsp; <b>New:</b>{" "}
                  {summary.newAdds} &nbsp; <b>Updates:</b> {summary.updates}{" "}
                  &nbsp; <b>Invalid:</b> {summary.invalid}
                </div>
              </div>
              <div className="hint">Preview hidden to protect student data</div>
            </div>
          </div>
        )}
        {summary && summary.error && (
          <p className="hint">
            Missing required headers <code>student_id, full_name</code>.
          </p>
        )}
      </div>
    </div>
  );
}
