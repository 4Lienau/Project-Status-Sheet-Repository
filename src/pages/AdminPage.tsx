import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import KnowledgeManager from "@/components/admin/KnowledgeManager";
import DepartmentManager from "@/components/admin/DepartmentManager";
import SupabaseMetrics from "@/components/admin/SupabaseMetrics";
import PendingUsersManager from "@/components/admin/PendingUsersManager";
import ProjectDurationManager from "@/components/admin/ProjectDurationManager";
import UsageAnalytics from "@/components/admin/UsageAnalytics";
import AIUsageAnalytics from "@/components/admin/AIUsageAnalytics";
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
  Clock,
  Users,
  Building,
  Brain,
  Zap,
  Calendar,
  Users2,
  Building2,
  BookOpen,
  Palette,
  Mail,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";

// Admin emails - add your email here to get admin access
const ADMIN_EMAILS = ["4lienau@gmail.com", "chrisl@re-wa.org"];

const AdminPage: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState("users");
  
  // Reminder emails state
  const [reminderLogs, setReminderLogs] = useState([]);
  const [reminderStats, setReminderStats] = useState(null);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [dryRunResults, setDryRunResults] = useState(null);
  const [testEmail, setTestEmail] = useState(''); // Add test email state
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false); // Add test email loading state

  // Scheduler logs state
  const [schedulerLogs, setSchedulerLogs] = useState([]);
  const [schedulerStats, setSchedulerStats] = useState(null);

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
          // Silently log the error without showing it to the user
          console.warn("Sync check skipped:", error);
        }
      }
    };

    checkDueSyncs();

    // Set up periodic checking every 5 minutes while admin page is open
    const interval = setInterval(checkDueSyncs, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, toast]);

  // Auto-refresh scheduler logs and sync logs every 30 seconds when on Users tab
  useEffect(() => {
    if (activeTab !== "users" || !user || !ADMIN_EMAILS.includes(user.email)) {
      return;
    }

    const refreshLogs = async () => {
      try {
        console.log("[AdminPage] Auto-refreshing logs...");
        
        // Refresh scheduler logs
        const schedulerLogsData = await adminService.getSchedulerLogs(20);
        setSchedulerLogs(schedulerLogsData);

        const schedulerStatsData = await adminService.getSchedulerStats();
        setSchedulerStats(schedulerStatsData);

        // Refresh sync logs
        const syncLogsData = await adminService.getAzureSyncLogs();
        setSyncLogs(syncLogsData);

        // Refresh sync configuration
        const syncConfigData = await adminService.getSyncConfiguration();
        setSyncConfig(syncConfigData);

        console.log("[AdminPage] Logs refreshed successfully");
      } catch (error) {
        console.warn("[AdminPage] Error refreshing logs:", error);
      }
    };

    // Initial refresh
    refreshLogs();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(refreshLogs, 30 * 1000);

    return () => clearInterval(interval);
  }, [activeTab, user]);

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
        console.log("[AdminPage] Loading directory users...");

        // First run database debug to understand the issue
        console.log("[AdminPage] Running database debug...");
        const debugResult = await adminService.debugDatabaseAccess();
        console.log("[AdminPage] Database debug result:", debugResult);

        const directoryUsersData = await adminService.getDirectoryUsers();
        console.log("[AdminPage] Directory users loaded:", directoryUsersData);
        console.log(
          "[AdminPage] Directory users count:",
          directoryUsersData.length,
        );
        console.log(
          "[AdminPage] Directory users raw data:",
          directoryUsersData.slice(0, 2), // Show first 2 records
        );
        console.log(
          "[AdminPage] Active users count:",
          directoryUsersData.filter((u) => u.sync_status === "active").length,
        );
        console.log("[AdminPage] All sync statuses found:", [
          ...new Set(directoryUsersData.map((u) => u.sync_status)),
        ]);
        setDirectoryUsers(directoryUsersData);
        console.log("[AdminPage] State updated with directory users");

        console.log("[AdminPage] Loading Azure sync logs...");
        const syncLogsData = await adminService.getAzureSyncLogs();
        console.log("[AdminPage] Sync logs loaded:", syncLogsData);
        console.log("[AdminPage] Sync logs count:", syncLogsData.length);
        if (syncLogsData.length > 0) {
          console.log("[AdminPage] Sample sync log:", syncLogsData[0]);
        }
        setSyncLogs(syncLogsData);
        console.log("[AdminPage] State updated with sync logs");

        // Load reminder email data
        const reminderLogsData = await adminService.getReminderEmailLogs(20);
        setReminderLogs(reminderLogsData);

        const reminderStatsData = await adminService.getReminderEmailStats();
        setReminderStats(reminderStatsData);

        // Load scheduler logs and stats
        const schedulerLogsData = await adminService.getSchedulerLogs(20);
        setSchedulerLogs(schedulerLogsData);

        const schedulerStatsData = await adminService.getSchedulerStats();
        setSchedulerStats(schedulerStatsData);

        // Ensure sync configuration exists and load it
        await adminService.ensureSyncConfiguration();
        const syncConfigData = await adminService.getSyncConfiguration();
        setSyncConfig(syncConfigData);
        if (syncConfigData) {
          setNewFrequency(syncConfigData.frequency_hours);
        }
      } catch (error) {
        console.warn("Error loading admin data:", error);
        toast({
          title: "Warning",
          description: "Some admin data could not be loaded",
          variant: "default",
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

          // Refresh scheduler logs
          const schedulerLogsData = await adminService.getSchedulerLogs(20);
          setSchedulerLogs(schedulerLogsData);

          const schedulerStatsData = await adminService.getSchedulerStats();
          setSchedulerStats(schedulerStatsData);
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

  const handleDryRunReminders = async () => {
    setIsDryRunning(true);
    setDryRunResults(null);
    try {
      console.log('[AdminPage] Starting dry run...');
      const result = await adminService.triggerReminderEmails({
        dryRun: true,
        minDaysSinceUpdate: 14,
        cooldownDays: 7,
      });

      console.log('[AdminPage] Dry run result:', result);
      setDryRunResults(result);

      toast({
        title: "Dry Run Complete",
        description: `Evaluated ${result.evaluatedCount || 0} projects. Found ${result.dueCount || 0} that would receive reminders. Skipped ${result.skippedCount || 0}.`,
        className: "bg-blue-50 border-blue-200",
      });
    } catch (error) {
      console.error("[AdminPage] Error running dry run:", error);
      console.error("[AdminPage] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to run dry run",
        variant: "destructive",
      });
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const result = await adminService.triggerReminderEmails({
        dryRun: false,
        minDaysSinceUpdate: 14,
        cooldownDays: 7,
      });

      toast({
        title: "Reminders Sent",
        description: `Successfully sent ${result.sentCount || 0} reminder emails`,
        className: "bg-green-50 border-green-200",
      });

      // Refresh logs after sending
      setTimeout(async () => {
        const reminderLogsData = await adminService.getReminderEmailLogs(20);
        setReminderLogs(reminderLogsData);

        const reminderStatsData = await adminService.getReminderEmailStats();
        setReminderStats(reminderStatsData);
      }, 2000);

      setDryRunResults(null);
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Error",
        description: "Failed to send reminder emails",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTestEmail(true);
    try {
      console.log('[AdminPage] Sending test email to:', testEmail);
      const result = await adminService.triggerReminderEmails({
        testEmail: testEmail,
      });

      console.log('[AdminPage] Test email result:', result);

      toast({
        title: "Test Email Sent",
        description: `A sample reminder email has been sent to ${testEmail}. Check your inbox!`,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsSendingTestEmail(false);
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
      <div className="container mx-auto p-6 bg-background">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Admin Dashboard", current: true },
            ]}
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage users, departments, and system settings
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="text-foreground border-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="departments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="reminders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Mail className="h-4 w-4 mr-2" />
              Reminder Emails
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="ai-usage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Brain className="h-4 w-4 mr-2" />
              AI Usage
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="supabase" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="h-4 w-4 mr-2" />
              Supabase Metrics
            </TabsTrigger>
            <TabsTrigger value="duration" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Project Duration
            </TabsTrigger>
            <TabsTrigger value="status-colors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-4 w-4 mr-2" />
              Status Colors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Total Projects
                  </CardTitle>
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalProjects}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Active Projects
                  </CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.activeProjects}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Avg Milestones Per Project
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalProjects > 0
                      ? (stats.totalMilestones / stats.totalProjects).toFixed(1)
                      : 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Azure AD Sync Control */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
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

                  {/* Sync Schedule Info */}
                  {syncConfig && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Last Run</div>
                        <div className="text-sm font-medium text-foreground">
                          {syncConfig.last_run_at
                            ? new Date(syncConfig.last_run_at).toLocaleString()
                            : "Never"}
                        </div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Next Scheduled Run</div>
                        <div className="text-sm font-medium text-foreground">
                          {syncConfig.next_run_at
                            ? new Date(syncConfig.next_run_at).toLocaleString()
                            : "Not scheduled"}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">
                          Manual Sync
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Trigger an immediate sync with Azure AD
                        </p>
                      </div>
                      <Button
                        onClick={handleAzureAdSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                        />
                        {isSyncing ? "Syncing..." : "Sync Now"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">
                          Check Due Syncs
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Check if any scheduled syncs are due and trigger them
                        </p>
                      </div>
                      <Button
                        onClick={handleCheckDueSyncs}
                        disabled={isCheckingDueSyncs}
                        variant="secondary"
                      >
                        <CheckCircle
                          className={`h-4 w-4 ${isCheckingDueSyncs ? "animate-spin" : ""}`}
                        />
                        {isCheckingDueSyncs ? "Checking..." : "Check Now"}
                      </Button>
                    </div>

                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">
                            Sync Frequency
                          </h3>
                          <p className="text-sm text-muted-foreground">
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
                          >
                            {isUpdatingFrequency ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="text-center p-3 bg-muted rounded-lg border border-border">
                      <div className="text-2xl font-bold text-foreground">
                        {directoryUsers.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Directory Users
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Sync Logs */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Activity className="h-5 w-5" />
                    Recent Sync Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Loading sync logs...
                      </p>
                    ) : syncLogs.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          No sync logs available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sync logs will appear here after running Azure AD
                          sync. Try triggering a manual sync to create the first
                          log entry.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground mb-2">
                          Showing {Math.min(5, syncLogs.length)} of{" "}
                          {syncLogs.length} recent logs
                        </div>
                        {syncLogs.slice(0, 5).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    log.sync_status === "completed"
                                      ? "bg-success/10 text-success"
                                      : log.sync_status === "failed"
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-warning/10 text-warning"
                                  }`}
                                >
                                  {log.sync_status}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(
                                    log.sync_started_at,
                                  ).toLocaleString()}
                                </span>
                              </div>
                              {log.sync_status === "completed" && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {log.users_processed} processed,{" "}
                                  {log.users_created} created,{" "}
                                  {log.users_updated} updated
                                </div>
                              )}
                              {log.error_message && (
                                <div className="text-xs text-destructive mt-1">
                                  {log.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Scheduler Logs */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5" />
                    Scheduler Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats Summary */}
                    {schedulerStats && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg border border-border">
                          <div className="text-xs text-muted-foreground">Total Runs</div>
                          <div className="text-xl font-bold text-foreground">
                            {schedulerStats.totalRuns}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                          <div className="text-xs text-muted-foreground">Syncs Triggered</div>
                          <div className="text-xl font-bold text-foreground">
                            {schedulerStats.syncsTriggered}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                          <div className="text-xs text-muted-foreground">Last Run</div>
                          <div className="text-sm font-medium text-foreground">
                            {schedulerStats.lastRun
                              ? new Date(schedulerStats.lastRun).toLocaleString()
                              : "Never"}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                          <div className="text-xs text-muted-foreground">Avg Time</div>
                          <div className="text-xl font-bold text-foreground">
                            {schedulerStats.avgExecutionTime}ms
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Logs */}
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Recent Scheduler Executions
                      </div>
                      {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Loading scheduler logs...
                        </p>
                      ) : schedulerLogs.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            No scheduler logs yet
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Logs will appear here when the cron job runs (every 5 minutes)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {schedulerLogs.slice(0, 10).map((log) => (
                            <div
                              key={log.id}
                              className="p-3 bg-muted rounded-lg border border-border"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.run_at).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2">
                                  {log.sync_triggered && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/10 text-success">
                                      Sync Triggered
                                    </span>
                                  )}
                                  {log.error_message && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                                      Error
                                    </span>
                                  )}
                                  {log.execution_time_ms && (
                                    <span className="text-xs text-muted-foreground">
                                      {log.execution_time_ms}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.sync_was_due ? (
                                  <span className="text-warning">Sync was due</span>
                                ) : (
                                  <span>No sync due</span>
                                )}
                                {log.error_message && (
                                  <div className="text-destructive mt-1">
                                    Error: {log.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Directory Users Table */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Directory Users</CardTitle>
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
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
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
                            <div key={index}>
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
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              )}
                            </div>
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

          <TabsContent value="reminders" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Total Sent</CardTitle>
                  <Mail className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {reminderStats?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Successful</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {reminderStats?.sent || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Failed</CardTitle>
                  <Activity className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {reminderStats?.failed || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Success Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {reminderStats?.total > 0
                      ? Math.round((reminderStats.sent / reminderStats.total) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Delivery rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Control Panel */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Mail className="h-5 w-5" />
                  Reminder Email Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Send reminder emails to project managers whose projects haven't been updated in 14+ days.
                    The system enforces a 7-day cooldown to prevent duplicate reminders.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                    <div>
                      <h3 className="font-medium text-foreground">Dry Run</h3>
                      <p className="text-sm text-muted-foreground">
                        Preview which projects would receive reminders
                      </p>
                    </div>
                    <Button
                      onClick={handleDryRunReminders}
                      disabled={isDryRunning}
                    >
                      <Activity className={`h-4 w-4 ${isDryRunning ? "animate-spin" : ""}`} />
                      {isDryRunning ? "Running..." : "Dry Run"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                    <div>
                      <h3 className="font-medium text-foreground">Send Reminders</h3>
                      <p className="text-sm text-muted-foreground">
                        Send reminder emails to all eligible project managers
                      </p>
                    </div>
                    <Button
                      onClick={handleSendReminders}
                      disabled={isSendingReminders}
                      variant="secondary"
                    >
                      <Mail className={`h-4 w-4 ${isSendingReminders ? "animate-spin" : ""}`} />
                      {isSendingReminders ? "Sending..." : "Send Now"}
                    </Button>
                  </div>
                </div>

                {/* Test Email Section */}
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <h3 className="font-medium text-foreground mb-3">Send Test Email</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send a sample reminder email to your email address to preview the content and format.
                    This will not affect any project managers or create any logs.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail || !testEmail}
                    >
                      <Mail className={`h-4 w-4 ${isSendingTestEmail ? "animate-spin" : ""}`} />
                      {isSendingTestEmail ? "Sending..." : "Send Test"}
                    </Button>
                  </div>
                </div>

                {/* Dry Run Results */}
                {dryRunResults && (
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <h3 className="font-medium text-foreground mb-2">Dry Run Results</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Projects evaluated:</strong> {dryRunResults.evaluatedCount || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Projects due for reminder:</strong> {dryRunResults.dueCount || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Projects skipped (cooldown):</strong> {dryRunResults.skippedCount || 0}
                      </p>
                      {dryRunResults.targets && dryRunResults.targets.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-foreground mb-2">Projects that would receive reminders:</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {dryRunResults.targets.map((target, index) => (
                              <div key={index} className="text-xs text-muted-foreground bg-card p-2 rounded border border-border">
                                <strong>{target.projectTitle}</strong> → {target.managerEmail}
                                <span className="text-muted-foreground ml-2">
                                  (Last updated: {new Date(target.lastUpdated).toLocaleDateString()})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reminder Logs */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Reminder Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Manager</TableHead>
                      <TableHead>Days Since Update</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminderLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No reminder logs found. Run a dry run or send reminders to see logs.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reminderLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.project_manager_email}
                          </TableCell>
                          <TableCell>{log.days_since_update || "-"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                log.status === "sent"
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {log.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(log.sent_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-destructive">
                            {log.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <DepartmentManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <UsageAnalytics />
          </TabsContent>

          <TabsContent value="ai-usage" className="space-y-4">
            <AIUsageAnalytics />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <KnowledgeManager />
          </TabsContent>

          <TabsContent value="supabase" className="space-y-4">
            <SupabaseMetrics />
          </TabsContent>

          <TabsContent value="duration" className="space-y-4">
            <ProjectDurationManager />
          </TabsContent>

          <TabsContent value="status-colors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Status Colors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">Active</h3>
                        <p className="text-sm text-muted-foreground">Projects in active state</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">Completed</h3>
                        <p className="text-sm text-muted-foreground">Projects completed</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-success" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">On Hold</h3>
                        <p className="text-sm text-muted-foreground">Projects on hold</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-warning" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">Cancelled</h3>
                        <p className="text-sm text-muted-foreground">Cancelled projects</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-destructive" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div>
                        <h3 className="font-medium text-foreground">Draft</h3>
                        <p className="text-sm text-muted-foreground">Draft projects</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Toaster />
      </div>
    </Layout>
  );
};

export default AdminPage;