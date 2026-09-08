// Staff-only: introduce the scanning centre to nearby practices.
//
// v2 — the list lives in the database, and you can add to it from the page.
// The original seventeen were hardcoded, which meant every new practice you
// discovered needed a developer. Now paste addresses in, press send, done.
//
// One email each, sent as Rachel with Rachel copied. Never a group send — the
// recipients must not see each other's addresses.
//
// Deliberately dull mechanics:
//   * every address is a row in practice_invites, so pressing Send twice can
//     never email anyone twice
//   * a failure is recorded against the address and shown, rather than
//     silently swallowed
//   * an address that has been written to can't be deleted — that record is
//     the answer to "who did we contact?" in six months
//   * "Send a test to Rachel" exists so somebody reads the thing in a real
//     inbox before strangers do

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CENTRE,
  INVITE_SUBJECT,
  inviteHtml,
  sendPracticeInvite,
} from "@/lib/emails/send-practice-invite";

export const dynamic = "force-dynamic";

async function requireStaff(supabase) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const role = me?.role;
  if (role !== "staff" && role !== "admin") return null;
  return claims.sub;
}

function fmtWhen(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Pull addresses out of whatever gets pasted in — one per line, separated by
// commas, wrapped in <angle brackets>, or copied as a mailto: link.
function parseAddresses(raw) {
  const out = [];
  const seen = new Set();

  for (const chunk of String(raw || "").split(/[\s,;<>()\[\]"']+/)) {
    let email = chunk.trim().toLowerCase();
    if (!email) continue;
    email = email.replace(/^mailto:/, "");
    // Deliberately loose: something@something.something, no spaces.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }

  return out;
}

export default async function PracticeInvitePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const note = sp.note ? String(sp.note) : "";

  const supabase = await createClient();
  const staffId = await requireStaff(supabase);
  if (!staffId) redirect("/dashboard");

  const { data: rows } = await supabase
    .from("practice_invites")
    .select("email, practice_name, sent_at, send_error")
    .order("sent_at", { ascending: true, nullsFirst: true })
    .order("email");

  const list = rows || [];
  const waiting = list.filter((r) => !r.sent_at);
  const sent = list.filter((r) => r.sent_at);

  // ---------- Add addresses ----------
  async function addAddresses(formData) {
    "use server";
    const supabase = await createClient();
    if (!(await requireStaff(supabase))) redirect("/dashboard");

    const emails = parseAddresses(formData.get("emails"));
    const practiceName = String(formData.get("practice_name") || "").trim();

    if (!emails.length) {
      redirect(
        "/practice-invite?note=" +
          encodeURIComponent(
            "No usable email addresses in that. Paste them one per line, or separated by commas."
          )
      );
    }

    // Which of these do we already know about? Told apart so the message is
    // honest about what actually happened.
    const { data: existing } = await supabase
      .from("practice_invites")
      .select("email")
      .in("email", emails);

    const known = new Set((existing || []).map((r) => r.email));
    const fresh = emails.filter((e) => !known.has(e));

    if (fresh.length) {
      await supabase.from("practice_invites").insert(
        fresh.map((email) => ({
          email,
          practice_name: practiceName || null,
        }))
      );
    }

    const already = emails.length - fresh.length;
    revalidatePath("/practice-invite");
    redirect(
      "/practice-invite?note=" +
        encodeURIComponent(
          `Added ${fresh.length}.` +
            (already
              ? ` ${already} ${already === 1 ? "was" : "were"} already on the list.`
              : "")
        )
    );
  }

  // ---------- Remove one that hasn't been written to ----------
  async function removeAddress(formData) {
    "use server";
    const supabase = await createClient();
    if (!(await requireStaff(supabase))) redirect("/dashboard");

    const email = String(formData.get("email") || "").trim();
    if (!email) redirect("/practice-invite");

    // is("sent_at", null) is the safety catch: a practice we've written to
    // stays on the record whatever anyone clicks.
    await supabase
      .from("practice_invites")
      .delete()
      .eq("email", email)
      .is("sent_at", null);

    revalidatePath("/practice-invite");
    redirect(
      "/practice-invite?note=" + encodeURIComponent(`Removed ${email}.`)
    );
  }

  // ---------- Send one to Rachel, so somebody reads it first ----------
  async function sendTest() {
    "use server";
    const supabase = await createClient();
    if (!(await requireStaff(supabase))) redirect("/dashboard");

    const result = await sendPracticeInvite(CENTRE.contactEmail);
    redirect(
      "/practice-invite?note=" +
        encodeURIComponent(
          result.ok
            ? `Test sent to ${CENTRE.contactEmail}. Read it before sending to anybody else.`
            : `Test failed: ${result.error}`
        )
    );
  }

  // ---------- Send to everyone not yet contacted ----------
  async function sendAll() {
    "use server";
    const supabase = await createClient();
    if (!(await requireStaff(supabase))) redirect("/dashboard");

    const { data: pending } = await supabase
      .from("practice_invites")
      .select("email")
      .is("sent_at", null);

    if (!pending?.length) {
      redirect(
        "/practice-invite?note=" +
          encodeURIComponent("Nobody is waiting — everyone on the list has had one.")
      );
    }

    let ok = 0;
    const problems = [];

    for (const row of pending) {
      const result = await sendPracticeInvite(row.email);

      if (result.ok) {
        ok += 1;
        await supabase
          .from("practice_invites")
          .update({ sent_at: new Date().toISOString(), send_error: null })
          .eq("email", row.email);
      } else {
        problems.push(row.email);
        await supabase
          .from("practice_invites")
          .update({ send_error: result.error || "failed" })
          .eq("email", row.email);
      }

      // Gentle on Resend's rate limit.
      await new Promise((r) => setTimeout(r, 600));
    }

    revalidatePath("/practice-invite");
    redirect(
      "/practice-invite?note=" +
        encodeURIComponent(
          problems.length
            ? `Sent ${ok}. ${problems.length} failed — see the list below.`
            : `Sent ${ok} introduction${ok === 1 ? "" : "s"}. Rachel is copied on every one.`
        )
    );
  }

  const preview = inviteHtml();

  return (
    <main className="pi">
      <div className="pi-inner">
        <p className="pi-eyebrow">Practice outreach</p>
        <h1 className="pi-h1">Introduce the scanning centre</h1>
        <p className="pi-lead">
          One email each, sent as {CENTRE.contactName} from{" "}
          {CENTRE.contactEmail}, with her copied in. Nobody sees anybody
          else&rsquo;s address. An address that has been sent to can never be
          sent to again.
        </p>

        {note ? <div className="pi-note">{note}</div> : null}

        {/* ---- add ---- */}
        <div className="pi-add">
          <h2 className="pi-h2 tight">Add practices</h2>
          <p className="pi-sub">
            Paste as many as you like — one per line, or separated by commas.
            Anything already on the list is ignored.
          </p>
          <form action={addAddresses}>
            <textarea
              className="pi-textarea"
              name="emails"
              rows={4}
              placeholder={"info@examplepractice.co.uk\nreception@another.co.uk"}
            />
            <div className="pi-addrow">
              <input
                className="pi-input"
                name="practice_name"
                placeholder="Practice name (optional)"
              />
              <button className="pi-btn" type="submit">
                Add to the list
              </button>
            </div>
          </form>
        </div>

        <div className="pi-check">
          <p className="pi-check-t">Read these before you send</p>
          <ul>
            <li>
              Report turnaround is quoted as{" "}
              <strong>{CENTRE.reportTurnaround}</strong>.
            </li>
            <li>
              Signed off as <strong>{CENTRE.contactName}</strong>, from{" "}
              {CENTRE.contactEmail}.
            </li>
            <li>
              Prices quoted: OPG £65, small £125, single jaw £149, dual jaw £199,
              report from £105.
            </li>
            <li>
              Personal addresses (someone&rsquo;s Gmail or Hotmail rather than a
              practice mailbox) should only go on here if you know them —
              marketing rules treat a sole trader as an individual.
            </li>
          </ul>
        </div>

        <div className="pi-actions">
          <form action={sendTest}>
            <button className="pi-btn ghost" type="submit">
              Send a test to {CENTRE.contactEmail}
            </button>
          </form>
          <form action={sendAll}>
            <button className="pi-btn" type="submit" disabled={waiting.length === 0}>
              {waiting.length === 0
                ? "Nobody waiting"
                : `Send to ${waiting.length} practice${waiting.length === 1 ? "" : "s"}`}
            </button>
          </form>
        </div>

        {/* ---- waiting ---- */}
        <h2 className="pi-h2">
          Waiting <span className="pi-count">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="pi-sub">
            Nobody. Add some above and they&rsquo;ll appear here before anything
            is sent.
          </p>
        ) : (
          <div className="pi-list">
            {waiting.map((r) => (
              <div className="pi-row" key={r.email}>
                <span className="pi-mail">
                  {r.email}
                  {r.practice_name ? (
                    <span className="pi-name">{r.practice_name}</span>
                  ) : null}
                </span>
                <span className="pi-right">
                  {r.send_error ? (
                    <span className="pi-tag bad">{r.send_error}</span>
                  ) : (
                    <span className="pi-tag">Not sent</span>
                  )}
                  <form action={removeAddress}>
                    <input type="hidden" name="email" value={r.email} />
                    <button className="pi-x" type="submit" title="Remove">
                      Remove
                    </button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---- sent ---- */}
        <h2 className="pi-h2">
          Already written to <span className="pi-count">{sent.length}</span>
        </h2>
        <div className="pi-list">
          {sent.map((r) => (
            <div className="pi-row" key={r.email}>
              <span className="pi-mail">
                {r.email}
                {r.practice_name ? (
                  <span className="pi-name">{r.practice_name}</span>
                ) : null}
              </span>
              <span className="pi-tag ok">Sent {fmtWhen(r.sent_at)}</span>
            </div>
          ))}
          {sent.length === 0 ? (
            <div className="pi-row">
              <span className="pi-tag">Nobody yet</span>
            </div>
          ) : null}
        </div>

        <h2 className="pi-h2">Preview</h2>
        <p className="pi-sub">Subject: {INVITE_SUBJECT}</p>
        <iframe className="pi-frame" title="Email preview" srcDoc={preview} />
      </div>

      <style>{`
        .pi{min-height:100vh;background:#0E1E30;color:#F7F4EC;padding:40px 20px 80px;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
        .pi-inner{max-width:820px;margin:0 auto;}
        .pi-eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;
          color:#E0A43B;font-weight:700;margin:0 0 8px;}
        .pi-h1{font-family:'Fraunces',Georgia,serif;font-size:34px;margin:0 0 12px;
          font-weight:600;}
        .pi-h2{font-family:'Fraunces',Georgia,serif;font-size:22px;margin:38px 0 12px;
          font-weight:600;}
        .pi-h2.tight{margin:0 0 6px;}
        .pi-count{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;
          font-weight:600;color:rgba(247,244,236,.5);margin-left:10px;}
        .pi-lead{margin:0 0 22px;font-size:16px;line-height:1.65;
          color:rgba(247,244,236,.75);}
        .pi-sub{font-size:13px;color:rgba(247,244,236,.5);margin:0 0 12px;
          line-height:1.55;}
        .pi-note{background:rgba(224,164,59,.14);border:1px solid rgba(224,164,59,.5);
          border-radius:12px;padding:14px 18px;margin:0 0 22px;font-weight:600;
          color:#E9C179;}
        .pi-add{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);
          border-radius:14px;padding:20px 22px;margin:0 0 24px;}
        .pi-textarea{width:100%;box-sizing:border-box;background:#0B1A2B;
          border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#F7F4EC;
          font:inherit;font-size:14px;padding:12px 14px;resize:vertical;
          font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
        .pi-textarea:focus,.pi-input:focus{outline:2px solid #E0A43B;outline-offset:1px;}
        .pi-addrow{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;}
        .pi-input{flex:1;min-width:200px;box-sizing:border-box;background:#0B1A2B;
          border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#F7F4EC;
          font:inherit;font-size:14px;padding:12px 14px;}
        .pi-check{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);
          border-left:4px solid #E0A43B;border-radius:12px;padding:18px 22px;margin:0 0 24px;}
        .pi-check-t{margin:0 0 10px;font-size:12px;letter-spacing:.12em;
          text-transform:uppercase;color:#E0A43B;font-weight:700;}
        .pi-check ul{margin:0;padding-left:20px;}
        .pi-check li{margin:0 0 8px;font-size:15px;line-height:1.55;
          color:rgba(247,244,236,.8);}
        .pi-check li:last-child{margin-bottom:0;}
        .pi-actions{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 8px;}
        .pi-btn{appearance:none;border:none;cursor:pointer;font:inherit;font-size:16px;
          font-weight:700;background:#E0A43B;color:#12263C;border-radius:12px;
          padding:14px 24px;}
        .pi-btn:hover{background:#EFB765;}
        .pi-btn:disabled{background:rgba(255,255,255,.14);color:rgba(247,244,236,.45);
          cursor:default;}
        .pi-btn.ghost{background:transparent;color:#F7F4EC;
          border:1px solid rgba(255,255,255,.28);}
        .pi-btn.ghost:hover{border-color:#E0A43B;color:#E0A43B;background:transparent;}
        .pi-list{border:1px solid rgba(255,255,255,.12);border-radius:12px;
          overflow:hidden;}
        .pi-row{display:flex;justify-content:space-between;align-items:center;gap:14px;
          padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;}
        .pi-row:last-child{border-bottom:none;}
        .pi-mail{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;}
        .pi-name{display:block;font-family:'DM Sans',system-ui,sans-serif;
          font-size:12px;color:rgba(247,244,236,.45);margin-top:3px;}
        .pi-right{display:flex;align-items:center;gap:12px;}
        .pi-tag{font-size:11.5px;font-weight:700;letter-spacing:.06em;
          text-transform:uppercase;color:rgba(247,244,236,.5);white-space:nowrap;}
        .pi-tag.ok{color:#4ecfa0;}
        .pi-tag.bad{color:#e58c7d;text-transform:none;letter-spacing:0;font-weight:600;}
        .pi-x{appearance:none;background:none;border:none;cursor:pointer;
          font:inherit;font-size:12px;color:rgba(247,244,236,.4);
          text-decoration:underline;padding:0;}
        .pi-x:hover{color:#e58c7d;}
        .pi-frame{width:100%;height:900px;border:1px solid rgba(255,255,255,.12);
          border-radius:12px;background:#EFE9DC;}
        @media(max-width:560px){
          .pi-h1{font-size:27px;}
          .pi-row{flex-direction:column;align-items:flex-start;gap:6px;}
        }
      `}</style>
    </main>
  );
}
