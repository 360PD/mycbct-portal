import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server action: runs when the invited user submits the form. They already
// have a session at this point (the /auth/callback route exchanged their
// invite code before sending them here), so we just set the password on the
// signed-in user.
async function setPassword(formData) {
  "use server";

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 8) {
    redirect(
      "/auth/set-password?error=" +
        encodeURIComponent("Your password must be at least 8 characters.")
    );
  }
  if (password !== confirm) {
    redirect(
      "/auth/set-password?error=" +
        encodeURIComponent("The two passwords do not match.")
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/sign-in?notice=" +
        encodeURIComponent(
          "Your invite link has expired. Please ask the team to resend it."
        )
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/auth/set-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard");
}

export default async function SetPasswordPage({ searchParams }) {
  const sp = await searchParams;
  const error = sp?.error;

  // You can only be here with a valid session from the invite/reset link.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/sign-in?notice=" +
        encodeURIComponent(
          "Please use the link in your invite email to set your password."
        )
    );
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "#0e1b2e",
    border: "1px solid rgba(247,244,236,0.2)",
    borderRadius: "9px",
    padding: "11px 12px",
    color: "#f7f4ec",
    fontSize: "15px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0e1b2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial,Helvetica,sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#13243b",
          borderRadius: "14px",
          padding: "32px",
          color: "#f7f4ec",
        }}
      >
        <h1 style={{ fontSize: "22px", margin: "0 0 8px", color: "#e7ae3b" }}>
          Set your password
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            margin: "0 0 24px",
            color: "rgba(247,244,236,0.75)",
          }}
        >
          Welcome to MyCBCT. Choose a password to finish setting up your account.
        </p>

        {error ? (
          <p
            style={{
              fontSize: "13px",
              background: "rgba(220,80,80,0.15)",
              border: "1px solid rgba(220,80,80,0.4)",
              color: "#ffb4b4",
              padding: "10px 12px",
              borderRadius: "8px",
              margin: "0 0 16px",
            }}
          >
            {error}
          </p>
        ) : null}

        <form action={setPassword}>
          <label style={{ display: "block", fontSize: "13px", margin: "0 0 6px" }}>
            New password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />

          <label
            style={{ display: "block", fontSize: "13px", margin: "16px 0 6px" }}
          >
            Confirm password
          </label>
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              marginTop: "24px",
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
            Set password &amp; continue
          </button>
        </form>
      </div>
    </main>
  );
}
