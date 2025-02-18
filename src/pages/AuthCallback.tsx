import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Auth callback mounted, current URL:", window.location.href);

    const handleCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        console.log("Got session:", session?.user?.email, error);

        if (error) {
          console.error("Auth error:", error);
          navigate("/login");
          return;
        }

        if (session) {
          console.log("Session found, navigating home");
          navigate("/");
        } else {
          console.log("No session found, navigating to login");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate]);

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
