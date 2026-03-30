import React from "react";
import { WEEKS, QUIZZES } from "../utils/constants.js";

export default function ColumnsModal({ onClose, state, update }) {
  const v = state.settings.visible;
  const setV = (path, val) => {
    const next = JSON.parse(JSON.stringify(v));
    if (Array.isArray(path)) {
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = val;
    } else {
      next[path] = val;
    }
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, visible: next },
    }));
  };
  return (
    <div className="modal">
      <div className="panel card pad">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Visible Columns</h3>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="row">
          <label>
            <input
              type="checkbox"
              checked={v.id}
              onChange={(e) => setV("id", e.target.checked)}
            />{" "}
            Student ID
          </label>
          <label>
            <input
              type="checkbox"
              checked={v.name}
              onChange={(e) => setV("name", e.target.checked)}
            />{" "}
            Name
          </label>
          <label>
            <input
              type="checkbox"
              checked={v.section}
              onChange={(e) => setV("section", e.target.checked)}
            />{" "}
            Section
          </label>
          <label>
            <input
              type="checkbox"
              checked={v.comment}
              onChange={(e) => setV("comment", e.target.checked)}
            />{" "}
            Comment
          </label>
          <label>
            <input
              type="checkbox"
              checked={v.actions}
              onChange={(e) => setV("actions", e.target.checked)}
            />{" "}
            Actions
          </label>
        </div>

        <h4>Attendance columns</h4>
        <div className="row">
          {Array.from({ length: WEEKS }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={v.att[i]}
                onChange={(e) => setV(["att", i], e.target.checked)}
              />{" "}
              ATT {i + 1}
            </label>
          ))}
        </div>

        <h4>Quiz columns</h4>
        <div className="row">
          {Array.from({ length: QUIZZES }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={v.quiz[i]}
                onChange={(e) => setV(["quiz", i], e.target.checked)}
              />{" "}
              Q{i + 1}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
