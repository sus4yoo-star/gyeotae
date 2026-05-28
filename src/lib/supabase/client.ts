"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Returns a Supabase browser client, or null if env vars aren't set
 *  (so the app still runs in demo mode before Supabase is configured). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export const isSupabaseEnabled = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
