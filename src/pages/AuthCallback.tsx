/**
 * File: AuthCallback.tsx
 * Purpose: Page component for handling authentication callbacks
 * Description: This component handles the OAuth callback process after authentication with Azure AD.
 * It processes the authentication response, manages the session, and handles communication between
 * popup windows and the main application. The component includes special handling for popup detection,
 * error handling, and navigation after successful authentication.
 *
 * Imports from:
 * - React core libraries
 * - React Router for navigation
 * - Supabase client for authentication
 * - UI components from shadcn/ui
 * - Lucide icons
 * - query-string for URL parameter parsing
 *
 * Called by: src/App.tsx (via routing)
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import queryString from "query-string";

// Immediately check if we're in a popup window to prevent any rendering
if (window.opener || window.location.search.includes("popup=true")) {
  console.log("POPUP DETECTED: Immediate action to prevent rendering");
  // Try to notify parent window immediately
  try {
    window.opener?.postMessage(
      { type: "AUTH_CALLBACK_LOADED" },
      window.location.origin,
    );
  } catch (e) {
    console.error("Error sending initial message to opener:", e);
  }

  // Block navigation only if this is actually a popup (not the main window)
  const isPopup = window.opener && window !== window.opener;
  if (isPopup) {
    // Block navigation
    window.onbeforeunload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // Disable history navigation
    try {
      history.pushState = function () {};
      history.replaceState = function () {};
      history.go = function () {};
    } catch (e) {}
  }
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // CRITICAL: Immediately prevent any navigation or page rendering
        // This is the most important step to prevent the app from loading in the popup
        if (window.opener) {
          console.log("POPUP DETECTED: Immediately blocking navigation");
          // Block all navigation attempts - but only in the popup window
          const isPopup = window.opener && window !== window.opener;
          if (isPopup) {
            // Block all navigation attempts
            window.onbeforeunload = (e) => {
              e.preventDefault();
              e.returnValue = "";
              return "";
            };
            window.onpopstate = (e) => {
              e.preventDefault();
              return false;
            };
            // Disable history navigation
            history.pushState = function () {};
            history.replaceState = function () {};
            history.go = function () {};
          }
        }

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

              console.log("Closing popup window immediately");

              // CRITICAL: Force the document to be blank with ONLY a self-closing script
              // This prevents any React rendering or navigation from happening
              document.open();
              document.write(
                "<!DOCTYPE html><html><head><title>Authentication Complete</title><script>try{window.opener.postMessage({type:\"AUTH_COMPLETE\",success:true},window.location.origin);window.close();}catch(e){console.error(e);}setTimeout(function(){window.close();},100);setTimeout(function(){document.body.innerHTML=\"<div style='text-align:center;padding:20px;font-family:sans-serif;'><h2>Authentication Complete</h2><p>This window should close automatically.</p><button onclick='window.close()' style='padding:10px;margin-top:20px;'>Close Window</button></div>\";},500);</script></head><body style=\"background:#f0f4f8;\"></body></html>",
              );
              document.close();

              // Try multiple approaches to close the window with increased delay
              const closeWindow = () => {
                try {
                  console.log("Attempting to close popup window");
                  window.close();

                  // If window.close() doesn't work, try these alternatives
                  setTimeout(() => {
                    console.log("Trying alternative closing methods");
                    try {
                      window.open("", "_self").close();
                    } catch (e) {
                      console.log("Method 1 failed");
                    }
                    try {
                      window.location.href = "about:blank";
                    } catch (e) {
                      console.log("Method 2 failed");
                    }
                    try {
                      window.location.replace("about:blank");
                    } catch (e) {
                      console.log("Method 3 failed");
                    }

                    // As a last resort, make the window very small and move it off-screen
                    try {
                      window.resizeTo(1, 1);
                      window.moveTo(-10000, -10000);
                      console.log("Window minimized and moved off-screen");

                      // Add a close button that users can click
                      document.body.innerHTML =
                        '<div style="padding:5px;text-align:center;"><p style="font-size:10px;">Please click to close:</p><button onclick="window.close();" style="padding:2px 5px;font-size:10px;">Close Window</button></div>';
                    } catch (e) {
                      console.log("Window resize/move failed");
                    }
                  }, 200);
                } catch (closeError) {
                  console.error("Error closing popup:", closeError);
                }
              };

              // First attempt immediately
              closeWindow();

              // Additional attempts with increasing delays
              setTimeout(closeWindow, 300);
              setTimeout(closeWindow, 1000);
              setTimeout(closeWindow, 3000);

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

              // Force the document to be blank with self-closing script
              document.open();
              document.write(
                "<!DOCTYPE html><html><head><title>Authentication Complete</title><script>try{window.opener.postMessage({type:\"AUTH_COMPLETE\",success:true},window.location.origin);window.close();}catch(e){console.error(e);}setTimeout(function(){window.close();},100);setTimeout(function(){document.body.innerHTML=\"<div style='text-align:center;padding:20px;font-family:sans-serif;'><h2>Authentication Complete</h2><p>This window should close automatically.</p><button onclick='window.close()' style='padding:10px;margin-top:20px;'>Close Window</button></div>\";},500);</script></head><body style=\"background:#f0f4f8;\"></body></html>",
              );
              document.close();

              // Block all navigation - but only in the popup window
              const isPopup = window.opener && window !== window.opener;
              if (isPopup) {
                window.onbeforeunload = (e) => {
                  e.preventDefault();
                  e.returnValue = "";
                  return "";
                };
              }

              window.opener.postMessage(
                { type: "AUTH_COMPLETE", success: true },
                window.location.origin,
              );

              // Add a longer delay before closing to ensure the message is sent
              setTimeout(() => {
                console.log("Closing popup after auth state change");
                window.close();

                // Try alternative methods if window.close() doesn't work
                setTimeout(() => {
                  try {
                    window.open("", "_self").close();
                  } catch (e) {}
                  try {
                    window.location.href = "about:blank";
                  } catch (e) {}
                  try {
                    window.location.replace("about:blank");
                  } catch (e) {}
                  try {
                    window.resizeTo(1, 1);
                    window.moveTo(-10000, -10000);
                  } catch (e) {}
                }, 200);
              }, 500);
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
