import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Privileged client — needed to create the login, send the invite, and write
// the profile past row-level security. Server-only; the key never reaches the
// browser.
function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// Server action: creates the dentist and sends their invite.
async function addDentist(formData) {
  "use server";

  // Only staff/admin may do this.
  const supabase = await createClient();
  const { data: cd } = await supabase.auth.getClaims();
  const claims = cd?.claims;
  if (!claims) redirect("/sign-in");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const myRole = me?.role;
  if (myRole !== "staff" && myRole !== "admin") {
    redirect("/add-dentist?error=" + encodeURIComponent("Only staff can add dentists."));
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const practiceId = String(formData.get("practice_id") || "").trim();
  const newPractice = String(formData.get("new_practice") || "").trim();

  if (!fullName || !email) {
    redirect("/add-dentist?error=" + encodeURIComponent("Name and email are both required."));
  }
  if (!practiceId && !newPractice) {
    redirect("/add-dentist?error=" + encodeURIComponent("Choose an existing practice, or type a new one."));
  }

  const admin = adminClient();
  if (!admin) {
    redirect("/add-dentist?error=" + encodeURIComponent("Server is missing its service key."));
  }

  // Guard: refuse if this email already has an account, so we never collide
  // with an existing profile (e.g. your own admin login).
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    redirect(
      "/add-dentist?error=" +
        encodeURIComponent("An account already exists for that email. Use a different address.")
    );
  }

  // Resolve the practice: a typed new name wins; otherwise use the chosen one.
  let resolvedPracticeId = practiceId;
  if (newPractice) {
    const { data: p, error: pErr } = await admin
      .from("practices")
      .insert({ name: newPractice })
      .select("id")
      .single();
    if (pErr || !p) {
      redirect("/add-dentist?error=" + encodeURIComponent(pErr?.message || "Could not create the practice."));
    }
    resolvedPracticeId = p.id;
  }

  // Create the login and send the invite email in one step.
  const redirectTo = "https://mycbct-portal.vercel.app/auth/callback?next=/auth/set-password";
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (invErr || !invited?.user) {
    const msg = invErr?.message || "Could not send the invite.";
    redirect("/add-dentist?error=" + encodeURIComponent(msg));
  }

  // File their profile, linked to the practice.
  const { error: profErr } = await admin.from("profiles").insert({
    id: invited.user.id,
    role: "dentist",
    full_name: fullName,
    email,
    phone: phone || null,
    practice_id: resolvedPracticeId,
  });
  if (profErr) {
    redirect("/add-dentist?error=" + encodeURIComponent(profErr.message));
  }

  redirect("/add-dentist?ok=" + encodeURIComponent(fullName));
}

export default async function AddDentistPage({ searchParams }) {
  const sp = await searchParams;
  const ok = sp?.ok;
  const error = sp?.error;

  // Staff-only page.
  const supabase = await createClient();
  const { data: cd } = await supabase.auth.getClaims();
  const claims = cd?.claims;
  if (!claims) redirect("/sign-in?notice=" + encodeURIComponent("Please sign in."));
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const myRole = me?.role;
  if (myRole !== "staff" && myRole !== "admin") redirect("/dashboard");

  // Load practices for the picker.
  const admin = adminClient();
  let practices = [];
  if (admin) {
    const { data } = await admin
      .from("practices")
      .select("id,name")
      .order("name", { ascending: true });
    practices = data || [];
  }

  const label = { display: "block", fontSize: "13px", margin: "0 0 6px", color: "rgba(247,244,236,0.85)" };
  const input = {
    width: "100%",
    boxSizing: "border-box",
    background: "#0e1b2e",
    border: "1px solid rgba(247,244,236,0.2)",
    borderRadius: "9px",
    padding: "11px 12px",
    color: "#f7f4ec",
    fontSize: "15px",
    marginBottom: "16px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0e1b2e",
        padding: "32px 24px",
        fontFamily: "Arial,Helvetica,sans-serif",
        color: "#f7f4ec",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", margin: "0 0 6px", color: "#e7ae3b" }}>Add a dentist</h1>
        <p style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px", color: "rgba(247,244,236,0.75)" }}>
          Create a dentist's account and send them an invite to set their password. Link them to their
          practice so their existing scans appear straight away.
        </p>

        {ok ? (
          <p
            style={{
              fontSize: "14px",
              background: "rgba(80,200,120,0.15)",
              border: "1px solid rgba(80,200,120,0.4)",
              color: "#a9f0c1",
              padding: "12px 14px",
              borderRadius: "9px",
              margin: "0 0 20px",
            }}
          >
            Invite sent to <strong>{ok}</strong>. They'll get an email to set their password and sign in.
          </p>
        ) : null}

        {error ? (
          <p
            style={{
              fontSize: "14px",
              background: "rgba(220,80,80,0.15)",
              border: "1px solid rgba(220,80,80,0.4)",
              color: "#ffb4b4",
              padding: "12px 14px",
              borderRadius: "9px",
              margin: "0 0 20px",
            }}
          >
            {error}
          </p>
        ) : null}

        <form action={addDentist}>
          <label style={label}>Dentist's full name</label>
          <input name="full_name" type="text" required placeholder="Dr Jane Smith" style={input} />

          <label style={label}>Email</label>
          <input name="email" type="email" required placeholder="jane@practice.co.uk" style={input} />

          <label style={label}>Phone (optional)</label>
          <input name="phone" type="text" placeholder="01943 000000" style={input} />

          <label style={label}>Practice</label>
          <select name="practice_id" defaultValue="" style={input}>
            <option value="">— Select an existing practice —</option>
            {practices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label style={label}>…or add a new practice</label>
          <input
            name="new_practice"
            type="text"
            placeholder="Only if it isn't in the list above"
            style={input}
          />

          <button
            type="submit"
            style={{
              marginTop: "8px",
              width: "100%",
              background: "#e7ae3b",
              color: "#0e1b2e",
              border: "none",
              fontWeight: "bold",
              fontSize: "15px",
              padding: "13px",
              borderRadius: "9px",
              cursor: "pointer",
            }}
          >
            Send invite
          </button>
        </form>
      </div>
    </main>
  );
}
