import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import queryString from "query-string";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if there's an error in the URL (both in search params and hash fragment)
        const params = new URLSearchParams(location.search);
        // Parse the hash fragment manually since query-string is having issues
        const hashFragment = location.hash.substring(1); // Remove the # character
        const hashParams = {};

        if (hashFragment) {
          const pairs = hashFragment.split("&");
          pairs.forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key && value) {
              hashParams[key] = decodeURIComponent(value);
            }
          });
        }

        const errorParam = params.get("error") || hashParams.error;
        const errorDescription =
          params.get("error_description") || hashParams.error_description;

        if (errorParam) {
          setError(
            typeof errorDescription === "string"
              ? decodeURIComponent(errorDescription)
              : "Authentication error",
          );
          return;
        }

        // Process the authentication callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (data.session) {
          // Successfully authenticated
          console.log("Authentication successful, checking if in popup");

          // If this is in a popup, close it and redirect the parent
          if (window.opener && !window.opener.closed) {
            try {
              console.log("In popup, attempting to notify opener and close");
              // Try to access the opener to check if it's from the same origin
              window.opener.postMessage(
                { type: "AUTH_COMPLETE", success: true },
                window.location.origin,
              );

              // IMPORTANT: Prevent any navigation in this window
              // This prevents the landing page from loading in the popup
              e.preventDefault && e.preventDefault();

              console.log("Closing popup window immediately");
              // Try multiple approaches to close the window
              try {
                window.close();
                // If window.close() doesn't work, try these alternatives
                window.open("", "_self").close();
                window.location.href = "about:blank";
              } catch (closeError) {
                console.error("Error closing popup:", closeError);
              }

              // Return early to prevent any further code execution
              return;
            } catch (e) {
              console.error("Error communicating with opener:", e);
              // If we can't access the opener, just redirect this window
              navigate("/");
            }
          } else {
            // Not in a popup or opener is closed/inaccessible, redirect this window
            console.log(
              "Not in popup or opener inaccessible, redirecting this window",
            );
            navigate("/");
          }
        } else {
          // No session and no error, redirect to login
          if (window.opener && !window.opener.closed) {
            try {
              console.log("No session found, sending AUTH_FAILED to opener");
              window.opener.postMessage(
                { type: "AUTH_FAILED" },
                window.location.origin,
              );

              // Add a small delay before closing
              setTimeout(() => {
                console.log("Closing popup after auth failure");
                window.close();
              }, 300);
            } catch (e) {
              console.error("Error sending AUTH_FAILED message:", e);
              navigate("/login");
            }
          } else {
            console.log("No session and not in popup, redirecting to login");
            navigate("/login");
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred during authentication");
      }
    };

    // Handle the auth callback when the component mounts
    handleAuthCallback();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // If in a popup, try to close it and notify the opener
          if (window.opener && !window.opener.closed) {
            try {
              console.log("Auth state change: SIGNED_IN, notifying opener");
              window.opener.postMessage(
                { type: "AUTH_COMPLETE", success: true },
                window.location.origin,
              );

              // Add a small delay before closing to ensure the message is sent
              setTimeout(() => {
                console.log("Closing popup after auth state change");
                window.close();
              }, 300);
            } catch (e) {
              console.error("Error in auth state change handler:", e);
              navigate("/");
            }
          } else {
            console.log("Auth state change: not in popup, redirecting");
            navigate("/");
          }
        } else if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, location]);

  const handleBackToLogin = () => {
    navigate("/login");
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md w-full p-6">
          <Alert className="bg-red-50 border-red-200 text-red-800 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription className="mt-2">{error}</AlertDescription>
          </Alert>
          <p className="text-muted-foreground mb-4">
            There was a problem with the authentication process. This might be
            due to a configuration issue with the Azure AD application.
          </p>
          <Button onClick={handleBackToLogin} className="w-full">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Logging you in...</h2>
        <p className="text-muted-foreground">
          Please wait while we complete the authentication.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
