import React, { useState } from 'react'
import { useApp } from './context/AppContext.jsx'
import Login from './components/Login.jsx'
import Courses from './components/Courses.jsx'
import Roster from './components/Roster.jsx'
import StudentDetail from './components/StudentDetail.jsx'
import StudentPortal from './components/StudentPortal.jsx'
import QRScan from './components/QRScan.jsx'
import Toast from './components/Toast.jsx'
import { signOut, isSupabaseEnabled } from './services/supabase.js'

export default function App(){
  const { state, update, view, go, activeCourse } = useApp()
  const [toast, setToast] = useState('')
  const doToast = (msg) => {
    setToast(msg)
    setTimeout(()=> setToast(''), 2200)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">TA App</h1>
        <nav className="nav">
          {state.loggedIn && <>
            <button className={"link " + (view==='courses'?'active':'')} onClick={()=>go('courses')}>Courses</button>
            {activeCourse && <button className={"link " + (view==='roster'?'active':'')} onClick={()=>go('roster')}>Roster</button>}
            {activeCourse && <button className={"link " + (view==='studentDetail'?'active':'')} onClick={()=>go('studentDetail')}>Student</button>}
            <button className={"link " + (view==='qr'?'active':'')} onClick={()=>go('qr')}>QR</button>
            <button className={"link " + (view==='portal'?'active':'')} onClick={()=>go('portal')}>Self‑View</button>
          </>}
        </nav>
        <div className="grow" />
        {state.loggedIn && <button className="btn ghost" onClick={async()=>{
          if(isSupabaseEnabled()) await signOut(); 
          update(prev=>({ ...prev, loggedIn:false }));
          go('login')
        }}>Sign out</button>}
      </header>

      <main className="container">
        {view==='login' && <Login />}
        {view==='courses' && <Courses state={state} update={update} go={go} doToast={doToast} />}
        {view==='roster' && <Roster state={state} update={update} activeCourse={activeCourse} go={go} doToast={doToast} />}
        {view==='studentDetail' && <StudentDetail state={state} update={update} activeCourse={activeCourse} go={go} doToast={doToast} />}
        {view==='portal' && <StudentPortal state={state} />}
        {view==='qr' && <QRScan state={state} update={update} activeCourse={activeCourse} doToast={doToast} />}
      </main>
      <Toast msg={toast} />
    </div>
  )
}
