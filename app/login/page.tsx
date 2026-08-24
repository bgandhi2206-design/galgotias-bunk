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

  const result =
    mode === "login"
      ? await supabase.auth.signInWithPassword({
          email,
          password,
        })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    setBusy(false);
    setMessage("Your session is still loading. Please try again.");
    return;
  }

  const next =
    new URLSearchParams(window.location.search).get("next");

  router.replace(next || "/dashboard");
}}
