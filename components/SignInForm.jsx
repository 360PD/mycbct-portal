"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * MyCBCT — Sign in
 * ----------------------------------------------------------------------------
 * The portal's front door. Refined, on-brand (360 Visualise navy + gold,
 * Fraunces + DM Sans), and deliberately low-friction:
 *   - Password sign-in by default (most return users).
 *   - One tap to switch to a passwordless "email me a link" instead.
 *   - Forgot-password reset, in the same place.
 *
 * Self-contained: own React import, own styles, sample/stub handlers, default
 * export. Drop into the Next.js app at src/app/(auth)/sign-in/page.tsx and
 * replace the three stub handlers with the Supabase calls noted below.
 *
 * Backend wiring (Supabase auth):
 *   PASSWORD  → supabase.auth.signInWithPassword({ email, password })
 *   MAGIC LINK→ supabase.auth.signInWithOtp({ email,
 *                 options: { emailRedirectTo: `${origin}/auth/callback` } })
 *   RESET     → supabase.auth.resetPasswordForEmail(email,
 *                 { redirectTo: `${origin}/auth/reset` })
 * On a successful password sign-in, redirect to /dashboard (router.push).
 * ----------------------------------------------------------------------------
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Swoosh({ className }) {
  return (
    <svg className={className} viewBox="0 0 107.9684 102.6351" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#222559" d="M31.0428.6435s-5.2,2.66-10.08,12.41c-.09.18,9.08.35,15.58,6.68,0,0,6.02-4.39,10.68-7.31,2.85-1.79,5.87-3.65,5.87-3.65,0,0-8.87-8.14-22.05-8.14v.01Z" />
      <path fill="#36b886" d="M55.7628,8.6035l15.04,11.12s17.2-10.18,29.12-4.37c7.66,3.73,8.02,12.64,8.02,12.64,0,0,1.42-16.46-16.91-25.2-18.33-8.73-35.26,5.79-35.26,5.79h0l-.01.02Z" />
      <path fill="#36b886" d="M107.4228,30.4535s-.92,5.84-3.6,12.08c-2.67,6.23-4.63,7.66-4.63,7.66,0,0-3.12-5.34-7.48-10.68-4.31-5.27-5.79-5.97-5.79-5.97,0,0,5.16-5.08,6.23-17.71,0,0,11.22-.54,15.22,14.52" />
      <path fill="#e42b64" d="M7.7828,51.9535s2.31,4.81,6.68,10.24c4.36,5.43,7.66,8.81,7.66,8.81,0,0-3.75,6.23-4,11.31-.27,5.08-.18,5.7-.18,5.7,0,0-17.18-.71-17.89-12.64-.8-13.24,7.75-23.41,7.75-23.41h-.01l-.01-.01Z" />
      <path fill="#e42b64" d="M1.7228,84.5435s9.88,7.77,21.37,4.81c10.51-2.72,13.35-5.34,13.35-5.34,0,0,4.1,1.06,9.25,5.25,5.16,4.19,5.34,5.34,5.34,5.34,0,0-28.58,23.14-49.32-10.06,0,0,.01,0,.01,0Z" />
      <path fill="#e7ae3b" d="M71.7928,84.4635l-14.96,9.88s6.77,8.15,19.5,8.29c10.39.1,14.91-4.7,14.18-13.16,0,0-1.73,4.16-18.73-5.01h.01Z" />
      <path fill="#222559" d="M21.9928,29.1935c12.34,19.48,31.37,39.48,31.37,39.48,0,0-1.75,2.85-7.89,6.36s-10.53,4.16-10.53,4.16c0,0-13.62-5.5-28.76-34.01C-8.9672,16.6835,12.1228,3.3035,28.1328.6735c0,0-17.95,9.86-6.14,28.52Z" />
      <path fill="#e7ae3b" d="M57.4528,34.2435s1.87-2.31,7.39-5.43c5.52-3.12,8.02-3.83,8.02-3.83,0,0,13,4.19,27.68,29.29,14.69,25.1,5.43,38.91-10.42,45.49,0,0,15.76-17.89-32.68-65.53h0l.01.01Z" />
    </svg>
  );
}

