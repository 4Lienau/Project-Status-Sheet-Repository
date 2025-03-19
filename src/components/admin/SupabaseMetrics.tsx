import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Database, Users, FileText, HardDrive } from "lucide-react";
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

const SupabaseMetrics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalStorage: 0,
    totalQueries: 0,
    dailyActiveUsers: [
      { date: "Mon", count: 12 },
      { date: "Tue", count: 19 },
      { date: "Wed", count: 15 },
      { date: "Thu", count: 22 },
      { date: "Fri", count: 30 },
      { date: "Sat", count: 18 },
      { date: "Sun", count: 14 },
    ],
    databaseSize: [
      { table: "projects", size: 2.4 },
      { table: "profiles", size: 1.8 },
      { table: "milestones", size: 3.2 },
      { table: "pending_users", size: 0.5 },
      { table: "departments", size: 0.3 },
    ],
  });

  const [authFunctionStatus, setAuthFunctionStatus] = useState({
    exists: false,
    lastChecked: null,
    error: null,
  });

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

      setMetrics((prev) => ({
        ...prev,
        totalUsers: usersCount || 0,
        totalProjects: projectsCount || 0,
      }));
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
        <h2 className="text-lg font-semibold">Supabase Project Metrics</h2>
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
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "5.2 MB"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "8.2 MB"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-800">Daily Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.dailyActiveUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    name="Active Users"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Database Table Sizes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.databaseSize}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="table" />
                  <YAxis />
                  <Tooltip />
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
