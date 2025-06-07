import {
  ProjectWithRelations,
  calculateWeightedCompletion,
  calculateProjectHealthStatusColor,
} from "./project";

export interface FinancialKPIs {
  totalBudget: number;
  totalActuals: number;
  totalForecast: number;
  budgetUtilization: number;
  budgetVariance: number;
  departmentBudgets: Array<{
    department: string;
    budget: number;
    actuals: number;
    forecast: number;
    utilization: number;
  }>;
}

export interface PerformanceKPIs {
  overallCompletion: number;
  milestoneCompletionRate: number;
  completedMilestones: number;
  totalMilestones: number;
  healthDistribution: Array<{
    health: string;
    count: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface ResourceKPIs {
  departmentDistribution: Array<{
    department: string;
    count: number;
    avgCompletion: number;
  }>;
  projectManagerWorkload: Array<{
    manager: string;
    projectCount: number;
    totalBudget: number;
    avgCompletion: number;
  }>;
}

export interface OperationalKPIs {
  activeProjects: number;
  completedProjects: number;
  taskCompletionRate: number;
  tasksCompleted: number;
  totalTasks: number;
  averageProjectDuration: string;
  averageWorkingDays: number;
  projectCreationTrend: Array<{
    month: string;
    count: number;
  }>;
}

export interface QualityKPIs {
  projectSuccessRate: number;
  onTimeDeliveryRate: number;
  averageRisksPerProject: number;
  changeRequestFrequency: number;
}

export interface TimelineKPIs {
  upcomingMilestones: Array<{
    milestone: string;
    projectTitle: string;
    daysUntilDue: number;
    completion: number;
  }>;
  overdueMilestones: Array<{
    milestone: string;
    projectTitle: string;
    daysOverdue: number;
    completion: number;
  }>;
}

export interface DurationKPIs {
  averageTotalDays: number;
  averageWorkingDays: number;
  medianTotalDays: number;
  medianWorkingDays: number;
  medianTotalDaysRemaining: number;
  medianWorkingDaysRemaining: number;
  durationCoverage: number;
  projectsWithDuration: number;
  durationEfficiency: number;
  shortProjects: number;
  longProjects: number;
  durationDistribution: Array<{
    range: string;
    count: number;
  }>;
  departmentDurations: Array<{
    department: string;
    avgTotalDays: number;
    avgWorkingDays: number;
  }>;
  longestProject?: {
    title: string;
    totalDays: number;
    workingDays: number;
  };
  shortestProject?: {
    title: string;
    totalDays: number;
    workingDays: number;
  };
}

class KPIService {
  calculateFinancialKPIs(projects: ProjectWithRelations[]): FinancialKPIs {
    const totalBudget = projects.reduce(
      (sum, p) => sum + (p.budget_total || 0),
      0,
    );
    const totalActuals = projects.reduce(
      (sum, p) => sum + (p.budget_actuals || 0),
      0,
    );
    const totalForecast = projects.reduce(
      (sum, p) => sum + (p.budget_forecast || 0),
      0,
    );

    const budgetUtilization =
      totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;
    const budgetVariance = totalBudget - totalForecast;

    // Department budget breakdown
    const departmentMap = new Map<
      string,
      { budget: number; actuals: number; forecast: number }
    >();

    projects.forEach((p) => {
      const dept = p.department || "Unknown";
      const current = departmentMap.get(dept) || {
        budget: 0,
        actuals: 0,
        forecast: 0,
      };

      departmentMap.set(dept, {
        budget: current.budget + (p.budget_total || 0),
        actuals: current.actuals + (p.budget_actuals || 0),
        forecast: current.forecast + (p.budget_forecast || 0),
      });
    });

    const departmentBudgets = Array.from(departmentMap.entries()).map(
      ([department, data]) => ({
        department,
        ...data,
        utilization: data.budget > 0 ? (data.actuals / data.budget) * 100 : 0,
      }),
    );

    return {
      totalBudget,
      totalActuals,
      totalForecast,
      budgetUtilization,
      budgetVariance,
      departmentBudgets,
    };
  }

  calculatePerformanceKPIs(projects: ProjectWithRelations[]): PerformanceKPIs {
    // Overall completion
    const totalCompletion = projects.reduce((sum, p) => {
      if (
        p.health_calculation_type === "manual" &&
        p.manual_health_percentage !== null
      ) {
        return sum + p.manual_health_percentage;
      }
      return sum + calculateWeightedCompletion(p.milestones);
    }, 0);

    const overallCompletion =
      projects.length > 0 ? Math.round(totalCompletion / projects.length) : 0;

    // Milestone completion
    const allMilestones = projects.flatMap((p) => p.milestones || []);
    const completedMilestones = allMilestones.filter(
      (m) => (m.completion_percentage || m.completion) === 100,
    ).length;
    const totalMilestones = allMilestones.length;
    const milestoneCompletionRate =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // Health distribution - using standardized health calculation
    const healthCounts = new Map<string, number>();
    projects.forEach((p) => {
      // Use the standardized health calculation function
      const health = calculateProjectHealthStatusColor(p);

      // Special handling: Exclude cancelled projects from health distribution
      // Cancelled projects should be tracked separately
      if (p.status === "cancelled") {
        // Don't include cancelled projects in health distribution
        // They will be tracked in status distribution instead
        return;
      }

      healthCounts.set(health, (healthCounts.get(health) || 0) + 1);
    });

    // Calculate health distribution percentage based on non-cancelled projects only
    const nonCancelledProjects = projects.filter(
      (p) => p.status !== "cancelled",
    );
    const healthDistribution = Array.from(healthCounts.entries()).map(
      ([health, count]) => ({
        health: health.toUpperCase(),
        count,
        percentage:
          nonCancelledProjects.length > 0
            ? Math.round((count / nonCancelledProjects.length) * 100)
            : 0,
      }),
    );

    // Ensure all health statuses are represented (even if count is 0)
    const allHealthStatuses = ["green", "yellow", "red"];
    allHealthStatuses.forEach((status) => {
      if (!healthDistribution.find((h) => h.health === status.toUpperCase())) {
        healthDistribution.push({
          health: status.toUpperCase(),
          count: 0,
          percentage: 0,
        });
      }
    });

    // Sort health distribution for consistent display
    healthDistribution.sort((a, b) => {
      const order = { GREEN: 0, YELLOW: 1, RED: 2 };
      return order[a.health] - order[b.health];
    });

    // Status distribution
    const statusCounts = new Map<string, number>();
    projects.forEach((p) => {
      const status = p.status || "unknown";
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusCounts.entries()).map(
      ([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: Math.round((count / projects.length) * 100),
      }),
    );

    return {
      overallCompletion,
      milestoneCompletionRate,
      completedMilestones,
      totalMilestones,
      healthDistribution,
      statusDistribution,
    };
  }

  calculateResourceKPIs(projects: ProjectWithRelations[]): ResourceKPIs {
    // Department distribution
    const departmentMap = new Map<
      string,
      { count: number; totalCompletion: number }
    >();

    projects.forEach((p) => {
      const dept = p.department || "Unknown";
      const current = departmentMap.get(dept) || {
        count: 0,
        totalCompletion: 0,
      };

      const completion =
        p.health_calculation_type === "manual" &&
        p.manual_health_percentage !== null
          ? p.manual_health_percentage
          : calculateWeightedCompletion(p.milestones);

      departmentMap.set(dept, {
        count: current.count + 1,
        totalCompletion: current.totalCompletion + completion,
      });
    });

    const departmentDistribution = Array.from(departmentMap.entries()).map(
      ([department, data]) => ({
        department,
        count: data.count,
        avgCompletion: Math.round(data.totalCompletion / data.count),
      }),
    );

    // Project manager workload
    const pmMap = new Map<
      string,
      { count: number; totalBudget: number; totalCompletion: number }
    >();

    projects.forEach((p) => {
      const pm = p.project_manager || "Unassigned";
      const current = pmMap.get(pm) || {
        count: 0,
        totalBudget: 0,
        totalCompletion: 0,
      };

      const completion =
        p.health_calculation_type === "manual" &&
        p.manual_health_percentage !== null
          ? p.manual_health_percentage
          : calculateWeightedCompletion(p.milestones);

      pmMap.set(pm, {
        count: current.count + 1,
        totalBudget: current.totalBudget + (p.budget_total || 0),
        totalCompletion: current.totalCompletion + completion,
      });
    });

    const projectManagerWorkload = Array.from(pmMap.entries())
      .filter(([manager]) => manager && manager !== "Unassigned")
      .map(([manager, data]) => ({
        manager,
        projectCount: data.count,
        totalBudget: data.totalBudget,
        avgCompletion: Math.round(data.totalCompletion / data.count),
      }))
      .sort((a, b) => b.projectCount - a.projectCount);

    return {
      departmentDistribution,
      projectManagerWorkload,
    };
  }

  calculateOperationalKPIs(projects: ProjectWithRelations[]): OperationalKPIs {
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed",
    ).length;

    // Task completion (using milestones as tasks)
    const allMilestones = projects.flatMap((p) => p.milestones || []);
    const completedMilestones = allMilestones.filter(
      (m) => (m.completion_percentage || m.completion) === 100,
    ).length;
    const taskCompletionRate =
      allMilestones.length > 0
        ? Math.round((completedMilestones / allMilestones.length) * 100)
        : 0;

    // Average project duration
    const projectsWithDuration = projects.filter(
      (p) => p.total_days && p.total_days > 0,
    );
    const avgTotalDays =
      projectsWithDuration.length > 0
        ? Math.round(
            projectsWithDuration.reduce(
              (sum, p) => sum + (p.total_days || 0),
              0,
            ) / projectsWithDuration.length,
          )
        : 0;

    const avgWorkingDays =
      projectsWithDuration.length > 0
        ? Math.round(
            projectsWithDuration.reduce(
              (sum, p) => sum + (p.working_days || 0),
              0,
            ) / projectsWithDuration.length,
          )
        : 0;

    const averageProjectDuration = `${avgTotalDays} days`;

    // Project creation trend (last 12 months)
    const now = new Date();
    const monthsData = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      const projectsInMonth = projects.filter((p) => {
        if (!p.created_at) return false;
        const projectDate = new Date(p.created_at);
        return (
          projectDate.getFullYear() === date.getFullYear() &&
          projectDate.getMonth() === date.getMonth()
        );
      }).length;

      monthsData.push({ month: monthName, count: projectsInMonth });
    }

    return {
      activeProjects,
      completedProjects,
      taskCompletionRate,
      tasksCompleted: completedMilestones,
      totalTasks: allMilestones.length,
      averageProjectDuration,
      averageWorkingDays: avgWorkingDays,
      projectCreationTrend: monthsData,
    };
  }

  calculateQualityKPIs(projects: ProjectWithRelations[]): QualityKPIs {
    const completedProjects = projects.filter((p) => p.status === "completed");
    const projectSuccessRate =
      projects.length > 0
        ? Math.round((completedProjects.length / projects.length) * 100)
        : 0;

    // On-time delivery (projects completed by their end date)
    const onTimeProjects = completedProjects.filter((p) => {
      if (!p.end_date) return false;
      // For now, assume all completed projects are on time
      // This could be enhanced with actual completion date tracking
      return true;
    }).length;

    const onTimeDeliveryRate =
      completedProjects.length > 0
        ? Math.round((onTimeProjects / completedProjects.length) * 100)
        : 0;

    // Average risks per project
    const totalRisks = projects.reduce(
      (sum, p) => sum + (p.risks?.length || 0),
      0,
    );
    const averageRisksPerProject =
      projects.length > 0
        ? Math.round((totalRisks / projects.length) * 10) / 10
        : 0;

    // Change request frequency (using considerations as proxy)
    const totalChanges = projects.reduce(
      (sum, p) => sum + (p.considerations?.length || 0),
      0,
    );
    const changeRequestFrequency =
      projects.length > 0
        ? Math.round((totalChanges / projects.length) * 10) / 10
        : 0;

    return {
      projectSuccessRate,
      onTimeDeliveryRate,
      averageRisksPerProject,
      changeRequestFrequency,
    };
  }

  calculateTimelineKPIs(projects: ProjectWithRelations[]): TimelineKPIs {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const upcomingMilestones = [];
    const overdueMilestones = [];

    projects.forEach((project) => {
      (project.milestones || []).forEach((milestone) => {
        if (!milestone.date) return;

        const milestoneDate = new Date(milestone.date);
        const daysUntilDue = Math.ceil(
          (milestoneDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (daysUntilDue > 0 && daysUntilDue <= 30) {
          upcomingMilestones.push({
            milestone: milestone.description || milestone.milestone,
            projectTitle: project.title,
            daysUntilDue,
            completion:
              milestone.completion_percentage || milestone.completion || 0,
          });
        } else if (daysUntilDue < 0) {
          overdueMilestones.push({
            milestone: milestone.description || milestone.milestone,
            projectTitle: project.title,
            daysOverdue: Math.abs(daysUntilDue),
            completion:
              milestone.completion_percentage || milestone.completion || 0,
          });
        }
      });
    });

    // Sort by urgency
    upcomingMilestones.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    overdueMilestones.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      upcomingMilestones,
      overdueMilestones,
    };
  }

  calculateDurationKPIs(projects: ProjectWithRelations[]): DurationKPIs {
    const projectsWithDuration = projects.filter(
      (p) => p.total_days && p.total_days > 0,
    );

    if (projectsWithDuration.length === 0) {
      return {
        averageTotalDays: 0,
        averageWorkingDays: 0,
        medianTotalDays: 0,
        medianWorkingDays: 0,
        medianTotalDaysRemaining: 0,
        medianWorkingDaysRemaining: 0,
        durationCoverage: 0,
        projectsWithDuration: 0,
        durationEfficiency: 0,
        shortProjects: 0,
        longProjects: 0,
        durationDistribution: [],
        departmentDurations: [],
      };
    }

    // Calculate averages
    const totalDays = projectsWithDuration.map((p) => p.total_days || 0);
    const workingDays = projectsWithDuration.map((p) => p.working_days || 0);
    const totalDaysRemaining = projectsWithDuration.map(
      (p) => p.total_days_remaining || 0,
    );
    const workingDaysRemaining = projectsWithDuration.map(
      (p) => p.working_days_remaining || 0,
    );

    const averageTotalDays = Math.round(
      totalDays.reduce((sum, days) => sum + days, 0) / totalDays.length,
    );
    const averageWorkingDays = Math.round(
      workingDays.reduce((sum, days) => sum + days, 0) / workingDays.length,
    );

    // Calculate medians
    const sortedTotalDays = [...totalDays].sort((a, b) => a - b);
    const sortedWorkingDays = [...workingDays].sort((a, b) => a - b);
    const sortedTotalDaysRemaining = [...totalDaysRemaining].sort(
      (a, b) => a - b,
    );
    const sortedWorkingDaysRemaining = [...workingDaysRemaining].sort(
      (a, b) => a - b,
    );

    const medianTotalDays =
      sortedTotalDays[Math.floor(sortedTotalDays.length / 2)];
    const medianWorkingDays =
      sortedWorkingDays[Math.floor(sortedWorkingDays.length / 2)];
    const medianTotalDaysRemaining =
      sortedTotalDaysRemaining[Math.floor(sortedTotalDaysRemaining.length / 2)];
    const medianWorkingDaysRemaining =
      sortedWorkingDaysRemaining[
        Math.floor(sortedWorkingDaysRemaining.length / 2)
      ];

    // Duration coverage
    const durationCoverage = Math.round(
      (projectsWithDuration.length / projects.length) * 100,
    );

    // Duration efficiency
    const totalWorkingDays = workingDays.reduce((sum, days) => sum + days, 0);
    const totalTotalDays = totalDays.reduce((sum, days) => sum + days, 0);
    const durationEfficiency =
      totalTotalDays > 0
        ? Math.round((totalWorkingDays / totalTotalDays) * 100)
        : 0;

    // Project categories
    const shortProjects = projectsWithDuration.filter(
      (p) => (p.total_days || 0) < 30,
    ).length;
    const longProjects = projectsWithDuration.filter(
      (p) => (p.total_days || 0) > 90,
    ).length;

    // Duration distribution
    const ranges = [
      { range: "< 30 days", min: 0, max: 29 },
      { range: "30-60 days", min: 30, max: 60 },
      { range: "61-90 days", min: 61, max: 90 },
      { range: "> 90 days", min: 91, max: Infinity },
    ];

    const durationDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: projectsWithDuration.filter((p) => {
        const days = p.total_days || 0;
        return days >= min && days <= max;
      }).length,
    }));

