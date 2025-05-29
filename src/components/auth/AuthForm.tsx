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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const AuthForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      console.log("Received message from popup:", event.data);

      // Handle authentication completion message
      if (event.data?.type === "AUTH_COMPLETE" && event.data?.success) {
        // Redirect to home page
        console.log("Received AUTH_COMPLETE message, redirecting to home");
        localStorage.removeItem("auth_in_progress");
        localStorage.removeItem("auth_started_at");
        setLoading(false);

        // Try to close any remaining popup windows
        try {
          if ((window as any).authPopup && !(window as any).authPopup.closed) {
            console.log("Attempting to close lingering popup from parent");
            (window as any).authPopup.close();
          }
        } catch (e) {
          console.log("Error closing popup from parent:", e);
        }

        // Force a session check before redirecting
        console.log("Checking session before redirecting");
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            console.log("Valid session confirmed, redirecting to home");
            // Clear any beforeunload listeners that might be causing the "Leave site?" dialog
            window.onbeforeunload = null;

            // Use a small timeout to ensure the UI has time to update
            setTimeout(() => {
              // Force a clean navigation without the leave site dialog
              const cleanNavigation = () => {
                window.removeEventListener("beforeunload", cleanNavigation);
                return undefined;
              };
              window.addEventListener("beforeunload", cleanNavigation);

              window.location.href = "/";
            }, 100);
          } else {
            console.log("No valid session found after AUTH_COMPLETE message");
            // Try one more time with a delay
            setTimeout(async () => {
              const { data: retryData } = await supabase.auth.getSession();
              if (retryData.session) {
                console.log("Session found on retry, redirecting");
                // Clear any beforeunload listeners
                window.onbeforeunload = null;
                window.location.href = "/";
              } else {
                console.log("Still no session after retry, showing error");
                setError(
                  "Authentication completed but session not found. Please try again.",
                );
              }
            }, 1000);
          }
        });
      } else if (event.data?.type === "AUTH_FAILED") {
        console.log("Received AUTH_FAILED message");
        localStorage.removeItem("auth_in_progress");
        localStorage.removeItem("auth_started_at");
        setLoading(false);
        setError("Authentication failed. Please try again.");
      }
    };

    window.addEventListener("message", handleMessage);

    // Set up a fallback mechanism to check for authentication
    // in case the message passing fails
    let authCheckInterval: number | null = null;

    if (loading) {
      authCheckInterval = window.setInterval(async () => {
        console.log("Checking authentication status...");
        const { data } = await supabase.auth.getSession();

        // Only redirect if we have both a session and a user
        if (data.session && data.session.user) {
          console.log("Valid session detected in main window, redirecting");
          console.log("User ID:", data.session.user.id);
          clearInterval(authCheckInterval);
          localStorage.removeItem("auth_in_progress");
          localStorage.removeItem("auth_started_at");
          setLoading(false);

          // Try to close any remaining popup windows
          try {
            if (
              (window as any).authPopup &&
              !(window as any).authPopup.closed
            ) {
              console.log("Attempting to close lingering popup from interval");
              (window as any).authPopup.close();
            }
          } catch (e) {
            console.log("Error closing popup from interval:", e);
          }

          // Clear any beforeunload listeners that might be causing the "Leave site?" dialog
          window.onbeforeunload = null;

          // Use a small timeout to ensure the UI has time to update
          setTimeout(() => {
            console.log("Navigating to home page after session check");
            // Force a clean navigation without the leave site dialog
            const cleanNavigation = () => {
              window.removeEventListener("beforeunload", cleanNavigation);
              return undefined;
            };
            window.addEventListener("beforeunload", cleanNavigation);

            window.location.href = "/";
          }, 100);
        } else {
          console.log("No valid session yet, continuing to wait...");

          // Check if popup is still open
          try {
            if ((window as any).authPopup) {
              if ((window as any).authPopup.closed) {
                console.log("Popup closed without completing auth");
                clearInterval(authCheckInterval);
                localStorage.removeItem("auth_in_progress");
                localStorage.removeItem("auth_started_at");
                setLoading(false);
                setError("Authentication window was closed. Please try again.");
              }
            }
          } catch (e) {
            console.log("Error checking popup status:", e);
          }
        }
      }, 1000) as unknown as number;
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      if (authCheckInterval) clearInterval(authCheckInterval);
    };
  }, [navigate, loading]);

  const handleAzureSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use popup flow to prevent new browser window
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile openid",
          // Use popup flow to keep everything in the same window
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

      // Force the popup to open in a new window, not a new tab
      let popup;
      try {
        // First close any existing popup with the same name
        try {
          if ((window as any).authPopup && !(window as any).authPopup.closed) {
            (window as any).authPopup.close();
          }
        } catch (e) {
          console.log("Error closing existing popup:", e);
        }

        // Open a new popup with a unique name (timestamp) to avoid caching issues
        const popupName = `azure-auth-popup-${Date.now()}`;

        // Add a special parameter to the URL to indicate this is a popup
        const urlWithParam = new URL(data.url);
        urlWithParam.searchParams.append("popup", "true");

        popup = window.open(
          urlWithParam.toString(),
          popupName,
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=no`,
        );

        // Check if popup was actually created and accessible
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          console.log("Popup appears to be blocked, but continuing anyway");
          // Don't throw an error, just show a message and continue
          toast({
            title: "Popup Notice",
            description:
              "If a login window opened, please complete authentication there. If not, please enable popups for this site.",
            duration: 6000,
          });
        } else {
          // Try to set a flag on the popup window to identify it as an auth popup
          try {
            popup.isAuthPopup = true;
          } catch (e) {
            console.log("Could not set isAuthPopup flag on popup window");
          }
        }
      } catch (popupError) {
        console.error("Error opening popup:", popupError);
        // Don't throw an error, just show a message and continue
        toast({
          title: "Authentication Notice",
          description:
            "If a login window opened, please complete authentication there. If not, please enable popups for this site.",
          duration: 6000,
        });
      }

      // Store popup reference globally to help with debugging
      (window as any).authPopup = popup;

      // Set a flag to indicate authentication is in progress with timestamp
      localStorage.setItem("auth_in_progress", "true");
      localStorage.setItem("auth_started_at", Date.now().toString());

      // Set up a cleanup timeout in case authentication gets stuck
      setTimeout(
        () => {
          const authStartedAt = localStorage.getItem("auth_started_at");
          if (authStartedAt) {
            const startTime = parseInt(authStartedAt, 10);
            const now = Date.now();
            // If auth has been in progress for more than 5 minutes, clean up
            if (now - startTime > 5 * 60 * 1000) {
              console.log(
                "Auth process timed out after 5 minutes, cleaning up",
              );
              localStorage.removeItem("auth_in_progress");
              localStorage.removeItem("auth_started_at");
              setLoading(false);
            }
          }
        },
        5 * 60 * 1000,
      ); // 5 minute timeout

      // Poll for authentication completion
      const checkPopup = setInterval(() => {
        try {
          // Check if popup is closed
          if (popup.closed) {
            clearInterval(checkPopup);
            console.log("Popup closed, checking authentication status");
            // Check if user is authenticated after popup closes
            supabase.auth.getSession().then(({ data: { session } }) => {
              // Only redirect if we have both a session and a user
              if (session && session.user) {
                console.log(
                  "Valid session found after popup closed, redirecting",
                );
                console.log("User ID:", session.user.id);
                localStorage.removeItem("auth_in_progress");
                localStorage.removeItem("auth_started_at");

                // Clear any beforeunload listeners that might be causing the "Leave site?" dialog
                window.onbeforeunload = null;

                // Use window.location for a more forceful navigation
                setTimeout(() => {
                  // Force a clean navigation without the leave site dialog
                  const cleanNavigation = () => {
                    window.removeEventListener("beforeunload", cleanNavigation);
                    return undefined;
                  };
                  window.addEventListener("beforeunload", cleanNavigation);

                  window.location.href = "/";
                }, 100);
              } else {
                console.log("No valid session found after popup closed");
                localStorage.removeItem("auth_in_progress");
                localStorage.removeItem("auth_started_at");
                setLoading(false); // Reset loading state if not authenticated
                setError("Authentication was not completed. Please try again.");
              }
            });
          } else {
            // Check if popup has navigated to our domain
            try {
              // This will throw an error if popup has navigated to a different origin
              const popupUrl = popup.location.href;

              // If we can access the URL, check if it's on our callback page
              if (popupUrl.includes("/auth/callback")) {
                console.log("Popup is on callback page, checking for session");
                // Check for session in main window
                supabase.auth.getSession().then(({ data: { session } }) => {
                  // Only redirect if we have both a session and a user
                  if (session && session.user) {
                    console.log(
                      "Valid session found while popup on callback page",
                    );
                    console.log("User ID:", session.user.id);
                    // Try to close the popup with multiple methods
                    try {
                      // First try to replace the content with a self-closing script
                      try {
                        popup.document.open();
                        popup.document.write(
                          "<html><head><script>window.close();</script></head><body></body></html>",
                        );
                        popup.document.close();
                      } catch (e) {
                        console.log("Error replacing popup content:", e);
                      }

                      // Then try standard close
                      popup.close();

                      // Try additional methods
                      setTimeout(() => {
                        try {
                          popup.open("", "_self").close();
                        } catch (e) {}
                        try {
                          popup.location.href = "about:blank";
                        } catch (e) {}
                        try {
                          popup.location.replace("about:blank");
                        } catch (e) {}
                      }, 100);
                    } catch (closeError) {
                      console.error("Error closing popup:", closeError);
                    }
                    clearInterval(checkPopup);
                    localStorage.removeItem("auth_in_progress");
                    localStorage.removeItem("auth_started_at");

                    // Clear any beforeunload listeners that might be causing the "Leave site?" dialog
                    window.onbeforeunload = null;

                    // Use window.location for a more forceful navigation
                    console.log("Forcefully redirecting to home page");
                    // Force a clean navigation without the leave site dialog
                    const cleanNavigation = () => {
                      window.removeEventListener(
                        "beforeunload",
                        cleanNavigation,
                      );
                      return undefined;
                    };
                    window.addEventListener("beforeunload", cleanNavigation);

                    window.location.href = "/";
                  } else {
                    console.log("No valid session yet, continuing to wait...");
                  }
                });
              }
            } catch (locationError) {
              // Expected error when popup navigates to different origin (Azure AD)
              // Just continue polling
            }
          }
        } catch (e) {
          // Handle cross-origin errors
          console.error("Popup check error:", e);
          clearInterval(checkPopup);
          localStorage.removeItem("auth_in_progress");
          localStorage.removeItem("auth_started_at");
          setLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error("Auth error:", error);
      localStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_started_at");
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
