import React, { useEffect, useState } from 'react';
import { WEEKS } from '../utils/constants.js';
import { ensureWeeks } from '../utils/helpers.js';
import { isSupabaseEnabled, setAttendance } from '../services/supabase.js';

export default function QRScan({ state, update, activeCourse, doToast }){
  const [cid, setCid] = useState(state.activeCourseId || (state.courses[0]?.id ?? ''));
  const [week, setWeek] = useState(1);
  const [sid, setSid] = useState('');
  const course = state.courses.find(x => x.id === cid);

  useEffect(() => { if(state.activeCourseId) setCid(state.activeCourseId); }, [state.activeCourseId]);

  const mark = () => {
    if(!course) return doToast('Pick a course');
    const w = (Number(week) || 1) - 1;
    const s = course.students.find(x => x.student_id === sid.trim());
    if(!s) return doToast('ID not found');
    const nextCourses = state.courses.map(c => {
      if(c.id !== course.id) return c;
      const next = { ...c, students: c.students.map(x => ({ ...x })) };
      const st = next.students.find(x => x.student_id === s.student_id);
      st.attendance = ensureWeeks(st.attendance, 'A', WEEKS);
      st.attendance[w] = 'P';
      return next;
    });
    update({ ...state, courses: nextCourses });
    if(isSupabaseEnabled()){
      setAttendance(cid, s.student_id, Number(week), 'P').catch(console.error);
    }
    doToast(`Marked Present: ${s.full_name}`);
  };

  return (
    <section id="qr">
      <div className="card pad">
        <h2>QR Scan (Simulated)</h2>
        <div className="row">
          <div className="col">
            <label>Course</label>
            <select value={cid} onChange={e=>setCid(e.target.value)}>
              {state.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="col">
            <label>Week</label>
            <select value={week} onChange={e=>setWeek(e.target.value)}>
              {Array.from({length: WEEKS}, (_,i)=> <option key={i} value={i+1}>Week {i+1}</option>)}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>Enter Student ID</label>
            <input value={sid} onChange={e=>setSid(e.target.value)} />
          </div>
          <div className="col" style={{ display:'flex', alignItems:'flex-end' }}>
            <button className="btn ok" style={{ marginTop: 26 }} onClick={mark}>Mark Present</button>
          </div>
        </div>
        <p className="hint">In production this would use the camera to scan QR.</p>
      </div>
    </section>
  )
}
