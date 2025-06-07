import { supabase } from "../supabase";
import { Database } from "@/types/supabase";

export type Project = Database["public"]["Tables"]["projects"]["Row"] & {
  manual_status_color?: "red" | "yellow" | "green";
  computed_status_color?: "red" | "yellow" | "green";
};
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"] & {
  weight?: number;
};
export type Accomplishment =
  Database["public"]["Tables"]["accomplishments"]["Row"];
export type NextPeriodActivity = {
  id: string;
  project_id: string;
  description: string;
  date: string;
  completion: number;
  assignee: string;
  created_at?: string;
  updated_at?: string;
};
export type Risk = Database["public"]["Tables"]["risks"]["Row"];
export type Consideration =
  Database["public"]["Tables"]["considerations"]["Row"];
export type Change = {
  id: string;
  project_id: string;
  change: string;
  impact: string;
  disposition: string;
  created_at?: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  project_id: string;
  milestone_id: string;
  description: string;
  assignee: string;
  date: string;
  completion: number;
  created_at?: string;
  updated_at?: string;
};

export interface ProjectWithRelations
  extends Omit<Project, "manual_status_color" | "computed_status_color"> {
  manual_status_color: "red" | "yellow" | "green" | null;
  computed_status_color: "red" | "yellow" | "green" | null;
  projectId: string; // Form field mapping for project_id
  milestones: (Milestone & { tasks?: Task[] })[];
  accomplishments: Accomplishment[];
  next_period_activities: NextPeriodActivity[];
  risks: Risk[];
  considerations: string[];
  changes: Change[];
  calculated_start_date?: string | null;
  calculated_end_date?: string | null;
  total_days?: number | null;
  working_days?: number | null;
  total_days_remaining?: number | null;
  working_days_remaining?: number | null;
}

// Calculate weighted completion percentage for milestones
export const calculateWeightedCompletion = (milestones: Milestone[]) => {
  if (!milestones.length) return 0;

  // Calculate the weighted sum of completion percentages
  const weightedSum = milestones.reduce((sum, m) => {
    const weight = m.weight || 3;
    // Multiply completion by weight directly
    return sum + m.completion * weight;
  }, 0);

  // Calculate total possible weighted completion (sum of weights * 100)
  const totalPossibleWeighted = milestones.reduce(
    (sum, m) => sum + (m.weight || 3) * 100,
    0,
  );

  // Return the weighted percentage
  return Math.round((weightedSum / totalPossibleWeighted) * 100);
};

// Calculate project duration based on milestone dates
export const calculateProjectDuration = (milestones: Milestone[]) => {
  if (!milestones.length) {
    return {
      startDate: null,
      endDate: null,
      totalDays: null,
      workingDays: null,
      totalDaysRemaining: null,
      workingDaysRemaining: null,
    };
  }

  // Find earliest and latest milestone dates
  const dates = milestones
    .map((m) => new Date(m.date))
    .filter((date) => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return {
      startDate: null,
      endDate: null,
      totalDays: null,
      workingDays: null,
      totalDaysRemaining: null,
      workingDaysRemaining: null,
    };
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // Calculate total days
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate working days (excluding weekends)
  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate remaining days
  let totalDaysRemaining = null;
  let workingDaysRemaining = null;

  // Always calculate remaining days (can be negative for overdue projects)
  totalDaysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate working days remaining (can be negative for overdue projects)
  workingDaysRemaining = 0;
  const startCalcDate = new Date(Math.min(today.getTime(), endDate.getTime()));
  const endCalcDate = new Date(Math.max(today.getTime(), endDate.getTime()));
  const calcDate = new Date(startCalcDate);

  while (calcDate <= endCalcDate) {
    const dayOfWeek = calcDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysRemaining++;
    }
    calcDate.setDate(calcDate.getDate() + 1);
  }

  // If project is overdue, make working days remaining negative
  if (endDate < today) {
    workingDaysRemaining = -workingDaysRemaining;
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    totalDays: totalDays || 0,
    workingDays,
    totalDaysRemaining,
    workingDaysRemaining,
  };
};

// Calculate time remaining as a percentage of total project duration
const calculateTimeRemainingPercentage = (
  project: ProjectWithRelations | Project,
): number | null => {
  const projectWithRelations = project as ProjectWithRelations;

  // Check if we have duration data
  if (
    !projectWithRelations.total_days ||
    projectWithRelations.total_days_remaining === null ||
    projectWithRelations.total_days_remaining === undefined
  ) {
    return null;
  }

  const totalDays = projectWithRelations.total_days;
  const remainingDays = projectWithRelations.total_days_remaining;

  // If project is overdue, return 0%
  if (remainingDays < 0) {
    return 0;
  }

  // Calculate percentage of time remaining
  const timeRemainingPercentage = Math.round((remainingDays / totalDays) * 100);
  return Math.max(0, Math.min(100, timeRemainingPercentage));
};

