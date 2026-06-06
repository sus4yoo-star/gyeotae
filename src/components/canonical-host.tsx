"use client";
import { useEffect } from "react";

/**
 * Login only works on the canonical domain (it's the only origin in Supabase's
 * redirect allow-list), but Netlify also exposes every build at a
 * `<hash>--gyeotae.netlify.app` URL. Landing on one of those leaves the user
 * permanently logged-out (demo) and confused. So if we're on any netlify.app
 * host, bounce to the canonical domain — same path — where auth actually works.
 */
const CANONICAL = "gyeotae.theamov.com";

export function CanonicalHost() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host !== CANONICAL && host.endsWith(".netlify.app")) {
      const url = new URL(window.location.href);
      url.protocol = "https:";
      url.hostname = CANONICAL;
      url.port = "";
      window.location.replace(url.toString());
    }
  }, []);
  return null;
}
