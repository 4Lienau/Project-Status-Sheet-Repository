import { supabase } from "../supabase";
import {
  calculateProjectHealthStatusColor,
  calculateWeightedCompletion,
  ProjectWithRelations,
} from "./project";

/**
 * Debug service to analyze project health status calculations
 * Specifically designed to investigate issues with status color calculations
 */
export const projectHealthDebugger = {
  /**
   * Find and analyze a specific project by title
   */
  async analyzeProjectByTitle(projectTitle: string): Promise<{
    project: ProjectWithRelations | null;
    analysis: {
      healthCalculationType: string;
      manualStatusColor: string | null;
      computedStatusColor: string | null;
      calculatedStatusColor: string;
      weightedCompletion: number;
      timeRemainingPercentage: number | null;
      milestonesCount: number;
      totalDays: number | null;
      totalDaysRemaining: number | null;
      workingDaysRemaining: number | null;
      projectStatus: string;
      calculationReason: string;
      recommendations: string[];
    };
  }> {
    try {
      console.log(`[HEALTH_DEBUGGER] Searching for project: "${projectTitle}"`);

      // Search for project by title (case-insensitive)
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .ilike("title", `%${projectTitle}%`);

      if (projectsError) {
        console.error(
          "[HEALTH_DEBUGGER] Error searching for project:",
          projectsError,
        );
        throw new Error(
          `Failed to search for project: ${projectsError.message}`,
        );
      }

      if (!projects || projects.length === 0) {
        console.log(
          `[HEALTH_DEBUGGER] No projects found matching: "${projectTitle}"`,
        );
        return {
          project: null,
          analysis: {
            healthCalculationType: "N/A",
            manualStatusColor: null,
            computedStatusColor: null,
            calculatedStatusColor: "N/A" as any,
            weightedCompletion: 0,
            timeRemainingPercentage: null,
            milestonesCount: 0,
            totalDays: null,
            totalDaysRemaining: null,
            workingDaysRemaining: null,
            projectStatus: "N/A",
            calculationReason: "Project not found",
            recommendations: [
              "Check if the project title is correct",
              "Verify the project exists in the database",
            ],
          },
        };
      }

      // If multiple projects found, use the first one but log a warning
      if (projects.length > 1) {
        console.warn(
          `[HEALTH_DEBUGGER] Multiple projects found (${projects.length}), using first match:`,
        );
        projects.forEach((p, index) => {
          console.warn(`  ${index + 1}. "${p.title}" (ID: ${p.id})`);
        });
      }

      const project = projects[0];
      console.log(
        `[HEALTH_DEBUGGER] Analyzing project: "${project.title}" (ID: ${project.id})`,
      );

      // Get project milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", project.id);

      if (milestonesError) {
        console.error(
          "[HEALTH_DEBUGGER] Error fetching milestones:",
          milestonesError,
        );
      }

      // Get all related data to build complete project
      const { data: accomplishments } = await supabase
        .from("accomplishments")
        .select("*")
        .eq("project_id", project.id);

      const { data: activities } = await supabase
        .from("next_period_activities")
        .select("*")
        .eq("project_id", project.id);

      const { data: risks } = await supabase
        .from("risks")
        .select("*")
        .eq("project_id", project.id);

      const { data: considerations } = await supabase
        .from("considerations")
        .select("*")
        .eq("project_id", project.id);

      const { data: changes } = await supabase
        .from("changes")
        .select("*")
        .eq("project_id", project.id);

      // Build complete project object
      const completeProject: ProjectWithRelations = {
        ...project,
        projectId: (project.project_id ?? "").toString(),
        manual_status_color: project.manual_status_color || null,
        computed_status_color: project.computed_status_color || null,
        milestones: milestones || [],
        accomplishments: accomplishments || [],
        next_period_activities: activities || [],
        risks: risks || [],
        considerations: (considerations || []).map((c) =>
          typeof c.description === "string" ? c.description : "",
        ),
        changes: changes || [],
      };

      // Perform detailed analysis
      const analysis = this.performDetailedAnalysis(completeProject);

      return {
        project: completeProject,
        analysis,
      };
    } catch (error) {
      console.error("[HEALTH_DEBUGGER] Unexpected error:", error);
      throw error;
    }
  },

  /**
   * Perform detailed health status analysis
   */
  performDetailedAnalysis(project: ProjectWithRelations): {
    healthCalculationType: string;
    manualStatusColor: string | null;
    computedStatusColor: string | null;
    calculatedStatusColor: string;
    weightedCompletion: number;
    timeRemainingPercentage: number | null;
    milestonesCount: number;
    totalDays: number | null;
    totalDaysRemaining: number | null;
    workingDaysRemaining: number | null;
    projectStatus: string;
    calculationReason: string;
    recommendations: string[];
  } {
    const milestones = project.milestones || [];
    const weightedCompletion = calculateWeightedCompletion(milestones);
    const calculatedStatusColor = calculateProjectHealthStatusColor(project);

    // Calculate time remaining percentage
    let timeRemainingPercentage: number | null = null;
    if (
      project.total_days &&
      project.total_days_remaining !== null &&
      project.total_days_remaining !== undefined
    ) {
      const totalDays = project.total_days;
      const remainingDays = project.total_days_remaining;

      if (remainingDays < 0) {
        timeRemainingPercentage = 0;
      } else {
        timeRemainingPercentage = Math.round((remainingDays / totalDays) * 100);
      }
    }

    // Determine calculation reason and recommendations
    let calculationReason = "";
    const recommendations: string[] = [];

    // Check if manual calculation is being used
    if (
      project.health_calculation_type === "manual" &&
      project.manual_status_color
    ) {
      calculationReason = `Manual calculation: Using manual status color '${project.manual_status_color}'`;
      if (project.manual_status_color === "yellow") {
        recommendations.push("Project is manually set to Yellow status");
        recommendations.push(
          "Consider reviewing why manual override was applied",
        );
        recommendations.push(
          "Switch to automatic calculation if manual override is no longer needed",
        );
      }
    } else {
      // Automatic calculation logic
      if (project.status === "completed") {
        calculationReason = "Status-based: Project is completed (Green)";
      } else if (project.status === "cancelled") {
        calculationReason = "Status-based: Project is cancelled (Red)";
      } else if (project.status === "draft" || project.status === "on_hold") {
        calculationReason = `Status-based: Project is ${project.status} (Yellow)`;
      } else if (milestones.length === 0) {
        calculationReason =
          "Default: Active project with no milestones (Green)";
      } else {
        // Time-aware calculation
        if (timeRemainingPercentage === null) {
          calculationReason = `Milestone-only calculation: ${weightedCompletion}% completion`;
          if (weightedCompletion >= 70) calculationReason += " (Green)";
          else if (weightedCompletion >= 40) calculationReason += " (Yellow)";
          else calculationReason += " (Red)";
        } else {
          calculationReason = `Time-aware calculation: ${weightedCompletion}% completion, ${timeRemainingPercentage}% time remaining`;

          if (timeRemainingPercentage === 0) {
            calculationReason += " - Project is overdue";
            if (weightedCompletion >= 90) calculationReason += " (Yellow)";
            else calculationReason += " (Red)";
          } else if (timeRemainingPercentage > 60) {
            calculationReason += " - Substantial time remaining";
            if (weightedCompletion >= 10) calculationReason += " (Green)";
            else if (weightedCompletion >= 5) calculationReason += " (Yellow)";
            else calculationReason += " (Red)";
          } else if (timeRemainingPercentage > 30) {
            calculationReason += " - Plenty of time remaining";
            if (weightedCompletion >= 20) calculationReason += " (Green)";
            else if (weightedCompletion >= 10) calculationReason += " (Yellow)";
            else calculationReason += " (Red)";
          } else if (timeRemainingPercentage > 15) {
            calculationReason += " - Moderate time remaining";
            if (weightedCompletion >= 40) calculationReason += " (Green)";
            else if (weightedCompletion >= 25) calculationReason += " (Yellow)";
            else calculationReason += " (Red)";
          } else {
            calculationReason += " - Little time remaining";
            if (weightedCompletion >= 80) calculationReason += " (Green)";
            else if (weightedCompletion >= 60) calculationReason += " (Yellow)";
            else calculationReason += " (Red)";
          }
        }
      }
    }

    // Generate recommendations based on analysis
    if (calculatedStatusColor === "yellow") {
      if (project.health_calculation_type !== "manual") {
        if (timeRemainingPercentage !== null && timeRemainingPercentage > 50) {
          recommendations.push(
            "Project has substantial time remaining but is showing Yellow status",
          );
          recommendations.push(
            "Consider if milestone completion expectations are realistic for this stage",
          );
          recommendations.push(
            "Review milestone weights - heavily weighted incomplete milestones may be skewing the calculation",
          );
        }

        if (
          weightedCompletion < 25 &&
          timeRemainingPercentage !== null &&
          timeRemainingPercentage > 30
        ) {
          recommendations.push(
            "Low completion percentage with moderate time remaining",
          );
          recommendations.push(
            "Consider breaking down large milestones into smaller, more manageable tasks",
          );
          recommendations.push(
            "Review if milestone dates are appropriately spaced throughout the project timeline",
          );
        }
      }

      recommendations.push("Review project progress and identify any blockers");
      recommendations.push(
        "Consider updating milestone completion percentages if work has been completed",
      );
    }

    // Check for inconsistencies
    if (
      project.computed_status_color &&
      project.computed_status_color !== calculatedStatusColor
    ) {
      recommendations.push(
        `Inconsistency detected: Computed status (${project.computed_status_color}) differs from calculated status (${calculatedStatusColor})`,
      );
      recommendations.push(
        "Run the computed status color update function to fix this inconsistency",
      );
    }

    return {
      healthCalculationType: project.health_calculation_type || "automatic",
      manualStatusColor: project.manual_status_color,
      computedStatusColor: project.computed_status_color,
      calculatedStatusColor,
      weightedCompletion,
      timeRemainingPercentage,
      milestonesCount: milestones.length,
      totalDays: project.total_days,
      totalDaysRemaining: project.total_days_remaining,
      workingDaysRemaining: project.working_days_remaining,
      projectStatus: project.status || "unknown",
      calculationReason,
      recommendations,
    };
  },

  /**
   * List all projects with their health status for comparison
   */
  async listAllProjectsHealthStatus(): Promise<
    Array<{
      id: string;
      title: string;
      status: string;
      healthCalculationType: string;
      manualStatusColor: string | null;
      computedStatusColor: string | null;
      calculatedStatusColor: string;
      weightedCompletion: number;
      timeRemainingPercentage: number | null;
      milestonesCount: number;
    }>
  > {
    try {
      console.log(
        "[HEALTH_DEBUGGER] Fetching all projects for health status comparison",
      );

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("title");

      if (projectsError) {
        console.error(
          "[HEALTH_DEBUGGER] Error fetching projects:",
          projectsError,
        );
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      if (!projects || projects.length === 0) {
        return [];
      }

      // Get all milestones for all projects
      const projectIds = projects.map((p) => p.id);
      const { data: allMilestones } = await supabase
        .from("milestones")
        .select("*")
        .in("project_id", projectIds);

      const results = projects.map((project) => {
        const milestones = (allMilestones || []).filter(
          (m) => m.project_id === project.id,
        );
        const weightedCompletion = calculateWeightedCompletion(milestones);

        const completeProject: ProjectWithRelations = {
          ...project,
          projectId: (project.project_id ?? "").toString(),
          manual_status_color: project.manual_status_color || null,
          computed_status_color: project.computed_status_color || null,
          milestones,
          accomplishments: [],
          next_period_activities: [],
          risks: [],
          considerations: [],
          changes: [],
        };

        const calculatedStatusColor =
          calculateProjectHealthStatusColor(completeProject);

        // Calculate time remaining percentage
        let timeRemainingPercentage: number | null = null;
        if (
          project.total_days &&
          project.total_days_remaining !== null &&
          project.total_days_remaining !== undefined
        ) {
          const totalDays = project.total_days;
          const remainingDays = project.total_days_remaining;

          if (remainingDays < 0) {
            timeRemainingPercentage = 0;
          } else {
            timeRemainingPercentage = Math.round(
              (remainingDays / totalDays) * 100,
            );
          }
        }

        return {
          id: project.id,
          title: project.title,
          status: project.status || "unknown",
          healthCalculationType: project.health_calculation_type || "automatic",
          manualStatusColor: project.manual_status_color,
          computedStatusColor: project.computed_status_color,
          calculatedStatusColor,
          weightedCompletion,
          timeRemainingPercentage,
          milestonesCount: milestones.length,
        };
      });

      return results;
    } catch (error) {
      console.error("[HEALTH_DEBUGGER] Unexpected error:", error);
      throw error;
    }
  },
};
