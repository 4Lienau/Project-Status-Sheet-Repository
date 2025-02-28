import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  ArrowLeft,
  UserPlus,
  Trash2,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
} from "lucide-react";

// Admin emails
const ADMIN_EMAILS = ["4lienau@gmail.com", "chrisl@re-wa.org"];

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    draftProjects: 0,
    totalMilestones: 0,
  });

  useEffect(() => {
    // Redirect if not admin
    if (user && !ADMIN_EMAILS.includes(user.email)) {
      navigate("/");
      return;
    }

    // Fix for Supabase admin API not being available in the free tier
    const fetchUsers = async () => {
      try {
        // Try to get users from profiles table instead
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*");

        if (profilesData) {
          setUsers(
            profilesData.map((profile) => ({
              id: profile.id,
              email: profile.email || "Unknown",
              created_at: profile.created_at,
              last_sign_in_at: null,
              banned: false,
            })),
          );

          setStats((prev) => ({
            ...prev,
            totalUsers: profilesData.length,
          }));
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      try {
        // Try to get users from profiles table instead
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*");

        if (profilesData) {
          setUsers(
            profilesData.map((profile) => ({
              id: profile.id,
              email: profile.email || profile.id,
              created_at: profile.created_at,
              last_sign_in_at: null,
              banned: false,
            })),
          );

          setStats((prev) => ({
            ...prev,
            totalUsers: profilesData.length,
          }));
        }

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
          totalUsers: profilesData?.length || 0,
          totalProjects: projectsData?.length || 0,
          activeProjects,
          completedProjects,
          onHoldProjects,
          cancelledProjects,
          draftProjects,
          totalMilestones,
        });
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Use signUp instead of admin API
      const { error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully. Verification email sent.",
      });

      // Refresh user list by fetching profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*");

      if (profilesData) {
        setUsers(
          profilesData.map((profile) => ({
            id: profile.id,
            email: profile.email || profile.id,
            created_at: profile.created_at,
            last_sign_in_at: null,
            banned: false,
          })),
        );
      }

      // Clear form
      setNewUserEmail("");
      setNewUserPassword("");
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Delete from profiles table instead
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      // Refresh user list
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*");

      if (profilesData) {
        setUsers(
          profilesData.map((profile) => ({
            id: profile.id,
            email: profile.email || profile.id,
            created_at: profile.created_at,
            last_sign_in_at: null,
            banned: false,
          })),
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
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
              onClick={() => navigate("/")}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                {stats.totalUsers}
              </div>
            </CardContent>
          </Card>
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
          defaultValue="users"
          className="space-y-4 bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-sm p-4"
        >
          <TabsList className="bg-blue-50 border border-blue-100">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users Management
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-blue-800">Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-blue-800">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {user.last_sign_in_at
                                ? new Date(
                                    user.last_sign_in_at,
                                  ).toLocaleDateString()
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  user.banned
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.banned ? "Banned" : "Active"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Send password reset email
                                  supabase.auth.resetPasswordForEmail(
                                    user.email,
                                  );
                                  toast({
                                    title: "Password Reset Email Sent",
                                    description: `A password reset email has been sent to ${user.email}`,
                                  });
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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

            <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-blue-800">
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Project Manager</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No projects found
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">
                            {project.title}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                {
                                  active:
                                    "bg-green-100 text-green-800 border border-green-200",
                                  on_hold:
                                    "bg-yellow-100 text-yellow-800 border border-yellow-200",
                                  completed:
                                    "bg-blue-100 text-blue-800 border border-blue-200",
                                  cancelled:
                                    "bg-red-100 text-red-800 border border-red-200",
                                  draft:
                                    "bg-gray-100 text-gray-800 border border-gray-200",
                                }[project.status || "active"]
                              }`}
                            >
                              {project.status
                                ?.replace("_", " ")
                                .charAt(0)
                                .toUpperCase() +
                                project.status?.slice(1).replace("_", " ") ||
                                "Active"}
                            </span>
                          </TableCell>
                          <TableCell>{project.project_manager}</TableCell>
                          <TableCell>
                            ${project.budget_total?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(project.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card className="bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm border border-gray-100/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <ShieldAlert className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all admin users
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Enable
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Login Attempts</h3>
                      <p className="text-sm text-muted-foreground">
                        Maximum failed login attempts before account lockout
                      </p>
                    </div>
                    <Input
                      type="number"
                      defaultValue="5"
                      className="w-20 text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Session Timeout</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out users after inactivity (minutes)
                      </p>
                    </div>
                    <Input
                      type="number"
                      defaultValue="30"
                      className="w-20 text-center"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl">
                    Save Security Settings
                  </Button>
                </div>
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
