/**
 * File: projectDurationService.ts
 * Purpose: Service for managing project duration calculations and updates
 * Description: This service provides functions to calculate and update project durations
 * based on milestone dates, including both total days and working days calculations.
 */

import { supabase } from "../supabase";
import { calculateProjectDuration } from "./project";

export const projectDurationService = {
  /**
   * Update duration for a single project based on its milestones
   */
  async updateProjectDuration(projectId: string): Promise<boolean> {
    try {
      // Validate project ID
      if (!projectId || typeof projectId !== "string") {
        console.error(
          "[DURATION_SERVICE] Invalid project ID provided:",
          projectId,
        );
        return false;
      }

      console.log(
        "[DURATION_SERVICE] Starting duration update for project ID:",
        projectId,
      );

      // Fetch project milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId);

      if (milestonesError) {
        console.error(
          "[DURATION_SERVICE] Error fetching milestones:",
          milestonesError,
        );
        console.error("[DURATION_SERVICE] Milestones error details:", {
          code: milestonesError.code,
          message: milestonesError.message,
          details: milestonesError.details,
          hint: milestonesError.hint,
        });
        return false;
      }

      console.log(
        "[DURATION_SERVICE] Found milestones:",
        milestones?.length || 0,
        "milestones for project",
        projectId,
      );

      // Calculate duration
      const duration = calculateProjectDuration(milestones || []);
      console.log("[DURATION_SERVICE] Calculated duration:", duration);

      // Update project with calculated duration
      console.log(
        "[DURATION_SERVICE] Attempting to update project with duration data...",
      );
      const { data: updateResult, error: updateError } = await supabase
        .from("projects")
        .update({
          calculated_start_date: duration.startDate,
          calculated_end_date: duration.endDate,
          total_days: duration.totalDays,
          working_days: duration.workingDays,
          total_days_remaining: duration.totalDaysRemaining,
          working_days_remaining: duration.workingDaysRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select();

      if (updateError) {
        console.error(
          "[DURATION_SERVICE] Error updating project duration:",
          updateError,
        );
        console.error("[DURATION_SERVICE] Update error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return false;
      }

      console.log(
        "[DURATION_SERVICE] Successfully updated project duration:",
        updateResult,
      );
      console.log(
        "[DURATION_SERVICE] Update completed for project:",
        projectId,
      );
      return true;
    } catch (error) {
      console.error(
        "[DURATION_SERVICE] Unexpected error in updateProjectDuration:",
        error,
      );
      console.error(
        "[DURATION_SERVICE] Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      return false;
    }
  },

  /**
   * Recalculate duration for all projects in the database
   */
  async recalculateAllProjectDurations(): Promise<{
    success: boolean;
    updatedCount: number;
    totalCount: number;
    errors: string[];
  }> {
    try {
      console.log("[DURATION_SERVICE] Recalculating duration for all projects");

      // Get all projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, title");

      if (projectsError || !projects) {
        console.error(
          "[DURATION_SERVICE] Error fetching projects:",
          projectsError,
        );
        return {
          success: false,
          updatedCount: 0,
          totalCount: 0,
          errors: [projectsError?.message || "Failed to fetch projects"],
        };
      }

      console.log(
        `[DURATION_SERVICE] Found ${projects.length} projects to update`,
      );
      let updatedCount = 0;
      const errors: string[] = [];

      // Update each project
      for (const project of projects) {
        try {
          console.log(
            `[DURATION_SERVICE] Processing project: ${project.title} (${project.id})`,
          );
          const success = await this.updateProjectDuration(project.id);
          if (success) {
            updatedCount++;
            console.log(
              `[DURATION_SERVICE] ✓ Updated duration for project: ${project.title}`,
            );
          } else {
            const errorMsg = `Failed to update project: ${project.title}`;
            console.error(`[DURATION_SERVICE] ✗ ${errorMsg}`);
            errors.push(errorMsg);
          }
        } catch (error) {
          const errorMsg = `Error updating project ${project.title}: ${error instanceof Error ? error.message : "Unknown error"}`;
          console.error("[DURATION_SERVICE] ✗", errorMsg);
          errors.push(errorMsg);
        }
      }

      const result = {
        success: errors.length === 0,
        updatedCount,
        totalCount: projects.length,
        errors,
      };

      console.log(`[DURATION_SERVICE] Recalculation complete:`, result);
      console.log(
        `[DURATION_SERVICE] Successfully updated: ${updatedCount}/${projects.length} projects`,
      );
      if (errors.length > 0) {
        console.error(`[DURATION_SERVICE] Errors encountered:`, errors);
      }
      return result;
    } catch (error) {
      console.error(
        "[DURATION_SERVICE] Unexpected error in recalculateAllProjectDurations:",
        error,
      );
      return {
        success: false,
        updatedCount: 0,
        totalCount: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },

  /**
   * Get projects that need duration recalculation (missing duration data)
   */
  async getProjectsNeedingDurationUpdate(): Promise<{
    projectIds: string[];
    count: number;
  }> {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, title")
        .or(
          "total_days.is.null,working_days.is.null,calculated_start_date.is.null,calculated_end_date.is.null,total_days_remaining.is.null,working_days_remaining.is.null",
        );

      if (error) {
        console.error("[DEBUG] Error fetching projects needing update:", error);
        return { projectIds: [], count: 0 };
      }

      const projectIds = (projects || []).map((p) => p.id);
      console.log(
        `[DEBUG] Found ${projectIds.length} projects needing duration updates:`,
        (projects || []).map((p) => ({ id: p.id, title: p.title })),
      );

      return {
        projectIds,
        count: projectIds.length,
      };
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in getProjectsNeedingDurationUpdate:",
        error,
      );
      return { projectIds: [], count: 0 };
    }
  },

  /**
   * Get project duration statistics
   */
  async getProjectDurationStats(): Promise<{
    totalProjects: number;
    projectsWithDuration: number;
    projectsWithoutDuration: number;
    averageTotalDays: number;
    averageWorkingDays: number;
  }> {
    try {
      console.log("[DEBUG] Fetching project duration statistics");

      const { data: allProjects, error: allError } = await supabase
        .from("projects")
        .select(
          "id, total_days, working_days, total_days_remaining, working_days_remaining",
        )
        .not("status", "eq", "cancelled");

      if (allError) {
        console.error("[DEBUG] Error fetching all projects:", allError);
        return {
          totalProjects: 0,
          projectsWithDuration: 0,
          projectsWithoutDuration: 0,
          averageTotalDays: 0,
          averageWorkingDays: 0,
        };
      }

      const totalProjects = (allProjects || []).length;
      const projectsWithDuration = (allProjects || []).filter(
        (p) => p.total_days !== null && p.working_days !== null,
      );
      const projectsWithoutDuration =
        totalProjects - projectsWithDuration.length;

      const averageTotalDays =
        projectsWithDuration.length > 0
          ? Math.round(
              projectsWithDuration.reduce(
                (sum, p) => sum + (p.total_days || 0),
                0,
              ) / projectsWithDuration.length,
            )
          : 0;

      const averageWorkingDays =
        projectsWithDuration.length > 0
          ? Math.round(
              projectsWithDuration.reduce(
                (sum, p) => sum + (p.working_days || 0),
                0,
              ) / projectsWithDuration.length,
            )
          : 0;

      const stats = {
        totalProjects,
        projectsWithDuration: projectsWithDuration.length,
        projectsWithoutDuration,
        averageTotalDays,
        averageWorkingDays,
      };

      console.log("[DEBUG] Project duration statistics:", stats);
      return stats;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in getProjectDurationStats:",
        error,
      );
      return {
        totalProjects: 0,
        projectsWithDuration: 0,
        projectsWithoutDuration: 0,
        averageTotalDays: 0,
        averageWorkingDays: 0,
      };
    }
  },

  /**
   * Update duration for multiple projects by their IDs
   */
  async updateMultipleProjectDurations(projectIds: string[]): Promise<{
    success: boolean;
    updatedCount: number;
    totalCount: number;
    errors: string[];
  }> {
    try {
      console.log(
        `[DEBUG] Updating duration for ${projectIds.length} specific projects`,
      );

      if (!projectIds || projectIds.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          totalCount: 0,
          errors: [],
        };
      }

      let updatedCount = 0;
      const errors: string[] = [];

      // Update each project
      for (const projectId of projectIds) {
        try {
          const success = await this.updateProjectDuration(projectId);
          if (success) {
            updatedCount++;
            console.log(`[DEBUG] Updated duration for project: ${projectId}`);
          } else {
            errors.push(`Failed to update project: ${projectId}`);
          }
        } catch (error) {
          const errorMsg = `Error updating project ${projectId}: ${error instanceof Error ? error.message : "Unknown error"}`;
          console.error("[DEBUG]", errorMsg);
          errors.push(errorMsg);
        }
      }

      const result = {
        success: errors.length === 0,
        updatedCount,
        totalCount: projectIds.length,
        errors,
      };

      console.log(`[DEBUG] Multiple project update complete:`, result);
      return result;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in updateMultipleProjectDurations:",
        error,
      );
      return {
        success: false,
        updatedCount: 0,
        totalCount: projectIds.length,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  },

  /**
   * Validate project duration data consistency
   */
  async validateProjectDurations(): Promise<{
    validProjects: number;
    invalidProjects: number;
    inconsistencies: Array<{
      projectId: string;
      issue: string;
    }>;
  }> {
    try {
      console.log("[DEBUG] Validating project duration data consistency");

      const { data: projects, error } = await supabase
        .from("projects")
        .select(
          "id, title, calculated_start_date, calculated_end_date, total_days, working_days, total_days_remaining, working_days_remaining",
        )
        .not("status", "eq", "cancelled");

      if (error) {
        console.error("[DEBUG] Error fetching projects for validation:", error);
        return {
          validProjects: 0,
          invalidProjects: 0,
          inconsistencies: [],
        };
      }

      const inconsistencies: Array<{ projectId: string; issue: string }> = [];
      let validProjects = 0;

      for (const project of projects || []) {
        const hasStartDate = project.calculated_start_date !== null;
        const hasEndDate = project.calculated_end_date !== null;
        const hasTotalDays = project.total_days !== null;
        const hasWorkingDays = project.working_days !== null;

        // Check for partial data
        if (hasStartDate !== hasEndDate) {
          inconsistencies.push({
            projectId: project.id,
            issue: "Inconsistent start/end dates",
          });
        }

        if (hasTotalDays !== hasWorkingDays) {
          inconsistencies.push({
            projectId: project.id,
            issue: "Inconsistent total/working days",
          });
        }

        if ((hasStartDate && hasEndDate) !== (hasTotalDays && hasWorkingDays)) {
          inconsistencies.push({
            projectId: project.id,
            issue: "Inconsistent date and duration data",
          });
        }

        // Check for logical inconsistencies
        if (hasStartDate && hasEndDate && hasTotalDays) {
          const startDate = new Date(project.calculated_start_date!);
          const endDate = new Date(project.calculated_end_date!);
          const actualDays = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (Math.abs(actualDays - project.total_days!) > 1) {
            inconsistencies.push({
              projectId: project.id,
              issue: `Total days mismatch: calculated ${actualDays}, stored ${project.total_days}`,
            });
          }
        }

        if (
          inconsistencies.filter((i) => i.projectId === project.id).length === 0
        ) {
          validProjects++;
        }
      }

      const result = {
        validProjects,
        invalidProjects: (projects?.length || 0) - validProjects,
        inconsistencies,
      };

      console.log("[DEBUG] Validation results:", result);
      return result;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in validateProjectDurations:",
        error,
      );
      return {
        validProjects: 0,
        invalidProjects: 0,
        inconsistencies: [],
      };
    }
  },
};
