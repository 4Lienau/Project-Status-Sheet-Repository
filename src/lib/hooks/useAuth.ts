import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name: string | null;
  department: string | null;
  email: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile when user changes
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, department, email")
        .eq("id", user.id)
        .single();

      setProfile(data);
    };

    loadProfile();
  }, [user]);

  return { user, profile, loading };
};
