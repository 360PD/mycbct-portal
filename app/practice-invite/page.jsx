// Staff-only: introduce the scanning centre to nearby practices.
//
// Seventeen local practices, one email each, sent as Rachel with Rachel copied.
// Never a group send — the recipients must not see each other's addresses.
//
// Deliberately dull mechanics:
//   * every address is a row in practice_invites, so pressing Send twice can
//     never email anyone twice
//   * a failure is recorded against the address and shown, rather than
//     silently swallowed
//   * "Send a test to Rachel" exists so somebody reads the thing in a real
//     inbox before seventeen strangers do
//
// Read the preview before you press anything. It quotes prices and a report
// turnaround time to people who don't know us yet.

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

const PRACTICES = [
  "emergency@urgentcaredental.co.uk",
  "info@raynerdental.co.uk",
  "info@honestydentalcare.co.uk",
  "bingley@bupadentalcare.co.uk",
  "keighley@bupadentalcare.co.uk",
  "info@plumdentalfacial.co.uk",
  "keighley-rec@mydentist.co.uk",
  "smile@tayloreddentalcare.co.uk",
  "thorntonreception@carholmedentalgroup.co.uk",
  "enquiries@barkhilldental.com",
  "greengatesreception@carholmedentalgroup.co.uk",
  "info@rdentalclinic.co.uk",
  "info@heatondentalcare.com",
  "allertonreception@carholmedentalgroup.co.uk",
  "clayton.dentalpractice@nhs.net",
  "contact@pearldentalqueensbury.co.uk",
];

// Personal address rather than a practice mailbox — marketing rules treat a
// sole trader as an individual, who has to have agreed first. Left out on
// purpose. Add it below only if Pete confirms he knows them.
const HELD_BACK = ["kshunjan@hotmail.co.uk"];

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

export default async function PracticeInvitePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const note = sp.note ? String(sp.note) : "";

  const supabase = await createClient();
  const staffId = await requireStaff(supabase);
  if (!staffId) redirect("/dashboard");

  // Make sure every address has a row, without disturbing ones already sent.
  await supabase
    .from("practice_invites")
    .upsert(
      PRACTICES.map((email) => ({ email })),
      { onConflict: "email", ignoreDuplicates: true }
    );

  const { data: rows } = await supabase
    .from("practice_invites")
    .select("email, sent_at, send_error")
    .in("email", PRACTICES)
    .order("email");

  const list = PRACTICES.map(
    (email) =>
      (rows || []).find((r) => r.email === email) || {
        email,
        sent_at: null,
        send_error: null,
      }
  );

  const waiting = list.filter((r) => !r.sent_at);
  const sent = list.filter((r) => r.sent_at);
  const failed = list.filter((r) => !r.sent_at && r.send_error);

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
      .in("email", PRACTICES)
      .is("sent_at", null);

    let ok = 0;
    const problems = [];

    for (const row of pending || []) {
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
            : `Sent ${ok} introductions. Rachel is copied on every one.`
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
          {CENTRE.contactEmail}, with her copied in. Nobody sees anybody else&rsquo;s
          address. An address that has been sent to can never be sent to again.
        </p>

        {note ? <div className="pi-note">{note}</div> : null}

        <div className="pi-check">
          <p className="pi-check-t">Read these before you send</p>
          <ul>
            <li>
              Report turnaround is quoted as{" "}
              <strong>{CENTRE.reportTurnaround}</strong> — is that right?
            </li>
            <li>
              Signed off as <strong>{CENTRE.contactName}</strong> with no surname
              or job title.
            </li>
            <li>
              Prices quoted: OPG £65, small £125, single jaw £149, dual jaw £199,
              report from £105.
            </li>
            <li>
              <strong>{HELD_BACK.join(", ")}</strong> is held back — it&rsquo;s a
              personal address, not a practice one.
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
                ? "All sent"
                : `Send to ${waiting.length} practice${waiting.length === 1 ? "" : "s"}`}
            </button>
          </form>
        </div>

        <h2 className="pi-h2">
          Recipients <span className="pi-count">{sent.length} of {list.length} sent</span>
        </h2>
        <div className="pi-list">
          {list.map((r) => (
            <div className="pi-row" key={r.email}>
              <span className="pi-mail">{r.email}</span>
              {r.sent_at ? (
                <span className="pi-tag ok">Sent {fmtWhen(r.sent_at)}</span>
              ) : r.send_error ? (
                <span className="pi-tag bad">{r.send_error}</span>
              ) : (
                <span className="pi-tag">Not sent</span>
              )}
            </div>
          ))}
          {HELD_BACK.map((email) => (
            <div className="pi-row held" key={email}>
              <span className="pi-mail">{email}</span>
              <span className="pi-tag">Held back — personal address</span>
            </div>
          ))}
        </div>

        <h2 className="pi-h2">Preview</h2>
        <p className="pi-sub">Subject: {INVITE_SUBJECT}</p>
        <iframe className="pi-frame" title="Email preview" srcDoc={preview} />

        {failed.length ? (
          <p className="pi-sub">
            Failures usually mean the sending domain isn&rsquo;t verified in
            Resend. 360v.co.uk has to be added there before Rachel&rsquo;s
            address can send.
          </p>
        ) : null}
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
        .pi-count{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;
          font-weight:600;color:rgba(247,244,236,.5);margin-left:10px;}
        .pi-lead{margin:0 0 22px;font-size:16px;line-height:1.65;
          color:rgba(247,244,236,.75);}
        .pi-sub{font-size:13px;color:rgba(247,244,236,.5);margin:0 0 12px;}
        .pi-note{background:rgba(224,164,59,.14);border:1px solid rgba(224,164,59,.5);
          border-radius:12px;padding:14px 18px;margin:0 0 22px;font-weight:600;
          color:#E9C179;}
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
        .pi-btn.ghost:hover{border-color:#E0A43B;color:#E0A43B;}
        .pi-list{border:1px solid rgba(255,255,255,.12);border-radius:12px;
          overflow:hidden;}
        .pi-row{display:flex;justify-content:space-between;align-items:center;gap:14px;
          padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;}
        .pi-row:last-child{border-bottom:none;}
        .pi-row.held{opacity:.55;}
        .pi-mail{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;}
        .pi-tag{font-size:11.5px;font-weight:700;letter-spacing:.06em;
          text-transform:uppercase;color:rgba(247,244,236,.5);white-space:nowrap;}
        .pi-tag.ok{color:#4ecfa0;}
        .pi-tag.bad{color:#e58c7d;text-transform:none;letter-spacing:0;font-weight:600;}
        .pi-frame{width:100%;height:900px;border:1px solid rgba(255,255,255,.12);
          border-radius:12px;background:#EFE9DC;}
        @media(max-width:560px){
          .pi-h1{font-size:27px;}
          .pi-row{flex-direction:column;align-items:flex-start;gap:4px;}
        }
      `}</style>
    </main>
  );
}
