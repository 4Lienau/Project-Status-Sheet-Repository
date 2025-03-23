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

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      // Handle authentication completion message
      if (event.data?.type === "AUTH_COMPLETE" && event.data?.success) {
        // Redirect to home page
        navigate("/");
      } else if (event.data?.type === "AUTH_FAILED") {
        setLoading(false);
        setError("Authentication failed. Please try again.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

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

      const popup = window.open(
        data.url,
        "azure-auth-popup",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`,
      );

      if (!popup) {
        throw new Error(
          "Popup blocked. Please allow popups for this site and try again.",
        );
      }

      // Poll for authentication completion
      const checkPopup = setInterval(() => {
        try {
          // Check if popup is closed
          if (popup.closed) {
            clearInterval(checkPopup);
            // Check if user is authenticated after popup closes
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                window.location.href = "/"; // Redirect to home page if authenticated
              } else {
                setLoading(false); // Reset loading state if not authenticated
              }
            });
          }
        } catch (e) {
          // Handle cross-origin errors
          console.error("Popup check error:", e);
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
