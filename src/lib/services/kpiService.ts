/**
 * File: kpiService.ts
 * Purpose: Service for calculating project KPIs and metrics
 * Description: This service provides functions to calculate various KPIs from project data,
 * including financial metrics, performance indicators, resource utilization, and operational metrics.
 * It aggregates data from all projects to provide portfolio-level insights.
 */

import { ProjectWithRelations, calculateWeightedCompletion } from "./project";
import {
  format,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
} from "date-fns";

export interface FinancialKPIs {
  totalBudget: number;
  totalActuals: number;
  totalForecast: number;
  budgetVariance: number;
  budgetUtilization: number;
  costPerformanceIndex: number;
  projectsOverBudget: number;
  projectsUnderBudget: number;
  departmentBudgets: Array<{
    department: string;
    budget: number;
    actuals: number;
    forecast: number;
    variance: number;
  }>;
}

export interface PerformanceKPIs {
  overallCompletion: number;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  healthDistribution: Array<{
    health: string;
    count: number;
    percentage: number;
  }>;
  milestoneCompletionRate: number;
  averageProjectCompletion: number;
  completedMilestones: number;
  totalMilestones: number;
}

export interface ResourceKPIs {
  departmentDistribution: Array<{
    department: string;
    count: number;
    percentage: number;
    avgCompletion: number;
  }>;
  projectManagerWorkload: Array<{
    manager: string;
    projectCount: number;
    avgCompletion: number;
    totalBudget: number;
  }>;
  resourceUtilization: number;
}

export interface OperationalKPIs {
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  averageProjectDuration: number;
  averageWorkingDays: number;
  projectsWithDuration: number;
  projectCreationTrend: Array<{
    month: string;
    count: number;
  }>;
  riskDistribution: Array<{
    riskLevel: string;
    count: number;
    percentage: number;
  }>;
  tasksCompleted: number;
  totalTasks: number;
  taskCompletionRate: number;
}

export interface QualityKPIs {
  projectsWithRisks: number;
  projectsWithoutRisks: number;
  averageRisksPerProject: number;
  changeRequestFrequency: number;
  onTimeDeliveryRate: number;
  projectSuccessRate: number;
}

export interface TimelineKPIs {
  upcomingMilestones: Array<{
    projectTitle: string;
    milestone: string;
    date: string;
    daysUntilDue: number;
    completion: number;
    status: string;
  }>;
  overdueMilestones: Array<{
    projectTitle: string;
    milestone: string;
    date: string;
    daysOverdue: number;
    completion: number;
    status: string;
  }>;
}

export interface DurationKPIs {
  averageTotalDays: number;
  averageWorkingDays: number;
  medianTotalDays: number;
  medianWorkingDays: number;
  medianTotalDaysRemaining: number;
  medianWorkingDaysRemaining: number;
  projectsWithDuration: number;
  projectsWithoutDuration: number;
  durationCoverage: number;
  shortProjects: number; // < 30 days
  mediumProjects: number; // 30-90 days
  longProjects: number; // > 90 days
  durationDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  departmentDurations: Array<{
    department: string;
    avgTotalDays: number;
    avgWorkingDays: number;
    projectCount: number;
  }>;
  durationEfficiency: number; // working days / total days ratio
  longestProject: {
    title: string;
    totalDays: number;
    workingDays: number;
  } | null;
  shortestProject: {
    title: string;
    totalDays: number;
    workingDays: number;
  } | null;
}

