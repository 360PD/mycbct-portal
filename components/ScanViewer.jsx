"use client";

import { useEffect, useRef, useState } from "react";

const PLANE_ORDER = ["axial", "coronal", "sagittal"];
const PLANE_LABEL = { axial: "Axial", coronal: "Coronal", sagittal: "Sagittal" };
const POLL_MS = 4000; // while a preview builds, re-check every 4s

export default function ScanViewer({ scanId }) {
  const [loading, setLoading] = useState(true);   // first request in flight
  const [preparing, setPreparing] = useState(false); // worker is building it
  const [error, setError] = useState("");          // "" | "failed" | "nopreview" | other
  const [planes, setPlanes] = useState(null);
  const [active, setActive] = useState("axial");
  const [index, setIndex] = useState(0);

  // Which frames of the ACTIVE plane have finished downloading (loaded) or
  // failed (errored), and which frame is actually on screen (shownIndex).
  // We only ever display a fully-loaded frame, and hold the previous one until
  // the next is ready - so scrubbing never flashes blank.
  const [loaded, setLoaded] = useState(() => new Set());
  const [errored, setErrored] = useState(() => new Set());
  const [shownIndex, setShownIndex] = useState(0);

  const stageRef = useRef(null);
  const countRef = useRef(0);

  // Load the manifest of signed frame URLs. If the scan isn't ready yet, the
  // route flips it to pending (the on-demand build) and we poll until it's done.
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    setLoading(true);
    setPreparing(false);
    setError("");
    setPlanes(null);

    async function attempt() {
      try {
        const res = await fetch("/api/scans/" + scanId + "/preview");

        if (res.status === 200) {
          const data = await res.json();
          if (cancelled) return;
          const got = data.planes || {};
          const first = PLANE_ORDER.find(
            (p) => got[p] && got[p].frames && got[p].frames.length
          );
          if (!first) throw new Error("empty");
          setPlanes(got);
          setActive(first);
          setIndex(0);
          setShownIndex(0);
          setPreparing(false);
          setLoading(false);
          return;
        }

        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          const st = data.status || "none";

          if (data.previewable === false) {
            // OPG or non-CBCT - no slice viewer for this one.
            setError("nopreview");
            setPreparing(false);
            setLoading(false);
            return;
          }
          if (st === "failed") {
            setError("failed");
            setPreparing(false);
            setLoading(false);
            return;
          }
          // none / pending / processing -> being built; show "preparing" and poll.
          setPreparing(true);
          setLoading(false);
          timer = setTimeout(attempt, POLL_MS);
          return;
        }

        throw new Error("bad status " + res.status);
      } catch (e) {
        if (cancelled) return;
        setError("load");
        setPreparing(false);
        setLoading(false);
      }
    }

    attempt();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  const plane = planes ? planes[active] : null;
  const frames = plane && plane.frames ? plane.frames : [];
  const count = frames.length;
  countRef.current = count;

  // When the active plane changes, download every frame in the background and
  // mark each as loaded (or errored) as it settles. Reset the sets first.
  useEffect(() => {
    if (!frames.length) return;
    let cancelled = false;
    setLoaded(new Set());
    setErrored(new Set());

    const imgs = frames.map((src, i) => {
      const im = new Image();
      im.onload = () => {
        if (cancelled) return;
        setLoaded((prev) => {
          const next = new Set(prev);
          next.add(i);
          return next;
        });
      };
      im.onerror = () => {
        if (cancelled) return;
        setErrored((prev) => {
          const next = new Set(prev);
          next.add(i);
          return next;
        });
      };
      im.src = src;
      return im;
    });

    return () => {
      cancelled = true;
      imgs.forEach((im) => {
        im.onload = null;
        im.onerror = null;
      });
    };
  }, [active, planes]);

  // Advance the on-screen frame to the target only once that target is loaded.
  // Until then, the previous frame stays put - no flash.
  useEffect(() => {
    if (loaded.has(index)) {
      setShownIndex(index);
    }
  }, [index, loaded]);

  const targetLoaded = loaded.has(index);
  const targetErrored = errored.has(index);
  const waiting = !targetLoaded && !targetErrored;
  const showImg = loaded.has(shownIndex) && !!frames[shownIndex];

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
  }, [planes]);

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
    setShownIndex(0);
  }

  // Non-CBCT scan: render nothing at all (the download link still shows above).
  if (error === "nopreview") {
    return null;
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

  // Being built on demand - first open of a historical scan.
  if (preparing) {
    return (
      <div className="sv">
        <div className="sv-prep">
          <span className="sv-spin" />
          <div>
            <p className="sv-prep-title">Preparing preview&hellip;</p>
            <p className="sv-prep-sub">
              This builds the first time a scan is opened and usually takes about a minute.
              It will appear here automatically &mdash; no need to refresh.
            </p>
          </div>
        </div>
        <ViewerStyle />
      </div>
    );
  }

  if (error === "failed") {
    return (
      <div className="sv">
        <p className="sv-msg sv-muted">
          The preview couldn&rsquo;t be built for this scan. You can still use Download above.
        </p>
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

  const available = PLANE_ORDER.filter(
    (p) => planes[p] && planes[p].frames && planes[p].frames.length
  );

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
        {showImg ? (
          <img
            className="sv-img"
            src={frames[shownIndex]}
            alt={PLANE_LABEL[active] + " frame " + (shownIndex + 1)}
            draggable={false}
          />
        ) : null}

        {waiting ? (
          <div className="sv-overlay">
            <span className="sv-spin" />
          </div>
        ) : null}

        {!waiting && targetErrored ? (
          <div className="sv-overlay sv-overlay-text">
            This preview link has expired. Refresh the page to reload it.
          </div>
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
      .sv-overlay{position:absolute;inset:0;display:flex;align-items:center;
        justify-content:center;background:rgba(10,20,34,.35);}
      .sv-overlay-text{background:rgba(10,20,34,.6);text-align:center;padding:0 24px;
        font-size:13px;color:rgba(247,244,236,.7);line-height:1.5;}
      .sv-overlay .sv-spin{width:22px;height:22px;border-width:3px;}
      .sv-controls{display:flex;align-items:center;gap:14px;margin-top:14px;}
      .sv-range{flex:1;accent-color:#e7ae3b;cursor:pointer;}
      .sv-count{flex:none;font-size:13px;font-variant-numeric:tabular-nums;
        color:rgba(247,244,236,.6);min-width:64px;text-align:right;}
      .sv-hint{margin:10px 0 0;font-size:12px;color:rgba(247,244,236,.4);}
      .sv-msg{display:flex;align-items:center;gap:10px;font-size:14px;
        color:rgba(247,244,236,.6);padding:18px 0;}
      .sv-muted{color:rgba(247,244,236,.5);}
      .sv-prep{display:flex;align-items:flex-start;gap:14px;
        background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.1);
        border-radius:12px;padding:18px 20px;}
      .sv-prep .sv-spin{width:20px;height:20px;border-width:3px;margin-top:2px;flex:none;}
      .sv-prep-title{margin:0 0 4px;font-size:15px;font-weight:600;color:#f7f4ec;}
      .sv-prep-sub{margin:0;font-size:13px;line-height:1.5;color:rgba(247,244,236,.55);}
      .sv-spin{width:15px;height:15px;border-radius:50%;
        border:2px solid rgba(247,244,236,.25);border-top-color:#e7ae3b;
        display:inline-block;animation:svspin .7s linear infinite;}
      @keyframes svspin{to{transform:rotate(360deg);}}
    `}</style>
  );
}
