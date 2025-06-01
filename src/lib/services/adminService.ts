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
  // Debug function to check database connectivity and table structure
  async debugDatabaseAccess(): Promise<any> {
    try {
      console.log(
        "[adminService.debugDatabaseAccess] Starting database debug...",
      );

      // Test basic connectivity with a simple query
      const { data: testData, error: testError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      console.log(
        "[adminService.debugDatabaseAccess] Basic connectivity test:",
        {
          testData,
          testError,
        },
      );

      // Check if directory_users table exists by trying to get its structure
      const { data: tableInfo, error: tableError } = await supabase.rpc(
        "execute_sql",
        {
          sql_query:
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'directory_users' ORDER BY ordinal_position;",
        },
      );

      console.log("[adminService.debugDatabaseAccess] Table structure query:", {
        tableInfo,
        tableError,
      });

      // Try to get row count from directory_users
      const { data: countData, error: countError } = await supabase.rpc(
        "execute_sql",
        {
          sql_query: "SELECT COUNT(*) as total_rows FROM directory_users;",
        },
      );

      console.log("[adminService.debugDatabaseAccess] Row count query:", {
        countData,
        countError,
      });

      return {
        connectivity: { testData, testError },
        tableStructure: { tableInfo, tableError },
        rowCount: { countData, countError },
      };
    } catch (error) {
      console.error("[adminService.debugDatabaseAccess] Debug failed:", error);
      return { error: error.message };
    }
  },

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
      console.log(
        "[adminService.triggerAzureAdSync] Invoking Azure AD sync edge function...",
      );

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-azure-ad-sync",
        {
          body: { manual: true },
        },
      );

      console.log("[adminService.triggerAzureAdSync] Edge function response:", {
        data,
        error,
      });

      if (error) {
        console.error(
          "[adminService.triggerAzureAdSync] Error triggering Azure AD sync:",
          error,
        );
        console.error("[adminService.triggerAzureAdSync] Error details:", {
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
        console.error(
          "[adminService.triggerAzureAdSync] Azure AD sync failed:",
          data.error,
        );
        return {
          success: false,
          message: data.error || "Azure AD sync failed",
        };
      }

      console.log(
        "[adminService.triggerAzureAdSync] Azure AD sync completed successfully:",
        data,
      );

      // After sync completes, refresh the sync logs to see if new entries were created
      setTimeout(async () => {
        console.log(
          "[adminService.triggerAzureAdSync] Refreshing sync logs after sync completion...",
        );
        const refreshedLogs = await this.getAzureSyncLogs();
        console.log(
          "[adminService.triggerAzureAdSync] Refreshed sync logs:",
          refreshedLogs,
        );
      }, 2000);

      return (
        data || {
          success: true,
          message: "Azure AD sync triggered successfully",
        }
      );
    } catch (error) {
      console.error(
        "[adminService.triggerAzureAdSync] Error triggering Azure AD sync:",
        error,
      );
      console.error(
        "[adminService.triggerAzureAdSync] Catch block error details:",
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      );
      return {
        success: false,
        message: `Unexpected error: ${error.message || "Failed to trigger Azure AD sync"}`,
      };
    }
  },

  async getDirectoryUsers(): Promise<any[]> {
    try {
      console.log(
        "[adminService.getDirectoryUsers] Starting to fetch directory users...",
      );

      // First, let's test basic connectivity and check if the table exists
      console.log("[adminService.getDirectoryUsers] Testing table access...");

      const { count, error: countError } = await supabase
        .from("directory_users")
        .select("*", { count: "exact", head: true });

      console.log("[adminService.getDirectoryUsers] Table count check:", {
        count,
        countError: countError
          ? {
              message: countError.message,
              code: countError.code,
              details: countError.details,
              hint: countError.hint,
            }
          : null,
      });

      if (countError) {
        console.error(
          "[adminService.getDirectoryUsers] Cannot access directory_users table:",
          countError,
        );

        if (countError.code === "42P01") {
          console.error(
            "[adminService.getDirectoryUsers] Table 'directory_users' does not exist!",
          );
        } else if (countError.code === "42501") {
          console.error(
            "[adminService.getDirectoryUsers] Permission denied - RLS policy issue",
          );
        }

        return [];
      }

      console.log(
        `[adminService.getDirectoryUsers] Table accessible with ${count} total records`,
      );

      if (count === 0) {
        console.warn(
          "[adminService.getDirectoryUsers] directory_users table is empty!",
        );
        console.warn(
          "[adminService.getDirectoryUsers] You may need to run the Azure AD sync to populate users.",
        );
        return [];
      }

      // Now fetch the actual data
      const { data, error } = await supabase
        .from("directory_users")
        .select("*")
        .order("last_synced", { ascending: false, nullsFirst: false });

      console.log("[adminService.getDirectoryUsers] Query result:", {
        dataExists: !!data,
        dataLength: data?.length || 0,
        errorExists: !!error,
        error: error
          ? {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            }
          : null,
      });

      if (error) {
        console.error(
          "[adminService.getDirectoryUsers] Error fetching directory users:",
          error,
        );

        // Provide specific guidance based on error type
        if (error.code === "42501") {
          console.error(
            "[adminService.getDirectoryUsers] RLS Policy Issue: Row Level Security is blocking access to directory_users table",
          );
          console.error(
            "[adminService.getDirectoryUsers] This might be resolved by running the migration: 20250603000001_allow_authenticated_users_read_directory_users.sql",
          );
        }

        return [];
      }

      console.log(
        "[adminService.getDirectoryUsers] Successfully fetched",
        data?.length || 0,
        "directory users",
      );

      if (data && data.length > 0) {
        console.log(
          "[adminService.getDirectoryUsers] Sample data (first 2 users):",
          data.slice(0, 2),
        );

        const syncStatuses = [...new Set(data.map((u) => u.sync_status))];
        const activeUsers = data.filter(
          (u) => u.sync_status === "active",
        ).length;
        const usersWithDisplayNames = data.filter((u) => u.display_name).length;

        console.log("[adminService.getDirectoryUsers] Data analysis:", {
          totalUsers: data.length,
          syncStatuses,
          activeUsers,
          usersWithDisplayNames,
          sampleActiveUser: data.find(
            (u) => u.sync_status === "active" && u.display_name,
          ),
        });

        // Check if user "Lienau" exists in any form
        const lienauUsers = data.filter(
          (u) =>
            (u.display_name &&
              u.display_name.toLowerCase().includes("lienau")) ||
            (u.email && u.email.toLowerCase().includes("lienau")),
        );

        if (lienauUsers.length > 0) {
          console.log(
            "[adminService.getDirectoryUsers] Found users matching 'Lienau':",
            lienauUsers,
          );
        } else {
          console.log(
            "[adminService.getDirectoryUsers] No users found matching 'Lienau'",
          );
          console.log(
            "[adminService.getDirectoryUsers] Sample display names:",
            data
              .slice(0, 5)
              .map((u) => u.display_name)
              .filter(Boolean),
          );
        }
      } else {
        console.warn(
          "[adminService.getDirectoryUsers] Query returned empty result despite count > 0",
        );
      }

      return data || [];
    } catch (error) {
      console.error(
        "[adminService.getDirectoryUsers] Catch block error:",
        error,
      );
      console.error("[adminService.getDirectoryUsers] Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      return [];
    }
  },

  async getAzureSyncLogs(): Promise<any[]> {
    try {
      console.log(
        "[adminService.getAzureSyncLogs] Fetching Azure sync logs...",
      );

      // First, let's check if the table exists and we can access it
      console.log("[adminService.getAzureSyncLogs] Testing table access...");

      // Try a simple count query first
      const { count, error: countError } = await supabase
        .from("azure_sync_logs")
        .select("*", { count: "exact", head: true });

      console.log("[adminService.getAzureSyncLogs] Count query result:", {
        count,
        countError,
      });

      if (countError) {
        console.error(
          "[adminService.getAzureSyncLogs] Count query failed:",
          countError,
        );
        console.error("[adminService.getAzureSyncLogs] Count error details:", {
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
          code: countError.code,
        });
        return [];
      }

      console.log(
        `[adminService.getAzureSyncLogs] Table accessible, found ${count} total records`,
      );

      // Now try the actual query
      const { data, error } = await supabase
        .from("azure_sync_logs")
        .select("*")
        .order("sync_started_at", { ascending: false })
        .limit(10);

      console.log("[adminService.getAzureSyncLogs] Query result:", {
        data: data,
        error: error,
        dataLength: data?.length || 0,
      });

      if (error) {
        console.error(
          "[adminService.getAzureSyncLogs] Error fetching Azure sync logs:",
          error,
        );
        console.error("[adminService.getAzureSyncLogs] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // Check if it's an RLS policy issue
        if (error.code === "42501" || error.message?.includes("policy")) {
          console.error(
            "[adminService.getAzureSyncLogs] RLS Policy Issue: The azure_sync_logs table may have Row Level Security enabled but no policy allows SELECT operations for the current user.",
          );
        }

        return [];
      }

      console.log(
        "[adminService.getAzureSyncLogs] Successfully fetched",
        data?.length || 0,
        "sync logs",
      );

      if (data && data.length > 0) {
        console.log(
          "[adminService.getAzureSyncLogs] Sample log data:",
          data.slice(0, 2),
        );
        console.log("[adminService.getAzureSyncLogs] Sync statuses found:", [
          ...new Set(data.map((log) => log.sync_status)),
        ]);
      } else {
        console.log(
          "[adminService.getAzureSyncLogs] No sync logs found in database - this could mean:",
        );
        console.log("  1. No syncs have been run yet");
        console.log("  2. Logs were cleared");
        console.log("  3. RLS policy is filtering results");
        console.log("  4. The sync function isn't writing to the logs table");
      }

      return data || [];
    } catch (error) {
      console.error(
        "[adminService.getAzureSyncLogs] Catch block error:",
        error,
      );
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
