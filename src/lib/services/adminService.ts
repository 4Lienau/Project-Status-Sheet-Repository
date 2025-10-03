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
      // Cleanup stale sessions more aggressively
      try {
        const { data: cleanupResult } = await supabase.rpc(
          "cleanup_stale_sessions",
        );
        console.log(
          "[adminService.getActiveUsers] Cleaned up stale sessions:",
          cleanupResult,
        );
      } catch (cleanupError) {
        console.warn(
          "[adminService.getActiveUsers] Session cleanup warning:",
          cleanupError,
        );
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

      // Calculate average session time using improved database function
      let avgSessionTime = 0;

      console.log(
        "[adminService.getUsageMetrics] Calculating average session time:",
        {
          totalSessionTime,
          userActivityDataLength: userActivityData?.length || 0,
        },
      );

      // First cleanup inactive sessions
      try {
        await supabase.rpc("cleanup_inactive_sessions");
      } catch (cleanupError) {
        console.warn(
          "[adminService.getUsageMetrics] Session cleanup warning:",
          cleanupError,
        );
      }

      // Use the new session statistics function
      try {
        const { data: sessionStats, error: statsError } = await supabase.rpc(
          "get_session_statistics",
        );

        console.log("[adminService.getUsageMetrics] Session statistics:", {
          sessionStats,
          statsError,
        });

        if (!statsError && sessionStats && sessionStats.length > 0) {
          const stats = sessionStats[0];
          avgSessionTime = Number(stats.avg_session_minutes) || 0;

          console.log(
            "[adminService.getUsageMetrics] Using database function result:",
            {
              avgSessionTime,
              totalSessions: stats.total_sessions,
              totalSessionMinutes: stats.total_session_minutes,
              activeSessions: stats.active_sessions,
            },
          );
        }
      } catch (statsError) {
        console.warn(
          "[adminService.getUsageMetrics] Error getting session statistics:",
          statsError,
        );
      }

      // Fallback calculation if database function fails
      if (
        avgSessionTime === 0 &&
        userActivityData &&
        userActivityData.length > 0
      ) {
        const usersWithActivity = userActivityData.filter(
          (user) => user.total_session_time > 0,
        );

        if (usersWithActivity.length > 0) {
          const totalSessions = usersWithActivity.reduce(
            (sum, user) => sum + Math.max(user.login_count || 1, 1),
            0,
          );

          if (totalSessions > 0 && totalSessionTime > 0) {
            avgSessionTime = Math.round(totalSessionTime / totalSessions);
            console.log(
              "[adminService.getUsageMetrics] Fallback calculation:",
              {
                avgSessionTime,
                totalSessionTime,
                totalSessions,
                usersWithActivity: usersWithActivity.length,
              },
            );
          }
        }
      }

      console.log(
        "[adminService.getUsageMetrics] Final average session time:",
        avgSessionTime,
      );

      // Get daily active users for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyData, error: dailyError } = await supabase
        .from("usage_metrics")
        .select("date, user_id")
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
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
      // First, end ALL existing active sessions for this user to prevent duplicates
      const { data: existingSessions, error: queryError } = await supabase
        .from("user_sessions")
        .select("id, session_start, last_activity")
        .eq("user_id", userId)
        .eq("is_active", true);

      const { error: endSessionsError } = await supabase
        .from("user_sessions")
        .update({
          is_active: false,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_active", true);

      // Create new session
      const sessionData = {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true,
        session_start: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_sessions")
        .insert(sessionData)
        .select("id, user_id, session_start, last_activity, is_active")
        .single();

      if (error) {
        return null;
      }

      // Update daily login count
      try {
        await supabase.rpc("update_daily_usage_metrics", {
          p_user_id: userId,
          p_activity_type: "login",
        });
      } catch (metricsError) {
        // Silently ignore
      }

      return data.id;
    } catch (error) {
      return null;
    }
  },

  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
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
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async endUserSession(sessionId: string): Promise<boolean> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 5000);
      });

      const updatePromise = supabase
        .from("user_sessions")
        .update({
          is_active: false,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      // Return true anyway to prevent blocking the UI
      return true;
    } catch (error) {
      // Return true to prevent blocking the UI on network errors
      return true;
    }
  },

  async endAllUserSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("end_user_sessions", {
        p_user_id: userId,
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
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
      // Validate inputs
      if (!userId || !activityType) {
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
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 5000);
      });

      const insertPromise = supabase
        .from("user_activity_logs")
        .insert({
          user_id: userId,
          session_id: validSessionId,
          activity_type: activityType,
          activity_data: activityData,
          page_url: pageUrl,
        })
        .select();

      const { data: insertedData, error } = await Promise.race([
        insertPromise,
        timeoutPromise,
      ]);

      if (error || !insertedData || insertedData.length === 0) {
        // Return true to prevent blocking the UI
        return true;
      }

      // Update daily metrics with improved error handling
      try {
        await supabase.rpc("update_daily_usage_metrics", {
          p_user_id: userId,
          p_activity_type: activityType,
        });
      } catch (metricsError) {
        // Silently ignore
      }

      return true;
    } catch (error) {
      // Return true to prevent blocking the UI on network errors
      return true;
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

  async debugDatabaseAccess(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    try {
      console.log(
        "[adminService.debugDatabaseAccess] Starting database access diagnostics...",
      );

      const diagnostics = {
        timestamp: new Date().toISOString(),
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
      };

      // Test 1: Basic connection
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from("profiles")
          .select("count", { count: "exact", head: true });

        diagnostics.tests.push({
          name: "Database Connection",
          status: connectionError ? "FAILED" : "PASSED",
          details: connectionError || "Connection successful",
        });
        diagnostics.summary.total++;
        if (!connectionError) diagnostics.summary.passed++;
        else diagnostics.summary.failed++;
      } catch (error) {
        diagnostics.tests.push({
          name: "Database Connection",
          status: "FAILED",
          details: error.message,
        });
        diagnostics.summary.total++;
        diagnostics.summary.failed++;
      }

      // Test 2: Profiles table access
      try {
        const { data: profilesTest, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .limit(1);

        diagnostics.tests.push({
          name: "Profiles Table Access",
          status: profilesError ? "FAILED" : "PASSED",
          details: profilesError || "Table accessible",
        });
        diagnostics.summary.total++;
        if (!profilesError) diagnostics.summary.passed++;
        else diagnostics.summary.failed++;
      } catch (error) {
        diagnostics.tests.push({
          name: "Profiles Table Access",
          status: "FAILED",
          details: error.message,
        });
        diagnostics.summary.total++;
        diagnostics.summary.failed++;
      }

      // Test 3: User sessions table access
      try {
        const { data: sessionsTest, error: sessionsError } = await supabase
          .from("user_sessions")
          .select("id")
          .limit(1);

        diagnostics.tests.push({
          name: "User Sessions Table Access",
          status: sessionsError ? "FAILED" : "PASSED",
          details: sessionsError || "Table accessible",
        });
        diagnostics.summary.total++;
        if (!sessionsError) diagnostics.summary.passed++;
        else diagnostics.summary.failed++;
      } catch (error) {
        diagnostics.tests.push({
          name: "User Sessions Table Access",
          status: "FAILED",
          details: error.message,
        });
        diagnostics.summary.total++;
        diagnostics.summary.failed++;
      }

      // Test 4: Usage metrics table access
      try {
        const { data: metricsTest, error: metricsError } = await supabase
          .from("usage_metrics")
          .select("id")
          .limit(1);

        diagnostics.tests.push({
          name: "Usage Metrics Table Access",
          status: metricsError ? "FAILED" : "PASSED",
          details: metricsError || "Table accessible",
        });
        diagnostics.summary.total++;
        if (!metricsError) diagnostics.summary.passed++;
        else diagnostics.summary.failed++;
      } catch (error) {
        diagnostics.tests.push({
          name: "Usage Metrics Table Access",
          status: "FAILED",
          details: error.message,
        });
        diagnostics.summary.total++;
        diagnostics.summary.failed++;
      }

      // Test 5: Database functions access
      try {
        const { data: functionTest, error: functionError } = await supabase.rpc(
          "get_session_statistics",
        );

        diagnostics.tests.push({
          name: "Database Functions Access",
          status: functionError ? "FAILED" : "PASSED",
          details: functionError || "Functions accessible",
        });
        diagnostics.summary.total++;
        if (!functionError) diagnostics.summary.passed++;
        else diagnostics.summary.failed++;
      } catch (error) {
        diagnostics.tests.push({
          name: "Database Functions Access",
          status: "FAILED",
          details: error.message,
        });
        diagnostics.summary.total++;
        diagnostics.summary.failed++;
      }

      const success = diagnostics.summary.failed === 0;
      const message = success
        ? `All ${diagnostics.summary.total} database access tests passed`
        : `${diagnostics.summary.failed}/${diagnostics.summary.total} database access tests failed`;

      console.log("[adminService.debugDatabaseAccess] Diagnostics completed:", {
        success,
        message,
        summary: diagnostics.summary,
      });

      return {
        success,
        message,
        details: diagnostics,
      };
    } catch (error) {
      console.error("[adminService.debugDatabaseAccess] Catch error:", error);
      return {
        success: false,
        message: `Database diagnostics failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  },

  // Reminder Email Management
  async triggerReminderEmails(options: {
    dryRun?: boolean;
    minDaysSinceUpdate?: number;
    cooldownDays?: number;
    testEmail?: string; // Add test email parameter
  } = {}) {
    try {
      console.log('[adminService.triggerReminderEmails] Invoking edge function with options:', options);
      
      const { data, error } = await supabase.functions.invoke(
        'supabase-functions-send-reminder-emails',
        {
          body: {
            manual: true,
            dryRun: options.dryRun ?? false,
            minDaysSinceUpdate: options.minDaysSinceUpdate ?? 14,
            cooldownDays: options.cooldownDays ?? 7,
            testEmail: options.testEmail, // Pass test email if provided
          },
        }
      );

      console.log('[adminService.triggerReminderEmails] Edge function response:', { data, error });

      if (error) {
        console.error('[adminService.triggerReminderEmails] Edge function error:', error);
        throw new Error(error.message || 'Failed to trigger reminder emails');
      }

      return data;
    } catch (error) {
      console.error('[adminService.triggerReminderEmails] Catch error:', error);
      throw error;
    }
  },

  async getReminderEmailLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('reminder_emails')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getReminderEmailStats() {
    const { data, error } = await supabase
      .from('reminder_emails')
      .select('status, sent_at')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      sent: data.filter(r => r.status === 'sent').length,
      failed: data.filter(r => r.status === 'failed').length,
      last30Days: data.length,
    };

    return stats;
  },
};