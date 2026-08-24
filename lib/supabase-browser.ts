import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase-config";

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

export function createSupabaseBrowserClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