// Standardized function to calculate project health status color with time awareness
export const calculateProjectHealthStatusColor = (
  project: ProjectWithRelations | Project,
  milestones?: Milestone[],
): "red" | "yellow" | "green" => {
  console.log(`[HEALTH_CALC] Calculating health status for project:`, {
    id: project.id,
    title: project.title,
    health_calculation_type: project.health_calculation_type,
    manual_status_color: project.manual_status_color,
    status: project.status,
    milestones_count:
      milestones?.length ||
      (project as ProjectWithRelations).milestones?.length ||
      0,
  });

  // For manual calculation, use the manual status color if available
  if (
    project.health_calculation_type === "manual" &&
    project.manual_status_color
  ) {
    console.log(
      `[HEALTH_CALC] Using manual status color: ${project.manual_status_color}`,
    );
    return project.manual_status_color;
  }

  // For automatic calculation or when manual color is not set
  // Use status-based colors first
  if (project.status === "completed") {
    console.log(`[HEALTH_CALC] Status-based color: green (completed)`);
    return "green";
  } else if (project.status === "cancelled") {
    console.log(`[HEALTH_CALC] Status-based color: red (cancelled)`);
    return "red";
  } else if (project.status === "draft" || project.status === "on_hold") {
    console.log(`[HEALTH_CALC] Status-based color: yellow (${project.status})`);
    return "yellow";
  }

  // For active projects, determine based on milestone completion AND time remaining
  const projectMilestones =
    milestones || (project as ProjectWithRelations).milestones || [];

  if (projectMilestones.length > 0) {
    // Calculate milestone completion percentage
    const weightedCompletion = calculateWeightedCompletion(projectMilestones);

    // Calculate time remaining percentage
    const timeRemainingPercentage = calculateTimeRemainingPercentage(project);

    console.log(`[HEALTH_CALC] Time-aware calculation:`, {
      weightedCompletion,
      timeRemainingPercentage,
      total_days: (project as ProjectWithRelations).total_days,
      total_days_remaining: (project as ProjectWithRelations)
        .total_days_remaining,
    });

    // If we don't have time data, fall back to milestone-only calculation
    if (timeRemainingPercentage === null) {
      let color: "red" | "yellow" | "green" = "green";
      if (weightedCompletion >= 70) color = "green";
      else if (weightedCompletion >= 40) color = "yellow";
      else color = "red";

      console.log(
        `[HEALTH_CALC] Milestone-only color: ${color} (weighted completion: ${weightedCompletion}%)`,
      );
      return color;
    }

    // Time-aware health calculation with more lenient thresholds
    let color: "red" | "yellow" | "green" = "green";

    // If project is overdue (0% time remaining), be strict with milestone requirements
    if (timeRemainingPercentage === 0) {
      if (weightedCompletion >= 90)
        color = "yellow"; // Even high completion is concerning if overdue
      else color = "red";
      console.log(
        `[HEALTH_CALC] Overdue project color: ${color} (completion: ${weightedCompletion}%, overdue)`,
      );
      return color;
    }

    // If substantial time remaining (>60% of total duration), be very lenient
    if (timeRemainingPercentage > 60) {
      if (weightedCompletion >= 10)
        color = "green"; // Very low threshold for green when substantial time remains
      else if (weightedCompletion >= 5) color = "yellow";
      else color = "red";
      console.log(
        `[HEALTH_CALC] Substantial time color: ${color} (completion: ${weightedCompletion}%, time remaining: ${timeRemainingPercentage}%)`,
      );
      return color;
    }

    // If plenty of time remaining (30-60% of total duration), be more lenient
    if (timeRemainingPercentage > 30) {
      if (weightedCompletion >= 20)
        color = "green"; // Lower threshold for green when plenty of time
      else if (weightedCompletion >= 10) color = "yellow";
      else color = "red";
      console.log(
        `[HEALTH_CALC] Plenty of time color: ${color} (completion: ${weightedCompletion}%, time remaining: ${timeRemainingPercentage}%)`,
      );
      return color;
    }

    // If moderate time remaining (15-30% of total duration), use balanced approach
    if (timeRemainingPercentage > 15) {
      if (weightedCompletion >= 40) color = "green";
      else if (weightedCompletion >= 25) color = "yellow";
      else color = "red";
      console.log(
        `[HEALTH_CALC] Moderate time color: ${color} (completion: ${weightedCompletion}%, time remaining: ${timeRemainingPercentage}%)`,
      );
      return color;
    }

    // If little time remaining (1-15% of total duration), be stricter
    if (weightedCompletion >= 80) color = "green";
    else if (weightedCompletion >= 60) color = "yellow";
    else color = "red";

    console.log(
      `[HEALTH_CALC] Little time color: ${color} (completion: ${weightedCompletion}%, time remaining: ${timeRemainingPercentage}%)`,
    );
    return color;
  }

  // Default to green for active projects with no milestones
  console.log(`[HEALTH_CALC] Default color: green (active, no milestones)`);
  return "green";
};

// Service function to update computed status color for a project
export const updateProjectComputedStatusColor = async (
  projectId: string,
): Promise<boolean> => {
  try {
    console.log(
      "[COMPUTED_STATUS] Updating computed status color for project:",
      projectId,
    );

    // Get the project with its milestones
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[COMPUTED_STATUS] Error fetching project:", projectError);
      return false;
    }

    const { data: milestones, error: milestonesError } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId);

    if (milestonesError) {
      console.error(
        "[COMPUTED_STATUS] Error fetching milestones:",
        milestonesError,
      );
      // Continue with empty milestones array
    }

    // Calculate the computed status color using the standardized function
    const computedColor = calculateProjectHealthStatusColor(
      project,
      milestones || [],
    );

    console.log(
      `[COMPUTED_STATUS] Calculated color for project "${project.title}":`,
      {
        projectId,
        status: project.status,
        health_calculation_type: project.health_calculation_type,
        manual_status_color: project.manual_status_color,
        manual_health_percentage: project.manual_health_percentage,
        milestones_count: (milestones || []).length,
        weighted_completion:
          (milestones || []).length > 0
            ? calculateWeightedCompletion(milestones || [])
            : 0,
        computed_color: computedColor,
      },
    );

    // Update the project with the computed status color
    const { error: updateError } = await supabase
      .from("projects")
      .update({ computed_status_color: computedColor })
      .eq("id", projectId);

    if (updateError) {
      console.error(
        "[COMPUTED_STATUS] Error updating computed status color:",
        updateError,
      );
      return false;
    }

    console.log(
      `[COMPUTED_STATUS] Successfully updated computed status color to: ${computedColor}`,
    );
    return true;
  } catch (error) {
    console.error(
      "[COMPUTED_STATUS] Unexpected error updating computed status color:",
      error,
    );
    return false;
  }
};

