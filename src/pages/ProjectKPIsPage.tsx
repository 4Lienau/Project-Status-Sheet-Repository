/**
 * File: ProjectKPIsPage.tsx
 * Purpose: Comprehensive Project KPIs dashboard page
 * Description: This page displays various key performance indicators for the project portfolio,
 * including financial metrics, performance indicators, resource utilization, operational metrics,
 * quality indicators, and timeline analysis. It provides executives and managers with a complete
 * overview of project portfolio health and performance.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  projectService,
  calculateProjectHealthStatusColor,
  calculateWeightedCompletion,
  type ProjectWithRelations,
} from "@/lib/services/project";
import {
  kpiService,
  type FinancialKPIs,
  type PerformanceKPIs,
  type ResourceKPIs,
  type OperationalKPIs,
  type QualityKPIs,
  type TimelineKPIs,
  type DurationKPIs,
} from "@/lib/services/kpiService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Utility function to strip HTML tags from text
const stripHtmlTags = (text: string): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").trim();
};

// Vibrant color palette for charts
const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// Department-specific colors
const DEPARTMENT_COLORS: Record<string, string> = {
  Technology: "#3b82f6",      // blue
  Engineering: "#10b981",     // green
  "Asset Management": "#f59e0b", // amber
  Finance: "#ef4444",         // red
  Operations: "#8b5cf6",      // purple
  Marketing: "#ec4899",       // pink
  HR: "#06b6d4",              // cyan
  Sales: "#f97316",           // orange
  Purchasing: "#14b8a6",      // teal
};

// Health status colors
const HEALTH_COLORS = {
  GREEN: "#10b981",   // green
  YELLOW: "#f59e0b",  // amber
  RED: "#ef4444",     // red
};

const ProjectKPIsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to get department color
  const getDepartmentColor = (department: string, index: number): string => {
    return DEPARTMENT_COLORS[department] || CHART_COLORS[index % CHART_COLORS.length];
  };

  const [financialKPIs, setFinancialKPIs] = useState<FinancialKPIs | null>(
    null,
  );
  const [performanceKPIs, setPerformanceKPIs] =
    useState<PerformanceKPIs | null>(null);
  const [resourceKPIs, setResourceKPIs] = useState<ResourceKPIs | null>(null);
  const [operationalKPIs, setOperationalKPIs] =
    useState<OperationalKPIs | null>(null);
  const [qualityKPIs, setQualityKPIs] = useState<QualityKPIs | null>(null);
  const [timelineKPIs, setTimelineKPIs] = useState<TimelineKPIs | null>(null);
  const [durationKPIs, setDurationKPIs] = useState<DurationKPIs | null>(null);
  const [timeAwareInsights, setTimeAwareInsights] = useState<{
    projectsByTimeCategory: Array<{
      category: string;
      count: number;
      avgCompletion: number;
      healthDistribution: { green: number; yellow: number; red: number };
    }>;
    overallHealthImprovement: {
      oldGreenCount: number;
      newGreenCount: number;
      improvement: number;
    };
  } | null>(null);

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        setLoading(true);
        const allProjects = await projectService.getAllProjects();
        setProjects(allProjects);

        if (allProjects.length > 0) {
          console.log("[KPI_PAGE] All projects loaded:", allProjects.length);
          console.log(
            "[KPI_PAGE] Sample project managers:",
            allProjects
              .slice(0, 5)
              .map((p) => ({ title: p.title, pm: p.project_manager })),
          );

          setFinancialKPIs(kpiService.calculateFinancialKPIs(allProjects));
          setPerformanceKPIs(kpiService.calculatePerformanceKPIs(allProjects));

          const resourceKPIsData =
            kpiService.calculateResourceKPIs(allProjects);
          console.log(
            "[KPI_PAGE] Resource KPIs calculated:",
            resourceKPIsData.projectManagerWorkload,
          );
          setResourceKPIs(resourceKPIsData);

          setOperationalKPIs(kpiService.calculateOperationalKPIs(allProjects));
          setQualityKPIs(kpiService.calculateQualityKPIs(allProjects));
          setTimelineKPIs(kpiService.calculateTimelineKPIs(allProjects));
          setDurationKPIs(kpiService.calculateDurationKPIs(allProjects));

          // Calculate time-aware insights
          const insights = calculateTimeAwareInsights(allProjects);
          setTimeAwareInsights(insights);
        }
      } catch (error) {
        console.error("Error loading KPIs:", error);
        toast({
          title: "Error",
          description: "Failed to load project KPIs. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadKPIs();
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Function to calculate time-aware health insights
  const calculateTimeAwareInsights = (projects: ProjectWithRelations[]) => {
    const activeProjects = projects.filter(
      (p) =>
        p.status === "active" &&
        p.total_days &&
        p.total_days_remaining !== null,
    );

    const categories = {
      "Substantial Time (>60%)": { projects: [], threshold: 60 },
      "Plenty of Time (30-60%)": { projects: [], threshold: 30 },
      "Moderate Time (15-30%)": { projects: [], threshold: 15 },
      "Little Time (<15%)": { projects: [], threshold: 0 },
    };

    // Categorize projects by time remaining percentage
    activeProjects.forEach((project) => {
      if (!project.total_days || project.total_days_remaining === null) return;

      const timeRemainingPercentage =
        project.total_days_remaining < 0
          ? 0
          : Math.round(
              (project.total_days_remaining / project.total_days) * 100,
            );

      if (timeRemainingPercentage > 60) {
        categories["Substantial Time (>60%)"].projects.push(project);
      } else if (timeRemainingPercentage > 30) {
        categories["Plenty of Time (30-60%)"].projects.push(project);
      } else if (timeRemainingPercentage > 15) {
        categories["Moderate Time (15-30%)"].projects.push(project);
      } else {
        categories["Little Time (<15%)"].projects.push(project);
      }
    });

    const projectsByTimeCategory = Object.entries(categories).map(
      ([category, data]) => {
        const projectList = data.projects as ProjectWithRelations[];
        const avgCompletion =
          projectList.length > 0
            ? Math.round(
                projectList.reduce((sum, p) => {
                  const completion =
                    p.health_calculation_type === "manual"
                      ? p.manual_health_percentage || 0
                      : calculateWeightedCompletion(p.milestones);
                  return sum + completion;
                }, 0) / projectList.length,
              )
            : 0;

        const healthDistribution = { green: 0, yellow: 0, red: 0 };
        projectList.forEach((p) => {
          const health = calculateProjectHealthStatusColor(p);
          healthDistribution[health]++;
        });

        return {
          category,
          count: projectList.length,
          avgCompletion,
          healthDistribution,
        };
      },
    );

    // Calculate overall health improvement (simulated old vs new calculation)
    const newGreenCount = activeProjects.filter(
      (p) => calculateProjectHealthStatusColor(p) === "green",
    ).length;
    // Simulate old calculation (stricter thresholds)
    const oldGreenCount = activeProjects.filter((p) => {
      const completion =
        p.health_calculation_type === "manual"
          ? p.manual_health_percentage || 0
          : calculateWeightedCompletion(p.milestones);
      return completion >= 70; // Old threshold was 70%
    }).length;

    const improvement =
      activeProjects.length > 0
        ? Math.round(
            ((newGreenCount - oldGreenCount) / activeProjects.length) * 100,
          )
        : 0;

    return {
      projectsByTimeCategory,
      overallHealthImprovement: {
        oldGreenCount,
        newGreenCount,
        improvement,
      },
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-foreground">
              Loading KPIs...
            </h2>
            <p className="text-muted-foreground">Analyzing project data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (projects.length === 0) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              <h1 className="text-3xl font-bold text-foreground">
                Project KPIs Dashboard
              </h1>
            </div>

            <Card className="bg-card backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Projects Found
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create some projects to see KPIs and analytics.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Project KPIs Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Portfolio insights and performance metrics
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(projects.length)}
              </div>
              <div className="text-muted-foreground text-sm">Total Projects</div>
            </div>
          </div>

          {/* Financial KPIs */}
          {financialKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Financial Performance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-1">
                      {formatCurrency(financialKPIs.totalBudget)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Actuals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2">
                      {formatCurrency(financialKPIs.totalActuals)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {financialKPIs.budgetUtilization.toFixed(1)}% utilized
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-3">
                      {formatCurrency(financialKPIs.totalForecast)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Budget Variance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold flex items-center gap-1 ${
                        financialKPIs.budgetVariance >= 0
                          ? "text-chart-2"
                          : "text-destructive"
                      }`}
                    >
                      {financialKPIs.budgetVariance >= 0 ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      {formatCurrency(Math.abs(financialKPIs.budgetVariance))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Budget Breakdown */}
              <Card className="bg-card backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Budget by Department</CardTitle>
                  <CardDescription>
                    Budget allocation and utilization across departments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialKPIs.departmentBudgets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="department" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tickFormatter={(value) =>
                          `${(value / 1000).toFixed(0)}K`
                        }
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--popover-foreground))",
                        }}
                      />
                      <Bar dataKey="budget" name="Budget">
                        {financialKPIs.departmentBudgets.map((entry, index) => (
                          <Cell 
                            key={`budget-${index}`}
                            fill={getDepartmentColor(entry.department, index)}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="actuals" name="Actuals">
                        {financialKPIs.departmentBudgets.map((entry, index) => (
                          <Cell 
                            key={`actuals-${index}`}
                            fill={getDepartmentColor(entry.department, index)}
                            opacity={0.7}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="forecast" name="Forecast">
                        {financialKPIs.departmentBudgets.map((entry, index) => (
                          <Cell 
                            key={`forecast-${index}`}
                            fill={getDepartmentColor(entry.department, index)}
                            opacity={0.5}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Time-Aware Health Analysis */}
          {performanceKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Time-Aware Health Analysis
              </h2>

              <Card className="bg-card backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Health Calculation Rules</CardTitle>
                  <CardDescription>
                    Projects are now evaluated based on time remaining vs.
                    completion percentage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-chart-2/10 rounded-lg border border-chart-2/20">
                      <div className="text-chart-2 font-semibold mb-2">
                        Substantial Time (&gt;70%)
                      </div>
                      <div className="text-sm text-foreground/80">
                        <div>
                          • ≥5% completion = <strong>Green</strong>
                        </div>
                        <div>
                          • 1-4% completion = <strong>Yellow</strong>
                        </div>
                        <div>
                          • 0% completion = <strong>Red</strong>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-chart-1/10 rounded-lg border border-chart-1/20">
                      <div className="text-chart-1 font-semibold mb-2">
                        Plenty of Time (&gt;40%)
                      </div>
                      <div className="text-sm text-foreground/80">
                        <div>
                          • ≥15% completion = <strong>Green</strong>
                        </div>
                        <div>
                          • 5-14% completion = <strong>Yellow</strong>
                        </div>
                        <div>
                          • &lt;5% completion = <strong>Red</strong>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-chart-3/10 rounded-lg border border-chart-3/20">
                      <div className="text-chart-3 font-semibold mb-2">
                        Moderate Time (&gt;20%)
                      </div>
                      <div className="text-sm text-foreground/80">
                        <div>
                          • ≥30% completion = <strong>Green</strong>
                        </div>
                        <div>
                          • 15-29% completion = <strong>Yellow</strong>
                        </div>
                        <div>
                          • &lt;15% completion = <strong>Red</strong>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <div className="text-destructive font-semibold mb-2">
                        Little Time (1-20%)
                      </div>
                      <div className="text-sm text-foreground/80">
                        <div>
                          • ≥70% completion = <strong>Green</strong>
                        </div>
                        <div>
                          • 50-69% completion = <strong>Yellow</strong>
                        </div>
                        <div>
                          • &lt;50% completion = <strong>Red</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      <strong>Special Cases:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          Completed projects ={" "}
                          <span className="text-chart-2 font-semibold">
                            Green (100%)
                          </span>
                        </li>
                        <li>
                          Cancelled projects ={" "}
                          <span className="text-muted-foreground font-semibold">
                            Excluded from health metrics
                          </span>
                        </li>
                        <li>
                          Draft/On Hold projects ={" "}
                          <span className="text-chart-3 font-semibold">
                            Yellow
                          </span>
                        </li>
                        <li>
                          Overdue projects ={" "}
                          <span className="text-destructive font-semibold">
                            Strict thresholds applied
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance KPIs */}
          {performanceKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Performance Metrics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Overall Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-1 mb-2">
                      {performanceKPIs.overallCompletion}%
                    </div>
                    <Progress
                      value={performanceKPIs.overallCompletion}
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Milestone Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-2 mb-2">
                      {performanceKPIs.milestoneCompletionRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {performanceKPIs.completedMilestones} of{" "}
                      {performanceKPIs.totalMilestones} milestones
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Project Health (Time-Aware)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceKPIs.healthDistribution.map((item, index) => {
                        const healthLabel =
                          item.health === "GREEN"
                            ? "On Track"
                            : item.health === "YELLOW"
                              ? "At Risk"
                              : "Critical";
                        return (
                          <div
                            key={item.health}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  item.health === "GREEN"
                                    ? "bg-chart-2"
                                    : item.health === "YELLOW"
                                      ? "bg-chart-3"
                                      : "bg-destructive"
                                }`}
                              />
                              <span className="text-sm">{healthLabel}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                {item.count}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {item.percentage}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mt-2">
                        <strong>Time-Aware Calculation:</strong> Projects with
                        substantial time remaining (&gt;70%) need only ≥5%
                        completion for Green status. Cancelled projects
                        excluded.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Project Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceKPIs.statusDistribution
                        .slice(0, 3)
                        .map((item) => (
                          <div
                            key={item.status}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{item.status}</span>
                            <Badge variant="secondary">{item.count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Project Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={performanceKPIs.statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          nameKey="status"
                          label={({ name, value, percent }) =>
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {performanceKPIs.statusDistribution.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            color: "hsl(var(--popover-foreground))",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Time-Aware Health Distribution</CardTitle>
                    <CardDescription>
                      New lenient calculation considers time remaining vs.
                      completion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={performanceKPIs.healthDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          nameKey="health"
                          label={({ name, value, percent }) => {
                            const healthLabel =
                              name === "GREEN"
                                ? "On Track"
                                : name === "YELLOW"
                                  ? "At Risk"
                                  : "Critical";
                            return `${healthLabel}: ${value} (${(percent * 100).toFixed(0)}%)`;
                          }}
                          labelLine={false}
                        >
                          {performanceKPIs.healthDistribution.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={HEALTH_COLORS[entry.health as keyof typeof HEALTH_COLORS] || CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => {
                            const healthLabel =
                              name === "GREEN"
                                ? "On Track"
                                : name === "YELLOW"
                                  ? "At Risk"
                                  : "Critical";
                            return [value, healthLabel];
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            color: "hsl(var(--popover-foreground))",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                      <div>
                        <strong>On Track (Green):</strong> Projects meeting
                        completion thresholds for their time remaining
                      </div>
                      <div>
                        <strong>At Risk (Yellow):</strong> Projects behind
                        schedule but recoverable
                      </div>
                      <div>
                        <strong>Critical (Red):</strong> Projects significantly
                        behind or overdue
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <em>
                          Note: Cancelled projects are excluded from health
                          calculations
                        </em>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Resource KPIs */}
          {resourceKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6" />
                Resource Utilization
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Projects by Department</CardTitle>
                    <CardDescription>
                      Distribution and average completion by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {resourceKPIs.departmentDistribution.map(
                        (dept, index) => {
                          const departmentColor = getDepartmentColor(
                            dept.department,
                            index,
                          );
                          return (
                            <div key={dept.department} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: departmentColor }}
                                  />
                                  <span className="font-medium">
                                    {dept.department}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    style={{
                                      borderColor: departmentColor,
                                      color: departmentColor,
                                    }}
                                  >
                                    {dept.count} projects
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {dept.avgCompletion}% avg
                                  </span>
                                </div>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={dept.avgCompletion}
                                  className="h-3"
                                />
                                <div
                                  className="absolute top-0 left-0 h-3 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${dept.avgCompletion}%`,
                                    backgroundColor: departmentColor,
                                    opacity: 0.8,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Project Manager Workload</CardTitle>
                    <CardDescription>
                      Projects and budget managed per PM
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resourceKPIs.projectManagerWorkload.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No project managers found
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground mb-2">
                            Showing all{" "}
                            {resourceKPIs.projectManagerWorkload.length} project
                            managers
                          </div>
                          {resourceKPIs.projectManagerWorkload.map((pm) => (
                            <div
                              key={pm.manager}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{pm.manager}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(pm.totalBudget)} budget
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {pm.projectCount} projects
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {pm.avgCompletion}% avg completion
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Operational KPIs */}
          {operationalKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Operational Metrics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-1">
                      {operationalKPIs.activeProjects}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Completed Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-2">
                      {operationalKPIs.completedProjects}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Task Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-5 mb-2">
                      {operationalKPIs.taskCompletionRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {operationalKPIs.tasksCompleted} of{" "}
                      {operationalKPIs.totalTasks} tasks
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-3">
                      {operationalKPIs.averageProjectDuration}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {operationalKPIs.averageWorkingDays} working days
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Creation Trend */}
              <Card className="bg-card backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Project Creation Trend</CardTitle>
                  <CardDescription>
                    New projects created over the last 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={operationalKPIs.projectCreationTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          color: "hsl(var(--popover-foreground))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={CHART_COLORS[0]}
                        fill={CHART_COLORS[0]}
                        fillOpacity={0.3}
                      />
                      {operationalKPIs.projectCreationTrend.map(
                        (entry, index) => (
                          <text
                            key={`label-${index}`}
                            x={`${(index / (operationalKPIs.projectCreationTrend.length - 1)) * 100}%`}
                            y="20"
                            textAnchor="middle"
                            fill="hsl(var(--foreground))"
                            fontSize="12"
                          >
                            {entry.count}
                          </text>
                        ),
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline KPIs */}
          {timelineKPIs &&
            (timelineKPIs.upcomingMilestones.length > 0 ||
              timelineKPIs.overdueMilestones.length > 0) && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Timeline Analysis
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {timelineKPIs.upcomingMilestones.length > 0 && (
                    <Card className="bg-card backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Upcoming Milestones
                        </CardTitle>
                        <CardDescription>
                          Milestones due in the next 30 days
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {timelineKPIs.upcomingMilestones
                            .slice(0, 5)
                            .map((milestone, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-chart-1/10 rounded-lg border border-chart-1/20"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {milestone.milestone}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {stripHtmlTags(milestone.projectTitle)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold">
                                    {milestone.daysUntilDue} days
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {milestone.completion}% complete
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {timelineKPIs.overdueMilestones.length > 0 && (
                    <Card className="bg-card backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Overdue Milestones
                        </CardTitle>
                        <CardDescription>
                          Milestones that are past their due date
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {timelineKPIs.overdueMilestones
                            .slice(0, 5)
                            .map((milestone, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {milestone.milestone}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {stripHtmlTags(milestone.projectTitle)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-destructive">
                                    {milestone.daysOverdue} days overdue
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {milestone.completion}% complete
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

          {/* Duration KPIs */}
          {durationKPIs && (
            <TooltipProvider>
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Project Duration Analysis
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg Total Duration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-chart-1">
                        {durationKPIs.averageTotalDays}
                      </div>
                      <div className="text-sm text-muted-foreground">days</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg Working Days
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-chart-2">
                        {durationKPIs.averageWorkingDays}
                      </div>
                      <div className="text-sm text-muted-foreground">working days</div>
                    </CardContent>
                  </Card>

                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Card className="bg-card backdrop-blur-sm cursor-help">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Duration Coverage
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-chart-5 mb-2">
                            {durationKPIs.durationCoverage}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {durationKPIs.projectsWithDuration} of{" "}
                            {projects.length} projects
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        <strong>Duration Coverage:</strong> Percentage of
                        projects with milestone dates available for duration
                        calculation. Higher coverage means better project
                        planning and tracking. This metric shows how many
                        projects have sufficient milestone data to calculate
                        accurate project timelines.
                      </p>
                    </TooltipContent>
                  </UITooltip>

                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Card className="bg-card backdrop-blur-sm cursor-help">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Duration Efficiency
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-chart-3 mb-2">
                            {durationKPIs.durationEfficiency}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            working/total ratio
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        <strong>Duration Efficiency:</strong> Ratio of working
                        days to total calendar days across all projects (Working
                        Days ÷ Total Days × 100). Shows how efficiently project
                        time is utilized, excluding weekends. Higher efficiency
                        indicates better time management and fewer calendar gaps
                        in project execution.
                      </p>
                    </TooltipContent>
                  </UITooltip>
                </div>

                {/* Duration Distribution and Department Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Duration Distribution</CardTitle>
                      <CardDescription>
                        Project distribution by duration categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={durationKPIs.durationDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="count"
                            nameKey="range"
                            label={({ name, value, percent }) =>
                              `${value} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {durationKPIs.durationDistribution.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)",
                              color: "hsl(var(--popover-foreground))",
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Duration by Department</CardTitle>
                      <CardDescription>
                        Average project duration across departments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={durationKPIs.departmentDurations}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="department" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)",
                              color: "hsl(var(--popover-foreground))",
                            }}
                          />
                          <Bar
                            dataKey="avgTotalDays"
                            name="Total Days"
                          >
                            {durationKPIs.departmentDurations.map(
                              (entry, index) => (
                                <Cell 
                                  key={`total-${index}`}
                                  fill={getDepartmentColor(entry.department, index)}
                                />
                              ),
                            )}
                          </Bar>
                          <Bar
                            dataKey="avgWorkingDays"
                            name="Working Days"
                          >
                            {durationKPIs.departmentDurations.map(
                              (entry, index) => (
                                <Cell 
                                  key={`working-${index}`}
                                  fill={getDepartmentColor(entry.department, index)}
                                  opacity={0.7}
                                />
                              ),
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Duration Extremes */}
                {(durationKPIs.longestProject ||
                  durationKPIs.shortestProject) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {durationKPIs.longestProject && (
                      <Card className="bg-card backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-destructive" />
                            Longest Project
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="font-medium text-lg">
                              {stripHtmlTags(durationKPIs.longestProject.title)}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Total Duration:
                              </span>
                              <span className="font-semibold">
                                {durationKPIs.longestProject.totalDays} days
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Working Days:
                              </span>
                              <span className="font-semibold">
                                {durationKPIs.longestProject.workingDays} days
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {durationKPIs.shortestProject && (
                      <Card className="bg-card backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-chart-2" />
                            Shortest Project
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="font-medium text-lg">
                              {stripHtmlTags(
                                durationKPIs.shortestProject.title,
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Total Duration:
                              </span>
                              <span className="font-semibold">
                                {durationKPIs.shortestProject.totalDays} days
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Working Days:
                              </span>
                              <span className="font-semibold">
                                {durationKPIs.shortestProject.workingDays} days
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Duration Statistics Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Average Duration (Planning Metrics)</CardTitle>
                      <CardDescription>
                        Mean values - useful for resource planning and budgeting
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-chart-1">
                            {durationKPIs.averageTotalDays}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg Total Days
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Calendar days from start to end
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-chart-2">
                            {durationKPIs.averageWorkingDays}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg Working Days
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Business days (excludes weekends)
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Median Duration (Typical Projects)</CardTitle>
                      <CardDescription>
                        Middle values - not skewed by extremely long projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-chart-1">
                            {durationKPIs.medianTotalDays}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Median Total Days
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            50% of projects are shorter
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-chart-2">
                            {durationKPIs.medianWorkingDays}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Median Working Days
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Typical project effort
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Remaining Days and Project Categories */}
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Current Status & Project Categories</CardTitle>
                    <CardDescription>
                      Remaining time and project distribution by duration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            durationKPIs.medianTotalDaysRemaining >= 0
                              ? "text-chart-1"
                              : "text-destructive"
                          }`}
                        >
                          {durationKPIs.medianTotalDaysRemaining}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Median Days Remaining
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {durationKPIs.medianTotalDaysRemaining < 0
                            ? "Overdue"
                            : "Until completion"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            durationKPIs.medianWorkingDaysRemaining >= 0
                              ? "text-chart-2"
                              : "text-destructive"
                          }`}
                        >
                          {durationKPIs.medianWorkingDaysRemaining}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Median Working Days Remaining
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Business days left
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-chart-3">
                          {durationKPIs.shortProjects}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Short Projects
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          &lt; 30 days
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {durationKPIs.longProjects}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Long Projects
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          &gt; 90 days
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TooltipProvider>
          )}

          {/* Quality KPIs */}
          {qualityKPIs && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Quality Indicators
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-2 mb-2">
                      {qualityKPIs.projectSuccessRate}%
                    </div>
                    <Progress
                      value={qualityKPIs.projectSuccessRate}
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      On-Time Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-1 mb-2">
                      {qualityKPIs.onTimeDeliveryRate}%
                    </div>
                    <Progress
                      value={qualityKPIs.onTimeDeliveryRate}
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Risks/Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-3">
                      {qualityKPIs.averageRisksPerProject}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Change Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-5">
                      {qualityKPIs.changeRequestFrequency}
                    </div>
                    <div className="text-sm text-muted-foreground">changes/project</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </Layout>
  );
};

export default ProjectKPIsPage;