function Lockup({ tone = "light" }) {
  return (
    <div className={"si-lockup " + (tone === "dark" ? "si-lockup-dark" : "si-lockup-light")}>
      <Swoosh className="si-logo" />
      <span className="si-lockup-text">
        <span className="si-lockup-name">MyCBCT</span>
        <span className="si-lockup-by">by 360 Visualise</span>
      </span>
    </div>
  );
}

export default function SignInForm({ notice, next }) {
  const router = useRouter();
  // notice: optional line shown above the form (e.g. "Please sign in to refer a patient.").
  // next: where to send the user after a successful sign-in (defaults to /dashboard).
  // mode: "password" | "magic" | "reset"
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // status: "idle" | "working" | "error" | "sent" | "done"
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const working = status === "working";

  function switchMode(next) {
    setMode(next);
    setStatus("idle");
    setMessage("");
    setShowPw(false);
  }

  function validate() {
    if (!EMAIL_RE.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    if (mode === "password" && password.length === 0) {
      return "Please enter your password.";
    }
    return "";
  }

  async function submit() {
    const problem = validate();
    if (problem) {
      setStatus("error");
      setMessage(problem);
      return;
    }
    setStatus("working");
    setMessage("");

    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const dest = next || "/dashboard";

    try {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setStatus("error");
          setMessage("That email and password don't match. Please try again.");
          return;
        }
        setStatus("done");
        setMessage("");
        router.push(dest);
        router.refresh();
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(dest)}`,
          },
        });
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setStatus("sent");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
          }
        );
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setStatus("sent");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="si-root">
      <style>{css}</style>

      <div className="si-shell">
        {/* ---------------- Brand panel ---------------- */}
        <aside className="si-brand" aria-hidden="true">
          <div className="si-rings" />
          <div className="si-grain" />
          <div className="si-brand-inner">
            <Lockup tone="light" />
            <h1 className="si-brand-head">
              Scans, shared
              <br />
              the simple way.
            </h1>
            <p className="si-brand-sub">
              The referral and scan-sharing portal for practices working with
              360 Visualise.
            </p>
            <ul className="si-trust">
              <li>
                <Check /> Refer a patient in under a minute
              </li>
              <li>
                <Check /> Previews and downloads in one place
              </li>
              <li>
                <Check /> UK-hosted, secure scan storage
              </li>
            </ul>
            <div className="si-brand-foot">part of 360 Visualise</div>
          </div>
        </aside>

        {/* ---------------- Form panel ---------------- */}
        <main className="si-panel">
          <div className="si-card" onKeyDown={onKeyDown}>
            {/* Small wordmark for mobile, where the brand panel is hidden */}
            <div className="si-mobile-mark">
              <Lockup tone="dark" />
            </div>

            {status === "sent" ? (
              <SentPanel
                mode={mode}
                email={email}
                onBack={() => switchMode("password")}
                onResend={submit}
              />
            ) : status === "done" ? (
              <DonePanel email={email} />
            ) : (
              <>
                <header className="si-head">
                  <h2 className="si-title">
                    {mode === "reset" ? "Reset your password" : "Welcome back"}
                  </h2>
                  <p className="si-subtitle">
                    {mode === "password" &&
                      "Sign in to your MyCBCT portal."}
                    {mode === "magic" &&
                      "We'll email you a one-tap sign-in link — no password needed."}
                    {mode === "reset" &&
                      "Enter your email and we'll send a link to set a new password."}
                  </p>
                </header>

                {notice && (
                  <div className="si-notice">{notice}</div>
                )}

                {status === "error" && (
                  <div className="si-alert" role="alert" aria-live="assertive">
                    {message}
                  </div>
                )}

                <div className="si-field si-stagger" style={{ "--i": 1 }}>
                  <label htmlFor="si-email">Email</label>
                  <input
                    id="si-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@practice.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={working}
                  />
                </div>

                {mode === "password" && (
                  <div className="si-field si-stagger" style={{ "--i": 2 }}>
                    <div className="si-label-row">
                      <label htmlFor="si-pw">Password</label>
                      <button
                        type="button"
                        className="si-link si-link-sm"
                        onClick={() => switchMode("reset")}
                        tabIndex={0}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="si-pw-wrap">
                      <input
                        id="si-pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={working}
                      />
                      <button
                        type="button"
                        className="si-eye"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="si-submit si-stagger"
                  style={{ "--i": 3 }}
                  onClick={submit}
                  disabled={working}
                >
                  {working ? (
                    <span className="si-spinner" />
                  ) : mode === "password" ? (
                    "Sign in"
                  ) : mode === "magic" ? (
                    "Email me a sign-in link"
                  ) : (
                    "Send reset link"
                  )}
                </button>

                <div className="si-alt si-stagger" style={{ "--i": 4 }}>
                  {mode === "password" && (
                    <button
                      type="button"
                      className="si-link"
                      onClick={() => switchMode("magic")}
                    >
                      Use a sign-in link instead
                    </button>
                  )}
                  {mode === "magic" && (
                    <button
                      type="button"
                      className="si-link"
                      onClick={() => switchMode("password")}
                    >
                      Use your password instead
                    </button>
                  )}
                  {mode === "reset" && (
                    <button
                      type="button"
                      className="si-link"
                      onClick={() => switchMode("password")}
                    >
                      Back to sign in
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="si-foot">
            New to MyCBCT? Your 360 Visualise contact will set you up.
            <br />
            <span className="si-foot-dim">
              Secure portal · UK-hosted · part of 360 Visualise
            </span>
          </p>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Sub-views ---------------- */

function SentPanel({ mode, email, onBack, onResend }) {
  return (
    <div className="si-sent">
      <div className="si-sent-icon">
        <Mail />
      </div>
      <h2 className="si-title">Check your inbox</h2>
      <p className="si-subtitle">
        {mode === "reset"
          ? "If an account exists for "
          : "We've sent a sign-in link to "}
        <strong>{email || "your email"}</strong>
        {mode === "reset"
          ? ", you'll get a link to set a new password."
          : ". Tap it on this device to sign in."}
      </p>
      <p className="si-sent-hint">
        It can take a minute to arrive. Check spam if you don't see it.
      </p>
      <div className="si-sent-actions">
        <button type="button" className="si-link" onClick={onResend}>
          Resend
        </button>
        <span className="si-dot-sep">·</span>
        <button type="button" className="si-link" onClick={onBack}>
          Use a different email
        </button>
      </div>
    </div>
  );
}

function DonePanel({ email }) {
  return (
    <div className="si-sent">
      <div className="si-sent-icon si-sent-ok">
        <Check big />
      </div>
      <h2 className="si-title">You're in</h2>
      <p className="si-subtitle">
        Signed in as <strong>{email}</strong>. Taking you to your dashboard…
      </p>
      <div className="si-redirect-bar">
        <span />
      </div>
    </div>
  );
}

/* ---------------- Icons (inline, no dependencies) ---------------- */

function Check({ big }) {
  return (
    <svg
      width={big ? 26 : 16}
      height={big ? 26 : 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3 3.9M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.5-1M3 3l18 18" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function Mail() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

/* ---------------- Styles ---------------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');

.si-root {
  --ink: #0e1b2e;
  --ink-2: #16294433;
  --gold: #e7ae3b;
  --gold-soft: #f0c46a;
  --paper: #f7f4ec;
  --teal: #137562;
  --card: #ffffff;
  --text: #16202e;
  --muted: #5c6b7e;
  --line: #e6e1d6;
  --err: #b4452f;
  --err-bg: #fbeae6;

  font-family: 'DM Sans', -apple-system, sans-serif;
  color: var(--text);
  min-height: 100vh;
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
}

.si-shell {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  min-height: 100vh;
}

/* ---- Brand panel ---- */
.si-brand {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 18% 12%, #1a2f4e 0%, #0e1b2e 55%, #0a1322 100%);
  color: #eef2f7;
  display: flex;
  align-items: center;
}
.si-rings {
  position: absolute;
  top: 50%;
  right: -20%;
  width: 80vh;
  height: 80vh;
  transform: translateY(-50%);
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle at center,
      rgba(231,174,59,0) 0,
      rgba(231,174,59,0) 38px,
      rgba(231,174,59,0.10) 39px,
      rgba(231,174,59,0.10) 40px);
  -webkit-mask-image: radial-gradient(circle at center, #000 60%, transparent 72%);
          mask-image: radial-gradient(circle at center, #000 60%, transparent 72%);
  opacity: 0.7;
  animation: si-drift 26s ease-in-out infinite alternate;
}
.si-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
@keyframes si-drift {
  from { transform: translateY(-50%) scale(1); }
  to   { transform: translateY(-52%) scale(1.06); }
}
.si-brand-inner {
  position: relative;
  z-index: 2;
  padding: clamp(40px, 6vw, 88px);
  max-width: 560px;
}
.si-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 21px;
  letter-spacing: 0.2px;
  color: #fff;
}
.si-mark-dot {
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 0 4px rgba(231,174,59,0.18);
}
.si-brand-head {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: clamp(34px, 4.6vw, 56px);
  line-height: 1.04;
  letter-spacing: -0.5px;
  margin: 40px 0 0;
}
.si-brand-sub {
  font-size: 17px;
  line-height: 1.55;
  color: #b9c6d6;
  margin: 22px 0 0;
  max-width: 40ch;
}
.si-trust {
  list-style: none;
  margin: 38px 0 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.si-trust li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: #d7e0ea;
}
.si-trust svg { color: var(--gold); flex: none; }
.si-brand-foot {
  margin-top: 52px;
  font-size: 12.5px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #7d8da0;
}

/* ---- Form panel ---- */
.si-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 26px;
}
.si-card {
  width: 100%;
  max-width: 380px;
}
.si-mobile-mark {
  display: none;
  margin-bottom: 28px;
}

/* ---- Logo lockup: 360 swoosh chip + "MyCBCT by 360 Visualise" ---- */
.si-lockup { display: inline-flex; align-items: center; gap: 12px; }
.si-logo {
  width: 42px; height: auto;
  display: block; flex: none;
}
.si-lockup-text { display: flex; flex-direction: column; line-height: 1.05; }
.si-lockup-name {
  font-family: 'Fraunces', serif;
  font-weight: 600; font-size: 20px; letter-spacing: 0.2px;
}
.si-lockup-by {
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 1.3px; text-transform: uppercase;
  margin-top: 3px;
}
.si-lockup-light .si-lockup-name { color: #fff; }
.si-lockup-light .si-lockup-by { color: var(--gold); }
.si-lockup-dark .si-lockup-name { color: var(--ink); }
.si-lockup-dark .si-lockup-by { color: var(--muted); }

.si-head { margin-bottom: 26px; }
.si-title {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: 30px;
  letter-spacing: -0.4px;
  color: var(--ink);
  margin: 0;
}
.si-subtitle {
  font-size: 15px;
  line-height: 1.55;
  color: var(--muted);
  margin: 10px 0 0;
}

.si-alert {
  background: var(--err-bg);
  color: var(--err);
  border: 1px solid #f0cabf;
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 14px;
  margin-bottom: 18px;
}
.si-notice {
  background: #eef4f2;
  color: var(--teal);
  border: 1px solid #cfe4dd;
  border-radius: 11px;
  padding: 11px 14px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 18px;
}

.si-field { margin-bottom: 18px; }
.si-field label {
  display: block;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 7px;
}
.si-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.si-field input {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 15px;
  color: var(--text);
  background: #fcfbf7;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 13px 14px;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.si-field input::placeholder { color: #aab4c0; }
.si-field input:focus {
  outline: none;
  background: #fff;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(231,174,59,0.18);
}
.si-field input:disabled { opacity: 0.6; }

.si-pw-wrap { position: relative; }
.si-pw-wrap input { padding-right: 44px; }
.si-eye {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 32px; height: 32px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  border-radius: 8px;
}
.si-eye:hover { color: var(--ink); background: #f1eee6; }

.si-submit {
  width: 100%;
  font-family: inherit;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--ink);
  background: linear-gradient(180deg, var(--gold-soft), var(--gold));
  border: none;
  border-radius: 11px;
  padding: 14px;
  margin-top: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  box-shadow: 0 6px 18px rgba(231,174,59,0.28);
  transition: transform .12s, box-shadow .15s, filter .15s;
}
.si-submit:hover { filter: brightness(1.03); box-shadow: 0 8px 22px rgba(231,174,59,0.34); }
.si-submit:active { transform: translateY(1px); }
.si-submit:disabled { cursor: default; filter: saturate(0.7); box-shadow: none; }

.si-spinner {
  width: 18px; height: 18px;
  border: 2.5px solid rgba(14,27,46,0.25);
  border-top-color: var(--ink);
  border-radius: 50%;
  animation: si-spin .7s linear infinite;
}
@keyframes si-spin { to { transform: rotate(360deg); } }

.si-alt {
  margin-top: 20px;
  text-align: center;
}
.si-link {
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--teal);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  border-bottom: 1px solid transparent;
}
.si-link:hover { border-bottom-color: var(--teal); }
.si-link-sm { font-size: 13px; color: var(--muted); }
.si-link-sm:hover { color: var(--ink); border-bottom-color: var(--ink); }

.si-foot {
  text-align: center;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
  max-width: 380px;
}
.si-foot-dim { color: #98a2b0; font-size: 12px; letter-spacing: 0.2px; }

/* ---- Sent / done panels ---- */
.si-sent { text-align: center; padding: 8px 0 4px; }
.si-sent-icon {
  width: 58px; height: 58px;
  margin: 0 auto 22px;
  display: grid; place-items: center;
  border-radius: 16px;
  background: #eef4f2;
  color: var(--teal);
}
.si-sent-ok { background: #eef4f2; color: var(--teal); }
.si-sent .si-title { text-align: center; }
.si-sent .si-subtitle { text-align: center; }
.si-sent-hint {
  font-size: 13px;
  color: #98a2b0;
  margin: 16px 0 0;
}
.si-sent-actions {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.si-dot-sep { color: #c4ccd6; }

.si-redirect-bar {
  margin: 26px auto 0;
  width: 180px; height: 4px;
  background: #ece7dc;
  border-radius: 99px;
  overflow: hidden;
}
.si-redirect-bar span {
  display: block; height: 100%; width: 40%;
  background: var(--gold);
  border-radius: 99px;
  animation: si-load 1.1s ease-in-out infinite;
}
@keyframes si-load {
  0% { margin-left: -40%; }
  100% { margin-left: 100%; }
}

/* ---- Entrance stagger ---- */
.si-stagger {
  opacity: 0;
  transform: translateY(8px);
  animation: si-rise .5s cubic-bezier(.2,.7,.3,1) forwards;
  animation-delay: calc(var(--i) * 70ms);
}
@keyframes si-rise {
  to { opacity: 1; transform: none; }
}

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .si-shell { grid-template-columns: 1fr; }
  .si-brand { display: none; }
  .si-mobile-mark { display: flex; }
  .si-panel { min-height: 100vh; justify-content: flex-start; padding-top: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .si-rings, .si-stagger, .si-redirect-bar span, .si-spinner { animation: none; }
  .si-stagger { opacity: 1; transform: none; }
}
`;