// Service function to recalculate all computed status colors
export const recalculateAllComputedStatusColors = async (): Promise<number> => {
  try {
    console.log("[COMPUTED_STATUS] Recalculating all computed status colors");

    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*");

    if (projectsError) {
      console.error(
        "[COMPUTED_STATUS] Error fetching projects:",
        projectsError,
      );
      return 0;
    }

    if (!projects || projects.length === 0) {
      console.log("[COMPUTED_STATUS] No projects found");
      return 0;
    }

    // Get all milestones for all projects
    const projectIds = projects.map((p) => p.id);
    const { data: allMilestones, error: milestonesError } = await supabase
      .from("milestones")
      .select("*")
      .in("project_id", projectIds);

    if (milestonesError) {
      console.error(
        "[COMPUTED_STATUS] Error fetching milestones:",
        milestonesError,
      );
      // Continue with empty milestones
    }

    let updatedCount = 0;
    const updates = [];

    // Calculate computed status color for each project
    for (const project of projects) {
      const projectMilestones = (allMilestones || []).filter(
        (m) => m.project_id === project.id,
      );

      const computedColor = calculateProjectHealthStatusColor(
        project,
        projectMilestones,
      );

      // Only update if the computed color is different
      if (project.computed_status_color !== computedColor) {
        updates.push({
          id: project.id,
          computed_status_color: computedColor,
        });
      }
    }

    // Batch update all projects that need updating
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("projects")
          .update({ computed_status_color: update.computed_status_color })
          .eq("id", update.id);

        if (updateError) {
          console.error(
            `[COMPUTED_STATUS] Error updating project ${update.id}:`,
            updateError,
          );
        } else {
          updatedCount++;
        }
      }
    }

    console.log(
      `[COMPUTED_STATUS] Successfully recalculated computed status colors for ${updatedCount} projects`,
    );
    return updatedCount;
  } catch (error) {
    console.error(
      "[COMPUTED_STATUS] Unexpected error recalculating computed status colors:",
      error,
    );
    return 0;
  }
};

