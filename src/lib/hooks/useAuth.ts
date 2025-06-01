/**
 * File: useAuth.ts
 * Purpose: Custom hook for authentication and user management
 * Description: This hook provides authentication functionality throughout the application,
 * handling user sessions, profile data, and approval status. It manages the authentication state,
 * loads user profiles, checks for pending approval status, and handles sign-out. The hook also
 * subscribes to auth state changes and provides navigation based on authentication status.
 *
 * Imports from:
 * - React core libraries
 * - Supabase client and types
 * - Toast notifications
 * - React Router navigation
 *
 * Used by:
 * - src/App.tsx
 * - Various components that need authentication state
 */

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export interface UserProfile {
  id: string;
  full_name: string | null;
  department: string | null;
  email: string | null;
  is_approved?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        setLoading(true);
        console.log("Checking initial authentication state...");
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
          setUser(null);
          // Redirect to login on error
          if (
            window.location.pathname !== "/login" &&
            !window.location.pathname.includes("/auth/callback")
          ) {
            navigate("/login");
          }
          setLoading(false);
          return;
        }

        // Check if we have a valid session with a user
        const currentUser = data.session?.user ?? null;
        const hasValidSession = !!data.session && !!currentUser;

        console.log(
          "Initial auth check:",
          hasValidSession ? "User is authenticated" : "No authenticated user",
          "User ID:",
          currentUser?.id || "none",
        );

        setUser(currentUser);

        // If no valid session, redirect to login unless already on login or callback page
        if (!hasValidSession) {
          if (
            window.location.pathname !== "/login" &&
            !window.location.pathname.includes("/auth/callback")
          ) {
            console.log("No authenticated user, redirecting to login");
            navigate("/login");
          }
        }
      } catch (err) {
        console.error("Unexpected auth error:", err);
        setUser(null);
        // Redirect to login on error
        if (
          window.location.pathname !== "/login" &&
          !window.location.pathname.includes("/auth/callback")
        ) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "Auth state changed:",
        event,
        session ? "session exists" : "no session",
      );

      // Don't process auth changes if we're in a popup
      const isPopup = window.opener && window !== window.opener;
      if (isPopup) {
        return;
      }

      setUser(session?.user ?? null);
      setLoading(false);

      // Handle sign out event
      if (event === "SIGNED_OUT") {
        console.log("User signed out, clearing state");
        setUser(null);
        setProfile(null);
        setIsApproved(null);
        setIsPendingApproval(false);

        // Clear any cached data
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.refreshToken");

        // Force navigation to login page
        if (window.location.pathname !== "/login") {
          console.log("Redirecting to login after sign out");
          navigate("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  // Load user profile when user changes
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        setIsApproved(null);
        setIsPendingApproval(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, department, email, is_approved")
        .eq("id", user.id)
        .single();

      setProfile(data);

      // Check if user is approved
      if (data) {
        // If is_approved is explicitly set to false, user is rejected
        if (data.is_approved === false) {
          setIsApproved(false);
          setIsPendingApproval(false);
          // Sign out rejected users
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "Your account has been rejected by an administrator.",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        // If is_approved is true, user is approved
        if (data.is_approved === true) {
          setIsApproved(true);
          setIsPendingApproval(false);
          return;
        }

        // If is_approved is null, check pending_users table
        const { data: pendingData } = await supabase
          .from("pending_users")
          .select("status")
          .eq("id", user.id)
          .single();

        if (pendingData) {
          if (pendingData.status === "pending") {
            setIsApproved(false);
            setIsPendingApproval(true);
            // Sign out pending users
            await supabase.auth.signOut();
            toast({
              title: "Account Pending Approval",
              description:
                "Your account is pending administrator approval. You'll be notified when your account is approved.",
              duration: 6000,
            });
            navigate("/login");
            return;
          } else if (pendingData.status === "approved") {
            setIsApproved(true);
            setIsPendingApproval(false);
            // Update profile to mark as approved
            await supabase
              .from("profiles")
              .update({ is_approved: true })
              .eq("id", user.id);
            return;
          } else if (pendingData.status === "rejected") {
            setIsApproved(false);
            setIsPendingApproval(false);
            // Update profile to mark as rejected
            await supabase
              .from("profiles")
              .update({ is_approved: false })
              .eq("id", user.id);
            // Sign out rejected users
            await supabase.auth.signOut();
            toast({
              title: "Access Denied",
              description:
                "Your account has been rejected by an administrator.",
              variant: "destructive",
            });
            navigate("/login");
            return;
          }
        }

        // If no pending record and is_approved is null, assume this is an existing user (grandfathered in)
        // or a new user that hasn't been processed yet
        setIsApproved(true);
        setIsPendingApproval(false);
      }
    };

    loadProfile();
  }, [user, toast, navigate]);

  return { user, profile, loading, isApproved, isPendingApproval };
};
