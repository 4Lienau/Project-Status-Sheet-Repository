import { supabase } from "../supabase";
import {
  calculateProjectHealthStatusColor,
  calculateWeightedCompletion,
  ProjectWithRelations,
  projectService,
} from "./project";

/**
 * Enhanced project health analyzer with detailed debugging information
 * Use this to understand why projects are getting specific health scores
 */
export const projectHealthAnalyzer = {
  /**
   * Analyze a specific project's health calculation in detail
   */
  async analyzeProject(projectId: string): Promise<{
    project: ProjectWithRelations | null;
    analysis: {
      healthStatus: "red" | "yellow" | "green";
      calculationType:
        | "manual"
        | "status-based"
        | "milestone-based"
        | "future-project";
      reasoning: string;
      metrics: {
        weightedCompletion: number;
        timeRemainingPercentage: number | null;
        totalDays: number | null;
        totalDaysRemaining: number | null;
        workingDaysRemaining: number | null;
        startDate: string | null;
        endDate: string | null;
        projectStartsInFuture: boolean;
        isOverdue: boolean;
      };
      recommendations: string[];
      debugInfo: {
        milestoneCount: number;
        milestoneDetails: Array<{
          date: string;
          milestone: string;
          completion: number;
          weight: number;
          daysFromToday: number;
          status: string;
        }>;
      };
    };
  }> {
    try {
      console.log(`[HEALTH_ANALYZER] Analyzing project: ${projectId}`);

      // Get the complete project
      const project = await projectService.getProject(projectId);
      if (!project) {
        return {
          project: null,
          analysis: {
            healthStatus: "red" as const,
            calculationType: "status-based" as const,
            reasoning: "Project not found",
            metrics: {
              weightedCompletion: 0,
              timeRemainingPercentage: null,
              totalDays: null,
              totalDaysRemaining: null,
              workingDaysRemaining: null,
              startDate: null,
              endDate: null,
              projectStartsInFuture: false,
              isOverdue: false,
            },
            recommendations: ["Verify the project ID is correct"],
            debugInfo: {
              milestoneCount: 0,
              milestoneDetails: [],
            },
          },
        };
      }

      // Calculate health status
      const healthStatus = calculateProjectHealthStatusColor(project);
      const weightedCompletion = calculateWeightedCompletion(
        project.milestones,
      );

      // Calculate time metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = project.calculated_start_date
        ? new Date(project.calculated_start_date)
        : null;
      const endDate = project.calculated_end_date
        ? new Date(project.calculated_end_date)
        : null;

      const projectStartsInFuture = startDate ? startDate > today : false;
      const isOverdue = project.total_days_remaining
        ? project.total_days_remaining < 0
        : false;

      // Calculate time remaining percentage
      let timeRemainingPercentage: number | null = null;
      if (project.total_days && project.total_days_remaining !== null) {
        if (projectStartsInFuture) {
          timeRemainingPercentage = 100; // Future projects get 100%
        } else if (project.total_days_remaining < 0) {
          timeRemainingPercentage = 0; // Overdue projects get 0%
        } else {
          timeRemainingPercentage = Math.round(
            (project.total_days_remaining / project.total_days) * 100,
          );
        }
      }

      // Determine calculation type and reasoning
      let calculationType:
        | "manual"
        | "status-based"
        | "milestone-based"
        | "future-project";
      let reasoning: string;

      if (
        project.health_calculation_type === "manual" &&
        project.manual_status_color
      ) {
        calculationType = "manual";
        reasoning = `Manual override: Status set to ${project.manual_status_color} by user`;
      } else if (project.status !== "active") {
        calculationType = "status-based";
        reasoning = `Status-based: Project status is "${project.status}" which maps to ${healthStatus}`;
      } else if (projectStartsInFuture) {
        calculationType = "future-project";
        reasoning = `Future project: Project starts ${startDate?.toDateString()}, which is in the future. Health status: ${healthStatus}`;
      } else {
        calculationType = "milestone-based";
        if (timeRemainingPercentage !== null) {
          reasoning = `Time-aware calculation: ${weightedCompletion}% completion with ${timeRemainingPercentage}% time remaining = ${healthStatus}`;
        } else {
          reasoning = `Milestone-only calculation: ${weightedCompletion}% weighted completion = ${healthStatus}`;
        }
      }

      // Generate milestone details
      const milestoneDetails = project.milestones.map((milestone) => {
        const milestoneDate = new Date(milestone.date);
        const daysFromToday = Math.ceil(
          (milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          date: milestone.date,
          milestone: milestone.milestone,
          completion: milestone.completion,
          weight: milestone.weight || 3,
          daysFromToday,
          status: milestone.status,
        };
      });

      // Generate recommendations
      const recommendations: string[] = [];

      if (healthStatus === "yellow" || healthStatus === "red") {
        if (projectStartsInFuture) {
          recommendations.push(
            "Project starts in the future - consider if milestone dates and completion percentages are realistic",
          );
        } else if (isOverdue) {
          recommendations.push(
            "Project is overdue - update milestone dates or mark completed milestones",
          );
        } else if (
          timeRemainingPercentage !== null &&
          timeRemainingPercentage > 50 &&
          weightedCompletion < 20
        ) {
          recommendations.push(
            "Low completion with substantial time remaining - consider breaking down milestones into smaller tasks",
          );
        } else if (
          timeRemainingPercentage !== null &&
          timeRemainingPercentage < 30 &&
          weightedCompletion < 60
        ) {
          recommendations.push(
            "Limited time remaining with low completion - project may need additional resources or scope adjustment",
          );
        }
      }

      if (project.milestones.length === 0) {
        recommendations.push(
          "No milestones defined - add milestones to get more accurate health calculations",
        );
      } else if (project.milestones.length < 3) {
        recommendations.push(
          "Consider adding more milestones for better project tracking",
        );
      }

      // Check for milestone completion inconsistencies
      const overdueMilestones = milestoneDetails.filter(
        (m) => m.daysFromToday < 0 && m.completion < 100,
      );
      if (overdueMilestones.length > 0) {
        recommendations.push(
          `${overdueMilestones.length} milestone(s) are overdue but not marked as complete`,
        );
      }

      const futureMilestonesWithHighCompletion = milestoneDetails.filter(
        (m) => m.daysFromToday > 30 && m.completion > 80,
      );
      if (futureMilestonesWithHighCompletion.length > 0) {
        recommendations.push(
          `${futureMilestonesWithHighCompletion.length} milestone(s) are far in the future but marked as highly complete`,
        );
      }

      return {
        project,
        analysis: {
          healthStatus,
          calculationType,
          reasoning,
          metrics: {
            weightedCompletion,
            timeRemainingPercentage,
            totalDays: project.total_days,
            totalDaysRemaining: project.total_days_remaining,
            workingDaysRemaining: project.working_days_remaining,
            startDate: project.calculated_start_date,
            endDate: project.calculated_end_date,
            projectStartsInFuture,
            isOverdue,
          },
          recommendations,
          debugInfo: {
            milestoneCount: project.milestones.length,
            milestoneDetails,
          },
        },
      };
    } catch (error) {
      console.error("[HEALTH_ANALYZER] Error analyzing project:", error);
      throw error;
    }
  },

  /**
   * Analyze all projects and find potential health calculation issues
   */
  async findHealthCalculationIssues(): Promise<{
    totalProjects: number;
    issuesFound: Array<{
      projectId: string;
      projectTitle: string;
      issue: string;
      severity: "low" | "medium" | "high";
      recommendation: string;
    }>;
  }> {
    try {
      console.log(
        "[HEALTH_ANALYZER] Analyzing all projects for health calculation issues",
      );

      const allProjects = await projectService.getAllProjects();
      const issues: Array<{
        projectId: string;
        projectTitle: string;
        issue: string;
        severity: "low" | "medium" | "high";
        recommendation: string;
      }> = [];

      for (const project of allProjects) {
        const analysis = await this.analyzeProject(project.id);
        if (!analysis.project) continue;

        const { metrics, debugInfo } = analysis.analysis;

        // Check for future projects with yellow/red status
        if (
          metrics.projectStartsInFuture &&
          (analysis.analysis.healthStatus === "yellow" ||
            analysis.analysis.healthStatus === "red")
        ) {
          issues.push({
            projectId: project.id,
            projectTitle: project.title,
            issue: "Future project with poor health status",
            severity: "medium",
            recommendation:
              "Review milestone completion percentages for future projects",
          });
        }

        // Check for projects with no milestones
        if (debugInfo.milestoneCount === 0) {
          issues.push({
            projectId: project.id,
            projectTitle: project.title,
            issue: "No milestones defined",
            severity: "low",
            recommendation: "Add milestones to enable proper health tracking",
          });
        }

        // Check for overdue milestones not marked complete
        const overdueMilestones = debugInfo.milestoneDetails.filter(
          (m) => m.daysFromToday < 0 && m.completion < 100,
        );
        if (overdueMilestones.length > 0) {
          issues.push({
            projectId: project.id,
            projectTitle: project.title,
            issue: `${overdueMilestones.length} overdue milestone(s) not marked complete`,
            severity: "high",
            recommendation: "Update completion status for overdue milestones",
          });
        }

        // Check for inconsistent time vs completion ratios
        if (
          metrics.timeRemainingPercentage !== null &&
          metrics.timeRemainingPercentage > 70 &&
          metrics.weightedCompletion < 5
        ) {
          issues.push({
            projectId: project.id,
            projectTitle: project.title,
            issue: "Very low completion with substantial time remaining",
            severity: "low",
            recommendation:
              "Consider if project timeline or milestone breakdown is realistic",
          });
        }
      }

      return {
        totalProjects: allProjects.length,
        issuesFound: issues,
      };
    } catch (error) {
      console.error(
        "[HEALTH_ANALYZER] Error finding health calculation issues:",
        error,
      );
      throw error;
    }
  },

  /**
   * Quick health check for a project - returns a simple summary
   */
  async quickHealthCheck(projectId: string): Promise<string> {
    try {
      const analysis = await this.analyzeProject(projectId);
      if (!analysis.project) {
        return "❌ Project not found";
      }

      const { healthStatus, reasoning, metrics } = analysis.analysis;
      const statusEmoji =
        healthStatus === "green"
          ? "🟢"
          : healthStatus === "yellow"
            ? "🟡"
            : "🔴";

      return `${statusEmoji} ${healthStatus.toUpperCase()}: ${reasoning} (${metrics.weightedCompletion}% complete, ${metrics.timeRemainingPercentage || "N/A"}% time remaining)`;
    } catch (error) {
      return `❌ Error analyzing project: ${error.message}`;
    }
  },
};