export const projectService = {
  // Method to update project duration based on milestones
  async updateProjectDuration(projectId: string): Promise<boolean> {
    try {
      console.log(
        "[DEBUG] Updating project duration for project ID:",
        projectId,
      );

      // Fetch project milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId);

      if (milestonesError) {
        console.error("[DEBUG] Error fetching milestones:", milestonesError);
        return false;
      }

      // Calculate duration
      const duration = calculateProjectDuration(milestones || []);
      console.log("[DEBUG] Calculated duration:", duration);

      // Update project with calculated duration
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          calculated_start_date: duration.startDate,
          calculated_end_date: duration.endDate,
          total_days: duration.totalDays,
          working_days: duration.workingDays,
          total_days_remaining: duration.totalDaysRemaining,
          working_days_remaining: duration.workingDaysRemaining,
        })
        .eq("id", projectId);

      if (updateError) {
        console.error("[DEBUG] Error updating project duration:", updateError);
        return false;
      }

      console.log("[DEBUG] Successfully updated project duration");
      return true;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in updateProjectDuration:",
        error,
      );
      return false;
    }
  },

  // Method to recalculate duration for all projects (deprecated - use projectDurationService instead)
  async recalculateAllProjectDurations(): Promise<number> {
    try {
      console.log(
        "[PROJECT_SERVICE] Delegating to projectDurationService.recalculateAllProjectDurations",
      );

      // Import and use the proper service
      const { projectDurationService } = await import(
        "./projectDurationService"
      );
      const result =
        await projectDurationService.recalculateAllProjectDurations();

      console.log(`[PROJECT_SERVICE] Recalculation result:`, result);
      return result.updatedCount;
    } catch (error) {
      console.error(
        "[PROJECT_SERVICE] Unexpected error in recalculateAllProjectDurations:",
        error,
      );
      return 0;
    }
  },
  async getAllProjects(): Promise<ProjectWithRelations[]> {
    try {
      console.log("[DEBUG] Fetching all projects with relations");

      // Fetch all projects first
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (projectsError) {
        console.error("[DEBUG] Error fetching projects:", projectsError);
        return [];
      }

      if (!projects || projects.length === 0) {
        console.log("[DEBUG] No projects found");
        return [];
      }

      console.log(
        `[DEBUG] Found ${projects.length} projects, fetching relations`,
      );

      // Get all project IDs
      const projectIds = projects.map((p) => p.id);

      // Fetch all related data in parallel
      const [
        { data: milestones, error: milestonesError },
        { data: tasks, error: tasksError },
        { data: accomplishments, error: accomplishmentsError },
        { data: activities, error: activitiesError },
        { data: risks, error: risksError },
        { data: considerations, error: considerationsError },
        { data: changes, error: changesError },
      ] = await Promise.all([
        supabase.from("milestones").select("*").in("project_id", projectIds),
        supabase.from("tasks").select("*").in("project_id", projectIds),
        supabase
          .from("accomplishments")
          .select("*")
          .in("project_id", projectIds),
        supabase
          .from("next_period_activities")
          .select("*")
          .in("project_id", projectIds),
        supabase.from("risks").select("*").in("project_id", projectIds),
        supabase
          .from("considerations")
          .select("*")
          .in("project_id", projectIds),
        supabase.from("changes").select("*").in("project_id", projectIds),
      ]);

      // Log any errors
      [
        milestonesError,
        tasksError,
        accomplishmentsError,
        activitiesError,
        risksError,
        considerationsError,
        changesError,
      ].forEach((error, index) => {
        if (error) {
          console.error(`[DEBUG] Error fetching relation ${index}:`, error);
        }
      });

      // Map tasks to milestones
      const milestonesWithTasks = (milestones || []).map((milestone) => ({
        ...milestone,
        tasks: (tasks || []).filter(
          (task) => task.milestone_id === milestone.id,
        ),
      }));

      // Build complete projects with relations
      const projectsWithRelations = projects.map((project) => {
        console.log(
          "[DEBUG] Project ID:",
          project.id,
          "manual_status_color:",
          project.manual_status_color,
          "health_calculation_type:",
          project.health_calculation_type,
          "project_id:",
          project.project_id,
        );
        return {
          ...project,
          // Map database field project_id to form field projectId - handle null/undefined properly
          projectId: (project.project_id ?? "").toString(),
          manual_status_color: project.manual_status_color || null,
          computed_status_color: project.computed_status_color || null,
          milestones: milestonesWithTasks.filter(
            (m) => m.project_id === project.id,
          ),
          accomplishments: (accomplishments || []).filter(
            (a) => a.project_id === project.id,
          ),
          next_period_activities: (activities || []).filter(
            (a) => a.project_id === project.id,
          ),
          risks: (risks || []).filter((r) => r.project_id === project.id),
          considerations: (considerations || [])
            .filter((c) => c.project_id === project.id)
            .map((c) =>
              typeof c.description === "string" ? c.description : "",
            ),
          changes: (changes || []).filter((c) => c.project_id === project.id),
        };
      });

      console.log(
        `[DEBUG] Successfully built ${projectsWithRelations.length} projects with relations`,
      );
      return projectsWithRelations;
    } catch (error) {
      console.error("[DEBUG] Unexpected error in getAllProjects:", error);
      return [];
    }
  },

  // Method to create a new project summary and mark previous ones as not current
  async updateProjectAnalysis(
    id: string,
    analysisContent: string,
  ): Promise<boolean> {
    console.log("[DEBUG] Creating new project summary for project ID:", id);
    console.log(
      "[DEBUG] Analysis content length:",
      analysisContent?.length || 0,
    );

    try {
      // First, mark all existing summaries for this project as not current
      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({ is_current: false })
        .eq("project_id", id)
        .eq("is_current", true);

      if (updateError) {
        console.error(
          "[DEBUG] Error updating existing summaries:",
          updateError,
        );
        // Continue anyway to try to insert the new summary
      } else {
        console.log(
          "[DEBUG] Successfully marked existing summaries as not current",
        );
      }

      // Create timestamp for the new summary
      const timestamp = new Date().toISOString();
      console.log("[DEBUG] Creating new summary with timestamp:", timestamp);

      // Insert the new summary
      const { data, error } = await supabase
        .from("project_summaries")
        .insert({
          project_id: id,
          content: analysisContent,
          is_current: true,
          created_at: timestamp,
        })
        .select()
        .single();

      if (error) {
        console.error("[DEBUG] Error inserting new project summary:", error);
        return false;
      }

      // Also update the project record with the latest analysis for backward compatibility
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          project_analysis: analysisContent,
        })
        .eq("id", id);

      if (projectUpdateError) {
        console.error(
          "[DEBUG] Error updating project analysis field:",
          projectUpdateError,
        );
        // Continue anyway since we've already saved to the summaries table
      }

      console.log("[DEBUG] Project summary created successfully:", data?.id);
      return true;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in updateProjectAnalysis:",
        error,
      );
      return false;
    }
  },

  // Method to get the latest project summary
  async getLatestProjectSummary(projectId: string): Promise<{
    content: string;
    created_at: string;
    is_stale: boolean;
  } | null> {
    try {
      console.log("[DEBUG] Fetching latest summary for project ID:", projectId);

      const { data, error } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - this is not an error, just no summary yet
          console.log("[DEBUG] No current summary found for project");
          return null;
        }
        console.error("[DEBUG] Error fetching project summary:", error);
        return null;
      }

      if (!data) {
        console.log("[DEBUG] No summary found for project ID:", projectId);
        return null;
      }

      // Check if the summary is older than 1 week (stale)
      const summaryDate = new Date(data.created_at);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const isStale = summaryDate < oneWeekAgo;

      console.log(
        "[DEBUG] Found summary, created at:",
        data.created_at,
        "is stale:",
        isStale,
      );
      console.log("[DEBUG] Summary content length:", data.content?.length || 0);

      // Ensure we're returning a properly formatted timestamp
      const formattedTimestamp = data.created_at
        ? new Date(data.created_at).toISOString()
        : null;
      console.log("[DEBUG] Formatted timestamp:", formattedTimestamp);

      return {
        content: data.content || "",
        created_at: formattedTimestamp || "",
        is_stale: isStale,
      };
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in getLatestProjectSummary:",
        error,
      );
      return null;
    }
  },

  // Method to get all summaries for a project
  async getProjectSummaryHistory(projectId: string): Promise<
    Array<{
      id: string;
      content: string;
      created_at: string;
      is_current: boolean;
    }>
  > {
    try {
      console.log(
        "[DEBUG] Fetching summary history for project ID:",
        projectId,
      );

      const { data, error } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DEBUG] Error fetching project summary history:", error);
        return [];
      }

      console.log("[DEBUG] Found", data?.length || 0, "summaries in history");
      return data || [];
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in getProjectSummaryHistory:",
        error,
      );
      return [];
    }
  },
  async updateProject(
    id: string,
    data: {
      projectId?: string;
      title: string;
      description?: string;
      valueStatement?: string;
      status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
      budget_total: number;
      budget_actuals: number;
      budget_forecast: number;
      charter_link: string;
      sponsors: string;
      business_leads: string;
      project_manager: string;
      health_calculation_type?: "automatic" | "manual";
      manual_health_percentage?: number;
      manual_status_color?: "red" | "yellow" | "green";
      milestones: Array<{
        date: string;
        milestone: string;
        owner: string;
        completion: number;
        status: "green" | "yellow" | "red";
        tasks?: Array<{
          id?: string;
          description: string;
          assignee: string;
          date: string;
          completion: number;
        }>;
      }>;
      accomplishments: string[];
      next_period_activities: Array<{
        description: string;
        date: string;
        completion: number;
        assignee: string;
      }>;
      risks: string[];
      considerations: string[];
      changes: Array<{
        change: string;
        impact: string;
        disposition: string;
      }>;
      department?: string;
      projectAnalysis?: string;
    },
  ): Promise<ProjectWithRelations | null> {
    // PROJECT ID DEBUG: Log Project ID being saved to database
    console.log("[PROJECT_ID] updateProject called:", {
      inputProjectId: data.projectId,
      inputType: typeof data.projectId,
      willSaveAs:
        data.projectId && data.projectId.trim() !== ""
          ? data.projectId.trim()
          : null,
    });
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .update({
          project_id:
            data.projectId && data.projectId.trim() !== ""
              ? data.projectId.trim()
              : null,
          title: data.title,
          description: data.description,
          value_statement: data.valueStatement,
          project_analysis:
            data.projectAnalysis !== undefined ? data.projectAnalysis : null,
          status: data.status,
          budget_total: data.budget_total,
          budget_actuals: data.budget_actuals,
          budget_forecast: data.budget_forecast,
          charter_link: data.charter_link,
          sponsors: data.sponsors,
          business_leads: data.business_leads,
          project_manager: data.project_manager,
          health_calculation_type: data.health_calculation_type || "automatic",
          manual_health_percentage: data.manual_health_percentage || null,
          manual_status_color: data.manual_status_color,
          department: data.department,
        })
        .eq("id", id)
        .select()
        .single();

      if (projectError || !project) {
        console.error("[PROJECT_ID] Error updating project:", projectError);
        return null;
      }

      // PROJECT ID DEBUG: Log what was actually saved to database
      console.log("[PROJECT_ID] Project updated in database:", {
        savedProjectId: project.project_id,
        savedType: typeof project.project_id,
      });

      // Delete existing related records
      const { error: tasksDeleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", id);

      if (tasksDeleteError) {
        console.error("Error deleting tasks:", tasksDeleteError);
      }

      const deleteOperations = [
        {
          table: "milestones",
          operation: supabase.from("milestones").delete().eq("project_id", id),
        },
        {
          table: "accomplishments",
          operation: supabase
            .from("accomplishments")
            .delete()
            .eq("project_id", id),
        },
        {
          table: "next_period_activities",
          operation: supabase
            .from("next_period_activities")
            .delete()
            .eq("project_id", id),
        },
        {
          table: "risks",
          operation: supabase.from("risks").delete().eq("project_id", id),
        },
        {
          table: "considerations",
          operation: supabase
            .from("considerations")
            .delete()
            .eq("project_id", id),
        },
        {
          table: "changes",
          operation: supabase.from("changes").delete().eq("project_id", id),
        },
      ];

      for (const { table, operation } of deleteOperations) {
        const { error } = await operation;
        if (error) {
          console.error(`Error deleting ${table}:`, error);
          throw new Error(`Failed to delete ${table}: ${error.message}`);
        }
      }

      // Insert new records
      // First insert milestones to get their IDs for tasks
      const { data: insertedMilestones, error: milestonesInsertError } =
        await supabase
          .from("milestones")
          .insert(
            data.milestones.map((m) => ({
              project_id: id,
              date: m.date,
              milestone: m.milestone,
              owner: m.owner,
              completion: m.completion,
              status: m.status,
              weight: m.weight || 3, // Default to 3 if not provided
            })),
          )
          .select();

      if (milestonesInsertError) {
        console.error("Error inserting milestones:", milestonesInsertError);
        throw new Error(
          `Failed to insert milestones: ${milestonesInsertError.message}`,
        );
      }

      // Insert tasks for each milestone
      const tasksToInsert = [];
      data.milestones.forEach((milestone, index) => {
        if (
          milestone.tasks &&
          milestone.tasks.length > 0 &&
          insertedMilestones &&
          insertedMilestones[index]
        ) {
          const milestoneId = insertedMilestones[index].id;
          milestone.tasks.forEach((task) => {
            const taskData = {
              project_id: id,
              milestone_id: milestoneId,
              description: task.description,
              assignee: task.assignee || milestone.owner,
              date: task.date || milestone.date,
              completion: task.completion || 0,
            };
            tasksToInsert.push(taskData);
          });
        }
      });

      if (tasksToInsert.length > 0) {
        const { error: tasksInsertError } = await supabase
          .from("tasks")
          .insert(tasksToInsert)
          .select();

        if (tasksInsertError) {
          console.error("Error inserting tasks:", tasksInsertError);
          throw new Error(
            `Failed to insert tasks: ${tasksInsertError.message}`,
          );
        }
      }

      // Insert related data
      if (data.accomplishments && data.accomplishments.length > 0) {
        const { error: accomplishmentsError } = await supabase
          .from("accomplishments")
          .insert(
            data.accomplishments.map((a) => ({
              project_id: id,
              description: a,
            })),
          );
        if (accomplishmentsError) {
          console.error(
            "Error inserting accomplishments:",
            accomplishmentsError,
          );
          throw new Error(
            `Failed to insert accomplishments: ${accomplishmentsError.message}`,
          );
        }
      }

      if (
        data.next_period_activities &&
        data.next_period_activities.length > 0
      ) {
        const { error: activitiesError } = await supabase
          .from("next_period_activities")
          .insert(
            data.next_period_activities.map((a) => ({
              project_id: id,
              description: a.description,
              date: a.date || new Date().toISOString().split("T")[0],
              completion: a.completion || 0,
              assignee: a.assignee || "",
            })),
          );
        if (activitiesError) {
          console.error("Error inserting activities:", activitiesError);
          throw new Error(
            `Failed to insert activities: ${activitiesError.message}`,
          );
        }
      }

      if (data.risks && data.risks.length > 0) {
        const { error: risksError } = await supabase.from("risks").insert(
          data.risks.map((r) => ({
            project_id: id,
            description: r.description,
            impact: r.impact || null,
          })),
        );
        if (risksError) {
          console.error("Error inserting risks:", risksError);
        }
      }

      if (data.considerations && data.considerations.length > 0) {
        const { error: considerationsError } = await supabase
          .from("considerations")
          .insert(
            data.considerations.map((c) => ({
              project_id: id,
              description:
                typeof c === "string"
                  ? c
                  : typeof c === "object" && c !== null && "description" in c
                    ? typeof c.description === "string"
                      ? c.description
                      : JSON.stringify(c.description)
                    : String(c || ""),
            })),
          );
        if (considerationsError) {
          console.error("Error inserting considerations:", considerationsError);
          throw new Error(
            `Failed to insert considerations: ${considerationsError.message}`,
          );
        }
      }

      if (data.changes && data.changes.length > 0) {
        const { error: changesError } = await supabase.from("changes").insert(
          data.changes.map((c) => ({
            project_id: id,
            change: c.change,
            impact: c.impact,
            disposition: c.disposition,
          })),
        );
        if (changesError) {
          console.error("Error inserting changes:", changesError);
          throw new Error(`Failed to insert changes: ${changesError.message}`);
        }
      }

      // Update project duration after saving milestones
      try {
        const { projectDurationService } = await import(
          "./projectDurationService"
        );
        await projectDurationService.updateProjectDuration(id);
      } catch (error) {
        console.error("Error updating project duration:", error);
      }

      // Update computed status color after saving project
      try {
        console.log(
          "[COMPUTED_STATUS] Updating computed status color after project update",
        );
        const success = await updateProjectComputedStatusColor(id);
        if (success) {
          console.log(
            "[COMPUTED_STATUS] Successfully updated computed status color after project update",
          );
        } else {
          console.error(
            "[COMPUTED_STATUS] Failed to update computed status color after project update",
          );
        }
      } catch (error) {
        console.error(
          "[COMPUTED_STATUS] Error updating computed status color:",
          error,
        );
      }

      const updatedProject = await this.getProject(id);
      if (!updatedProject) {
        console.error("Failed to fetch updated project after save");
        throw new Error("Failed to fetch updated project after save");
      }

      // Create a version after successful project update
      try {
        console.log(
          "[VERSION] Creating version after project update for project:",
          id,
        );
        const { projectVersionsService } = await import("./projectVersions");
        const version = await projectVersionsService.createVersion(
          id,
          updatedProject,
        );
        if (version) {
          console.log(
            "[VERSION] Successfully created version:",
            version.version_number,
          );
        } else {
          console.error(
            "[VERSION] Failed to create version after project update",
          );
        }
      } catch (error) {
        console.error(
          "[VERSION] Error creating version after project update:",
          error,
        );
        // Don't fail the entire update if version creation fails
      }

      // PROJECT ID DEBUG: Log final Project ID from updated project
      console.log("[PROJECT_ID] Final updated project:", {
        projectId: updatedProject.projectId,
        dbProjectId: updatedProject.project_id,
        type: typeof updatedProject.projectId,
      });

      return updatedProject;
    } catch (error) {
      console.error("[PROJECT_ID] Error in updateProject:", error);
      return null;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    return !error;
  },

  async createProject(data: {
    projectId?: string;
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    budget_total: number;
    budget_actuals: number;
    budget_forecast: number;
    charter_link: string;
    sponsors: string;
    business_leads: string;
    project_manager: string;
    health_calculation_type?: "automatic" | "manual";
    manual_health_percentage?: number;
    manual_status_color?: "red" | "yellow" | "green";
    milestones: Array<{
      date: string;
      milestone: string;
      owner: string;
      completion: number;
      status: "green" | "yellow" | "red";
    }>;
    accomplishments: string[];
    next_period_activities: Array<{
      description: string;
      date: string;
      completion: number;
      assignee: string;
    }>;
    risks: Array<{ description: string; impact?: string }>;
    considerations: string[];
    department?: string;
    changes?: Array<{
      change: string;
      impact: string;
      disposition: string;
    }>;
    projectAnalysis?: string;
  }): Promise<ProjectWithRelations | null> {
    try {
      console.log(
        "createProject called with data:",
        JSON.stringify(data, null, 2),
      );

      // Get current user's profile to get department
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let department = data.department;

      if (!department && user) {
        // If department not provided, get it from user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("department")
          .eq("id", user.id)
          .single();

        if (profile?.department) {
          department = profile.department;
        }
      }

      console.log("Inserting project with department:", department);
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          project_id:
            data.projectId && data.projectId.trim() !== ""
              ? data.projectId.trim()
              : null,
          title: data.title,
          description: data.description,
          value_statement: data.valueStatement,
          project_analysis:
            data.projectAnalysis !== undefined ? data.projectAnalysis : null,
          status: data.status || "active",
          budget_total: data.budget_total,
          budget_actuals: data.budget_actuals,
          budget_forecast: data.budget_forecast,
          charter_link: data.charter_link,
          sponsors: data.sponsors,
          business_leads: data.business_leads,
          project_manager: data.project_manager,
          health_calculation_type: data.health_calculation_type || "automatic",
          manual_health_percentage: data.manual_health_percentage,
          manual_status_color: data.manual_status_color,
          department: department,
        })
        .select()
        .single();

      if (projectError) {
        console.error("Error inserting project:", projectError);
        return null;
      }
      if (!project) {
        console.error("No project returned after insert");
        return null;
      }

      console.log("Project created successfully with ID:", project.id);

      // Insert milestones if any
      if (data.milestones && data.milestones.length > 0) {
        console.log(`Inserting ${data.milestones.length} milestones`);
        try {
          const { error: milestonesError } = await supabase
            .from("milestones")
            .insert(
              data.milestones.map((m) => ({
                project_id: project.id,
                date: m.date,
                milestone: m.milestone,
                owner: m.owner,
                completion: m.completion,
                status: m.status,
                weight: m.weight || 3, // Default to 3 if not provided
              })),
            );
          if (milestonesError) {
            console.error("Error inserting milestones:", milestonesError);
          }
        } catch (error) {
          console.error("Exception inserting milestones:", error);
        }
      }

      // Insert accomplishments if any
      if (data.accomplishments && data.accomplishments.length > 0) {
        console.log(`Inserting ${data.accomplishments.length} accomplishments`);
        try {
          const { error: accomplishmentsError } = await supabase
            .from("accomplishments")
            .insert(
              data.accomplishments.map((a) => ({
                project_id: project.id,
                description: a,
              })),
            );
          if (accomplishmentsError) {
            console.error(
              "Error inserting accomplishments:",
              accomplishmentsError,
            );
          }
        } catch (error) {
          console.error("Exception inserting accomplishments:", error);
        }
      }

      // Insert next period activities if any
      if (
        data.next_period_activities &&
        data.next_period_activities.length > 0
      ) {
        console.log(
          `Inserting ${data.next_period_activities.length} activities`,
        );
        try {
          const { error: activitiesError } = await supabase
            .from("next_period_activities")
            .insert(
              data.next_period_activities.map((a) => ({
                project_id: project.id,
                description: a.description,
                date: a.date || new Date().toISOString().split("T")[0],
                completion: a.completion || 0,
                assignee: a.assignee || "",
              })),
            );
          if (activitiesError) {
            console.error("Error inserting activities:", activitiesError);
          }
        } catch (error) {
          console.error("Exception inserting activities:", error);
        }
      }

      // Insert risks if any
      if (data.risks && data.risks.length > 0) {
        console.log(`Inserting ${data.risks.length} risks`);
        try {
          const { error: risksError } = await supabase.from("risks").insert(
            data.risks.map((r) => ({
              project_id: project.id,
              description: r.description,
              impact: r.impact || null,
            })),
          );
          if (risksError) {
            console.error("Error inserting risks:", risksError);
          }
        } catch (error) {
          console.error("Exception inserting risks:", error);
        }
      }

      // Insert considerations if any
      if (data.considerations && data.considerations.length > 0) {
        console.log(`Inserting ${data.considerations.length} considerations`);
        try {
          const { error: considerationsError } = await supabase
            .from("considerations")
            .insert(
              data.considerations.map((c) => ({
                project_id: project.id,
                description:
                  typeof c === "string"
                    ? c
                    : typeof c === "object" && c !== null && "description" in c
                      ? typeof c.description === "string"
                        ? c.description
                        : JSON.stringify(c.description)
                      : String(c || ""),
              })),
            );
          if (considerationsError) {
            console.error(
              "Error inserting considerations:",
              considerationsError,
            );
          }
        } catch (error) {
          console.error("Exception inserting considerations:", error);
        }
      }

      // Insert changes if any
      if (data.changes && data.changes.length > 0) {
        console.log(`Inserting ${data.changes.length} changes`);
        try {
          const { error: changesError } = await supabase.from("changes").insert(
            data.changes.map((c) => ({
              project_id: project.id,
              change: c.change,
              impact: c.impact,
              disposition: c.disposition,
            })),
          );
          if (changesError) {
            console.error("Error inserting changes:", changesError);
          }
        } catch (error) {
          console.error("Exception inserting changes:", error);
        }
      }

      console.log(
        "All related data inserted, fetching complete project with ID:",
        project.id,
      );

      // Update project duration after creating milestones
      console.log(
        "[PROJECT_SERVICE] Updating project duration after project creation for project:",
        project.id,
      );
      try {
        const { projectDurationService } = await import(
          "./projectDurationService"
        );
        const success = await projectDurationService.updateProjectDuration(
          project.id,
        );
        if (success) {
          console.log(
            "[PROJECT_SERVICE] Successfully updated project duration after project creation",
          );
        } else {
          console.error(
            "[PROJECT_SERVICE] Failed to update project duration after project creation",
          );
        }
      } catch (error) {
        console.error(
          "[PROJECT_SERVICE] Error updating project duration after project creation:",
          error,
        );
      }

      // Update computed status color after creating project
      try {
        console.log(
          "[COMPUTED_STATUS] Updating computed status color after project creation",
        );
        const success = await updateProjectComputedStatusColor(project.id);
        if (success) {
          console.log(
            "[COMPUTED_STATUS] Successfully updated computed status color after project creation",
          );
        } else {
          console.error(
            "[COMPUTED_STATUS] Failed to update computed status color after project creation",
          );
        }
      } catch (error) {
        console.error(
          "[COMPUTED_STATUS] Error updating computed status color:",
          error,
        );
      }

      const completeProject = await this.getProject(project.id);
      console.log(
        "Complete project fetched:",
        completeProject ? "success" : "failed",
      );

      // Create initial version after project creation
      if (completeProject) {
        try {
          console.log(
            "[VERSION] Creating initial version after project creation for project:",
            project.id,
          );
          const { projectVersionsService } = await import("./projectVersions");
          const version = await projectVersionsService.createVersion(
            project.id,
            completeProject,
          );
          if (version) {
            console.log(
              "[VERSION] Successfully created initial version:",
              version.version_number,
            );
          } else {
            console.error(
              "[VERSION] Failed to create initial version after project creation",
            );
          }
        } catch (error) {
          console.error(
            "[VERSION] Error creating initial version after project creation:",
            error,
          );
          // Don't fail the entire creation if version creation fails
        }
      }

      return completeProject;
    } catch (error) {
      console.error("Unexpected error in createProject:", error);
      return null;
    }
  },

  async getProject(id: string): Promise<ProjectWithRelations | null> {
    if (!id) {
      return null;
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn("Invalid project ID format:", id);
      return null;
    }

    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) {
        console.warn("Supabase error fetching project:", projectError.message);
        return null;
      }

      if (!project) {
        console.warn("No project found with ID:", id);
        return null;
      }

      // PROJECT ID DEBUG: Log Project ID from database
      console.log("[PROJECT_ID] getProject fetched:", {
        dbProjectId: project.project_id,
        dbType: typeof project.project_id,
        willMapTo: (project.project_id ?? "").toString(),
      });

      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", id);

      if (milestonesError)
        console.warn("Error fetching milestones:", milestonesError.message);

      const { data: allTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id);

      if (allTasksError) {
        console.warn("Error fetching all tasks:", allTasksError.message);
      }

      const milestonesWithTasks = (milestones || []).map((milestone) => {
        const milestoneTasks = (allTasks || []).filter(
          (task) => task.milestone_id === milestone.id,
        );
        return {
          ...milestone,
          tasks: milestoneTasks,
        };
      });

      const [
        { data: accomplishments, error: accomplishmentsError },
        { data: activities, error: activitiesError },
        { data: risks, error: risksError },
        { data: considerations, error: considerationsError },
        { data: changes, error: changesError },
      ] = await Promise.all([
        supabase.from("accomplishments").select("*").eq("project_id", id),
        supabase
          .from("next_period_activities")
          .select("*")
          .eq("project_id", id),
        supabase.from("risks").select("*").eq("project_id", id),
        supabase.from("considerations").select("*").eq("project_id", id),
        supabase.from("changes").select("*").eq("project_id", id),
      ]);

      [
        accomplishmentsError,
        activitiesError,
        risksError,
        considerationsError,
        changesError,
      ].forEach((error) => {
        if (error) {
          console.warn("Error fetching related data:", error.message);
        }
      });

      console.log("[PROJECT_ID] Final project data:", {
        dbProjectId: project.project_id,
        manual_status_color: project.manual_status_color,
        health_calculation_type: project.health_calculation_type,
      });

      return {
        ...project,
        // Map database field project_id to form field projectId - handle null/undefined properly
        projectId: (project.project_id ?? "").toString(),
        manual_status_color: project.manual_status_color || null,
        computed_status_color: project.computed_status_color || null,
        milestones: milestonesWithTasks,
        accomplishments: accomplishments || [],
        next_period_activities: activities || [],
        risks: risks || [],
        considerations: (considerations || []).map((c) => {
          if (!c) return "";
          if (typeof c.description === "string") return c.description;
          if (typeof c.description === "object" && c.description !== null) {
            try {
              return JSON.stringify(c.description);
            } catch (e) {
              return "";
            }
          }
          return "";
        }),
        changes: changes || [],
      };
    } catch (error) {
      console.error("Unexpected error in getProject:", error);
      return null;
    }
  },
};
