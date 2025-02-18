export function logEnvironment() {
  console.log("Environment Variables:", {
    VITE_TEMPO: import.meta.env.VITE_TEMPO,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10) + "...",
    "window.location.origin": window.location.origin,
    "window.location.href": window.location.href,
    "window.location.pathname": window.location.pathname,
  });
}

export function logAuthEvent(event: string, data?: any) {
  console.log(`Auth Event [${event}]:`, data || "");
}
