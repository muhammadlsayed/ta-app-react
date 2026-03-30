import React from 'react';
import { QUIZZES, WEEKS } from '../utils/constants.js';
import { ensureQuizzes, ensureWeeks } from '../utils/helpers.js';
import { isSupabaseEnabled, setAttendance, setQuizScore, setComment } from '../services/supabase.js';

export default function StudentDetail({ state, update, activeCourse, go, doToast }){
  const id = sessionStorage.getItem('_sd_sel');
  if(!activeCourse) return null;
  const s = activeCourse.students.find(x => x.student_id === id);
  if(!s) return (<section id="studentDetail" className="card pad"><p className="hint">Student not found.</p></section>);

  const save = () => {
    const nextCourses = state.courses.map(c => {
      if(c.id !== activeCourse.id) return c;
      const next = { ...c, students: c.students.map(x => ({ ...x })) };
      return next;
    });
    update({ ...state, courses: nextCourses });
    doToast('Saved');
  };

  return (
    <section id="studentDetail">
      <div className="card pad">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <h2 id="sdTitle">{s.full_name} (ID: {s.student_id}) {s.section ? `• Section ${s.section}` : ''}</h2>
        </div>
        <div className="row">
          <div className="col">
            <h3>Attendance</h3>
            <div id="sdAttendance" className="row">
              {Array.from({length: WEEKS}, (_,i) => {
                const v = s.attendance?.[i] || 'A';
                return (
                  <div key={i} className={`status ${v === 'P' ? 'present' : 'absent'}`} onClick={() => {
                    const nextCourses = state.courses.map(c => {
                      if(c.id !== activeCourse.id) return c;
                      const next = { ...c, students: c.students.map(x => ({ ...x })) };
                      const st = next.students.find(x => x.student_id === s.student_id);
                      st.attendance = ensureWeeks(st.attendance, 'A', WEEKS);
                      const newVal = st.attendance[i] === 'A' ? 'P' : 'A';
                      st.attendance[i] = newVal;
                      return next;
                    });
                    update({ ...state, courses: nextCourses });
                    if(isSupabaseEnabled()){
                      const newVal = (s.attendance?.[i] || 'A') === 'A' ? 'P' : 'A';
                      setAttendance(activeCourse.id, s.student_id, i+1, newVal).catch(console.error);
                    }
                  }}>{`W${i+1}:${v}`}</div>
                )
              })}
            </div>
          </div>
          <div className="col">
            <h3>Quizzes</h3>
            <div id="sdQuizzes" className="row">
              {Array.from({length: QUIZZES}, (_,i) => (
                <div key={i}>
                  <label style={{ minWidth: 50 }}>Q{i+1}</label>
                  <input type="number" min={0} step={1} style={{ width: 120 }}
                    value={s.quizzes?.[i] ?? ''}
                    onChange={e => {
                      const nextCourses = state.courses.map(c => {
                        if(c.id !== activeCourse.id) return c;
                        const next = { ...c, students: c.students.map(x => ({ ...x })) };
                        const st = next.students.find(x => x.student_id === s.student_id);
                        st.quizzes = ensureQuizzes(st.quizzes, 0, QUIZZES);
                        const score = e.target.value === '' ? '' : Number(e.target.value);
                        st.quizzes[i] = score;
                        return next;
                      });
                      update({ ...state, courses: nextCourses });
                      if(isSupabaseEnabled()){
                        const score = e.target.value === '' ? null : Number(e.target.value);
                        setQuizScore(activeCourse.id, s.student_id, i+1, score).catch(console.error);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <label htmlFor="sdComment">Comment</label>
        <textarea id="sdComment" rows={4} value={s.comment || ''}
          onChange={e => {
            const nextCourses = state.courses.map(c => {
              if(c.id !== activeCourse.id) return c;
              const next = { ...c, students: c.students.map(x => ({ ...x })) };
              const st = next.students.find(x => x.student_id === s.student_id);
              st.comment = e.target.value;
              return next;
            });
            update({ ...state, courses: nextCourses });
            if(isSupabaseEnabled()){
              setComment(activeCourse.id, s.student_id, e.target.value).catch(console.error);
            }
          }}
        />
        <div className="row" style={{ justifyContent:'space-between' }}>
          <span className="hint">Autosaves on change</span>
          <button className="btn ok" onClick={save}>Save</button>
        </div>
      </div>
    </section>
  )
}
