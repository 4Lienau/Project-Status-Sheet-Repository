import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Cloud } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AuthForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAzureSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the tenant-specific endpoint directly instead of the /common endpoint
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile openid",
          flowType: "implicit",
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No URL returned from Supabase");

      // Redirect the user to the OAuth URL
      window.location.href = data.url;
    } catch (error) {
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
