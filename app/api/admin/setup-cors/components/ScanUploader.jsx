"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Uploads a scan file straight from the browser to Backblaze using a
// short-lived signed URL, then records it against the referral.
export default function ScanUploader({ referralId }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  function pick() {
    setError(null);
    if (inputRef.current) inputRef.current.click();
  }

  // PUT the file to Backblaze with a progress callback (XHR gives us progress).
  function putWithProgress(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload failed (" + xhr.status + ")"));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    setProgress(0);
    setError(null);

    try {
      // 1) Ask our server for a signed upload URL.
      const r1 = await fetch("/api/scans/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!r1.ok) {
        const j = await r1.json().catch(() => ({}));
        throw new Error(j.error || "Could not start upload");
      }
      const { uploadUrl, key } = await r1.json();

      // 2) Send the file straight to Backblaze.
      await putWithProgress(uploadUrl, file, setProgress);

      // 3) Record it against the referral.
      const r2 = await fetch("/api/scans/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId,
          key,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!r2.ok) {
        const j = await r2.json().catch(() => ({}));
        throw new Error(j.error || "Upload saved but could not be recorded");
      }

      setProgress(100);
      router.refresh(); // show the new scan in the list
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="su-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed,image/jpeg,image/png"
        onChange={onFile}
        style={{ display: "none" }}
      />

      <button type="button" className="su-btn" onClick={pick} disabled={busy}>
        {busy ? "Uploading\u2026" : "Upload a scan"}
      </button>

      {busy && (
        <div className="su-progress" aria-label="Upload progress">
          <div className="su-bar" style={{ width: progress + "%" }} />
          <span className="su-pct">{progress}%</span>
        </div>
      )}

      {fileName && !busy && !error && (
        <p className="su-note">Last file: {fileName}</p>
      )}

      {error && <p className="su-error">{error}</p>}

      <p className="su-hint">
        CBCT scans (.zip) or OPG images (.jpg). Large files are fine &mdash; they
        upload straight to secure storage.
      </p>

      <style>{`
        .su-wrap{margin-top:8px;}
        .su-btn{appearance:none;border:none;cursor:pointer;font-family:inherit;
          background:#e7ae3b;color:#1a1206;font-weight:600;font-size:15px;
          padding:12px 22px;border-radius:10px;transition:filter .15s ease;}
        .su-btn:hover{filter:brightness(1.05);}
        .su-btn:disabled{opacity:.6;cursor:default;}
        .su-progress{position:relative;margin-top:14px;height:10px;border-radius:6px;
          background:rgba(247,244,236,.12);overflow:hidden;max-width:420px;}
        .su-bar{position:absolute;inset:0 auto 0 0;background:#e7ae3b;
          transition:width .2s ease;}
        .su-pct{display:inline-block;margin-top:6px;font-size:12px;
          color:rgba(247,244,236,.6);}
        .su-note{margin-top:10px;font-size:13px;color:rgba(247,244,236,.6);}
        .su-error{margin-top:10px;font-size:14px;color:#ff9b9b;}
        .su-hint{margin-top:12px;font-size:13px;color:rgba(247,244,236,.45);
          max-width:480px;line-height:1.5;}
      `}</style>
    </div>
  );
}
