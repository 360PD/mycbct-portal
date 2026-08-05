"use client";
import { useEffect, useRef, useState } from "react";

// v1 — live fuzzy search bar for the top of the dashboard.
//
// Types ahead as you go, 200ms debounce, arrow keys + Enter to open a result,
// Escape to close. Fuzzy matching is done in Postgres (pg_trgm), so "montgomry"
// finds Rob Montgomery and "acorn dentl" finds Acorn Dental Clinic.
//
// Staff/admin only — the API route enforces that; this component is just the UI.

const KIND_LABEL = { dentist: "Dentist", practice: "Practice", patient: "Patient" };

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const seq = useRef(0);

  // Debounced fetch. Each request carries a sequence number so a slow earlier
  // response can never overwrite a newer one.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(term));
        const json = await res.json();
        if (mine !== seq.current) return;
        setResults(json.results || []);
        setActive(-1);
        setOpen(true);
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Click outside closes the dropdown.
  useEffect(() => {
    function onDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function onKeyDown(e) {
    if (e.key === "Escape") return setOpen(false);
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      window.location.href = results[active].href;
    }
  }

  const term = q.trim();
  const showEmpty = open && term.length >= 2 && !busy && results.length === 0;

  return (
    <div className="gs" ref={boxRef}>
      <style>{`
        .gs{position:relative;margin:0 0 28px;max-width:560px;}
        .gs-field{display:flex;align-items:center;gap:10px;background:rgba(247,244,236,.06);
          border:1px solid rgba(231,174,59,.28);border-radius:999px;padding:0 18px;}
        .gs-field:focus-within{border-color:#e7ae3b;background:rgba(247,244,236,.09);}
        .gs-ico{color:rgba(231,174,59,.7);font-size:15px;line-height:1;}
        .gs-in{flex:1;background:none;border:none;outline:none;color:#f7f4ec;
          font-family:inherit;font-size:15.5px;padding:13px 0;}
        .gs-in::placeholder{color:rgba(247,244,236,.4);}
        .gs-spin{width:14px;height:14px;border:2px solid rgba(231,174,59,.25);
          border-top-color:#e7ae3b;border-radius:50%;animation:gsspin .7s linear infinite;}
        @keyframes gsspin{to{transform:rotate(360deg);}}
        .gs-clear{background:none;border:none;color:rgba(247,244,236,.45);cursor:pointer;
          font-size:18px;line-height:1;padding:0 2px;}
        .gs-clear:hover{color:#e7ae3b;}
        .gs-pop{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:40;
          background:#13243b;border:1px solid rgba(231,174,59,.24);border-radius:14px;
          overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,.45);}
        .gs-item{display:flex;align-items:center;gap:12px;padding:11px 16px;
          border-bottom:1px solid rgba(247,244,236,.06);color:inherit;text-decoration:none;}
        .gs-item:last-child{border-bottom:none;}
        .gs-item:hover,.gs-item.on{background:rgba(231,174,59,.12);}
        .gs-kind{flex:none;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
          font-weight:700;padding:3px 8px;border-radius:999px;min-width:64px;text-align:center;}
        .gs-kind.dentist{background:rgba(231,174,59,.18);color:#e7ae3b;}
        .gs-kind.practice{background:rgba(120,180,231,.16);color:#8fc0ea;}
        .gs-kind.patient{background:rgba(247,244,236,.1);color:rgba(247,244,236,.65);}
        .gs-txt{min-width:0;}
        .gs-t{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .gs-s{font-size:12.5px;color:rgba(247,244,236,.5);white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;}
        .gs-none{padding:16px;color:rgba(247,244,236,.45);font-size:14px;}
        .gs-all{display:block;padding:10px 16px;text-align:center;font-size:13px;
          color:#e7ae3b;text-decoration:none;background:rgba(247,244,236,.04);}
        .gs-all:hover{background:rgba(231,174,59,.12);}
      `}</style>

      <div className="gs-field">
        <span className="gs-ico">⌕</span>
        <input
          className="gs-in"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search dentists, practices, patients…"
          autoComplete="off"
          aria-label="Search"
        />
        {busy && <span className="gs-spin" />}
        {!busy && q && (
          <button className="gs-clear" type="button" onClick={() => { setQ(""); setOpen(false); }}>
            ×
          </button>
        )}
      </div>

      {open && (results.length > 0 || showEmpty) && (
        <div className="gs-pop">
          {showEmpty && <div className="gs-none">Nothing found for &ldquo;{term}&rdquo;.</div>}
          {results.map((r, i) => (
            <a
              key={r.kind + r.title + i}
              className={"gs-item" + (i === active ? " on" : "")}
              href={r.href}
              onMouseEnter={() => setActive(i)}
            >
              <span className={"gs-kind " + r.kind}>{KIND_LABEL[r.kind] || r.kind}</span>
              <span className="gs-txt">
                <span className="gs-t">{r.title}</span>
                <span className="gs-s">{r.subtitle}</span>
              </span>
            </a>
          ))}
          {results.length > 0 && (
            <a className="gs-all" href={"/search?q=" + encodeURIComponent(term)}>
              See all results for &ldquo;{term}&rdquo;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
