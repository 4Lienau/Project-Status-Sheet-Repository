/**
 * File: Navbar.tsx
 * Purpose: Navigation bar component for the application header
 * Description: This component renders the top navigation bar with the application title and user
 * account menu. It handles user profile loading, sign out functionality, and navigation to profile
 * and admin pages. The component also subscribes to profile changes to keep the display updated.
 *
 * Imports from:
 * - React core libraries
 * - Authentication hooks
 * - UI components from shadcn/ui
 * - Supabase client
 * - Lucide icons
 *
 * Called by: src/components/layout/Layout.tsx (likely)
 */

import React from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { User, Shield, LogOut } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<{
    full_name: string | null;
    department: string | null;
  }>({
    full_name: null,
    department: null,
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, department")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
    };
    loadProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile:${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setProfile(payload.new as { full_name: string });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      console.log("Starting sign out process");

      // First, clear any local storage items
      try {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.refreshToken");
        // Clear any other potential auth-related items
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("supabase") || key.includes("auth"))) {
            localStorage.removeItem(key);
          }
        }
        console.log("Cleared local storage items");
      } catch (storageError) {
        console.error("Error clearing localStorage:", storageError);
        // Continue with sign out even if localStorage clearing fails
      }

      // Sign out from Supabase with a timeout to prevent hanging
      const signOutPromise = new Promise(async (resolve, reject) => {
        try {
          console.log("Calling supabase.auth.signOut");
          const { error } = await supabase.auth.signOut({ scope: "global" });
          if (error) {
            console.error("Supabase signOut returned error:", error);
            reject(error);
          } else {
            console.log("Supabase signOut successful");
            resolve(true);
          }
        } catch (e) {
          console.error("Exception in supabase.auth.signOut:", e);
          reject(e);
        }
      });

      // Add a timeout to prevent hanging if signOut takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log("Sign out timeout reached, continuing anyway");
          reject(new Error("Sign out timeout"));
        }, 3000); // 3 second timeout
      });

      // Race the signOut against the timeout
      await Promise.race([signOutPromise, timeoutPromise]).catch((err) => {
        console.warn("Sign out didn't complete normally, but continuing:", err);
      });

      console.log("Sign out process completed, redirecting to login");

      // Force clear any remaining session state and redirect
      // Use a small timeout to ensure logs are visible
      setTimeout(() => {
        // Force reload the page to clear any in-memory state
        window.location.href = "/login?signout=true";
      }, 100);
    } catch (error) {
      console.error("Error in handleSignOut:", error);

      // Even if there's an error, try to redirect to login
      toast({
        title: "Sign Out Issue",
        description:
          "There was an issue signing out, but we'll redirect you to the login page.",
        variant: "default",
      });

      // Force redirect after a short delay to show the toast
      setTimeout(() => {
        window.location.href = "/login?signout=true";
      }, 1500);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-none bg-white shadow-md">
      <div className="container flex h-16 items-center">
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-800">
              ReWa Project Status Sheet Repository
            </span>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-sm">
                  {profile.full_name || user.email?.split("@")[0]}
                </span>
                {profile.department && (
                  <span className="text-xs text-muted-foreground">
                    {profile.department}
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.full_name || "Account"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  {user.email === "chrisl@re-wa.org" && (
                    <DropdownMenuItem
                      onClick={() => {
                        console.log(
                          "[DEBUG] Admin Dashboard clicked from navbar",
                        );
                        console.log(
                          "[DEBUG] Current location:",
                          window.location.pathname,
                        );

                        // Force navigation using window.location as a reliable fallback
                        window.location.href = "/admin";
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