export const kpiService = {
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

    const budgetVariance = totalBudget - (totalActuals + totalForecast);
    const budgetUtilization =
      totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;
    const costPerformanceIndex =
      totalActuals > 0 ? totalBudget / totalActuals : 1;

    const projectsOverBudget = projects.filter(
      (p) => p.budget_actuals + p.budget_forecast > (p.budget_total || 0),
    ).length;

    const projectsUnderBudget = projects.filter(
      (p) => p.budget_actuals + p.budget_forecast < (p.budget_total || 0),
    ).length;

    // Department budget breakdown
    const departmentMap = new Map<
      string,
      {
        budget: number;
        actuals: number;
        forecast: number;
      }
    >();

    projects.forEach((p) => {
      const dept = p.department || "Unknown";
      const existing = departmentMap.get(dept) || {
        budget: 0,
        actuals: 0,
        forecast: 0,
      };
      departmentMap.set(dept, {
        budget: existing.budget + (p.budget_total || 0),
        actuals: existing.actuals + (p.budget_actuals || 0),
        forecast: existing.forecast + (p.budget_forecast || 0),
      });
    });

    const departmentBudgets = Array.from(departmentMap.entries()).map(
      ([department, data]) => ({
        department,
        ...data,
        variance: data.budget - (data.actuals + data.forecast),
      }),
    );

    return {
      totalBudget,
      totalActuals,
      totalForecast,
      budgetVariance,
      budgetUtilization,
      costPerformanceIndex,
      projectsOverBudget,
      projectsUnderBudget,
      departmentBudgets,
    };
  },

  calculatePerformanceKPIs(projects: ProjectWithRelations[]): PerformanceKPIs {
    // Calculate overall completion
    const totalWeightedCompletion = projects.reduce((sum, p) => {
      const completion =
        p.health_calculation_type === "manual"
          ? p.manual_health_percentage || 0
          : calculateWeightedCompletion(p.milestones);
      return sum + completion;
    }, 0);

    const overallCompletion =
      projects.length > 0
        ? Math.round(totalWeightedCompletion / projects.length)
        : 0;

    // Status distribution
    const statusCounts = new Map<string, number>();
    projects.forEach((p) => {
      const status = p.status || "unknown";
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusCounts.entries()).map(
      ([status, count]) => ({
        status: status.replace("_", " ").toUpperCase(),
        count,
        percentage: Math.round((count / projects.length) * 100),
      }),
    );

    // Health distribution
    const healthCounts = new Map<string, number>();
    projects.forEach((p) => {
      let health = "green";
      if (p.health_calculation_type === "manual" && p.manual_status_color) {
        health = p.manual_status_color;
      } else {
        // Determine health based on milestones
        const redMilestones = p.milestones.filter(
          (m) => m.status === "red",
        ).length;
        const yellowMilestones = p.milestones.filter(
          (m) => m.status === "yellow",
        ).length;

        if (redMilestones > 0) health = "red";
        else if (yellowMilestones > 0) health = "yellow";
      }

      healthCounts.set(health, (healthCounts.get(health) || 0) + 1);
    });

    const healthDistribution = Array.from(healthCounts.entries()).map(
      ([health, count]) => ({
        health: health.toUpperCase(),
        count,
        percentage: Math.round((count / projects.length) * 100),
      }),
    );

    // Milestone completion
    const allMilestones = projects.flatMap((p) => p.milestones);
    const completedMilestones = allMilestones.filter(
      (m) => m.completion === 100,
    ).length;
    const totalMilestones = allMilestones.length;
    const milestoneCompletionRate =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    const averageProjectCompletion = overallCompletion;

    return {
      overallCompletion,
      statusDistribution,
      healthDistribution,
      milestoneCompletionRate,
      averageProjectCompletion,
      completedMilestones,
      totalMilestones,
    };
  },

  calculateResourceKPIs(projects: ProjectWithRelations[]): ResourceKPIs {
    // Department distribution
    const departmentCounts = new Map<
      string,
      { count: number; totalCompletion: number }
    >();
    projects.forEach((p) => {
      const dept = p.department || "Unknown";
      const completion =
        p.health_calculation_type === "manual"
          ? p.manual_health_percentage || 0
          : calculateWeightedCompletion(p.milestones);

      const existing = departmentCounts.get(dept) || {
        count: 0,
        totalCompletion: 0,
      };
      departmentCounts.set(dept, {
        count: existing.count + 1,
        totalCompletion: existing.totalCompletion + completion,
      });
    });

    const departmentDistribution = Array.from(departmentCounts.entries()).map(
      ([department, data]) => ({
        department,
        count: data.count,
        percentage: Math.round((data.count / projects.length) * 100),
        avgCompletion: Math.round(data.totalCompletion / data.count),
      }),
    );

    // Project manager workload
    const managerCounts = new Map<
      string,
      { count: number; totalCompletion: number; totalBudget: number }
    >();
    projects.forEach((p) => {
      // Handle null, undefined, empty string, and whitespace-only project managers
      const manager =
        (p.project_manager && p.project_manager.trim()) || "Unknown";
      const completion =
        p.health_calculation_type === "manual"
          ? p.manual_health_percentage || 0
          : calculateWeightedCompletion(p.milestones);

      const existing = managerCounts.get(manager) || {
        count: 0,
        totalCompletion: 0,
        totalBudget: 0,
      };
      managerCounts.set(manager, {
        count: existing.count + 1,
        totalCompletion: existing.totalCompletion + completion,
        totalBudget: existing.totalBudget + (p.budget_total || 0),
      });
    });

    const projectManagerWorkload = Array.from(managerCounts.entries())
      .map(([manager, data]) => ({
        manager,
        projectCount: data.count,
        avgCompletion: Math.round(data.totalCompletion / data.count),
        totalBudget: data.totalBudget,
      }))
      .sort((a, b) => b.projectCount - a.projectCount);

    // Resource utilization (based on active projects vs total capacity)
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const resourceUtilization =
      projects.length > 0
        ? Math.round((activeProjects / projects.length) * 100)
        : 0;

    return {
      departmentDistribution,
      projectManagerWorkload,
      resourceUtilization,
    };
  },

  calculateOperationalKPIs(projects: ProjectWithRelations[]): OperationalKPIs {
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed",
    ).length;
    const onHoldProjects = projects.filter(
      (p) => p.status === "on_hold",
    ).length;
    const cancelledProjects = projects.filter(
      (p) => p.status === "cancelled",
    ).length;

    // Average project duration (using calculated duration fields)
    const projectsWithDuration = projects.filter(
      (p) =>
        p.total_days !== null && p.total_days !== undefined && p.total_days > 0,
    );

    const averageProjectDuration =
      projectsWithDuration.length > 0
        ? Math.round(
            projectsWithDuration.reduce(
              (sum, p) => sum + (p.total_days || 0),
              0,
            ) / projectsWithDuration.length,
          )
        : 0;

    // Project creation trend (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = subMonths(now, 11);
    const months = eachMonthOfInterval({ start: twelveMonthsAgo, end: now });

    const projectCreationTrend = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const count = projects.filter((p) => {
        if (!p.created_at) return false;
        const createdDate = parseISO(p.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;

      return {
        month: format(month, "MMM yyyy"),
        count,
      };
    });

    // Risk distribution
    const projectsWithRisks = projects.filter((p) => p.risks.length > 0).length;
    const projectsWithoutRisks = projects.length - projectsWithRisks;

    const riskDistribution = [
      {
        riskLevel: "High Risk",
        count: projectsWithRisks,
        percentage: Math.round((projectsWithRisks / projects.length) * 100),
      },
      {
        riskLevel: "Low Risk",
        count: projectsWithoutRisks,
        percentage: Math.round((projectsWithoutRisks / projects.length) * 100),
      },
    ];

    // Task completion
    const allTasks = projects.flatMap((p) =>
      p.milestones.flatMap((m) => m.tasks || []),
    );
    const completedTasks = allTasks.filter((t) => t.completion === 100).length;
    const totalTasks = allTasks.length;
    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Average working days
    const averageWorkingDays =
      projectsWithDuration.length > 0
        ? Math.round(
            projectsWithDuration.reduce(
              (sum, p) => sum + (p.working_days || 0),
              0,
            ) / projectsWithDuration.length,
          )
        : 0;

    return {
      activeProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects,
      averageProjectDuration,
      averageWorkingDays,
      projectsWithDuration: projectsWithDuration.length,
      projectCreationTrend,
      riskDistribution,
      tasksCompleted: completedTasks,
      totalTasks,
      taskCompletionRate,
    };
  },

  calculateQualityKPIs(projects: ProjectWithRelations[]): QualityKPIs {
    const projectsWithRisks = projects.filter((p) => p.risks.length > 0).length;
    const projectsWithoutRisks = projects.length - projectsWithRisks;

    const totalRisks = projects.reduce((sum, p) => sum + p.risks.length, 0);
    const averageRisksPerProject =
      projects.length > 0
        ? Math.round((totalRisks / projects.length) * 10) / 10
        : 0;

    const totalChanges = projects.reduce((sum, p) => sum + p.changes.length, 0);
    const changeRequestFrequency =
      projects.length > 0
        ? Math.round((totalChanges / projects.length) * 10) / 10
        : 0;

    // On-time delivery rate (based on completed projects with milestones)
    const completedProjects = projects.filter((p) => p.status === "completed");
    const onTimeProjects = completedProjects.filter((p) => {
      // Consider on-time if all milestones were completed by their due date
      return p.milestones.every((m) => m.completion === 100);
    }).length;

    const onTimeDeliveryRate =
      completedProjects.length > 0
        ? Math.round((onTimeProjects / completedProjects.length) * 100)
        : 0;

    // Project success rate (completed projects vs total projects)
    const projectSuccessRate =
      projects.length > 0
        ? Math.round((completedProjects.length / projects.length) * 100)
        : 0;

    return {
      projectsWithRisks,
      projectsWithoutRisks,
      averageRisksPerProject,
      changeRequestFrequency,
      onTimeDeliveryRate,
      projectSuccessRate,
    };
  },

  calculateTimelineKPIs(projects: ProjectWithRelations[]): TimelineKPIs {
    const today = new Date();
    const allMilestones = projects.flatMap((p) =>
      p.milestones.map((m) => ({
        ...m,
        projectTitle: p.title,
      })),
    );

    // Upcoming milestones (next 30 days)
    const upcomingMilestones = allMilestones
      .filter((m) => {
        const milestoneDate = parseISO(m.date);
        const daysUntilDue = differenceInDays(milestoneDate, today);
        return daysUntilDue >= 0 && daysUntilDue <= 30 && m.completion < 100;
      })
      .map((m) => {
        const milestoneDate = parseISO(m.date);
        return {
          projectTitle: m.projectTitle,
          milestone: m.milestone,
          date: m.date,
          daysUntilDue: differenceInDays(milestoneDate, today),
          completion: m.completion,
          status: m.status,
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 10);

    // Overdue milestones
    const overdueMilestones = allMilestones
      .filter((m) => {
        const milestoneDate = parseISO(m.date);
        const daysOverdue = differenceInDays(today, milestoneDate);
        return daysOverdue > 0 && m.completion < 100;
      })
      .map((m) => {
        const milestoneDate = parseISO(m.date);
        return {
          projectTitle: m.projectTitle,
          milestone: m.milestone,
          date: m.date,
          daysOverdue: differenceInDays(today, milestoneDate),
          completion: m.completion,
          status: m.status,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 10);

    return {
      upcomingMilestones,
      overdueMilestones,
    };
  },

  calculateDurationKPIs(projects: ProjectWithRelations[]): DurationKPIs {
    // Filter projects with duration data
    const projectsWithDuration = projects.filter(
      (p) =>
        p.total_days !== null &&
        p.total_days !== undefined &&
        p.total_days > 0 &&
        p.working_days !== null &&
        p.working_days !== undefined &&
        p.working_days > 0,
    );

    const projectsWithoutDuration =
      projects.length - projectsWithDuration.length;
    const durationCoverage =
      projects.length > 0
        ? Math.round((projectsWithDuration.length / projects.length) * 100)
        : 0;

    if (projectsWithDuration.length === 0) {
      return {
        averageTotalDays: 0,
        averageWorkingDays: 0,
        medianTotalDays: 0,
        medianWorkingDays: 0,
        medianTotalDaysRemaining: 0,
        medianWorkingDaysRemaining: 0,
        projectsWithDuration: 0,
        projectsWithoutDuration,
        durationCoverage: 0,
        shortProjects: 0,
        mediumProjects: 0,
        longProjects: 0,
        durationDistribution: [],
        departmentDurations: [],
        durationEfficiency: 0,
        longestProject: null,
        shortestProject: null,
      };
    }

    // Calculate averages
    const totalDaysSum = projectsWithDuration.reduce(
      (sum, p) => sum + (p.total_days || 0),
      0,
    );
    const workingDaysSum = projectsWithDuration.reduce(
      (sum, p) => sum + (p.working_days || 0),
      0,
    );

    const averageTotalDays = Math.round(
      totalDaysSum / projectsWithDuration.length,
    );
    const averageWorkingDays = Math.round(
      workingDaysSum / projectsWithDuration.length,
    );

    // Calculate medians
    const sortedTotalDays = projectsWithDuration
      .map((p) => p.total_days || 0)
      .sort((a, b) => a - b);
    const sortedWorkingDays = projectsWithDuration
      .map((p) => p.working_days || 0)
      .sort((a, b) => a - b);

    const medianTotalDays =
      sortedTotalDays.length % 2 === 0
        ? Math.round(
            (sortedTotalDays[sortedTotalDays.length / 2 - 1] +
              sortedTotalDays[sortedTotalDays.length / 2]) /
              2,
          )
        : sortedTotalDays[Math.floor(sortedTotalDays.length / 2)];

    const medianWorkingDays =
      sortedWorkingDays.length % 2 === 0
        ? Math.round(
            (sortedWorkingDays[sortedWorkingDays.length / 2 - 1] +
              sortedWorkingDays[sortedWorkingDays.length / 2]) /
              2,
          )
        : sortedWorkingDays[Math.floor(sortedWorkingDays.length / 2)];

    // Calculate median remaining days
    // Filter projects with remaining days data (including negative values for overdue projects)
    const projectsWithRemainingDays = projects.filter(
      (p) =>
        p.total_days_remaining !== null &&
        p.total_days_remaining !== undefined &&
        p.working_days_remaining !== null &&
        p.working_days_remaining !== undefined,
    );

    let medianTotalDaysRemaining = 0;
    let medianWorkingDaysRemaining = 0;

    if (projectsWithRemainingDays.length > 0) {
      // Calculate median for total days remaining
      const sortedTotalDaysRemaining = projectsWithRemainingDays
        .map((p) => p.total_days_remaining || 0)
        .sort((a, b) => a - b);

      medianTotalDaysRemaining =
        sortedTotalDaysRemaining.length % 2 === 0
          ? Math.round(
              (sortedTotalDaysRemaining[
                sortedTotalDaysRemaining.length / 2 - 1
              ] +
                sortedTotalDaysRemaining[sortedTotalDaysRemaining.length / 2]) /
                2,
            )
          : sortedTotalDaysRemaining[
              Math.floor(sortedTotalDaysRemaining.length / 2)
            ];

      // Calculate median for working days remaining
      const sortedWorkingDaysRemaining = projectsWithRemainingDays
        .map((p) => p.working_days_remaining || 0)
        .sort((a, b) => a - b);

      medianWorkingDaysRemaining =
        sortedWorkingDaysRemaining.length % 2 === 0
          ? Math.round(
              (sortedWorkingDaysRemaining[
                sortedWorkingDaysRemaining.length / 2 - 1
              ] +
                sortedWorkingDaysRemaining[
                  sortedWorkingDaysRemaining.length / 2
                ]) /
                2,
            )
          : sortedWorkingDaysRemaining[
              Math.floor(sortedWorkingDaysRemaining.length / 2)
            ];
    }

    // Duration categories
    const shortProjects = projectsWithDuration.filter(
      (p) => (p.total_days || 0) < 30,
    ).length;
    const mediumProjects = projectsWithDuration.filter(
      (p) => (p.total_days || 0) >= 30 && (p.total_days || 0) <= 90,
    ).length;
    const longProjects = projectsWithDuration.filter(
      (p) => (p.total_days || 0) > 90,
    ).length;

    // Duration distribution
    const durationDistribution = [
      {
        range: "Short (< 30 days)",
        count: shortProjects,
        percentage: Math.round(
          (shortProjects / projectsWithDuration.length) * 100,
        ),
      },
      {
        range: "Medium (30-90 days)",
        count: mediumProjects,
        percentage: Math.round(
          (mediumProjects / projectsWithDuration.length) * 100,
        ),
      },
      {
        range: "Long (> 90 days)",
        count: longProjects,
        percentage: Math.round(
          (longProjects / projectsWithDuration.length) * 100,
        ),
      },
    ];

    // Department duration analysis
    const departmentMap = new Map<
      string,
      {
        totalDaysSum: number;
        workingDaysSum: number;
        count: number;
      }
    >();

    projectsWithDuration.forEach((p) => {
      const dept = p.department || "Unknown";
      const existing = departmentMap.get(dept) || {
        totalDaysSum: 0,
        workingDaysSum: 0,
        count: 0,
      };
      departmentMap.set(dept, {
        totalDaysSum: existing.totalDaysSum + (p.total_days || 0),
        workingDaysSum: existing.workingDaysSum + (p.working_days || 0),
        count: existing.count + 1,
      });
    });

    const departmentDurations = Array.from(departmentMap.entries()).map(
      ([department, data]) => ({
        department,
        avgTotalDays: Math.round(data.totalDaysSum / data.count),
        avgWorkingDays: Math.round(data.workingDaysSum / data.count),
        projectCount: data.count,
      }),
    );

    // Duration efficiency (working days / total days)
    const durationEfficiency = Math.round(
      (workingDaysSum / totalDaysSum) * 100,
    );

    // Longest and shortest projects
    const longestProject = projectsWithDuration.reduce((longest, current) => {
      return (current.total_days || 0) > (longest.total_days || 0)
        ? current
        : longest;
    });

    const shortestProject = projectsWithDuration.reduce((shortest, current) => {
      return (current.total_days || 0) < (shortest.total_days || 0)
        ? current
        : shortest;
    });

    return {
      averageTotalDays,
      averageWorkingDays,
      medianTotalDays,
      medianWorkingDays,
      medianTotalDaysRemaining,
      medianWorkingDaysRemaining,
      projectsWithDuration: projectsWithDuration.length,
      projectsWithoutDuration,
      durationCoverage,
      shortProjects,
      mediumProjects,
      longProjects,
      durationDistribution,
      departmentDurations,
      durationEfficiency,
      longestProject: {
        title: longestProject.title,
        totalDays: longestProject.total_days || 0,
        workingDays: longestProject.working_days || 0,
      },
      shortestProject: {
        title: shortestProject.title,
        totalDays: shortestProject.total_days || 0,
        workingDays: shortestProject.working_days || 0,
      },
    };
  },
};
