import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
});

// Note: Auth state change handling is centralized in AuthContext.tsx
// Do NOT add onAuthStateChange here to avoid duplicate subscriptions.

// Intercept and suppress refresh token errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Suppress specific auth errors that are handled gracefully
  const message = args[0]?.toString() || '';
  if (
    message.includes('Invalid Refresh Token') ||
    message.includes('Session Expired') ||
    message.includes('AuthApiError')
  ) {
    // Log to console.log instead for debugging if needed
    console.log('[Auth] Session expired, will redirect to login');
    return;
  }
  // Call original console.error for other errors
  originalConsoleError.apply(console, args);
};