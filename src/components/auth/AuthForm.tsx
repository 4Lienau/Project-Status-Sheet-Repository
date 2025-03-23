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

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      console.log("Received message from popup:", event.data);

      // Handle authentication completion message
      if (event.data?.type === "AUTH_COMPLETE" && event.data?.success) {
        // Redirect to home page
        setLoading(false);
        navigate("/");
      } else if (event.data?.type === "AUTH_FAILED") {
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
          setLoading(false);
          navigate("/");
        } else {
          console.log("No valid session yet, continuing to wait...");
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
      const popup = window.open(
        data.url,
        "azure-auth-popup",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=no`,
      );

      if (!popup) {
        throw new Error(
          "Popup blocked. Please allow popups for this site and try again.",
        );
      }

      // Store popup reference globally to help with debugging
      (window as any).authPopup = popup;

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
                navigate("/"); // Use navigate instead of direct location change
              } else {
                console.log("No valid session found after popup closed");
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
                    // Try to close the popup
                    try {
                      popup.close();
                    } catch (closeError) {
                      console.error("Error closing popup:", closeError);
                    }
                    clearInterval(checkPopup);
                    navigate("/");
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
          setLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to ReWa Project Status Sheet Repository
        </h2>
        <p className="text-gray-600">
          Sign in with your organization account to continue
        </p>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 py-6 text-lg"
        onClick={handleAzureSignIn}
        disabled={loading}
      >
        <Cloud className="h-5 w-5" />
        {loading ? "Signing in..." : "Sign in with Azure AD"}
      </Button>

      <div className="text-center text-sm text-gray-500 mt-4">
        <p>Access is restricted to authorized ReWa personnel only.</p>
        <p>For access issues, please contact your system administrator.</p>
      </div>
    </div>
  );
};

export default AuthForm;
