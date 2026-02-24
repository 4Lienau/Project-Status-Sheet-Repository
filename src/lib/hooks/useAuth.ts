/**
 * File: useAuth.ts
 * Purpose: Custom hook for authentication and user management
 * Description: This hook re-exports auth state from the centralized AuthContext.
 * All authentication logic (subscriptions, profile loading, approval checking)
 * is handled by the AuthProvider so there's only ONE subscription for the entire app.
 *
 * Used by:
 * - src/App.tsx (ProtectedRoute, SessionTracker)
 * - Various components that need authentication state
 */

export type { UserProfile } from "./AuthContext";
export { useAuth } from "./AuthContext";