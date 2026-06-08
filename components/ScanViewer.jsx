"use client";

import { useEffect, useRef, useState } from "react";

const PLANE_ORDER = ["axial", "coronal", "sagittal"];
const PLANE_LABEL = { axial: "Axial", coronal: "Coronal", sagittal: "Sagittal" };

export default function ScanViewer({ scanId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planes, setPlanes] = useState(null);
  const [active, setActive] = useState("axial");
  const [index, setIndex] = useState(0);

  const stageRef = useRef(null);
  const countRef = useRef(0);

  // Load the manifest of signed frame URLs once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/scans/" + scanId + "/preview")
      .then(async (res) => {
        if (!res.ok) throw new Error("not ready");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const got = data.planes || {};
        const first = PLANE_ORDER.find((p) => got[p] && got[p].frames && got[p].frames.length);
        if (!first) throw new Error("empty");
        setPlanes(got);
        setActive(first);
        setIndex(0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Preview couldn't be loaded.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  const plane = planes ? planes[active] : null;
  const frames = plane && plane.frames ? plane.frames : [];
  const count = frames.length;
  countRef.current = count;

  // Preload the active plane's frames so scrubbing is smooth.
  useEffect(() => {
    if (!frames.length) return;
    const preloaded = frames.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });
    return () => {
      preloaded.length = 0;
    };
  }, [active, planes]);

  // Move through the stack, clamped against the live frame count.
  function step(delta) {
    setIndex((i) => {
      const max = countRef.current - 1;
      const n = i + delta;
      if (n < 0) return 0;
      if (n > max) return max;
      return n;
    });
  }

  // Mouse-wheel scrubbing. Bound directly so we can stop the page scrolling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  }

  function switchPlane(name) {
    setActive(name);
    setIndex(0);
  }

  if (loading) {
    return (
      <div className="sv">
        <div className="sv-msg">
          <span className="sv-spin" /> Loading preview&hellip;
        </div>
        <ViewerStyle />
      </div>
    );
  }

  if (error || !plane) {
    return (
      <div className="sv">
        <p className="sv-msg sv-muted">
          Preview couldn&rsquo;t be loaded. You can still use Download above.
        </p>
        <ViewerStyle />
      </div>
    );
  }

  const available = PLANE_ORDER.filter((p) => planes[p] && planes[p].frames && planes[p].frames.length);

  return (
    <div className="sv">
      <div className="sv-tabs" role="tablist">
        {available.map((name) => (
          <button
            key={name}
            type="button"
            className={"sv-tab" + (name === active ? " is-active" : "")}
            onClick={() => switchPlane(name)}
          >
            {PLANE_LABEL[name]}
          </button>
        ))}
      </div>

      <div
        className="sv-stage"
        ref={stageRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={PLANE_LABEL[active] + " view, frame " + (index + 1) + " of " + count}
      >
        {frames[index] ? (
          <img
            className="sv-img"
            src={frames[index]}
            alt={PLANE_LABEL[active] + " frame " + (index + 1)}
            draggable={false}
          />
        ) : null}
      </div>

      <div className="sv-controls">
        <input
          className="sv-range"
          type="range"
          min={0}
          max={count > 0 ? count - 1 : 0}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Scrub through slices"
        />
        <span className="sv-count">
          {index + 1} / {count}
        </span>
      </div>

      <p className="sv-hint">Drag the slider, scroll, or use the arrow keys to move through the slices.</p>

      <ViewerStyle />
    </div>
  );
}

function ViewerStyle() {
  return (
    <style>{`
      .sv{margin-top:6px;}
      .sv-tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;}
      .sv-tab{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;font-weight:600;
        letter-spacing:.02em;color:rgba(247,244,236,.7);cursor:pointer;
        background:rgba(247,244,236,.06);border:1px solid rgba(247,244,236,.12);
        border-radius:999px;padding:7px 16px;transition:all .15s ease;}
      .sv-tab:hover{color:#f7f4ec;background:rgba(247,244,236,.1);}
      .sv-tab.is-active{color:#0e1b2e;background:#e7ae3b;border-color:#e7ae3b;}
      .sv-stage{position:relative;display:flex;align-items:center;justify-content:center;
        background:#0a1422;border:1px solid rgba(247,244,236,.1);border-radius:12px;
        min-height:320px;max-height:62vh;overflow:hidden;outline:none;cursor:ns-resize;}
      .sv-stage:focus-visible{border-color:rgba(231,174,59,.6);}
      .sv-img{display:block;max-width:100%;max-height:62vh;object-fit:contain;
        user-select:none;-webkit-user-drag:none;}
      .sv-controls{display:flex;align-items:center;gap:14px;margin-top:14px;}
      .sv-range{flex:1;accent-color:#e7ae3b;cursor:pointer;}
      .sv-count{flex:none;font-size:13px;font-variant-numeric:tabular-nums;
        color:rgba(247,244,236,.6);min-width:64px;text-align:right;}
      .sv-hint{margin:10px 0 0;font-size:12px;color:rgba(247,244,236,.4);}
      .sv-msg{display:flex;align-items:center;gap:10px;font-size:14px;
        color:rgba(247,244,236,.6);padding:18px 0;}
      .sv-muted{color:rgba(247,244,236,.5);}
      .sv-spin{width:15px;height:15px;border-radius:50%;
        border:2px solid rgba(247,244,236,.25);border-top-color:#e7ae3b;
        display:inline-block;animation:svspin .7s linear infinite;}
      @keyframes svspin{to{transform:rotate(360deg);}}
    `}</style>
  );
}
