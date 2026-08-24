"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const supabase = createSupabaseBrowserClient(); if (supabase) supabase.auth.getUser().then(({ data }) => { if (data.user) router.replace("/dashboard"); }); }, [router]);
  async function submit(event: FormEvent) { event.preventDefault(); setMessage(""); setBusy(true); const supabase = createSupabaseBrowserClient(); if (!hasSupabaseConfig() || !supabase) { setMessage("Add your Supabase keys to .env.local first."); setBusy(false); return; } const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }); setBusy(false); if (result.error) return setMessage(result.error.message); if (mode === "signup" && !result.data.session) return setMessage("Check your email to confirm your account."); const next = new URLSearchParams(window.location.search).get("next"); router.push(next || "/dashboard"); }
  return <main className="auth-shell"><div className="auth-panel"><Link className="brand" href="/"><span className="brand-mark">GB</span>Galgotias Bunk</Link><div className="auth-copy"><div className="eyebrow">GB / ACCOUNT</div><h1>{mode === "login" ? "Welcome back." : "Let&apos;s get started."}</h1><p>{mode === "login" ? "Your attendance is waiting." : "Set up your timetable once."}</p></div><form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className="auth-message" role="alert">{message}</p>}<button className="button-primary" disabled={busy} type="submit">{busy ? "One sec..." : mode === "login" ? "Log in" : "Create account"} →</button></form><button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} type="button">{mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}</button></div></main>;
}
