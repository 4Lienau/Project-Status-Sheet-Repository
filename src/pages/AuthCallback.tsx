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

    // Check for the auth callback
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          navigate("/");
        } else if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      },
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      } else {
        // If no session and no error, redirect to login
        if (!errorParam) {
          navigate("/login");
        }
      }
    });

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
