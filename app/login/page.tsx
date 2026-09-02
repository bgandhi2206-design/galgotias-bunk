"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled && data.user) router.replace("/dashboard");
      }).catch((error) => console.error("Failed to initialize authentication on login:", error));
    }
    return () => { cancelled = true; };
  }, [router]);
 async function submit(event: FormEvent) {
  event.preventDefault();
  setMessage("");
  setBusy(true);

  const supabase = createSupabaseBrowserClient();

  if (!hasSupabaseConfig() || !supabase) {
    setMessage("Add your Supabase keys to .env.local first.");
    setBusy(false);
    return;
  }

  let result;
  try {
    result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
          });
  } catch (error) {
    console.error("Authentication request failed:", error);
    setBusy(false);
    setMessage("Unable to sign in right now. Please try again.");
    return;
  }

  if (result.error) {
    setBusy(false);
    setMessage(result.error.message);
    return;
  }

  // Signup with email confirmation enabled.
  if (mode === "signup" && !result.data.session) {
    setBusy(false);
    setMessage("Check your email to confirm your account.");
    return;
  }

  // Make sure the authenticated session is available
  // before navigating to the dashboard.
  let session;
  try {
    const sessionResult = await supabase.auth.getSession();
    session = sessionResult.data.session;
  } catch (error) {
    console.error("Authenticated session could not be restored:", error);
    setBusy(false);
    setMessage("Your session could not be restored. Please try again.");
    return;
  }

  if (!session?.user) {
    setBusy(false);
    setMessage("Your session is still loading. Please try again.");
    return;
  }

  const next =
    new URLSearchParams(window.location.search).get("next");

  router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
 }

 return <main className="auth-shell"><section className="auth-panel"><Link className="back-link" href="/">← Galgotias Bunk</Link><div className="auth-copy"><div className="eyebrow">GB / ACCOUNT</div><h1>{mode === "login" ? "Welcome back." : "Start checking."}</h1><p>{mode === "login" ? "Sign in to see your attendance." : "Create an account to save your dashboard."}</p></div><form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>}<label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className="auth-message" role="alert">{message}</p>}<button className="button-primary" disabled={busy} type="submit">{busy ? "Please wait..." : mode === "login" ? "Sign in →" : "Create account →"}</button></form><button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} type="button">{mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button></section></main>;
}
