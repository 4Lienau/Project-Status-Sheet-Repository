import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Brain,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  MessageSquare,
  FileText,
  Target,
  Lightbulb,
} from "lucide-react";
import {
  aiUsageTrackingService,
  AIUsageAnalytics as AIUsageAnalyticsType,
  AIUsageTrend,
  TopAIUser,
} from "@/lib/services/aiUsageTrackingService";
import { useToast } from "@/components/ui/use-toast";

const AIUsageAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AIUsageAnalyticsType[]>([]);
  const [trends, setTrends] = useState<AIUsageTrend[]>([]);
  const [topUsers, setTopUsers] = useState<TopAIUser[]>([]);
  const [adoptionMetrics, setAdoptionMetrics] = useState({
    total_users_with_ai_usage: 0,
    total_ai_events: 0,
    adoption_rate: 0,
    most_popular_feature: "None",
    least_popular_feature: "None",
    daily_average_usage: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("[AIUsageAnalytics] Loading AI usage data...");

      const [analyticsData, trendsData, topUsersData, adoptionData] =
        await Promise.all([
          aiUsageTrackingService.getAIUsageAnalytics(),
          aiUsageTrackingService.getAIUsageTrends(30),
          aiUsageTrackingService.getTopAIUsers(10),
          aiUsageTrackingService.getAIAdoptionMetrics(),
        ]);

      console.log("[AIUsageAnalytics] Loaded data:", {
        analytics: analyticsData.length,
        trends: trendsData.length,
        topUsers: topUsersData.length,
        adoption: adoptionData,
      });

      setAnalytics(analyticsData);
      setTrends(trendsData);
      setTopUsers(topUsersData);
      setAdoptionMetrics(adoptionData);
    } catch (error) {
      console.error("[AIUsageAnalytics] Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load AI usage analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Prepare chart data
  const featureUsageData = analytics.map((item) => ({
    name: getFeatureDisplayName(item.feature_type),
    total: item.total_usage,
    users: item.unique_users,
    last7days: item.usage_last_7_days,
    last30days: item.usage_last_30_days,
  }));

  // Prepare trend data for line chart
  const trendChartData = trends.reduce((acc, item) => {
    const existingDate = acc.find((d) => d.date === item.date);
    if (existingDate) {
      existingDate[item.feature_type] = item.usage_count;
    } else {
      acc.push({
        date: item.date,
        [item.feature_type]: item.usage_count,
      });
    }
    return acc;
  }, [] as any[]);

  // Prepare pie chart data
  const pieChartData = analytics.map((item) => ({
    name: getFeatureDisplayName(item.feature_type),
    value: item.total_usage,
    color: getFeatureColor(item.feature_type),
  }));

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

  function getFeatureDisplayName(featureType: string): string {
    switch (featureType) {
      case "description":
        return "Description Generation";
      case "value_statement":
        return "Value Statement";
      case "milestones":
        return "Milestone Suggestions";
      case "project_pilot":
        return "Project Pilot Chat";
      default:
        return featureType;
    }
  }

  function getFeatureColor(featureType: string): string {
    switch (featureType) {
      case "description":
        return "#8884d8";
      case "value_statement":
        return "#82ca9d";
      case "milestones":
        return "#ffc658";
      case "project_pilot":
        return "#ff7300";
      default:
        return "#8884d8";
    }
  }

  function getFeatureIcon(featureType: string) {
    switch (featureType) {
      case "description":
        return <FileText className="h-4 w-4" />;
      case "value_statement":
        return <Target className="h-4 w-4" />;
      case "milestones":
        return <Lightbulb className="h-4 w-4" />;
      case "project_pilot":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-blue-800">
            AI Usage Analytics
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-800">
          AI Usage Analytics
        </h2>
        <Button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-b from-blue-50 to-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total AI Usage
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {adoptionMetrics.total_ai_events.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {adoptionMetrics.daily_average_usage.toFixed(1)} per day avg
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-green-50 to-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              AI Adoption Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {adoptionMetrics.adoption_rate}%
            </div>
            <p className="text-xs text-green-600 mt-1">
              {adoptionMetrics.total_users_with_ai_usage} users using AI
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-purple-50 to-white border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Most Popular
            </CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-800">
              {getFeatureDisplayName(adoptionMetrics.most_popular_feature)}
            </div>
            <p className="text-xs text-purple-600 mt-1">Leading AI feature</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-orange-50 to-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Active AI Users
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {adoptionMetrics.total_users_with_ai_usage}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Users with AI activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-800">AI Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total Usage" />
                <Bar dataKey="users" fill="#82ca9d" name="Unique Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-800">Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-800">
              AI Usage Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="description"
                  stroke="#8884d8"
                  name="Description"
                />
                <Line
                  type="monotone"
                  dataKey="value_statement"
                  stroke="#82ca9d"
                  name="Value Statement"
                />
                <Line
                  type="monotone"
                  dataKey="milestones"
                  stroke="#ffc658"
                  name="Milestones"
                />
                <Line
                  type="monotone"
                  dataKey="project_pilot"
                  stroke="#ff7300"
                  name="Project Pilot"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Feature Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-800">AI Feature Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Total Usage</TableHead>
                <TableHead className="text-right">Unique Users</TableHead>
                <TableHead className="text-right">Last 7 Days</TableHead>
                <TableHead className="text-right">Last 30 Days</TableHead>
                <TableHead className="text-right">Daily Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((item) => (
                <TableRow key={item.feature_type}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getFeatureIcon(item.feature_type)}
                      {getFeatureDisplayName(item.feature_type)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.total_usage.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unique_users.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.usage_last_7_days.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.usage_last_30_days.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.avg_daily_usage.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top AI Users */}
      {topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-800">Top AI Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Total Usage</TableHead>
                  <TableHead className="text-right">Description</TableHead>
                  <TableHead className="text-right">Value Statement</TableHead>
                  <TableHead className="text-right">Milestones</TableHead>
                  <TableHead className="text-right">Project Pilot</TableHead>
                  <TableHead className="text-right">Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">
                          {user.full_name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {user.total_ai_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.description_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.value_statement_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.milestones_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.project_pilot_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {user.last_ai_usage
                        ? new Date(user.last_ai_usage).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIUsageAnalytics;
