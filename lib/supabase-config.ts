export function getSupabaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return null;
  if (/^https?:\/\//i.test(configured)) return configured.replace(/\/$/, "");
  return `https://${configured}.supabase.co`;
}

export function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
}