    // Department durations
    const departmentMap = new Map<
      string,
      { totalDays: number; workingDays: number; count: number }
    >();

    projectsWithDuration.forEach((p) => {
      const dept = p.department || "Unknown";
      const current = departmentMap.get(dept) || {
        totalDays: 0,
        workingDays: 0,
        count: 0,
      };

      departmentMap.set(dept, {
        totalDays: current.totalDays + (p.total_days || 0),
        workingDays: current.workingDays + (p.working_days || 0),
        count: current.count + 1,
      });
    });

    const departmentDurations = Array.from(departmentMap.entries()).map(
      ([department, data]) => ({
        department,
        avgTotalDays: Math.round(data.totalDays / data.count),
        avgWorkingDays: Math.round(data.workingDays / data.count),
      }),
    );

    // Extremes
    const longestProject = projectsWithDuration.reduce((longest, p) =>
      (p.total_days || 0) > (longest?.total_days || 0) ? p : longest,
    );

    const shortestProject = projectsWithDuration.reduce((shortest, p) =>
      (p.total_days || 0) < (shortest?.total_days || 0) ? p : shortest,
    );

    return {
      averageTotalDays,
      averageWorkingDays,
      medianTotalDays,
      medianWorkingDays,
      medianTotalDaysRemaining,
      medianWorkingDaysRemaining,
      durationCoverage,
      projectsWithDuration: projectsWithDuration.length,
      durationEfficiency,
      shortProjects,
      longProjects,
      durationDistribution,
      departmentDurations,
      longestProject: longestProject
        ? {
            title: longestProject.title,
            totalDays: longestProject.total_days || 0,
            workingDays: longestProject.working_days || 0,
          }
        : undefined,
      shortestProject: shortestProject
        ? {
            title: shortestProject.title,
            totalDays: shortestProject.total_days || 0,
            workingDays: shortestProject.working_days || 0,
          }
        : undefined,
    };
  }
}

export const kpiService = new KPIService();
