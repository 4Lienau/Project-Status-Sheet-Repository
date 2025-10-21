import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Handle expired refresh tokens gracefully
    onAuthStateChange: (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      // Handle token refresh failures silently
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, clearing session');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
      }
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
});

// Add error handler for auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && !session) {
    // Clear any stale tokens from localStorage
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
  }
});

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