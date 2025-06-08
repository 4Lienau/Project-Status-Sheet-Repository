import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Activity,
  Clock,
  Eye,
  FolderPlus,
  RefreshCw,
  TrendingUp,
  Monitor,
} from "lucide-react";
import { adminService } from "@/lib/services/adminService";
import { useToast } from "@/components/ui/use-toast";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";

interface ActiveUser {
  user_id: string;
  email: string;
  full_name: string;
  session_start: string;
  last_activity: string;
  session_duration_minutes: number;
}

interface UserLoginStats {
  id: string;
  email: string;
  full_name: string;
  login_count: number;
  last_login: string;
  total_session_time_minutes: number;
}

interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  avgSessionTime: number;
  totalPageViews: number;
  totalProjects: number;
  dailyActiveUsers: Array<{ date: string; activeUsers: number }>;
  topUsers: Array<{
    user_id: string;
    totalTime: number;
    totalPageViews: number;
    totalProjects: number;
  }>;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#84CC16",
  "#F97316",
];

const UsageAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [userLoginStats, setUserLoginStats] = useState<UserLoginStats[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    avgSessionTime: 0,
    totalPageViews: 0,
    totalProjects: 0,
    dailyActiveUsers: [],
    topUsers: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadUsageData = async () => {
    try {
      setLoading(true);

      const [activeUsersData, loginStatsData, metricsData] = await Promise.all([
        adminService.getActiveUsers(),
        adminService.getUserLoginStats(),
        adminService.getUsageMetrics(),
      ]);

      setActiveUsers(activeUsersData);
      setUserLoginStats(loginStatsData);
      setUsageMetrics(metricsData);
    } catch (error) {
      console.error("Error loading usage data:", error);
      toast({
        title: "Error",
        description: "Failed to load usage analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Usage analytics data has been refreshed",
      className: "bg-green-50 border-green-200",
    });
  };

  useEffect(() => {
    loadUsageData();

    // Set up auto-refresh every 30 seconds for active users
    const interval = setInterval(async () => {
      try {
        const activeUsersData = await adminService.getActiveUsers();
        setActiveUsers(activeUsersData);
        setUsageMetrics((prev) => ({
          ...prev,
          activeUsers: activeUsersData.length,
        }));
      } catch (error) {
        // Silently handle auto-refresh errors
      }
    }, 30000); // Increased to 30 seconds for better performance

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  // Prepare daily active users chart data
  const dailyChartData = usageMetrics.dailyActiveUsers.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.date), "MMM dd"),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-blue-800">
            Usage Analytics
          </h2>
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Usage Analytics
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Auto-refresh: 30s)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Currently Active
            </CardTitle>
            <Monitor className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">
              {usageMetrics.activeUsers}
            </div>
            <div className="text-sm text-blue-600">
              of {usageMetrics.totalUsers} total users
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Avg Session Time
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">
              {formatDuration(usageMetrics.avgSessionTime)}
            </div>
            <div className="text-sm text-green-600">per user session</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total Page Views
            </CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">
              {usageMetrics.totalPageViews.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">across all users</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Projects Created
            </CardTitle>
            <FolderPlus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">
              {usageMetrics.totalProjects}
            </div>
            <div className="text-sm text-orange-600">
              {usageMetrics.totalProjects === 0
                ? "No projects tracked yet"
                : "tracked via activity logs"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Active Users (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Users by Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageMetrics.topUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No user activity data available yet
                </div>
              ) : (
                usageMetrics.topUsers.map((user, index) => {
                  // Try to find user info from login stats first, then from active users
                  let userInfo = userLoginStats.find(
                    (u) => (u.user_id || u.id) === user.user_id,
                  );

                  // If not found in login stats, try active users
                  if (!userInfo) {
                    const activeUser = activeUsers.find(
                      (u) => u.user_id === user.user_id,
                    );
                    if (activeUser) {
                      userInfo = {
                        id: activeUser.user_id,
                        user_id: activeUser.user_id,
                        email: activeUser.email,
                        full_name: activeUser.full_name,
                        login_count: 0,
                        last_login: "",
                        total_session_time_minutes: 0,
                      };
                    }
                  }

                  // Create a display name with better fallback logic
                  const displayName =
                    userInfo?.full_name ||
                    (userInfo?.email ? userInfo.email.split("@")[0] : null) ||
                    `Unknown User`;

                  const displayEmail = userInfo?.email || "No email available";

                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{displayName}</div>
                          <div className="text-sm text-gray-600">
                            {formatDuration(user.totalTime)} •{" "}
                            {user.totalPageViews} views
                          </div>
                          {displayEmail !== "No email available" && (
                            <div className="text-xs text-gray-500">
                              {displayEmail}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {user.totalProjects} projects
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Currently Active Users
            <Badge variant="secondary" className="ml-2">
              {activeUsers.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Session Started</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Session Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">
                      <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No users currently active
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.full_name || "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.session_start), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {formatTimeAgo(user.last_activity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDuration(user.session_duration_minutes)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Login Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Login Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Logins</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Total Session Time</TableHead>
                <TableHead>Account Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userLoginStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="mb-2">
                        No user login statistics available yet
                      </div>
                      <div className="text-xs text-gray-400">
                        {loading
                          ? "Loading..."
                          : "Check browser console for debugging info"}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                userLoginStats
                  .slice(0, 10)
                  .map((user, index) => {
                    // Debug log for each user
                    if (index === 0) {
                      console.log(
                        "[UsageAnalytics] Rendering user data:",
                        user,
                      );
                    }

                    // Only show users who have actually logged in
                    const totalLogins =
                      user.total_logins || user.login_count || 0;
                    if (totalLogins === 0) {
                      return null; // Skip users who have never logged in
                    }

                    return (
                      <TableRow key={user.user_id || user.id || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.full_name ||
                                user.email?.split("@")[0] ||
                                "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {user.email || "No email"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{totalLogins}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_login
                            ? format(
                                new Date(user.last_login),
                                "MMM dd, yyyy HH:mm",
                              )
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {formatDuration(user.total_session_time_minutes || 0)}
                        </TableCell>
                        <TableCell>
                          {user.account_created || user.created_at
                            ? format(
                                new Date(
                                  user.account_created || user.created_at,
                                ),
                                "MMM dd, yyyy",
                              )
                            : "Unknown"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  .filter(Boolean) // Remove null entries
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;
