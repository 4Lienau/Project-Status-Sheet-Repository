import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import KnowledgeManager from "@/components/admin/KnowledgeManager";
import DepartmentManager from "@/components/admin/DepartmentManager";
import SupabaseMetrics from "@/components/admin/SupabaseMetrics";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { adminService } from "@/lib/services/adminService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  ArrowLeft,
  Shield,
  Activity,
  Database,
  RefreshCw,
  Cloud,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Power,
  PowerOff,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// Admin emails - add your email here to get admin access
const ADMIN_EMAILS = ["4lienau@gmail.com", "chrisl@re-wa.org"];

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    draftProjects: 0,
    totalMilestones: 0,
  });
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncConfig, setSyncConfig] = useState(null);
  const [newFrequency, setNewFrequency] = useState(6);
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  const [isCheckingDueSyncs, setIsCheckingDueSyncs] = useState(false);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isTriggeringSyncScheduler, setIsTriggeringSyncScheduler] =
    useState(false);

  // Pagination state for directory users
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Check for due syncs when the admin page loads
  useEffect(() => {
    const checkDueSyncs = async () => {
      if (user && ADMIN_EMAILS.includes(user.email)) {
        try {
          console.log("Admin page loaded, checking for due syncs...");
          const result = await adminService.checkAndTriggerDueSyncs();
          console.log("Sync check result:", result);

          if (result.syncTriggered) {
            console.log("Automatic sync was triggered from admin page");
            toast({
              title: "Automatic Sync Triggered",
              description:
                "Azure AD sync was due and has been triggered automatically.",
              className: "bg-blue-50 border-blue-200",
            });
          }
        } catch (error) {
          console.error("Error checking due syncs on admin page load:", error);
        }
      }
    };

    checkDueSyncs();

    // Set up periodic checking every 5 minutes while admin page is open
    const interval = setInterval(checkDueSyncs, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, toast]);

  useEffect(() => {
    // Redirect if not admin
    if (user && !ADMIN_EMAILS.includes(user.email)) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Load projects
        const { data: projectsData } = await supabase
          .from("projects")
          .select("*, milestones(count)");

        setProjects(projectsData || []);

        // Calculate stats
        const activeProjects =
          projectsData?.filter((p) => p.status === "active").length || 0;
        const completedProjects =
          projectsData?.filter((p) => p.status === "completed").length || 0;
        const onHoldProjects =
          projectsData?.filter((p) => p.status === "on_hold").length || 0;
        const cancelledProjects =
          projectsData?.filter((p) => p.status === "cancelled").length || 0;
        const draftProjects =
          projectsData?.filter((p) => p.status === "draft").length || 0;

        const totalMilestones = projectsData?.reduce((acc, project) => {
          return acc + (project.milestones?.[0]?.count || 0);
        }, 0);

        setStats({
          totalProjects: projectsData?.length || 0,
          activeProjects,
          completedProjects,
          onHoldProjects,
          cancelledProjects,
          draftProjects,
          totalMilestones,
        });

        // Load directory users and sync logs
        const directoryUsersData = await adminService.getDirectoryUsers();
        setDirectoryUsers(directoryUsersData);

        const syncLogsData = await adminService.getAzureSyncLogs();
        setSyncLogs(syncLogsData);

        // Ensure sync configuration exists and load it
        await adminService.ensureSyncConfiguration();
        const syncConfigData = await adminService.getSyncConfiguration();
        setSyncConfig(syncConfigData);
        if (syncConfigData) {
          setNewFrequency(syncConfigData.frequency_hours);
        }
      } catch (error) {
        console.error("Error loading admin data:", error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, navigate, toast]);

  const handleAzureAdSync = async () => {
    setIsSyncing(true);
    try {
      const result = await adminService.triggerAzureAdSync();

      if (result.success) {
        toast({
          title: "Azure AD Sync Started",
          description: result.message,
          className: "bg-green-50 border-green-200",
        });

        // Refresh directory users and sync logs after a short delay
        setTimeout(async () => {
          const directoryUsersData = await adminService.getDirectoryUsers();
          setDirectoryUsers(directoryUsersData);
          // Reset pagination when data refreshes
          setCurrentPage(1);

          const syncLogsData = await adminService.getAzureSyncLogs();
          setSyncLogs(syncLogsData);

          // Refresh sync configuration
          const syncConfigData = await adminService.getSyncConfiguration();
          setSyncConfig(syncConfigData);
        }, 2000);
      } else {
        toast({
          title: "Azure AD Sync Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error triggering Azure AD sync:", error);
      toast({
        title: "Error",
        description: "Failed to trigger Azure AD sync",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateFrequency = async () => {
    setIsUpdatingFrequency(true);
    try {
      const success = await adminService.updateSyncConfiguration(
        newFrequency,
        syncConfig?.is_enabled ?? false,
      );

      if (success) {
        toast({
          title: "Sync Frequency Updated",
          description: `Azure AD sync frequency updated to ${newFrequency} hours`,
          className: "bg-green-50 border-green-200",
        });

        // Refresh sync configuration
        const syncConfigData = await adminService.getSyncConfiguration();
        setSyncConfig(syncConfigData);
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update sync frequency",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating sync frequency:", error);
      toast({
        title: "Error",
        description: "Failed to update sync frequency",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingFrequency(false);
    }
  };

  const handleToggleSync = async () => {
    setIsTogglingSync(true);
    try {
      console.log("Toggle sync clicked. Current config:", syncConfig);
      const isCurrentlyEnabled = syncConfig?.is_enabled ?? false;
      console.log("Is currently enabled:", isCurrentlyEnabled);

      const success = isCurrentlyEnabled
        ? await adminService.disableSyncConfiguration()
        : await adminService.enableSyncConfiguration();

      console.log("Toggle operation success:", success);

      if (success) {
        // Wait a moment for the database to be updated
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refresh sync configuration with retry logic
        console.log("Refreshing sync configuration...");
        let syncConfigData = null;
        let retryCount = 0;
        const maxRetries = 5; // Increased retries

        while (!syncConfigData && retryCount < maxRetries) {
          syncConfigData = await adminService.getSyncConfiguration();
          if (!syncConfigData) {
            console.log(
              `Retry ${retryCount + 1}/${maxRetries} - sync config still null, waiting...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1500)); // Longer wait
            retryCount++;
          }
        }

        console.log("Final sync config data:", syncConfigData);
        setSyncConfig(syncConfigData);

        if (syncConfigData) {
          toast({
            title: `Sync ${isCurrentlyEnabled ? "Disabled" : "Enabled"}`,
            description: `Azure AD sync has been ${isCurrentlyEnabled ? "disabled" : "enabled"} successfully`,
            className: "bg-green-50 border-green-200",
          });
        } else {
          toast({
            title: "Configuration Issue",
            description:
              "Sync operation completed but configuration could not be refreshed. Please refresh the page.",
            variant: "destructive",
          });
        }
      } else {
        console.error("Toggle operation failed");
        toast({
          title: "Configuration Error",
          description: `Failed to ${isCurrentlyEnabled ? "disable" : "enable"} sync. This may be due to database permissions. Please check the console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling sync:", error);
      toast({
        title: "Error",
        description:
          "Failed to toggle sync status. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingSync(false);
    }
  };

  const handleCheckDueSyncs = async () => {
    setIsCheckingDueSyncs(true);
    try {
      const result = await adminService.checkAndTriggerDueSyncs();

      if (result.syncTriggered) {
        toast({
          title: "Sync Triggered",
          description: result.message,
          className: "bg-green-50 border-green-200",
        });

        // Refresh data after sync is triggered
        setTimeout(async () => {
          const directoryUsersData = await adminService.getDirectoryUsers();
          setDirectoryUsers(directoryUsersData);
          setCurrentPage(1);

          const syncLogsData = await adminService.getAzureSyncLogs();
          setSyncLogs(syncLogsData);

          const syncConfigData = await adminService.getSyncConfiguration();
          setSyncConfig(syncConfigData);
        }, 2000);
      } else {
        toast({
          title: "No Sync Needed",
          description: result.message,
          className: "bg-blue-50 border-blue-200",
        });
      }
    } catch (error) {
      console.error("Error checking due syncs:", error);
      toast({
        title: "Error",
        description: "Failed to check for due syncs",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDueSyncs(false);
    }
  };

  const handleTriggerSyncScheduler = async () => {
    setIsTriggeringSyncScheduler(true);
    try {
      const result = await adminService.triggerSyncScheduler();

      if (result.success) {
        toast({
          title: "Sync Scheduler Triggered",
          description: result.message,
          className: "bg-green-50 border-green-200",
        });

        // Show results if available
        if (result.results && result.results.length > 0) {
          console.log("Sync scheduler results:", result.results);
        }

        // Refresh data after scheduler runs
        setTimeout(async () => {
          const directoryUsersData = await adminService.getDirectoryUsers();
          setDirectoryUsers(directoryUsersData);
          setCurrentPage(1);

          const syncLogsData = await adminService.getAzureSyncLogs();
          setSyncLogs(syncLogsData);

          const syncConfigData = await adminService.getSyncConfiguration();
          setSyncConfig(syncConfigData);
        }, 2000);
      } else {
        toast({
          title: "Sync Scheduler Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error triggering sync scheduler:", error);
      toast({
        title: "Error",
        description: "Failed to trigger sync scheduler",
        variant: "destructive",
      });
    } finally {
      setIsTriggeringSyncScheduler(false);
    }
  };

  // Prepare chart data
  const projectStatusData = [
    { name: "Active", value: stats.activeProjects, color: "#4ade80" },
    { name: "Completed", value: stats.completedProjects, color: "#60a5fa" },
    { name: "On Hold", value: stats.onHoldProjects, color: "#facc15" },
    { name: "Cancelled", value: stats.cancelledProjects, color: "#f87171" },
    { name: "Draft", value: stats.draftProjects, color: "#94a3b8" },
  ];

  // Calculate pagination values for directory users
  const totalUsers = directoryUsers.length;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = directoryUsers.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(
        1,
        currentPage - Math.floor(maxVisiblePages / 2),
      );
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Calculate project activity data for the last 6 months
  const calculateProjectActivityData = () => {
    const now = new Date();
    const monthsData = [];

    // Generate the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Count projects created in this month
      const projectsInMonth = projects.filter((project) => {
        if (!project.created_at) return false;
        const createdDate = new Date(project.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;

      monthsData.push({
        name: format(monthDate, "MMM"),
        projects: projectsInMonth,
        fullMonth: format(monthDate, "MMMM yyyy"),
      });
    }

    return monthsData;
  };

  const projectActivityData = calculateProjectActivityData();

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Loading...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-blue-800">
              Admin Dashboard
            </h1>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Projects
              </CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                {stats.totalProjects}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                {stats.activeProjects}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Milestones Per Project
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                {stats.totalProjects > 0
                  ? (stats.totalMilestones / stats.totalProjects).toFixed(1)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          defaultValue="departments"
          className="space-y-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-sm p-4"
        >
          <TabsList className="bg-blue-50 border border-blue-100">
            <TabsTrigger
              value="departments"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="supabase" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Supabase Metrics
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Project Pilot Knowledge
            </TabsTrigger>
            <TabsTrigger value="azure-ad" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Azure AD Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <PieChartIcon className="h-5 w-5" />
                    Project Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {projectStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <BarChart3 className="h-5 w-5" />
                    Project Activity (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${value} projects created`,
                            props.payload.fullMonth,
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="projects"
                          fill="#3b82f6"
                          name="Projects Created"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <DepartmentManager />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <KnowledgeManager />
          </TabsContent>

          <TabsContent value="supabase" className="space-y-4">
            <SupabaseMetrics />
          </TabsContent>

          <TabsContent value="azure-ad" className="space-y-4">
            {/* Azure AD Sync Status Card */}
            <Card className="bg-blue-50 border-blue-200 mb-4">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-blue-800">
                        Azure AD Sync Status
                      </h3>
                      <Button
                        onClick={handleToggleSync}
                        disabled={isTogglingSync}
                        size="sm"
                        className={`flex items-center gap-2 ${
                          syncConfig?.is_enabled
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {isTogglingSync ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : syncConfig?.is_enabled ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                        {isTogglingSync
                          ? "Updating..."
                          : syncConfig?.is_enabled
                            ? "Disable"
                            : "Enable"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Last Sync:</span>
                        <span>
                          {syncConfig?.last_run_at
                            ? new Date(syncConfig.last_run_at).toLocaleString()
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Next Sync Due:</span>
                        <span
                          className={
                            syncConfig?.next_run_at &&
                            new Date(syncConfig.next_run_at) <= new Date()
                              ? "text-red-600 font-semibold"
                              : ""
                          }
                        >
                          {syncConfig?.next_run_at
                            ? new Date(syncConfig.next_run_at).toLocaleString()
                            : "Not scheduled"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Frequency:</span>
                        <span>{syncConfig?.frequency_hours || 6} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <span
                          className={
                            syncConfig?.is_enabled
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {syncConfig?.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    {syncConfig?.is_enabled &&
                      syncConfig?.next_run_at &&
                      new Date(syncConfig.next_run_at) <= new Date() && (
                        <div className="text-red-600 font-medium text-center mt-3 p-2 bg-red-50 rounded border border-red-200">
                          ⚠️ Sync is overdue! Click "Check Sync" to trigger it.
                        </div>
                      )}
                    {!syncConfig?.is_enabled && (
                      <div className="text-amber-600 font-medium text-center mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                        ℹ️ Sync is currently disabled. Click "Enable" to
                        activate automatic syncing.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Azure AD Sync Control */}
              <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Cloud className="h-5 w-5" />
                    Azure AD Sync Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Sync user data from Azure Active Directory to the local
                      directory_users table. The sync runs automatically every{" "}
                      {syncConfig?.frequency_hours || 6} hours, or you can
                      trigger it manually.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <h3 className="font-medium text-blue-900">
                          Manual Sync
                        </h3>
                        <p className="text-sm text-blue-700">
                          Trigger an immediate sync with Azure AD
                        </p>
                      </div>
                      <Button
                        onClick={handleAzureAdSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                        />
                        {isSyncing ? "Syncing..." : "Sync Now"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <h3 className="font-medium text-green-900">
                          Check Due Syncs
                        </h3>
                        <p className="text-sm text-green-700">
                          Check if any scheduled syncs are due and trigger them
                        </p>
                      </div>
                      <Button
                        onClick={handleCheckDueSyncs}
                        disabled={isCheckingDueSyncs}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                      >
                        <CheckCircle
                          className={`h-4 w-4 ${isCheckingDueSyncs ? "animate-spin" : ""}`}
                        />
                        {isCheckingDueSyncs ? "Checking..." : "Check Now"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div>
                        <h3 className="font-medium text-purple-900">
                          Trigger Sync Scheduler
                        </h3>
                        <p className="text-sm text-purple-700">
                          Run the sync scheduler edge function to check and
                          trigger all due syncs
                        </p>
                      </div>
                      <Button
                        onClick={handleTriggerSyncScheduler}
                        disabled={isTriggeringSyncScheduler}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                      >
                        <Activity
                          className={`h-4 w-4 ${isTriggeringSyncScheduler ? "animate-spin" : ""}`}
                        />
                        {isTriggeringSyncScheduler
                          ? "Running..."
                          : "Run Scheduler"}
                      </Button>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-amber-900">
                            Sync Frequency
                          </h3>
                          <p className="text-sm text-amber-700">
                            Configure how often the sync runs automatically
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="frequency" className="text-sm">
                            Hours:
                          </Label>
                          <Input
                            id="frequency"
                            type="number"
                            min="1"
                            max="168"
                            value={newFrequency}
                            onChange={(e) =>
                              setNewFrequency(parseInt(e.target.value) || 6)
                            }
                            className="w-20"
                          />
                          <Button
                            onClick={handleUpdateFrequency}
                            disabled={
                              isUpdatingFrequency ||
                              newFrequency === syncConfig?.frequency_hours
                            }
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                          >
                            {isUpdatingFrequency ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-800">
                        {directoryUsers.length}
                      </div>
                      <div className="text-sm text-green-600">
                        Directory Users
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-800">
                        {
                          directoryUsers.filter(
                            (u) => u.sync_status === "active",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-blue-600">Active Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Sync Logs */}
              <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Activity className="h-5 w-5" />
                    Recent Sync Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {syncLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No sync logs available
                      </p>
                    ) : (
                      syncLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  log.sync_status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : log.sync_status === "failed"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {log.sync_status}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(log.sync_started_at).toLocaleString()}
                              </span>
                            </div>
                            {log.sync_status === "completed" && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {log.users_processed} processed,{" "}
                                {log.users_created} created, {log.users_updated}{" "}
                                updated
                              </div>
                            )}
                            {log.error_message && (
                              <div className="text-xs text-red-600 mt-1">
                                {log.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Directory Users Table */}
            <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-blue-800">Directory Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directoryUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No directory users found. Run a sync to populate data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.display_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.job_title || "-"}</TableCell>
                          <TableCell>{user.department || "-"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                user.sync_status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {user.sync_status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.last_synced
                              ? new Date(user.last_synced).toLocaleString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalUsers > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, totalUsers)} of {totalUsers} users
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                          {getPageNumbers().map((page, index) => (
                            <React.Fragment key={index}>
                              {page === "..." ? (
                                <span className="px-2 py-1 text-sm text-muted-foreground">
                                  ...
                                </span>
                              ) : (
                                <Button
                                  variant={
                                    currentPage === page ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handlePageClick(page as number)
                                  }
                                  className={`w-8 h-8 p-0 ${
                                    currentPage === page
                                      ? "bg-blue-600 text-white hover:bg-blue-700"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  {page}
                                </Button>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Toaster />
      </div>
    </Layout>
  );
};

export default AdminPage;
