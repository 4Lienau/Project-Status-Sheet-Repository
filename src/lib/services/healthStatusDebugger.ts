import { supabase } from "../supabase";
import {
  calculateProjectHealthStatusColor,
  calculateWeightedCompletion,
} from "./project";

/**
 * Debug service to help identify health status calculation discrepancies
 */
export const healthStatusDebugger = {
  /**
   * Debug a specific project's health status calculation
   */
  async debugProject(projectId: string): Promise<{
    project: any;
    milestones: any[];
    calculatedColor: string;
    storedComputedColor: string | null;
    weightedCompletion: number;
    discrepancy: boolean;
  } | null> {
    try {
      console.log(`[HEALTH_DEBUG] Debugging project: ${projectId}`);

      // Get the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        console.error("[HEALTH_DEBUG] Error fetching project:", projectError);
        return null;
      }

      // Get milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId);

      if (milestonesError) {
        console.error(
          "[HEALTH_DEBUG] Error fetching milestones:",
          milestonesError,
        );
      }

      const projectMilestones = milestones || [];
      const weightedCompletion = calculateWeightedCompletion(projectMilestones);
      const calculatedColor = calculateProjectHealthStatusColor(
        project,
        projectMilestones,
      );
      const storedComputedColor = project.computed_status_color;
      const discrepancy = storedComputedColor !== calculatedColor;

      // Calculate time remaining percentage for debug info
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

      const debugInfo = {
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          health_calculation_type: project.health_calculation_type,
          manual_status_color: project.manual_status_color,
          manual_health_percentage: project.manual_health_percentage,
          computed_status_color: project.computed_status_color,
          total_days: project.total_days,
          total_days_remaining: project.total_days_remaining,
          working_days_remaining: project.working_days_remaining,
        },
        milestones: projectMilestones.map((m) => ({
          id: m.id,
          milestone: m.milestone,
          completion: m.completion,
          weight: m.weight || 3,
          status: m.status,
          date: m.date,
          end_date: m.end_date,
        })),
        calculatedColor,
        storedComputedColor,
        weightedCompletion,
        timeRemainingPercentage,
        discrepancy,
      };

      console.log(
        `[HEALTH_DEBUG] Debug info for "${project.title}":`,
        debugInfo,
      );

      if (discrepancy) {
        console.warn(
          `[HEALTH_DEBUG] DISCREPANCY FOUND for "${project.title}"!`,
          `Stored: ${storedComputedColor}, Calculated: ${calculatedColor}`,
        );
      }

      return debugInfo;
    } catch (error) {
      console.error("[HEALTH_DEBUG] Error debugging project:", error);
      return null;
    }
  },

  /**
   * Debug all projects to find health status discrepancies
   */
  async debugAllProjects(): Promise<{
    totalProjects: number;
    discrepancies: number;
    projects: any[];
  }> {
    try {
      console.log("[HEALTH_DEBUG] Debugging all projects...");

      // Get all projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*");

      if (projectsError) {
        console.error("[HEALTH_DEBUG] Error fetching projects:", projectsError);
        return { totalProjects: 0, discrepancies: 0, projects: [] };
      }

      if (!projects || projects.length === 0) {
        console.log("[HEALTH_DEBUG] No projects found");
        return { totalProjects: 0, discrepancies: 0, projects: [] };
      }

      // Get all milestones
      const projectIds = projects.map((p) => p.id);
      const { data: allMilestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .in("project_id", projectIds);

      if (milestonesError) {
        console.error(
          "[HEALTH_DEBUG] Error fetching milestones:",
          milestonesError,
        );
      }

      const debugResults = [];
      let discrepancyCount = 0;

      for (const project of projects) {
        const projectMilestones = (allMilestones || []).filter(
          (m) => m.project_id === project.id,
        );

        const weightedCompletion =
          calculateWeightedCompletion(projectMilestones);
        const calculatedColor = calculateProjectHealthStatusColor(
          project,
          projectMilestones,
        );
        const storedComputedColor = project.computed_status_color;
        const discrepancy = storedComputedColor !== calculatedColor;

        // Calculate time remaining percentage for debug info
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

        if (discrepancy) {
          discrepancyCount++;
          console.warn(
            `[HEALTH_DEBUG] DISCREPANCY: "${project.title}" - Stored: ${storedComputedColor}, Calculated: ${calculatedColor}`,
          );
        }

        debugResults.push({
          id: project.id,
          title: project.title,
          status: project.status,
          health_calculation_type: project.health_calculation_type,
          manual_status_color: project.manual_status_color,
          manual_health_percentage: project.manual_health_percentage,
          computed_status_color: storedComputedColor,
          calculated_color: calculatedColor,
          weighted_completion: weightedCompletion,
          time_remaining_percentage: timeRemainingPercentage,
          total_days: project.total_days,
          total_days_remaining: project.total_days_remaining,
          working_days_remaining: project.working_days_remaining,
          milestones_count: projectMilestones.length,
          discrepancy,
        });
      }

      console.log(
        `[HEALTH_DEBUG] Debug complete: ${projects.length} projects, ${discrepancyCount} discrepancies found`,
      );

      return {
        totalProjects: projects.length,
        discrepancies: discrepancyCount,
        projects: debugResults,
      };
    } catch (error) {
      console.error("[HEALTH_DEBUG] Error debugging all projects:", error);
      return { totalProjects: 0, discrepancies: 0, projects: [] };
    }
  },

  /**
   * Fix discrepancies by updating computed_status_color for all projects
   */
  async fixAllDiscrepancies(): Promise<number> {
    try {
      console.log("[HEALTH_DEBUG] Fixing all health status discrepancies...");

      const { recalculateAllComputedStatusColors } = await import("./project");
      const updatedCount = await recalculateAllComputedStatusColors();

      console.log(
        `[HEALTH_DEBUG] Fixed discrepancies for ${updatedCount} projects`,
      );

      return updatedCount;
    } catch (error) {
      console.error("[HEALTH_DEBUG] Error fixing discrepancies:", error);
      return 0;
    }
  },
};
