/**
 * File: AuthForm.tsx
 * Purpose: Authentication form component for user login
 * Description: This component handles the Azure AD authentication flow using Supabase Auth.
 * It manages the authentication state, handles popup windows for OAuth, and includes error handling
 * and session management. The component also cleans up existing sessions when needed and provides
 * feedback to users during the authentication process.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Supabase client for authentication
 * - react-router-dom for navigation
 * - Lucide icons
 *
 * Called by: src/pages/LoginPage.tsx
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Cloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const AuthForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear any existing auth session on component mount
  useEffect(() => {
    const clearExistingSession = async () => {
      // Check if we're on the login page directly (not from a sign-out)
      if (
        window.location.pathname === "/login" &&
        !window.location.search.includes("signout=true")
      ) {
        console.log("Login page loaded, checking for existing session");
        const { data } = await supabase.auth.getSession();

        // If there's an existing session but we're on the login page, sign out
        if (data.session) {
          console.log("Found existing session on login page, signing out");
          await supabase.auth.signOut({ scope: "global" });
          // Clear any local storage items
          localStorage.removeItem("supabase.auth.token");
          localStorage.removeItem("supabase.auth.refreshToken");
        }
      }
    };

    clearExistingSession();
  }, []);

  // Check for existing auth-in-progress flag on component mount
  useEffect(() => {
    const checkExistingAuthProcess = async () => {
      const authInProgress = localStorage.getItem("auth_in_progress");
      if (authInProgress === "true") {
        console.log(
          "Found existing auth-in-progress flag, checking for session",
        );
        // Check if we actually have a valid session
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
          console.log("Valid session found, redirecting to home");
          localStorage.removeItem("auth_in_progress");
          localStorage.removeItem("auth_started_at");
          navigate("/");
        } else {
          console.log("No valid session found, clearing auth-in-progress flag");
          localStorage.removeItem("auth_in_progress");
          localStorage.removeItem("auth_started_at");
        }
      }
    };

    checkExistingAuthProcess();
  }, [navigate]);

  // Listen for messages from the popup window and monitor auth state
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      console.log("Received message from popup:", event.data);

      // Handle authentication completion message
      if (event.data?.type === "AUTH_COMPLETE" && event.data?.success) {
        handleAuthSuccess("AUTH_COMPLETE message");
      } else if (event.data?.type === "AUTH_FAILED") {
        console.log("Received AUTH_FAILED message");
        cleanupAuth();
        setError("Authentication failed. Please try again.");
      }
    };

    // Helper to clean up auth state
    const cleanupAuth = () => {
      localStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_started_at");
      setLoading(false);
      // Try to close any remaining popup windows
      try {
        if ((window as any).authPopup && !(window as any).authPopup.closed) {
          console.log("Closing lingering popup");
          (window as any).authPopup.close();
        }
      } catch (e) {
        console.log("Error closing popup:", e);
      }
    };

    // Helper to handle successful auth
    const handleAuthSuccess = (source: string) => {
      console.log(`Auth success detected via: ${source}`);
      cleanupAuth();

      // Clear any beforeunload listeners
      window.onbeforeunload = null;

      // Redirect to home
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    };

    window.addEventListener("message", handleMessage);

    // Listen for auth state changes - this fires even if the popup fails to load
    // the callback page, as long as the PKCE exchange happens in any tab/window
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (loading && event === "SIGNED_IN" && session?.user) {
          console.log("Auth state change detected: SIGNED_IN in main window");
          handleAuthSuccess("onAuthStateChange SIGNED_IN");
        }
      },
    );

    // Set up a fallback polling mechanism
    let authCheckInterval: number | null = null;
    let popupFailureCount = 0;

    if (loading) {
      authCheckInterval = window.setInterval(async () => {
        console.log("Polling authentication status...");

        // Check session directly
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
          console.log("Valid session detected via polling");
          if (authCheckInterval) clearInterval(authCheckInterval);
          handleAuthSuccess("session polling");
          return;
        }

        // Check popup status
        try {
          const popup = (window as any).authPopup;
          if (popup) {
            if (popup.closed) {
              console.log("Popup closed, doing final session check");
              if (authCheckInterval) clearInterval(authCheckInterval);

              // Give a moment for the session to propagate
              setTimeout(async () => {
                const { data: finalData } = await supabase.auth.getSession();
                if (finalData.session && finalData.session.user) {
                  handleAuthSuccess("popup closed + session found");
                } else {
                  cleanupAuth();
                  setError(
                    "Authentication window was closed. Please try again.",
                  );
                }
              }, 1500);
              return;
            }

            // Check if popup hit an error (connection refused, etc.)
            try {
              // If we can read popup.location.href without error, 
              // it's on our origin
              const popupUrl = popup.location.href;
              if (popupUrl && (popupUrl.includes("about:blank") || popupUrl === "")) {
                // Popup navigated to blank - something went wrong
                popupFailureCount++;
              }
            } catch (e) {
              // Cross-origin = popup is on Azure AD or another domain, that's normal
              // But if popup has been on a foreign domain for too long, 
              // it might be stuck on an error page
              popupFailureCount = 0; // Reset - popup is on a different domain (normal)
            }
          }
        } catch (e) {
          console.log("Error checking popup:", e);
        }

        // If we've been waiting too long (30 seconds), provide recovery options
        const authStartedAt = localStorage.getItem("auth_started_at");
        if (authStartedAt) {
          const elapsed = Date.now() - parseInt(authStartedAt, 10);
          if (elapsed > 30000) {
            console.log("Auth process taking too long, showing recovery option");
            if (authCheckInterval) clearInterval(authCheckInterval);
            cleanupAuth();
            setError(
              "Authentication is taking too long. The login popup may have encountered an error. Please try again.",
            );
          }
        }
      }, 2000) as unknown as number;
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      authListener?.subscription.unsubscribe();
      if (authCheckInterval) clearInterval(authCheckInterval);
    };
  }, [navigate, loading]);

  const handleAzureSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine the correct redirect URL
      // Use the current origin for the redirect - this must be whitelisted
      // in the Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
      const redirectOrigin = window.location.origin;
      const redirectUrl = `${redirectOrigin}/auth/callback`;
      console.log("Auth redirect URL:", redirectUrl);

      // Use popup flow to prevent new browser window
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: redirectUrl,
          scopes: "email profile openid",
          queryParams: {
            prompt: "select_account",
          },
          skipBrowserRedirect: true, // Skip automatic redirect
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No URL returned from Supabase");

      // Open the authentication URL in a popup window
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      let popup;
      try {
        // Close any existing popup
        try {
          if ((window as any).authPopup && !(window as any).authPopup.closed) {
            (window as any).authPopup.close();
          }
        } catch (e) {
          console.log("Error closing existing popup:", e);
        }

        const popupName = `azure-auth-popup-${Date.now()}`;
        popup = window.open(
          data.url,
          popupName,
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=no`,
        );

        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          console.log("Popup blocked, falling back to redirect flow");
          // Fall back to redirect-based auth
          await handleRedirectSignIn();
          return;
        }
      } catch (popupError) {
        console.error("Error opening popup:", popupError);
        // Fall back to redirect-based auth
        await handleRedirectSignIn();
        return;
      }

      // Store popup reference globally
      (window as any).authPopup = popup;

      // Set auth-in-progress flag
      localStorage.setItem("auth_in_progress", "true");
      localStorage.setItem("auth_started_at", Date.now().toString());

      // Set up a cleanup timeout (5 minutes)
      setTimeout(
        () => {
          const authStartedAt = localStorage.getItem("auth_started_at");
          if (authStartedAt) {
            const startTime = parseInt(authStartedAt, 10);
            if (Date.now() - startTime > 5 * 60 * 1000) {
              console.log("Auth process timed out after 5 minutes");
              localStorage.removeItem("auth_in_progress");
              localStorage.removeItem("auth_started_at");
              setLoading(false);
            }
          }
        },
        5 * 60 * 1000,
      );

      // Note: Popup monitoring (close detection, session polling, timeout)
      // is handled by the useEffect above that watches the `loading` state.
    } catch (error) {
      console.error("Auth error:", error);
      localStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_started_at");
      setError(error.message);
      setLoading(false);
    }
  };

  // Fallback: redirect-based sign-in (no popup)
  const handleRedirectSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectOrigin = window.location.origin;
      const redirectUrl = `${redirectOrigin}/auth/callback`;
      console.log("Redirect auth URL:", redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: redirectUrl,
          scopes: "email profile openid",
          queryParams: {
            prompt: "select_account",
          },
          // Don't skip redirect - let the browser navigate directly
        },
      });

      if (error) throw error;
      // Browser will redirect to Azure AD
    } catch (error) {
      console.error("Redirect auth error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Button
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          onClick={handleAzureSignIn}
          disabled={loading}
        >
          <Cloud className="h-5 w-5" />
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Signing in...
            </>
          ) : (
            "Sign in with Azure AD"
          )}
        </Button>

        {error && (
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-3 text-sm font-medium rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handleRedirectSignIn}
            disabled={loading}
          >
            <Cloud className="h-4 w-4" />
            Try alternate sign-in method
          </Button>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">
              Secure Authentication
            </span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600 font-medium">
          Access is restricted to authorized ReWa personnel only.
        </p>
        <p className="text-sm text-gray-500">
          For support or issues, please contact the ReWa ServiceDesk at
          extension 411
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
