import React, { useState } from "react";
import { signIn, signUp } from "../services/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <section id="login">
      <div className="card pad">
        <h2>Sign in</h2>
        <div className="row">
          <div className="col">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
            />
          </div>
          <div className="col">
            <label>Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="row">
          <button
            className="btn primary"
            onClick={async () => {
              setMsg("");
              if (!email || !pw) {
                setMsg("Enter email & password");
                return;
              }
              try {
                await signIn(email, pw);
              } catch (e) {
                const m = String(e?.message || "");
                if (m.toLowerCase().includes("invalid"))
                  setMsg("Invalid email/password");
                else
                  setMsg('Account not found. Click "Sign up" to create one.');
              }
            }}
          >
            Login
          </button>
          <button
            className="btn"
            onClick={async () => {
              setMsg("");
              if (!email || !pw) {
                setMsg("Enter email & password");
                return;
              }
              try {
                await signUp(email, pw);
                setMsg("Check your email to confirm, then log in.");
              } catch (e) {
                setMsg(e.message || "Sign-up failed");
              }
            }}
          >
            Sign up
          </button>
        </div>
        {msg && <div className="hint mt16">{msg}</div>}
      </div>
    </section>
  );
}
