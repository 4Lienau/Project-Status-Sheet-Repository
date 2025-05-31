/**
 * File: adminService.ts
 * Purpose: Service for admin-related functionality
 * Description: This service provides functions for administrative tasks such as managing pending
 * users. It includes functions to fetch pending users, approve users, and reject users. The service
 * interacts with the Supabase database to update user statuses and profiles.
 *
 * Imports from:
 * - Supabase client
 *
 * Used by:
 * - src/components/admin/PendingUsersManager.tsx (likely)
 * - src/pages/AdminPage.tsx (likely)
 */

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

  async triggerAzureAdSync(): Promise<{
    success: boolean;
    message: string;
    summary?: any;
  }> {
    try {
      console.log("Invoking Azure AD sync edge function...");

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-azure-ad-sync",
        {
          body: { manual: true },
        },
      );

      console.log("Edge function response:", { data, error });

      if (error) {
        console.error("Error triggering Azure AD sync:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return {
          success: false,
          message: `Edge function error: ${error.message || "Unknown error"} ${error.details ? `(${error.details})` : ""}`,
        };
      }

      // Check if the response indicates an error
      if (data && data.success === false) {
        console.error("Azure AD sync failed:", data.error);
        return {
          success: false,
          message: data.error || "Azure AD sync failed",
        };
      }

      return (
        data || {
          success: true,
          message: "Azure AD sync triggered successfully",
        }
      );
    } catch (error) {
      console.error("Error triggering Azure AD sync:", error);
      console.error("Catch block error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        message: `Unexpected error: ${error.message || "Failed to trigger Azure AD sync"}`,
      };
    }
  },

  async getDirectoryUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("directory_users")
        .select("*")
        .order("last_synced", { ascending: false });

      if (error) {
        console.error("Error fetching directory users:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching directory users:", error);
      return [];
    }
  },

  async getAzureSyncLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("azure_sync_logs")
        .select("*")
        .order("sync_started_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching Azure sync logs:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching Azure sync logs:", error);
      return [];
    }
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
