/**
 * File: AuthContext.tsx
 * Purpose: Centralized authentication context provider
 * Description: This context provides a SINGLE auth subscription shared across
 * the entire app, preventing multiple useAuth() hooks from creating duplicate
 * onAuthStateChange subscriptions that cause infinite re-render loops.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isApproved: boolean | null;
  isPendingApproval: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isApproved: null,
  isPendingApproval: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use refs to avoid dependency issues
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);
  toastRef.current = toast;
  navigateRef.current = navigate;

  // Track if init has been called to prevent double-init in StrictMode
  const initCalledRef = useRef(false);

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log("AuthProvider: Checking initial authentication state...");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.log("AuthProvider: Session error:", error.message);

          if (
            error.message.includes("Invalid Refresh Token") ||
            error.message.includes("Session Expired") ||
            error.message.includes("refresh_token_not_found")
          ) {
            console.log("AuthProvider: Session expired, clearing");
            await supabase.auth.signOut({ scope: "local" });
            setUser(null);
            setLoading(false);
            if (
              window.location.pathname !== "/login" &&
              !window.location.pathname.includes("/auth/callback")
            ) {
              navigateRef.current("/login");
            }
            return;
          }

          toastRef.current({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
          setUser(null);
          if (
            window.location.pathname !== "/login" &&
            !window.location.pathname.includes("/auth/callback")
          ) {
            navigateRef.current("/login");
          }
          setLoading(false);
          return;
        }

        const currentUser = data.session?.user ?? null;
        console.log(
          "AuthProvider: Initial check:",
          currentUser ? "authenticated" : "no user",
        );
        setUser(currentUser);

        if (!currentUser) {
          if (
            window.location.pathname !== "/login" &&
            !window.location.pathname.includes("/auth/callback")
          ) {
            navigateRef.current("/login");
          }
        }
      } catch (err) {
        console.log("AuthProvider: Unexpected error:", err);
        setUser(null);
        if (
          window.location.pathname !== "/login" &&
          !window.location.pathname.includes("/auth/callback")
        ) {
          navigateRef.current("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Single auth state change subscription for the entire app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth state changed:", event);

      // Don't process auth changes if we're in a popup
      const isPopup = window.opener && window !== window.opener;
      if (isPopup) return;

      const newUser = session?.user ?? null;
      setUser(newUser);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        console.log("AuthProvider: User signed out");
        setUser(null);
        setProfile(null);
        setIsApproved(null);
        setIsPendingApproval(false);
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.refreshToken");
        if (window.location.pathname !== "/login") {
          navigateRef.current("/login");
        }
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        console.log("AuthProvider: Token refresh failed");
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        setProfile(null);
        setIsApproved(null);
        setIsPendingApproval(false);
        if (window.location.pathname !== "/login") {
          navigateRef.current("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

      if (data) {
        if (data.is_approved === false) {
          setIsApproved(false);
          setIsPendingApproval(false);
          await supabase.auth.signOut();
          toastRef.current({
            title: "Access Denied",
            description: "Your account has been rejected by an administrator.",
            variant: "destructive",
          });
          navigateRef.current("/login");
          return;
        }

        if (data.is_approved === true) {
          setIsApproved(true);
          setIsPendingApproval(false);
          return;
        }

        // Check pending_users table
        const { data: pendingData } = await supabase
          .from("pending_users")
          .select("status")
          .eq("id", user.id)
          .single();

        if (pendingData) {
          if (pendingData.status === "pending") {
            setIsApproved(false);
            setIsPendingApproval(true);
            await supabase.auth.signOut();
            toastRef.current({
              title: "Account Pending Approval",
              description:
                "Your account is pending administrator approval. You'll be notified when your account is approved.",
              duration: 6000,
            });
            navigateRef.current("/login");
            return;
          } else if (pendingData.status === "approved") {
            setIsApproved(true);
            setIsPendingApproval(false);
            await supabase
              .from("profiles")
              .update({ is_approved: true })
              .eq("id", user.id);
            return;
          } else if (pendingData.status === "rejected") {
            setIsApproved(false);
            setIsPendingApproval(false);
            await supabase
              .from("profiles")
              .update({ is_approved: false })
              .eq("id", user.id);
            await supabase.auth.signOut();
            toastRef.current({
              title: "Access Denied",
              description:
                "Your account has been rejected by an administrator.",
              variant: "destructive",
            });
            navigateRef.current("/login");
            return;
          }
        }

        // Default: existing user grandfathered in
        setIsApproved(true);
        setIsPendingApproval(false);
      }
    };

    loadProfile();
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isApproved, isPendingApproval }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
