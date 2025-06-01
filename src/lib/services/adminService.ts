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

  async getSyncConfiguration(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("sync_configurations")
        .select("*")
        .eq("sync_type", "azure_ad_sync")
        .maybeSingle();

      if (error) {
        console.error("Error fetching sync configuration:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return null;
      }

      console.log("Fetched sync configuration:", data);
      return data;
    } catch (error) {
      console.error("Error fetching sync configuration:", error);
      return null;
    }
  },

  async updateSyncConfiguration(
    frequencyHours: number,
    isEnabled: boolean,
  ): Promise<boolean> {
    try {
      // Calculate next run time based on current time + frequency (only if enabled)
      const nextRunTime = isEnabled ? new Date() : null;
      if (nextRunTime) {
        nextRunTime.setHours(nextRunTime.getHours() + frequencyHours);
      }

      const { error } = await supabase
        .from("sync_configurations")
        .update({
          frequency_hours: frequencyHours,
          is_enabled: isEnabled,
          next_run_at: nextRunTime ? nextRunTime.toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("sync_type", "azure_ad_sync");

      if (error) {
        console.error("Error updating sync configuration:", error);
        return false;
      }

      // After updating configuration, check if any syncs are due (only if enabled)
      if (isEnabled) {
        await this.checkAndTriggerDueSyncs();
      }

      return true;
    } catch (error) {
      console.error("Error updating sync configuration:", error);
      return false;
    }
  },

  async enableSyncConfiguration(): Promise<boolean> {
    try {
      console.log("Attempting to enable sync configuration...");

      // First ensure the configuration exists
      await this.ensureSyncConfiguration();

      // Get current configuration to preserve frequency
      const currentConfig = await this.getSyncConfiguration();
      console.log("Current config before enable:", currentConfig);

      const frequencyHours = currentConfig?.frequency_hours || 6;

      // Calculate next run time
      const nextRunTime = new Date();
      nextRunTime.setHours(nextRunTime.getHours() + frequencyHours);

      console.log(
        "Updating sync configuration to enabled with next run at:",
        nextRunTime.toISOString(),
      );

      const { data, error } = await supabase
        .from("sync_configurations")
        .update({
          is_enabled: true,
          next_run_at: nextRunTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("sync_type", "azure_ad_sync")
        .select();

      if (error) {
        console.error("Error enabling sync configuration:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return false;
      }

      console.log("Sync configuration enabled successfully:", data);
      return true;
    } catch (error) {
      console.error("Error enabling sync configuration:", error);
      return false;
    }
  },

  async disableSyncConfiguration(): Promise<boolean> {
    try {
      console.log("Attempting to disable sync configuration...");

      // First ensure the configuration exists
      await this.ensureSyncConfiguration();

      const { data, error } = await supabase
        .from("sync_configurations")
        .update({
          is_enabled: false,
          next_run_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("sync_type", "azure_ad_sync")
        .select();

      if (error) {
        console.error("Error disabling sync configuration:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return false;
      }

      console.log("Sync configuration disabled successfully:", data);
      return true;
    } catch (error) {
      console.error("Error disabling sync configuration:", error);
      return false;
    }
  },

  async ensureSyncConfiguration(): Promise<boolean> {
    try {
      console.log("Checking if sync configuration exists...");

      // Check if sync configuration exists
      const existingConfig = await this.getSyncConfiguration();
      console.log("Existing config:", existingConfig);

      if (!existingConfig) {
        console.log(
          "No sync configuration found. This should have been created by migration.",
        );
        console.log("Attempting to create default sync configuration...");

        // Try to create default sync configuration
        const { data, error } = await supabase
          .from("sync_configurations")
          .insert({
            sync_type: "azure_ad_sync",
            frequency_hours: 6,
            is_enabled: false, // Start disabled by default
            next_run_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        if (error) {
          console.error("Error creating sync configuration:", error);
          console.error("Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });

          // If it's an RLS policy violation, provide specific guidance
          if (error.code === "42501") {
            console.error(
              "RLS Policy Violation: The sync_configurations table has Row Level Security enabled but no policy allows INSERT operations for the current user.",
            );
            console.error(
              "Please run the migration: supabase/migrations/20250208000001_fix_sync_configurations_rls_and_default.sql",
            );
          }

          return false;
        }

        console.log("Default sync configuration created successfully:", data);
      } else {
        console.log("Sync configuration already exists");
      }

      return true;
    } catch (error) {
      console.error("Error ensuring sync configuration:", error);
      return false;
    }
  },

  async checkAndTriggerDueSyncs(): Promise<{
    success: boolean;
    message: string;
    syncTriggered?: boolean;
  }> {
    try {
      console.log("Checking for due syncs...");

      // Call the database function to check if sync is due
      const { data, error } = await supabase.rpc("trigger_sync_if_due");

      if (error) {
        console.error("Error checking due syncs:", error);
        return {
          success: false,
          message: `Error checking due syncs: ${error.message}`,
        };
      }

      console.log("Sync check result:", data);

      // If sync was triggered, also call the Azure AD sync function
      if (data?.sync_triggered) {
        console.log("Sync is due, triggering Azure AD sync...");
        const syncResult = await this.triggerAzureAdSync();

        return {
          success: true,
          message: `Sync was due and triggered. ${syncResult.message}`,
          syncTriggered: true,
        };
      }

      return {
        success: true,
        message: data?.message || "Sync check completed",
        syncTriggered: false,
      };
    } catch (error) {
      console.error("Error in checkAndTriggerDueSyncs:", error);
      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
      };
    }
  },

  async triggerSyncScheduler(): Promise<{
    success: boolean;
    message: string;
    results?: any;
  }> {
    try {
      console.log("Invoking sync scheduler edge function...");

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-sync-scheduler",
        {
          body: { manual: true },
        },
      );

      console.log("Sync scheduler response:", { data, error });

      if (error) {
        console.error("Error triggering sync scheduler:", error);
        return {
          success: false,
          message: `Sync scheduler error: ${error.message || "Unknown error"}`,
        };
      }

      // Check if the response indicates an error
      if (data && data.success === false) {
        console.error("Sync scheduler failed:", data.error);
        return {
          success: false,
          message: data.error || "Sync scheduler failed",
        };
      }

      return {
        success: true,
        message: data?.message || "Sync scheduler triggered successfully",
        results: data?.results,
      };
    } catch (error) {
      console.error("Error triggering sync scheduler:", error);
      return {
        success: false,
        message: `Unexpected error: ${error.message || "Failed to trigger sync scheduler"}`,
      };
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
