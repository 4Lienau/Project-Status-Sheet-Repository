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
} from "lucide-react";

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

        // Load sync configuration
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
        syncConfig?.is_enabled ?? true,
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

  // Prepare chart data
  const projectStatusData = [
    { name: "Active", value: stats.activeProjects, color: "#4ade80" },
    { name: "Completed", value: stats.completedProjects, color: "#60a5fa" },
    { name: "On Hold", value: stats.onHoldProjects, color: "#facc15" },
    { name: "Cancelled", value: stats.cancelledProjects, color: "#f87171" },
    { name: "Draft", value: stats.draftProjects, color: "#94a3b8" },
  ];

  const projectActivityData = [
    { name: "Jan", projects: 4 },
    { name: "Feb", projects: 7 },
    { name: "Mar", projects: 5 },
    { name: "Apr", projects: 10 },
    { name: "May", projects: 8 },
    { name: "Jun", projects: 12 },
  ];

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
          className="space-y-4 bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-sm p-4"
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
                        <Tooltip />
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
                    {syncConfig && (
                      <div className="text-xs text-blue-600">
                        Next scheduled run:{" "}
                        {syncConfig.next_run_at
                          ? new Date(syncConfig.next_run_at).toLocaleString()
                          : "Not scheduled"}
                      </div>
                    )}
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
                      directoryUsers.slice(0, 10).map((user) => (
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
                {directoryUsers.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    Showing 10 of {directoryUsers.length} users
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
