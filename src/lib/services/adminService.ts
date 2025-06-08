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

  async testAzureAdSync(): Promise<{
    success: boolean;
    message: string;
    results?: any;
  }> {
    try {
      console.log(
        "[adminService.testAzureAdSync] Running Azure AD sync diagnostics...",
      );

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-test-azure-sync",
        {
          body: { test: true },
        },
      );

      console.log("[adminService.testAzureAdSync] Test response:", {
        data,
        error,
      });

      if (error) {
        console.error(
          "[adminService.testAzureAdSync] Error running diagnostics:",
          error,
        );
        return {
          success: false,
          message: `Diagnostics error: ${error.message || "Unknown error"} ${error.details ? `(${error.details})` : ""}`,
        };
      }

      return {
        success: data?.summary?.failed === 0,
        message:
          data?.summary?.failed === 0
            ? `All ${data.summary.total} diagnostic tests passed`
            : `${data.summary.failed}/${data.summary.total} diagnostic tests failed`,
        results: data,
      };
    } catch (error) {
      console.error(
        "[adminService.testAzureAdSync] Error running diagnostics:",
        error,
      );
      return {
        success: false,
        message: `Unexpected error: ${error.message || "Failed to run diagnostics"}`,
      };
    }
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
      const { count, error: countError } = await supabase
        .from("directory_users")
        .select("*", { count: "exact", head: true });

      if (countError) {
        console.error("Error accessing directory_users table:", countError);
        return [];
      }

      if (count === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("directory_users")
        .select("*")
        .order("last_synced", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching directory users:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getDirectoryUsers:", error);
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

  // Usage Analytics Methods
  async getActiveUsers(): Promise<any[]> {
    try {
      // Cleanup stale sessions
      try {
        await supabase.rpc("cleanup_stale_sessions");
      } catch (cleanupError) {
        // Silently handle cleanup errors
      }

      // Use a 3-minute window for active users
      const threeMinutesAgo = new Date();
      threeMinutesAgo.setMinutes(threeMinutesAgo.getMinutes() - 3);

      // Query user_sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select(
          "id, user_id, session_start, last_activity, is_active, created_at",
        )
        .eq("is_active", true)
        .gte("last_activity", threeMinutesAgo.toISOString())
        .order("last_activity", { ascending: false });

      if (sessionsError || !sessionsData || sessionsData.length === 0) {
        return [];
      }

      // Get unique user IDs from active sessions
      const uniqueUserIds = [...new Set(sessionsData.map((s) => s.user_id))];

      // Query profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", uniqueUserIds);

      if (profilesError) {
        return [];
      }

      // Join the data and deduplicate by user_id
      const uniqueUsers = [];
      const seenUsers = new Set();

      for (const session of sessionsData) {
        if (!seenUsers.has(session.user_id)) {
          seenUsers.add(session.user_id);

          const profile = profilesData?.find((p) => p.id === session.user_id);
          const sessionStart = new Date(session.session_start);
          const lastActivity = new Date(session.last_activity);
          const sessionDurationMinutes = Math.round(
            (lastActivity.getTime() - sessionStart.getTime()) / (1000 * 60),
          );

          uniqueUsers.push({
            user_id: session.user_id,
            email: profile?.email || "Unknown",
            full_name: profile?.full_name || "Unknown User",
            session_start: session.session_start,
            last_activity: session.last_activity,
            session_duration_minutes: Math.max(sessionDurationMinutes, 0),
            session_id: session.id,
          });
        }
      }

      return uniqueUsers;
    } catch (error) {
      console.error("Error in getActiveUsers:", error);
      return [];
    }
  },

  async getUserLoginStats(): Promise<any[]> {
    try {
      // Try the comprehensive function first
      const { data: comprehensiveData, error: comprehensiveError } =
        await supabase.rpc("get_comprehensive_user_stats");

      if (
        !comprehensiveError &&
        comprehensiveData &&
        comprehensiveData.length > 0
      ) {
        return comprehensiveData;
      }

      // Try the standard function
      const { data: functionData, error: functionError } = await supabase.rpc(
        "get_user_login_statistics",
      );

      if (!functionError && functionData && functionData.length > 0) {
        return functionData;
      }

      // Fallback approach
      const { data: usageData, error: usageError } = await supabase
        .from("usage_metrics")
        .select("user_id, login_count, last_login, total_session_time_minutes")
        .gt("login_count", 0);

      if (usageError || !usageData || usageData.length === 0) {
        return [];
      }

      const userIds = usageData.map((u) => u.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, updated_at")
        .in("id", userIds);

      if (profilesError) {
        return [];
      }

      const combinedData = usageData
        .map((usage) => {
          const profile = profilesData?.find((p) => p.id === usage.user_id);
          if (!profile) return null;

          return {
            user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            total_logins: usage.login_count || 0,
            last_login: usage.last_login,
            total_session_time_minutes: usage.total_session_time_minutes || 0,
            account_created: profile.updated_at,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a.last_login && !b.last_login) return 0;
          if (!a.last_login) return 1;
          if (!b.last_login) return -1;
          return (
            new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
          );
        });

      return combinedData;
    } catch (error) {
      console.error("Error in getUserLoginStats:", error);
      return [];
    }
  },

  async getUsageMetrics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    avgSessionTime: number;
    totalPageViews: number;
    totalProjects: number;
    dailyActiveUsers: any[];
    topUsers: any[];
  }> {
    try {
      console.log(
        "[adminService.getUsageMetrics] Calculating usage metrics...",
      );

      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get currently active users
      const activeUsersData = await this.getActiveUsers();
      const activeUsers = activeUsersData.length;

      // Get user activity summary using the new function
      const { data: userActivityData, error: activityError } =
        await supabase.rpc("get_user_activity_summary");

      if (activityError) {
        console.warn(
          "[adminService.getUsageMetrics] Activity summary error:",
          activityError,
        );
      }

      console.log(
        "[adminService.getUsageMetrics] User activity data:",
        userActivityData,
      );

      // Calculate aggregated stats from the activity summary
      const totalSessionTime =
        userActivityData?.reduce(
          (sum, user) => sum + (user.total_session_time || 0),
          0,
        ) || 0;
      const totalPageViews =
        userActivityData?.reduce(
          (sum, user) => sum + (user.total_page_views || 0),
          0,
        ) || 0;

      // Get project creation count from activity logs
      let totalProjectsFromMetrics = 0;
      try {
        console.log(
          "[adminService.getUsageMetrics] 🔍 Querying total project creation count...",
        );

        const { count: projectCreationCount, error: countError } =
          await supabase
            .from("user_activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("activity_type", "project_creation");

        console.log(
          "[adminService.getUsageMetrics] 🔍 Project creation count query result:",
          {
            projectCreationCount,
            countError,
          },
        );

        if (countError) {
          console.error(
            "[adminService.getUsageMetrics] ❌ Error in count query:",
            countError,
          );
          throw countError;
        }

        totalProjectsFromMetrics = projectCreationCount || 0;
        console.log(
          "[adminService.getUsageMetrics] ✅ Project creation count from activity logs:",
          totalProjectsFromMetrics,
        );

        // Additional debug: Get recent project creation entries
        if (totalProjectsFromMetrics === 0) {
          console.log(
            "[adminService.getUsageMetrics] 🔍 Zero count detected, checking recent entries...",
          );

          const { data: recentEntries, error: recentError } = await supabase
            .from("user_activity_logs")
            .select("*")
            .eq("activity_type", "project_creation")
            .order("created_at", { ascending: false })
            .limit(10);

          console.log(
            "[adminService.getUsageMetrics] 🔍 Recent project creation entries:",
            {
              recentEntries,
              recentError,
              count: recentEntries?.length || 0,
            },
          );
        }
      } catch (error) {
        console.warn(
          "[adminService.getUsageMetrics] ⚠️ Error getting project creation count:",
          error,
        );
        // Fallback to user activity data if available
        totalProjectsFromMetrics =
          userActivityData?.reduce(
            (sum, user) => sum + (user.total_projects || 0),
            0,
          ) || 0;
        console.log(
          "[adminService.getUsageMetrics] 📊 Using fallback count:",
          totalProjectsFromMetrics,
        );
      }

      // Calculate average session time based on users with activity
      const usersWithActivity =
        userActivityData?.filter((user) => user.total_session_time > 0) || [];

      // Calculate weighted average session time (total time / total sessions)
      let avgSessionTime = 0;
      if (usersWithActivity.length > 0) {
        const totalSessions = usersWithActivity.reduce(
          (sum, user) => sum + (user.login_count || 1),
          0,
        );
        avgSessionTime =
          totalSessions > 0
            ? Math.round(totalSessionTime / totalSessions)
            : Math.round(totalSessionTime / usersWithActivity.length);
      }

      // Get daily active users for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dailyData, error: dailyError } = await supabase
        .from("usage_metrics")
        .select("date, user_id")
        .gte("date", sevenDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (dailyError) {
        console.warn(
          "[adminService.getUsageMetrics] Daily data error:",
          dailyError,
        );
      }

      // Group by date for daily active users
      const dailyActiveUsers = [];
      const dailyGroups =
        dailyData?.reduce(
          (groups, item) => {
            const date = item.date;
            if (!groups[date]) {
              groups[date] = new Set();
            }
            groups[date].add(item.user_id);
            return groups;
          },
          {} as Record<string, Set<string>>,
        ) || {};

      for (const [date, userSet] of Object.entries(dailyGroups)) {
        dailyActiveUsers.push({
          date,
          activeUsers: userSet.size,
        });
      }

      // Get project creation counts per user for top users calculation
      console.log(
        "[adminService.getUsageMetrics] 🔍 Querying project creation data...",
      );
      const { data: projectCreationData, error: projectCreationError } =
        await supabase
          .from("user_activity_logs")
          .select("user_id, activity_data, created_at")
          .eq("activity_type", "project_creation");

      console.log(
        "[adminService.getUsageMetrics] 🔍 Project creation query result:",
        {
          projectCreationData,
          projectCreationError,
          count: projectCreationData?.length || 0,
        },
      );

      if (projectCreationError) {
        console.warn(
          "[adminService.getUsageMetrics] ⚠️ Error getting project creation data for top users:",
          projectCreationError,
        );
      }

      // Count projects per user
      const projectCountsByUser = {};
      projectCreationData?.forEach((log) => {
        projectCountsByUser[log.user_id] =
          (projectCountsByUser[log.user_id] || 0) + 1;
      });

      // Convert user activity data to the expected format for top users
      const topUsers = (userActivityData || [])
        .map((user) => ({
          user_id: user.user_id,
          totalTime: user.total_session_time || 0,
          totalPageViews: user.total_page_views || 0,
          totalProjects: projectCountsByUser[user.user_id] || 0,
        }))
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 5);

      const result = {
        totalUsers: totalUsers || 0,
        activeUsers,
        avgSessionTime,
        totalPageViews,
        totalProjects: totalProjectsFromMetrics,
        dailyActiveUsers,
        topUsers,
      };

      console.log("[adminService.getUsageMetrics] Calculated metrics:", result);
      return result;
    } catch (error) {
      console.error("[adminService.getUsageMetrics] Catch error:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        avgSessionTime: 0,
        totalPageViews: 0,
        totalProjects: 0,
        dailyActiveUsers: [],
        topUsers: [],
      };
    }
  },

  async startUserSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    try {
      console.log(
        "[adminService.startUserSession] Starting session for user:",
        {
          userId,
          timestamp: new Date().toISOString(),
          userAgent: userAgent?.substring(0, 50) + "...",
        },
      );

      // First, end ALL existing active sessions for this user to prevent duplicates
      console.log(
        "[adminService.startUserSession] Ending all existing active sessions for user:",
        userId,
      );

      const { data: existingSessions, error: queryError } = await supabase
        .from("user_sessions")
        .select("id, session_start, last_activity")
        .eq("user_id", userId)
        .eq("is_active", true);

      console.log("[adminService.startUserSession] Found existing sessions:", {
        count: existingSessions?.length || 0,
        sessions: existingSessions?.map((s) => ({
          id: s.id,
          session_start: s.session_start,
          last_activity: s.last_activity,
        })),
        queryError,
      });

      const { error: endSessionsError } = await supabase
        .from("user_sessions")
        .update({
          is_active: false,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (endSessionsError) {
        console.error(
          "[adminService.startUserSession] Error ending existing sessions:",
          endSessionsError,
        );
      } else {
        console.log(
          "[adminService.startUserSession] Successfully ended",
          existingSessions?.length || 0,
          "existing sessions",
        );
      }

      // Create new session
      const sessionData = {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true,
        session_start: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      console.log(
        "[adminService.startUserSession] Creating new session with data:",
        {
          user_id: sessionData.user_id,
          is_active: sessionData.is_active,
          session_start: sessionData.session_start,
          last_activity: sessionData.last_activity,
        },
      );

      const { data, error } = await supabase
        .from("user_sessions")
        .insert(sessionData)
        .select("id, user_id, session_start, last_activity, is_active")
        .single();

      console.log("[adminService.startUserSession] Session creation result:", {
        data,
        error,
        success: !!data && !error,
      });

      if (error) {
        console.error(
          "[adminService.startUserSession] Error creating session:",
          {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
        );
        return null;
      }

      // Update daily login count
      try {
        await supabase.rpc("update_daily_usage_metrics", {
          p_user_id: userId,
          p_activity_type: "login",
        });
        console.log("[adminService.startUserSession] Updated daily metrics");
      } catch (metricsError) {
        console.warn(
          "[adminService.startUserSession] Metrics update failed:",
          metricsError,
        );
      }

      console.log(
        "[adminService.startUserSession] Session started successfully:",
        {
          sessionId: data.id,
          userId: data.user_id,
          isActive: data.is_active,
        },
      );

      return data.id;
    } catch (error) {
      console.error("[adminService.startUserSession] Catch error:", {
        error,
        message: error.message,
        stack: error.stack,
      });
      return null;
    }
  },

  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      console.log(
        "[adminService.updateSessionActivity] Updating activity for session:",
        sessionId,
      );

      const { data, error } = await supabase
        .from("user_sessions")
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("is_active", true)
        .select("user_id, last_activity");

      if (error) {
        console.error("[adminService.updateSessionActivity] Error:", error);
        return false;
      }

      if (data && data.length > 0) {
        console.log(
          "[adminService.updateSessionActivity] Activity updated for user:",
          data[0].user_id,
        );
      }

      return true;
    } catch (error) {
      console.error("[adminService.updateSessionActivity] Catch error:", error);
      return false;
    }
  },

  async endUserSession(sessionId: string): Promise<boolean> {
    try {
      console.log("[adminService.endUserSession] Ending session:", sessionId);

      const { error } = await supabase
        .from("user_sessions")
        .update({
          is_active: false,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("[adminService.endUserSession] Error:", error);
        return false;
      }

      console.log(
        "[adminService.endUserSession] Session ended successfully:",
        sessionId,
      );
      return true;
    } catch (error) {
      console.error("[adminService.endUserSession] Catch error:", error);
      return false;
    }
  },

  async endAllUserSessions(userId: string): Promise<boolean> {
    try {
      console.log(
        "[adminService.endAllUserSessions] Ending all sessions for user:",
        userId,
      );

      const { error } = await supabase.rpc("end_user_sessions", {
        p_user_id: userId,
      });

      if (error) {
        console.error("[adminService.endAllUserSessions] Error:", error);
        return false;
      }

      console.log(
        "[adminService.endAllUserSessions] All sessions ended for user:",
        userId,
      );
      return true;
    } catch (error) {
      console.error("[adminService.endAllUserSessions] Catch error:", error);
      return false;
    }
  },

  async logUserActivity(
    userId: string,
    sessionId: string,
    activityType: string,
    activityData?: any,
    pageUrl?: string,
  ): Promise<boolean> {
    try {
      console.log("[adminService.logUserActivity] Starting activity logging:", {
        userId,
        sessionId,
        activityType,
        activityData,
        pageUrl,
        timestamp: new Date().toISOString(),
      });

      // Enhanced logging for project creation specifically
      if (activityType === "project_creation") {
        console.log(
          "[adminService.logUserActivity] 🎯 PROJECT CREATION TRACKING:",
          {
            userId,
            sessionId,
            activityType,
            projectId: activityData?.project_id,
            projectTitle: activityData?.project_title,
            department: activityData?.department,
            timestamp: new Date().toISOString(),
          },
        );
      }

      // Validate inputs
      if (!userId) {
        console.error("[adminService.logUserActivity] ❌ userId is required");
        return false;
      }

      if (!activityType) {
        console.error(
          "[adminService.logUserActivity] ❌ activityType is required",
        );
        return false;
      }

      // Validate or generate session ID
      let validSessionId = sessionId;
      if (
        !sessionId ||
        sessionId === "system" ||
        sessionId === "test-session"
      ) {
        validSessionId =
          self.crypto?.randomUUID?.() ||
          "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        console.log(
          "[adminService.logUserActivity] Generated new session ID:",
          validSessionId,
          "(original was:",
          sessionId,
          ")",
        );
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(validSessionId)) {
        validSessionId =
          self.crypto?.randomUUID?.() ||
          "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        console.log(
          "[adminService.logUserActivity] Invalid UUID format, generated new session ID:",
          validSessionId,
        );
      }

      console.log(
        "[adminService.logUserActivity] Inserting into user_activity_logs table...",
      );
      const { data: insertedData, error } = await supabase
        .from("user_activity_logs")
        .insert({
          user_id: userId,
          session_id: validSessionId,
          activity_type: activityType,
          activity_data: activityData,
          page_url: pageUrl,
        })
        .select();

      console.log("[adminService.logUserActivity] Insert result:", {
        insertedData,
        error,
        success: !error && insertedData,
      });

      if (error) {
        console.error(
          "[adminService.logUserActivity] ❌ Database insert error:",
          {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
        );
        return false;
      }

      if (!insertedData || insertedData.length === 0) {
        console.error(
          "[adminService.logUserActivity] ❌ No data returned from insert",
        );
        return false;
      }

      console.log(
        "[adminService.logUserActivity] ✅ Successfully inserted activity log:",
        insertedData[0].id,
      );

      // Update daily metrics with improved error handling
      try {
        console.log(
          "[adminService.logUserActivity] Updating daily usage metrics...",
        );

        // Use the improved function that returns a boolean
        const { data: metricsResult, error: metricsError } = await supabase.rpc(
          "update_daily_usage_metrics",
          {
            p_user_id: userId,
            p_activity_type: activityType,
          },
        );

        console.log("[adminService.logUserActivity] Metrics update result:", {
          metricsResult,
          metricsError,
          success: metricsResult === true,
        });

        if (metricsError) {
          console.error(
            "[adminService.logUserActivity] ❌ Metrics update failed:",
            {
              error: metricsError,
              message: metricsError.message,
              details: metricsError.details,
              hint: metricsError.hint,
              code: metricsError.code,
            },
          );
        } else if (metricsResult === true) {
          console.log(
            "[adminService.logUserActivity] ✅ Successfully updated daily metrics for:",
            activityType,
          );
        } else {
          console.warn(
            "[adminService.logUserActivity] ⚠️ Metrics update returned false - check database function logs",
          );
        }
      } catch (metricsError) {
        console.error(
          "[adminService.logUserActivity] ❌ Metrics update exception:",
          {
            error: metricsError,
            message: metricsError.message,
            stack: metricsError.stack,
          },
        );
      }

      // For project creation, also verify the tracking worked
      if (activityType === "project_creation") {
        try {
          console.log(
            "[adminService.logUserActivity] 🔍 Verifying project creation was tracked...",
          );
          const { data: verifyData, error: verifyError } = await supabase
            .from("user_activity_logs")
            .select("*")
            .eq("activity_type", "project_creation")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);

          console.log(
            "[adminService.logUserActivity] 🔍 Recent project creation logs:",
            {
              verifyData,
              verifyError,
              count: verifyData?.length || 0,
            },
          );

          // Also check usage metrics to see if project count was updated
          const { data: metricsVerify, error: metricsVerifyError } =
            await supabase
              .from("usage_metrics")
              .select("project_count, date")
              .eq("user_id", userId)
              .eq("date", new Date().toISOString().split("T")[0])
              .single();

          console.log(
            "[adminService.logUserActivity] 🔍 Today's usage metrics:",
            {
              metricsVerify,
              metricsVerifyError,
              projectCount: metricsVerify?.project_count,
            },
          );
        } catch (verifyError) {
          console.warn(
            "[adminService.logUserActivity] Verification query failed:",
            verifyError,
          );
        }
      }

      return true;
    } catch (error) {
      console.error("[adminService.logUserActivity] ❌ Catch error:", {
        error,
        message: error.message,
        stack: error.stack,
        userId,
        activityType,
      });
      return false;
    }
  },

  async getCurrentUserActiveSession(userId: string): Promise<string | null> {
    try {
      console.log(
        "[adminService.getCurrentUserActiveSession] Getting active session for user:",
        userId,
      );

      const { data: activeSessions, error } = await supabase
        .from("user_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_activity", { ascending: false })
        .limit(1);

      if (error) {
        console.error(
          "[adminService.getCurrentUserActiveSession] Error getting active session:",
          error,
        );
        return null;
      }

      if (!activeSessions || activeSessions.length === 0) {
        console.log(
          "[adminService.getCurrentUserActiveSession] No active session found for user:",
          userId,
        );
        return null;
      }

      const sessionId = activeSessions[0].id;
      console.log(
        "[adminService.getCurrentUserActiveSession] Found active session:",
        sessionId,
      );
      return sessionId;
    } catch (error) {
      console.error(
        "[adminService.getCurrentUserActiveSession] Catch error:",
        error,
      );
      return null;
    }
  },

  // AI Usage Analytics Methods
  async getAIUsageOverview(): Promise<{
    totalAIUsage: number;
    uniqueAIUsers: number;
    adoptionRate: number;
    mostPopularFeature: string;
  }> {
    try {
      console.log(
        "[adminService.getAIUsageOverview] Fetching AI usage overview...",
      );

      // Get total users count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get AI usage data
      const { data: aiUsageData, error: aiUsageError } = await supabase
        .from("ai_usage_tracking")
        .select("user_id, feature_type");

      if (aiUsageError) {
        console.error(
          "[adminService.getAIUsageOverview] Error fetching AI usage data:",
          aiUsageError,
        );
        return {
          totalAIUsage: 0,
          uniqueAIUsers: 0,
          adoptionRate: 0,
          mostPopularFeature: "None",
        };
      }

      const totalAIUsage = aiUsageData?.length || 0;
      const uniqueAIUsers = new Set(aiUsageData?.map((u) => u.user_id) || [])
        .size;
      const adoptionRate = totalUsers
        ? Math.round((uniqueAIUsers / totalUsers) * 100)
        : 0;

      // Find most popular feature
      const featureCounts = {};
      aiUsageData?.forEach((usage) => {
        featureCounts[usage.feature_type] =
          (featureCounts[usage.feature_type] || 0) + 1;
      });

      const mostPopularFeature = Object.keys(featureCounts).reduce(
        (a, b) => (featureCounts[a] > featureCounts[b] ? a : b),
        "None",
      );

      const result = {
        totalAIUsage,
        uniqueAIUsers,
        adoptionRate,
        mostPopularFeature,
      };

      console.log(
        "[adminService.getAIUsageOverview] AI usage overview:",
        result,
      );

      return result;
    } catch (error) {
      console.error("[adminService.getAIUsageOverview] Catch error:", error);
      return {
        totalAIUsage: 0,
        uniqueAIUsers: 0,
        adoptionRate: 0,
        mostPopularFeature: "None",
      };
    }
  },
};
