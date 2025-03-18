import { supabase } from "../supabase";

export interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
}

export const adminService = {
  async getPendingUsers(): Promise<PendingUser[]> {
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending users:", error);
      return [];
    }

    return data || [];
  },

  async approveUser(userId: string, email: string): Promise<boolean> {
    try {
      // First, update the user's metadata in auth.users via admin API
      // Since we can't directly access the admin API in the browser,
      // we'll update the profile status instead
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Then remove the user from pending_users table
      const { error: pendingError } = await supabase
        .from("pending_users")
        .update({ status: "approved" })
        .eq("id", userId);

      if (pendingError) throw pendingError;

      return true;
    } catch (error) {
      console.error("Error approving user:", error);
      return false;
    }
  },

  async rejectUser(userId: string, email: string): Promise<boolean> {
    try {
      // Update the user's status in pending_users table
      const { error: pendingError } = await supabase
        .from("pending_users")
        .update({ status: "rejected" })
        .eq("id", userId);

      if (pendingError) throw pendingError;

      // Update the profile to mark as rejected
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: false })
        .eq("id", userId);

      if (profileError) throw profileError;

      return true;
    } catch (error) {
      console.error("Error rejecting user:", error);
      return false;
    }
  },
};
