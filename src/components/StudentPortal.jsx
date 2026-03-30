import React, { useEffect, useState } from 'react';
import { QUIZZES, WEEKS } from '../utils/constants.js';
import { ensureQuizzes, ensureWeeks } from '../utils/helpers.js';

export default function StudentPortal({ state }){
  const [cid, setCid] = useState(state.activeCourseId || (state.courses[0]?.id ?? ''));
  const [sid, setSid] = useState('');
  const [pin, setPin] = useState('');
  const [result, setResult] = useState(null);
  const course = state.courses.find(x => x.id === cid);

  useEffect(() => { if(state.activeCourseId) setCid(state.activeCourseId); }, [state.activeCourseId]);

  const view = () => {
    if(!course) return;
    const s = course.students.find(x => x.student_id === sid.trim());
    if(!s) return setResult(<p className="hint">Student not found.</p>);
    if(s.pin && s.pin !== pin.trim()) return setResult(<p className="hint">Invalid PIN.</p>);

    const attArr = ensureWeeks(s.attendance, 'A', WEEKS);
    const present = attArr.filter(v => v === 'P').length;
    const totalWeeks = attArr.length;
    const absent = totalWeeks - present;
    const rate = ((present / totalWeeks) * 100).toFixed(1);
    const attLine = attArr.map((v,i) => `W${i+1}:${v || '-'}`).join(' • ');
    const qRows = ensureQuizzes(s.quizzes, 0, QUIZZES).map((v,i)=>(<tr key={i}><td>Q{i+1}</td><td>{v ?? 0}</td></tr>));

    setResult(
      <div className="card pad">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <b>{s.full_name}</b>
          <span>{course.title}{s.section ? ` • Section ${s.section}` : ''}</span>
        </div>
        <h3>Attendance</h3>
        <p className="hint" style={{ margin: '0 0 8px 0' }}>Present: <b>{present}</b> / {totalWeeks} • Absent: <b>{absent}</b> • Rate: <b>{rate}%</b></p>
        <p>{attLine}</p>
        <h3>Quizzes</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Quiz</th><th>Score</th></tr></thead>
            <tbody>{qRows}</tbody>
          </table>
        </div>
        <h3>Comment</h3>
        <p>{s.comment || '—'}</p>
      </div>
    );
  };

  return (
    <section id="studentPortal">
      <div className="card pad">
        <h2>Student Self-View</h2>
        <div className="row">
          <div className="col">
            <label>Course</label>
            <select value={cid} onChange={e=>setCid(e.target.value)}>
              {state.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="col">
            <label>Student ID</label>
            <input value={sid} onChange={e=>setSid(e.target.value)} />
          </div>
          <div className="col">
            <label>PIN (optional)</label>
            <input value={pin} onChange={e=>setPin(e.target.value)} />
          </div>
          <div className="col" style={{ display:'flex', alignItems:'flex-end' }}>
            <button className="btn primary" onClick={view}>View</button>
          </div>
        </div>
        <div className="mt16">{result}</div>
      </div>
    </section>
  )
}
