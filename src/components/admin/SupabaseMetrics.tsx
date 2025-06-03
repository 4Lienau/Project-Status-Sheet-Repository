/**
 * File: SupabaseMetrics.tsx
 * Purpose: Admin component for displaying Supabase database metrics and statistics
 * Description: This component provides a dashboard view of key metrics from the Supabase project,
 * including user counts, project counts, storage usage, and database size. It also includes charts
 * for daily active users and database table sizes, and checks for the existence of required database
 * functions.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Supabase client for database operations
 * - Recharts for data visualization
 * - Lucide icons
 *
 * Called by: src/pages/AdminPage.tsx
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Database,
  Users,
  FileText,
  HardDrive,
  Play,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw } from "lucide-react";
import { adminService } from "@/lib/services/adminService";

const SupabaseMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isCheckingDueSync, setIsCheckingDueSync] = useState(false);
  const { toast } = useToast();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalTables: 0,
    totalDatabaseSize: 0,
    dailyActiveUsers: [],
    databaseSize: [],
  });

  const [authFunctionStatus, setAuthFunctionStatus] = useState({
    exists: false,
    lastChecked: null,
    error: null,
  });

  const [syncConfig, setSyncConfig] = useState(null);

  const checkAuthFunction = async () => {
    try {
      // Try to call the function to see if it exists
      const { data, error } = await supabase.rpc("get_auth_users_data");

      console.log("Auth function check result:", { data, error });

      if (error) {
        console.log("Auth function error:", error.message);
        if (error.message.includes("function does not exist")) {
          console.log("Auth function does not exist");
          setAuthFunctionStatus({
            exists: false,
            lastChecked: new Date().toISOString(),
            error: error.message,
          });
          return false;
        } else if (error.message.includes("Not authorized")) {
          console.log("Auth function exists but user not authorized");
          // This means the function exists but the current user is not authorized
          setAuthFunctionStatus({
            exists: true,
            lastChecked: new Date().toISOString(),
            error: error.message,
          });
          return true;
        } else {
          // If error is not about function not existing, it might be permissions
          // which means the function exists
          console.log("Auth function exists but other error occurred");
          setAuthFunctionStatus({
            exists: true,
            lastChecked: new Date().toISOString(),
            error: error.message,
          });
          return true;
        }
      }

      // If no error, function exists and we got data
      console.log("Auth function exists and returned data");
      setAuthFunctionStatus({
        exists: true,
        lastChecked: new Date().toISOString(),
        error: null,
      });
      return true;
    } catch (error) {
      console.error("Error checking auth function:", error);
      return false;
    }
  };

  const handleCheckDueSync = async () => {
    setIsCheckingDueSync(true);
    try {
      const result = await adminService.checkAndTriggerDueSyncs();
      if (result.success) {
        if (result.syncTriggered) {
          toast({
            title: "Sync Triggered",
            description:
              "Azure AD sync was due and has been triggered automatically.",
            className: "bg-green-50 border-green-200",
          });
          // Refresh sync config after sync trigger
          const syncConfigData = await adminService.getSyncConfiguration();
          setSyncConfig(syncConfigData);
        } else {
          toast({
            title: "No Sync Needed",
            description: "Azure AD sync is not due yet.",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check due syncs",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDueSync(false);
    }
  };

  const fetchTableCount = async () => {
    try {
      console.log("[SupabaseMetrics] Fetching table count...");

      // Try to get table count using the get_table_sizes function
      const { data: tableSizes, error: tableSizeError } =
        await supabase.rpc("get_table_sizes");

      if (!tableSizeError && tableSizes) {
        console.log(
          `[SupabaseMetrics] Found ${tableSizes.length} tables from database function`,
        );
        return tableSizes.length;
      } else {
        console.warn(
          "[SupabaseMetrics] Could not fetch table sizes, using fallback count...",
        );
      }

      // Fallback: Count known application tables
      const knownTables = [
        "profiles",
        "projects",
        "accomplishments",
        "changes",
        "milestones",
        "next_period_activities",
        "project_summaries",
        "project_versions",
        "risks",
        "tasks",
        "user_sessions",
        "user_activity_logs",
        "directory_users",
        "azure_sync_logs",
        "usage_metrics",
        "sync_configurations",
        "departments",
        "chat_conversations",
        "chat_messages",
        "considerations",
        "pm_knowledge",
      ];

      let accessibleTables = 0;
      for (const tableName of knownTables) {
        try {
          const { error } = await supabase
            .from(tableName)
            .select("*", { count: "exact", head: true });

          if (!error) {
            accessibleTables++;
          }
        } catch (tableError) {
          // Table might not exist or not be accessible
          console.warn(
            `[SupabaseMetrics] Could not access table ${tableName}:`,
            tableError,
          );
        }
      }

      console.log(
        `[SupabaseMetrics] Found ${accessibleTables} accessible tables out of ${knownTables.length} known tables`,
      );
      return accessibleTables;
    } catch (error) {
      console.error("[SupabaseMetrics] Error fetching table count:", error);
      return 0;
    }
  };

  const fetchDatabaseSize = async () => {
    try {
      console.log("[SupabaseMetrics] Fetching database size...");

      // Try to get database size using PostgreSQL system tables
      const { data: dbSizeData, error: dbSizeError } =
        await supabase.rpc("get_database_size");

      if (!dbSizeError && dbSizeData) {
        console.log(
          "[SupabaseMetrics] Database size from RPC function:",
          dbSizeData,
          "MB (this is from PostgreSQL system tables)",
        );
        return dbSizeData;
      } else {
        console.warn(
          "[SupabaseMetrics] get_database_size RPC function failed:",
          dbSizeError,
        );
      }

      // Fallback: Calculate estimated size from table row counts
      console.log(
        "[SupabaseMetrics] Using fallback database size calculation (row count estimation)...",
      );

      const allTables = [
        "profiles",
        "projects",
        "accomplishments",
        "changes",
        "milestones",
        "next_period_activities",
        "project_summaries",
        "project_versions",
        "risks",
        "tasks",
        "user_sessions",
        "user_activity_logs",
        "directory_users",
        "azure_sync_logs",
        "usage_metrics",
      ];

      let totalEstimatedSize = 0;
      const tableDetails = [];

      for (const tableName of allTables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select("*", { count: "exact", head: true });

          if (!error && count !== null) {
            // Rough estimation: each row is approximately 1KB on average
            const estimatedSizeMB = Math.max(0.01, count * 0.001);
            totalEstimatedSize += estimatedSizeMB;
            tableDetails.push({
              table: tableName,
              rows: count,
              estimatedSizeMB: parseFloat(estimatedSizeMB.toFixed(3)),
            });
            console.log(
              `[SupabaseMetrics] Table ${tableName}: ${count} rows ≈ ${estimatedSizeMB.toFixed(3)} MB`,
            );
          } else {
            console.warn(
              `[SupabaseMetrics] Could not get count for table ${tableName}:`,
              error,
            );
            tableDetails.push({
              table: tableName,
              rows: 0,
              estimatedSizeMB: 0,
              error: error?.message,
            });
          }
        } catch (tableError) {
          console.warn(
            `[SupabaseMetrics] Exception fetching count for table ${tableName}:`,
            tableError,
          );
          tableDetails.push({
            table: tableName,
            rows: 0,
            estimatedSizeMB: 0,
            error: tableError.message,
          });
        }
      }

      console.log(
        "[SupabaseMetrics] Final estimated database size:",
        totalEstimatedSize.toFixed(2),
        "MB (WARNING: This is a rough estimate based on row counts, not actual PostgreSQL data)",
      );
      console.log("[SupabaseMetrics] Table breakdown:", tableDetails);
      console.log(
        "[SupabaseMetrics] NOTE: This does NOT include PostgreSQL overhead, indexes, WAL files, or system tables",
      );

      return totalEstimatedSize;
    } catch (error) {
      console.error("[SupabaseMetrics] Error fetching database size:", error);
      return 0;
    }
  };

  const fetchDailyActiveUsers = async () => {
    try {
      console.log(
        "[SupabaseMetrics] Fetching daily active users for last 30 days...",
      );

      // Get the last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Query usage_metrics table for daily active users
      const { data: dailyData, error: dailyError } = await supabase
        .from("usage_metrics")
        .select("date, user_id")
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (dailyError) {
        console.warn(
          "[SupabaseMetrics] Error fetching daily data from usage_metrics:",
          dailyError,
        );

        // Fallback: Try to get data from user_sessions table
        console.log(
          "[SupabaseMetrics] Trying fallback approach with user_sessions...",
        );

        const { data: sessionData, error: sessionError } = await supabase
          .from("user_sessions")
          .select("user_id, session_start")
          .gte("session_start", thirtyDaysAgo.toISOString())
          .order("session_start", { ascending: true });

        if (sessionError) {
          console.error(
            "[SupabaseMetrics] Error fetching session data:",
            sessionError,
          );
          return [];
        }

        // Group session data by date
        const dailyGroups = {};
        sessionData?.forEach((session) => {
          const date = session.session_start.split("T")[0];
          if (!dailyGroups[date]) {
            dailyGroups[date] = new Set();
          }
          dailyGroups[date].add(session.user_id);
        });

        // Convert to chart format
        const chartData = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const userSet = dailyGroups[dateStr] || new Set();

          chartData.push({
            date: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            fullDate: dateStr,
            count: userSet.size,
          });
        }

        console.log(
          "[SupabaseMetrics] Fallback daily active users data:",
          chartData.slice(-7),
        );
        return chartData;
      }

      // Group by date for daily active users (primary approach)
      const dailyGroups = {};
      dailyData?.forEach((item) => {
        const date = item.date;
        if (!dailyGroups[date]) {
          dailyGroups[date] = new Set();
        }
        dailyGroups[date].add(item.user_id);
      });

      // Create array for last 30 days with actual data
      const chartData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const userSet = dailyGroups[dateStr] || new Set();

        chartData.push({
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          fullDate: dateStr,
          count: userSet.size,
        });
      }

      console.log(
        "[SupabaseMetrics] Daily active users data (last 7 days):",
        chartData.slice(-7),
      );
      return chartData;
    } catch (error) {
      console.error(
        "[SupabaseMetrics] Error fetching daily active users:",
        error,
      );
      return [];
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Check if auth function exists
      await checkAuthFunction();

      // Get total users count
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total projects count
      const { count: projectsCount, error: projectsError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;
      if (projectsError) throw projectsError;

      // Fetch daily active users data
      const dailyActiveUsersData = await fetchDailyActiveUsers();

      // Fetch table count and database size metrics
      const [tableCount, databaseSize] = await Promise.all([
        fetchTableCount(),
        fetchDatabaseSize(),
      ]);

      // Fetch actual table sizes using the database function
      let databaseSizeData = [];

      try {
        console.log(
          "[SupabaseMetrics] Fetching table sizes using database function...",
        );
        const { data: tableSizes, error: tableSizeError } =
          await supabase.rpc("get_table_sizes");

        if (!tableSizeError && tableSizes) {
          console.log(
            "[SupabaseMetrics] Got table sizes from database:",
            tableSizes,
          );

          // Define project-related tables to combine
          const projectTables = [
            "public.projects",
            "public.accomplishments",
            "public.changes",
            "public.milestones",
            "public.next_period_activities",
            "public.project_summaries",
            "public.project_versions",
            "public.risks",
            "public.tasks",
          ];

          // Aggregate project tables into "Project Data"
          let projectDataSize = 0;
          let projectDataRows = 0;

          tableSizes.forEach((table) => {
            if (projectTables.includes(table.table_name)) {
              projectDataSize += table.size_mb || 0;
              projectDataRows += table.row_count || 0;
            }
          });

          // Add consolidated project data entry
          if (projectDataSize > 0) {
            databaseSizeData.push({
              table: "project_data",
              displayName: "Project Data",
              size: parseFloat(projectDataSize.toFixed(2)),
              rows: projectDataRows,
            });
          }

          // Add individual analytics tables
          const analyticsDisplayNames = {
            "public.user_sessions": "User Sessions",
            "public.user_activity_logs": "Activity Logs",
            "public.directory_users": "Directory Users",
            "public.azure_sync_logs": "Azure Sync Logs",
            "public.usage_metrics": "Usage Metrics",
          };

          tableSizes.forEach((table) => {
            if (analyticsDisplayNames[table.table_name]) {
              databaseSizeData.push({
                table: table.table_name.replace("public.", ""),
                displayName: analyticsDisplayNames[table.table_name],
                size: table.size_mb || 0,
                rows: table.row_count || 0,
              });
            }
          });
        } else {
          console.warn(
            "[SupabaseMetrics] Could not fetch table sizes, using fallback...",
          );
          // Fallback to the old estimation method
          await fetchTableSizesFallback();
        }
      } catch (error) {
        console.error("[SupabaseMetrics] Error fetching table sizes:", error);
        // Fallback to the old estimation method
        await fetchTableSizesFallback();
      }

      async function fetchTableSizesFallback() {
        console.log(
          "[SupabaseMetrics] Using fallback table size estimation...",
        );

        // Define project-related tables to combine into "Project Data"
        const projectTables = [
          "projects",
          "accomplishments",
          "changes",
          "milestones",
          "next_period_activities",
          "project_summaries",
          "project_versions",
          "risks",
          "tasks",
        ];

        // Define user analytics tables to keep separate
        const analyticsTables = [
          "user_sessions",
          "user_activity_logs",
          "directory_users",
        ];

        // Table display names for analytics tables
        const analyticsDisplayNames = {
          user_sessions: "User Sessions",
          user_activity_logs: "Activity Logs",
          directory_users: "Directory Users",
        };

        // Aggregate project tables into a single "Project Data" metric
        let projectDataSize = 0;
        let projectDataRows = 0;

        for (const tableName of projectTables) {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select("*", { count: "exact", head: true });

            if (!error) {
              // Estimate size based on row count (rough approximation)
              const estimatedSizeMB = Math.max(0.01, (count || 0) * 0.001);
              projectDataSize += estimatedSizeMB;
              projectDataRows += count || 0;
            }
          } catch (tableError) {
            console.warn(
              `Could not fetch size for project table ${tableName}:`,
              tableError,
            );
          }
        }

        // Add the consolidated "Project Data" entry
        if (projectDataSize > 0) {
          databaseSizeData.push({
            table: "project_data",
            displayName: "Project Data",
            size: parseFloat(projectDataSize.toFixed(2)),
            rows: projectDataRows,
          });
        }

        // Process analytics tables individually
        for (const tableName of analyticsTables) {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select("*", { count: "exact", head: true });

            if (!error) {
              // Estimate size based on row count (rough approximation)
              const estimatedSizeMB = Math.max(0.01, (count || 0) * 0.001);
              databaseSizeData.push({
                table: tableName,
                displayName: analyticsDisplayNames[tableName] || tableName,
                size: parseFloat(estimatedSizeMB.toFixed(2)),
                rows: count || 0,
              });
            }
          } catch (tableError) {
            console.warn(
              `Could not fetch size for analytics table ${tableName}:`,
              tableError,
            );
          }
        }
      }

      setMetrics((prev) => ({
        ...prev,
        totalUsers: usersCount || 0,
        totalProjects: projectsCount || 0,
        totalTables: tableCount,
        totalDatabaseSize: databaseSize,
        dailyActiveUsers: dailyActiveUsersData,
        databaseSize: databaseSizeData,
      }));

      // Load sync configuration
      const syncConfigData = await adminService.getSyncConfiguration();
      setSyncConfig(syncConfigData);
    } catch (error) {
      console.error("Error fetching Supabase metrics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Supabase metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Supabase Project Metrics</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckDueSync}
            disabled={isCheckingDueSync}
            className="flex items-center gap-2"
          >
            <Play
              className={`h-4 w-4 ${isCheckingDueSync ? "animate-spin" : ""}`}
            />
            {isCheckingDueSync ? "Checking..." : "Check Sync"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!authFunctionStatus.exists && (
        <Card className="bg-amber-50 border-amber-200 mb-4">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="bg-amber-100 p-2 rounded-full">
                <Database className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-amber-800">
                  Auth Function Not Detected
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  The{" "}
                  <code className="bg-amber-100 px-1 rounded">
                    get_auth_users_data
                  </code>{" "}
                  function is not installed in your Supabase project. This
                  function is required to display accurate user creation dates
                  and last login times.
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Please run the SQL migration file{" "}
                  <code className="bg-amber-100 px-1 rounded">
                    supabase/migrations/20240613000001_fix_auth_users_function_return_type.sql
                  </code>{" "}
                  in your Supabase SQL Editor.
                </p>
                {authFunctionStatus.error && (
                  <p className="text-sm text-red-700 mt-2 bg-red-50 p-2 rounded border border-red-100">
                    <strong>Error:</strong> {authFunctionStatus.error}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show sync timing information */}
      {syncConfig && (
        <Card className="bg-blue-50 border-blue-200 mb-4">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-800">
                  Azure AD Sync Status
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Last Sync:</span>
                    <span>
                      {syncConfig.last_run_at
                        ? new Date(syncConfig.last_run_at).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Next Sync Due:</span>
                    <span
                      className={
                        syncConfig.next_run_at &&
                        new Date(syncConfig.next_run_at) <= new Date()
                          ? "text-red-600 font-semibold"
                          : ""
                      }
                    >
                      {syncConfig.next_run_at
                        ? new Date(syncConfig.next_run_at).toLocaleString()
                        : "Not scheduled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Frequency:</span>
                    <span>{syncConfig.frequency_hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span
                      className={
                        syncConfig.is_enabled
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {syncConfig.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                {syncConfig.next_run_at &&
                  new Date(syncConfig.next_run_at) <= new Date() && (
                    <div className="text-red-600 font-medium text-center mt-3 p-2 bg-red-50 rounded border border-red-200">
                      ⚠️ Sync is overdue! Click "Check Sync" to trigger it.
                    </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                metrics.totalUsers
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                metrics.totalProjects
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                metrics.totalTables
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Database tables</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Database Tables
            </CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${metrics.totalDatabaseSize.toFixed(2)} MB`
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Application data only</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Daily Active Users (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : metrics.dailyActiveUsers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No daily active user data available</p>
                    <p className="text-sm">
                      Data will appear as users become active
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={Math.floor(
                        metrics.dailyActiveUsers.length / 10,
                      )}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullDate
                          ? `Date: ${item.fullDate}`
                          : `Date: ${label}`;
                      }}
                      formatter={(value) => [value, "Active Users"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      name="Active Users"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Application Data Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.databaseSize}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} MB (${props.payload?.rows || 0} rows)`,
                      "Size",
                    ]}
                    labelFormatter={(label) => `Table: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="size"
                    fill="#3b82f6"
                    name="Size (MB)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupabaseMetrics;
