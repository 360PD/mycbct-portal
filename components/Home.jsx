"use client";

import React, { useState, useEffect, useRef } from "react";

/**
 * MyCBCT — public homepage.
 * Matches the 360 Visualise scheme: Web Navy #0e1b2e, Gold #e7ae3b,
 * Fraunces (headings) + DM Sans (text) — same tokens as the portal,
 * so the marketing page and the app read as one brand.
 *
 * CTAs are wired via props: onRefer -> referral form, onSignIn -> login.
 */
/* Inline demo of the scan viewer for the homepage. Synthetic scan (no real
 * patient). Drag across the image or use the slider; press play to cine. */
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

function HmLockup() {
  return (
    <div className="hm-lockup">
      <Swoosh className="hm-logoicon" />
      <span className="hm-locktext">
        <span className="hm-lockname">MyCBCT</span>
        <span className="hm-lockby">by 360 Visualise</span>
      </span>
    </div>
  );
}

function DemoViewer() {
  const PLANES = [
    { k: "axial", label: "Axial", total: 72 },
    { k: "coronal", label: "Coronal", total: 56 },
    { k: "sagittal", label: "Sagittal", total: 56 },
  ];
  const [plane, setPlane] = useState("axial");
  const [idx, setIdx] = useState(36);
  const [playing, setPlaying] = useState(true);
  const cv = useRef(null);
  const drag = useRef(null);
  const total = PLANES.find((p) => p.k === plane).total;

  const switchPlane = (nk) => {
    const frac = idx / (total - 1);
    const nt = PLANES.find((p) => p.k === nk).total;
    setPlane(nk); setIdx(Math.round(frac * (nt - 1)));
  };

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), 95);
    return () => clearInterval(t);
  }, [playing, total]);

  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height, cx = W / 2, cy = H / 2 + H * 0.02;
    const t = total > 1 ? idx / (total - 1) : 0;
    let s = (idx * 2654435761 + plane.length * 40503) | 0;
    const r = () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const ell = (x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };

    ctx.fillStyle = "#04060a"; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(W, H) * 0.5);
    vg.addColorStop(0, "rgba(74,80,90,0.5)"); vg.addColorStop(0.7, "rgba(34,38,46,0.35)"); vg.addColorStop(1, "rgba(4,6,10,0)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    if (plane === "axial") {
      ell(cx, cy, W * 0.40, H * 0.345, "#14171d");
      ell(cx, cy, W * 0.375, H * 0.315, "#202632");
      const archW = W * 0.20 * (0.85 + 0.3 * Math.sin(t * Math.PI));
      const archH = H * 0.19, ay = cy + H * 0.045;
      ctx.lineWidth = 17; ctx.strokeStyle = "#727983";
      ctx.beginPath(); ctx.ellipse(cx, ay, archW + 12, archH, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      ctx.lineWidth = 9; ctx.strokeStyle = "#3b414b";
      ctx.beginPath(); ctx.ellipse(cx, ay, archW + 12, archH, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 0.14 + Math.PI * 0.72 * (i / n);
        const tx = cx + Math.cos(a) * (archW + 12), ty = ay + Math.sin(a) * archH;
        const b = 208 + Math.floor(r() * 42);
        ell(tx, ty, 5.4, 6.4, `rgb(${b},${b},${b - 5})`);
        ell(tx, ty, 2.4, 2.9, "#9aa0a8");
      }
      ell(cx, cy - H * 0.01, W * 0.065, H * 0.06, "#0a0c10");
      ell(cx, cy + H * 0.235, W * 0.045, H * 0.035, "#5b616a");
    } else if (plane === "coronal") {
      ell(cx, cy, W * 0.31, H * 0.37, "#1a1f28");
      ell(cx - W * 0.13, cy - H * 0.02, W * 0.05, H * 0.30, "#565c64");
      ell(cx + W * 0.13, cy - H * 0.02, W * 0.05, H * 0.30, "#565c64");
      const teeth = 9;
      for (let i = 0; i <= teeth; i++) {
        const tx = cx - W * 0.16 + W * 0.32 * (i / teeth), ty = cy + H * 0.17 + Math.sin(i + t * 6) * 4;
        const b = 205 + Math.floor(r() * 40);
        ell(tx, ty, 5.5, 7.5, `rgb(${b},${b},${b - 5})`);
      }
      ell(cx, cy - H * 0.05, W * 0.035, H * 0.10, "#0a0c10");
    } else {
      ell(cx + W * 0.02, cy, W * 0.31, H * 0.35, "#1a1f28");
      for (let i = 0; i < 7; i++) ell(cx + W * 0.20, cy - H * 0.22 + i * H * 0.075, W * 0.05, H * 0.027, "#5b616a");
      const teeth = 7;
      for (let i = 0; i <= teeth; i++) {
        const tx = cx - W * 0.16 + W * 0.22 * (i / teeth), ty = cy + H * 0.155;
        const b = 202 + Math.floor(r() * 44);
        ell(tx, ty, 5.5, 6.5, `rgb(${b},${b},${b - 5})`);
      }
      ell(cx - W * 0.04, cy - H * 0.05, W * 0.055, H * 0.055, "#0a0c10");
    }

    const dots = (W * H) / 240;
    for (let i = 0; i < dots; i++) { const x = r() * W, y = r() * H, a = r() * 0.10; ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; ctx.fillRect(x, y, 1.4, 1.4); }
    const eg = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, Math.max(W, H) * 0.6);
    eg.addColorStop(0, "rgba(0,0,0,0)"); eg.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  }, [plane, idx, total]);

  const onDown = (e) => { setPlaying(false); drag.current = { x: e.clientX, idx }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => { if (!drag.current) return; const ni = drag.current.idx + Math.round((e.clientX - drag.current.x) / 6); setIdx(Math.max(0, Math.min(total - 1, ni))); };
  const onUp = () => { drag.current = null; };

  return (
    <div className="hm-dvcard">
      <div className="hm-dvstage">
        <canvas ref={cv} width={640} height={440} className="hm-dvcanvas"
          style={{ touchAction: "none", cursor: "ew-resize" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />
        <span className="hm-dvbanner">Demo scan · preview only</span>
        <span className="hm-dvslice">Slice {idx + 1} / {total}</span>
      </div>
      <div className="hm-dvctrls">
        <div className="hm-dvtabs">
          {PLANES.map((p) => <button key={p.k} className={"hm-dvtab " + (plane === p.k ? "on" : "")} onClick={() => switchPlane(p.k)}>{p.label}</button>)}
        </div>
        <button className="hm-dvplay" onClick={() => setPlaying((p) => !p)}>
          {playing
            ? <><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> Pause</>
            : <><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 5l12 7-12 7V5z" /></svg> Play</>}
        </button>
      </div>
      <input type="range" className="hm-dvscrub" min={0} max={total - 1} value={idx}
        style={{ "--pct": (idx / (total - 1)) * 100 + "%" }}
        onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }} />
      <div className="hm-dvhint">Drag across the scan or use the slider · switch planes above</div>
    </div>
  );
}

export default function Home({ onRefer = () => {}, onSignIn = () => {} }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 20);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');
  .hm * { box-sizing:border-box; margin:0; padding:0; }
  .hm {
    --ink:#0e1b2e; --navy:#16243b; --gold:#e7ae3b; --gold-deep:#c8902a;
    --paper:#f7f4ec; --card:#fffdf8; --line:#e4ddcf; --muted:#717b8c; --teal:#137562;
    font-family:'DM Sans',system-ui,sans-serif; color:var(--ink); background:var(--paper); overflow-x:hidden;
  }
  .hm-wrap { max-width:1120px; margin:0 auto; padding:0 24px; }

  /* nav */
  .hm-nav { position:fixed; top:0; left:0; right:0; z-index:50; transition:.25s; }
  .hm-nav.solid { background:rgba(14,27,46,.92); backdrop-filter:blur(10px); box-shadow:0 10px 30px -20px rgba(0,0,0,.6); }
  .hm-navin { display:flex; align-items:center; justify-content:space-between; height:68px; }
  .hm-logo { font-family:'Fraunces',serif; font-weight:600; font-size:22px; color:#fff; letter-spacing:-.4px; }
  .hm-logo b { color:var(--gold); }
  .hm-lockup { display:flex; align-items:center; gap:11px; }
  .hm-logoicon { width:34px; height:auto; display:block; flex:none; }
  .hm-locktext { display:flex; flex-direction:column; line-height:1.02; }
  .hm-lockname { font-family:'Fraunces',serif; font-weight:600; font-size:21px; color:#fff; letter-spacing:-.3px; }
  .hm-lockby { font-family:'DM Sans',sans-serif; font-size:9.5px; font-weight:600; letter-spacing:1.4px; text-transform:uppercase; color:var(--gold); margin-top:2px; }
  .hm-navlinks { display:flex; align-items:center; gap:30px; }
  .hm-navlinks a { color:rgba(255,255,255,.82); text-decoration:none; font-size:14.5px; font-weight:500; cursor:pointer; }
  .hm-navlinks a:hover { color:#fff; }
  .hm-navcta { display:flex; align-items:center; gap:14px; }
  .hm-signin { color:#fff; background:transparent; border:0; font:inherit; font-size:14.5px; font-weight:600; cursor:pointer; }
  .hm-btn { font:inherit; font-weight:600; cursor:pointer; border:0; border-radius:11px; transition:.18s; display:inline-flex; align-items:center; gap:9px; }
  .hm-btn.gold { background:var(--gold); color:var(--ink); }
  .hm-btn.gold:hover { background:var(--gold-deep); }
  .hm-btn.lg { font-size:16px; padding:15px 26px; }
  .hm-btn.sm { font-size:14.5px; padding:11px 18px; }
  .hm-btn.ghost { background:transparent; border:1.5px solid rgba(255,255,255,.3); color:#fff; }
  .hm-btn.ghost:hover { border-color:#fff; }
  @media (max-width:860px){ .hm-navlinks{ display:none; } }

  /* hero */
  .hm-hero { background:
      radial-gradient(900px 500px at 88% -5%, rgba(231,174,59,.16), transparent 60%),
      radial-gradient(700px 500px at -5% 10%, rgba(19,117,98,.10), transparent 55%),
      var(--ink);
    color:#fff; padding:148px 0 92px; position:relative; }
  .hm-herogrid { display:grid; grid-template-columns:1.1fr .9fr; gap:54px; align-items:center; }
  @media (max-width:900px){ .hm-herogrid{ grid-template-columns:1fr; gap:40px; } }
  .hm-kicker { display:inline-flex; align-items:center; gap:9px; font-size:13px; letter-spacing:.04em; color:var(--gold); background:rgba(231,174,59,.12); border:1px solid rgba(231,174,59,.3); padding:7px 14px; border-radius:99px; font-weight:600; }
  .hm-h1 { font-family:'Fraunces',serif; font-weight:500; font-size:54px; line-height:1.04; letter-spacing:-1.2px; margin:22px 0 18px; }
  .hm-h1 em { font-style:normal; color:var(--gold); }
  @media (max-width:560px){ .hm-h1{ font-size:38px; } }
  .hm-lede { font-size:18px; line-height:1.6; color:rgba(255,255,255,.8); max-width:520px; }
  .hm-heroctas { display:flex; gap:14px; margin-top:30px; flex-wrap:wrap; }
  .hm-trust { margin-top:28px; font-size:13.5px; color:rgba(255,255,255,.6); display:flex; align-items:center; gap:9px; }
  .hm-trust b { color:#fff; font-weight:600; }

  /* hero visual — portal/scan card */
  .hm-visual { position:relative; }
  .hm-pcard { background:var(--navy); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:18px; box-shadow:0 50px 90px -50px rgba(0,0,0,.8); }
  .hm-pbar { display:flex; align-items:center; gap:7px; margin-bottom:14px; }
  .hm-pdot { width:9px; height:9px; border-radius:99px; background:rgba(255,255,255,.2); }
  .hm-scan { aspect-ratio:16/11; border-radius:13px; background:radial-gradient(circle at 50% 45%, #2a3142 0%, #0d1119 75%); position:relative; overflow:hidden; display:grid; place-items:center; }
  .hm-scan svg { opacity:.9; }
  .hm-scanlbl { position:absolute; left:12px; bottom:11px; font-size:10.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0e1b2e; background:var(--gold); padding:5px 9px; border-radius:6px; }
  .hm-prow { display:flex; align-items:center; gap:11px; margin-top:14px; padding:12px 14px; background:rgba(255,255,255,.05); border-radius:12px; }
  .hm-pico { width:34px; height:34px; border-radius:9px; background:rgba(231,174,59,.18); color:var(--gold); display:grid; place-items:center; flex:none; }
  .hm-pt { font-size:13.5px; font-weight:600; color:#fff; }
  .hm-pd { font-size:12px; color:rgba(255,255,255,.55); margin-top:1px; }
  .hm-ppill { margin-left:auto; font-size:11.5px; font-weight:600; color:var(--teal); background:rgba(19,117,98,.2); padding:5px 10px; border-radius:99px; }
  .hm-float { position:absolute; right:-14px; bottom:36px; background:var(--card); color:var(--ink); border-radius:13px; padding:13px 16px; box-shadow:0 30px 60px -30px rgba(0,0,0,.5); display:flex; align-items:center; gap:10px; }
  .hm-float .n { font-family:'Fraunces',serif; font-size:22px; font-weight:600; color:var(--gold-deep); line-height:1; }
  .hm-float .l { font-size:11.5px; color:var(--muted); }
  @media (max-width:900px){ .hm-float{ right:8px; } }

  /* value props */
  .hm-props { padding:74px 0; }
  .hm-props-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
  @media (max-width:860px){ .hm-props-grid{ grid-template-columns:repeat(2,1fr); } }
  @media (max-width:480px){ .hm-props-grid{ grid-template-columns:1fr; } }
  .hm-prop { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:24px; }
  .hm-prop .ic { width:42px; height:42px; border-radius:11px; background:var(--ink); color:var(--gold); display:grid; place-items:center; margin-bottom:16px; }
  .hm-prop h3 { font-family:'Fraunces',serif; font-size:18px; font-weight:600; margin-bottom:8px; }
  .hm-prop p { font-size:14px; color:var(--muted); line-height:1.55; }

  /* embedded demo viewer */
  .hm-demo { padding:6px 0 78px; }
  .hm-demowrap { max-width:660px; margin:0 auto; }
  .hm-dvcard { background:var(--navy); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:16px; box-shadow:0 44px 84px -50px rgba(0,0,0,.7); }
  .hm-dvstage { position:relative; background:#04060a; border-radius:13px; overflow:hidden; }
  .hm-dvcanvas { display:block; width:100%; height:auto; }
  .hm-dvbanner { position:absolute; top:11px; left:11px; font-size:10px; letter-spacing:.1em; font-weight:700; text-transform:uppercase; color:#0e1b2e; background:var(--gold); padding:5px 9px; border-radius:6px; }
  .hm-dvslice { position:absolute; top:11px; right:11px; font-size:11.5px; font-weight:600; color:#cfd4da; background:rgba(0,0,0,.45); padding:5px 10px; border-radius:6px; font-variant-numeric:tabular-nums; }
  .hm-dvctrls { display:flex; align-items:center; gap:10px; margin-top:14px; flex-wrap:wrap; }
  .hm-dvtabs { display:flex; gap:5px; background:rgba(255,255,255,.06); padding:4px; border-radius:10px; }
  .hm-dvtab { font:inherit; font-size:13px; font-weight:600; padding:7px 13px; border-radius:7px; border:0; background:transparent; color:rgba(255,255,255,.6); cursor:pointer; transition:.15s; }
  .hm-dvtab.on { background:var(--gold); color:#0e1b2e; }
  .hm-dvplay { font:inherit; font-size:12.5px; font-weight:600; margin-left:auto; border:1.5px solid rgba(255,255,255,.2); background:transparent; color:#fff; border-radius:9px; padding:8px 13px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
  .hm-dvplay:hover { border-color:var(--gold); }
  .hm-dvscrub { -webkit-appearance:none; appearance:none; width:100%; margin-top:12px; height:6px; border-radius:99px; background:linear-gradient(var(--gold),var(--gold)) no-repeat, rgba(255,255,255,.15); background-size:var(--pct,50%) 100%; cursor:pointer; }
  .hm-dvscrub::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid var(--gold); cursor:pointer; }
  .hm-dvscrub::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid var(--gold); cursor:pointer; }
  .hm-dvhint { text-align:center; color:rgba(255,255,255,.5); font-size:12px; margin-top:11px; }

  /* section heading */
  .hm-sec { padding:24px 0 70px; }
  .hm-eyebrow { text-align:center; font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold-deep); font-weight:600; }
  .hm-sech2 { text-align:center; font-family:'Fraunces',serif; font-size:36px; font-weight:500; letter-spacing:-.6px; margin:12px 0 8px; }
  .hm-secsub { text-align:center; font-size:16px; color:var(--muted); max-width:560px; margin:0 auto 48px; line-height:1.6; }

  /* steps */
  .hm-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
  @media (max-width:780px){ .hm-steps{ grid-template-columns:1fr; } }
  .hm-step { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:30px 26px; position:relative; }
  .hm-stepn { font-family:'Fraunces',serif; font-size:15px; font-weight:600; color:var(--ink); width:40px; height:40px; border-radius:99px; background:rgba(231,174,59,.18); display:grid; place-items:center; margin-bottom:18px; }
  .hm-step h3 { font-family:'Fraunces',serif; font-size:20px; font-weight:600; margin-bottom:9px; }
  .hm-step p { font-size:14.5px; color:var(--muted); line-height:1.6; }

  /* reporting band */
  .hm-report { background:var(--ink); color:#fff; border-radius:24px; padding:54px 48px; display:grid; grid-template-columns:1.2fr .8fr; gap:44px; align-items:center; }
  @media (max-width:820px){ .hm-report{ grid-template-columns:1fr; padding:38px 28px; } }
  .hm-report .eb { font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); font-weight:600; }
  .hm-report h2 { font-family:'Fraunces',serif; font-size:34px; font-weight:500; letter-spacing:-.5px; margin:12px 0 16px; line-height:1.1; }
  .hm-report p { font-size:16px; color:rgba(255,255,255,.78); line-height:1.65; }
  .hm-rlist { list-style:none; display:flex; flex-direction:column; gap:14px; }
  .hm-rlist li { display:flex; gap:12px; align-items:flex-start; font-size:15px; color:rgba(255,255,255,.9); }
  .hm-rtick { width:24px; height:24px; border-radius:99px; background:var(--gold); color:var(--ink); display:grid; place-items:center; flex:none; margin-top:1px; }

  /* cta band */
  .hm-cta { text-align:center; padding:80px 0; }
  .hm-cta h2 { font-family:'Fraunces',serif; font-size:40px; font-weight:500; letter-spacing:-.7px; margin-bottom:14px; }
  .hm-cta p { font-size:17px; color:var(--muted); margin-bottom:30px; }
  .hm-ctabtns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .hm-btn.dark { background:var(--ink); color:#fff; }
  .hm-btn.dark:hover { background:var(--navy); }
  .hm-btn.outline { background:transparent; border:1.5px solid var(--line); color:var(--ink); }
  .hm-btn.outline:hover { border-color:var(--ink); }

  /* footer */
  .hm-foot { background:var(--ink); color:#fff; padding:56px 0 30px; }
  .hm-footgrid { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:40px; padding-bottom:40px; border-bottom:1px solid rgba(255,255,255,.12); }
  @media (max-width:720px){ .hm-footgrid{ grid-template-columns:1fr; gap:28px; } }
  .hm-foot .blurb { font-size:14px; color:rgba(255,255,255,.6); line-height:1.65; margin-top:14px; max-width:330px; }
  .hm-foot h4 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:rgba(255,255,255,.45); margin-bottom:16px; }
  .hm-foot ul { list-style:none; display:flex; flex-direction:column; gap:11px; }
  .hm-foot ul a { color:rgba(255,255,255,.82); text-decoration:none; font-size:14.5px; cursor:pointer; }
  .hm-foot ul a:hover { color:var(--gold); }
  .hm-footbottom { display:flex; justify-content:space-between; align-items:center; padding-top:24px; font-size:13px; color:rgba(255,255,255,.5); flex-wrap:wrap; gap:10px; }
  `;

  const Tooth = () => (
    <svg viewBox="0 0 120 120" width="150" height="150" fill="none">
      <path d="M60 22c-14-9-30-8-37 3-6 9-3 22 1 36 3 11 4 23 9 33 3 6 11 6 13-1l6-21c1-4 7-4 8 0l6 21c2 7 10 7 13 1 5-10 6-22 9-33 4-14 7-27 1-36-7-11-23-12-37-3z" stroke="#e7ae3b" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 40c4-4 12-5 16-2M76 40c-4-4-12-5-16-2" stroke="#e7ae3b" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  );
  const Tick = () => (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  const ic = {
    bolt: <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>,
    report: <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M7 3h7l5 5v13H7zM14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M10 13h6M10 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
    lock: <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" /></svg>,
    cal: <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  };
  const Arrow = () => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

  return (
    <div className="hm">
      <style>{css}</style>

      {/* NAV */}
      <nav className={"hm-nav " + (solid ? "solid" : "")}>
        <div className="hm-wrap hm-navin">
          <HmLockup />
          <div className="hm-navlinks">
            <a>How it works</a><a>Reporting</a><a>For practices</a><a>Contact</a>
          </div>
          <div className="hm-navcta">
            <button className="hm-signin" onClick={onSignIn}>Sign in</button>
            <button className="hm-btn gold sm" onClick={onRefer}>Refer a patient</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hm-hero">
        <div className="hm-wrap hm-herogrid">
          <div>
            <span className="hm-kicker">● Yorkshire CBCT scanning centre</span>
            <h1 className="hm-h1">Specialist CBCT scanning, <em>simple</em> for your practice.</h1>
            <p className="hm-lede">Refer online, we scan your patient, and you get the images back fast — with an optional consultant report. Built around how your practice actually works.</p>
            <div className="hm-heroctas">
              <button className="hm-btn gold lg" onClick={onRefer}>Refer a patient <Arrow /></button>
              <button className="hm-btn ghost lg" onClick={onSignIn}>Practice sign in</button>
            </div>
            <div className="hm-trust">Reported by a <b>GDC-registered consultant</b> in Dental &amp; Maxillofacial Radiology.</div>
          </div>

          <div className="hm-visual">
            <div className="hm-pcard">
              <div className="hm-pbar"><span className="hm-pdot" /><span className="hm-pdot" /><span className="hm-pdot" /></div>
              <div className="hm-scan"><Tooth /><span className="hm-scanlbl">CBCT · single jaw</span></div>
              <div className="hm-prow">
                <span className="hm-pico">{ic.report}</span>
                <div><div className="hm-pt">Consultant report</div><div className="hm-pd">Mrs J. Carter · single jaw</div></div>
                <span className="hm-ppill">Ready</span>
              </div>
            </div>
            <div className="hm-float"><div className="n">48hr</div><div className="l">typical report<br />turnaround</div></div>
          </div>
        </div>
      </header>

      {/* VALUE PROPS */}
      <section className="hm-props">
        <div className="hm-wrap hm-props-grid">
          <div className="hm-prop"><div className="ic">{ic.bolt}</div><h3>Fast turnaround</h3><p>Images ready as soon as your patient's scanned, with reports back in days, not weeks.</p></div>
          <div className="hm-prop"><div className="ic">{ic.report}</div><h3>Specialist reports</h3><p>Optional consultant reporting with annotated key images — clear, clinical, and easy to act on.</p></div>
          <div className="hm-prop"><div className="ic">{ic.lock}</div><h3>Secure UK storage</h3><p>Every scan stored safely in the UK and ready to download whenever you need it.</p></div>
          <div className="hm-prop"><div className="ic">{ic.cal}</div><h3>Effortless booking</h3><p>Book the patient at referral, or let them choose and pay for their own slot online.</p></div>
        </div>
      </section>

      {/* DEMO VIEWER */}
      <section className="hm-demo">
        <div className="hm-wrap">
          <div className="hm-eyebrow">See it in action</div>
          <h2 className="hm-sech2">Take the viewer for a spin</h2>
          <p className="hm-secsub">The same quick-look viewer your dentists get. Drag across the scan to move through the slices, switch planes, or press play. (A demo scan — not a real patient.)</p>
          <div className="hm-demowrap"><DemoViewer /></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="hm-sec">
        <div className="hm-wrap">
          <div className="hm-eyebrow">How it works</div>
          <h2 className="hm-sech2">Three steps, no faff</h2>
          <p className="hm-secsub">From referral to report, the whole thing is designed to take minutes of your time — not an afternoon.</p>
          <div className="hm-steps">
            <div className="hm-step"><div className="hm-stepn">1</div><h3>Refer online</h3><p>Tell us the patient and what you need. A couple of minutes and it's done — no phone calls, no forms to post.</p></div>
            <div className="hm-step"><div className="hm-stepn">2</div><h3>We scan &amp; book</h3><p>Choose a slot there and then, or send your patient a link to book and pay for their own. We take it from there.</p></div>
            <div className="hm-step"><div className="hm-stepn">3</div><h3>Download &amp; report</h3><p>Grab the images the moment they're ready, with an optional consultant report attached to the same record.</p></div>
          </div>
        </div>
      </section>

      {/* REPORTING BAND */}
      <section className="hm-wrap" style={{ paddingBottom: 70 }}>
        <div className="hm-report">
          <div>
            <div className="eb">Reporting</div>
            <h2>Reports you can act on with confidence.</h2>
            <p>Every report is produced by a UK-based, GDC-registered consultant in Dental and Maxillofacial Radiology — the same specialist each time, who'll tailor the report to how your practice likes to work.</p>
          </div>
          <ul className="hm-rlist">
            <li><span className="hm-rtick"><Tick /></span> Annotated key images with every report</li>
            <li><span className="hm-rtick"><Tick /></span> Clear, concise, clinically useful</li>
            <li><span className="hm-rtick"><Tick /></span> Typical turnaround within 48 hours</li>
            <li><span className="hm-rtick"><Tick /></span> Priced per scan, no surprises</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="hm-cta">
        <div className="hm-wrap">
          <h2>Ready to refer?</h2>
          <p>Send your first patient in a couple of minutes.</p>
          <div className="hm-ctabtns">
            <button className="hm-btn dark lg" onClick={onRefer}>Refer a patient <Arrow /></button>
            <button className="hm-btn outline lg" onClick={onSignIn}>Practice sign in</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hm-foot">
        <div className="hm-wrap">
          <div className="hm-footgrid">
            <div>
              <HmLockup />
              <p className="blurb">A Yorkshire CBCT scanning centre for dental practices — specialist imaging, consultant reporting, and a portal built around your day.</p>
            </div>
            <div>
              <h4>Service</h4>
              <ul><li><a onClick={onRefer}>Refer a patient</a></li><li><a>How it works</a></li><li><a>Reporting</a></li><li><a onClick={onSignIn}>Practice sign in</a></li></ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul><li><a>hello@mycbct.co.uk</a></li><li><a>Yorkshire</a></li><li><a>Are you a patient?</a></li></ul>
            </div>
          </div>
          <div className="hm-footbottom"><span>© {new Date().getFullYear()} MyCBCT · part of 360 Visualise</span><span>Privacy · Terms</span></div>
        </div>
      </footer>
    </div>
  );
}
