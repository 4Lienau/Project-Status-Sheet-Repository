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

export interface AccomplishmentItem {
  id?: string;
  description: string;
  source_type: "manual" | "milestone" | "task";
  source_id: string | null;
  is_hidden: boolean;
  is_deleted: boolean;
  auto_generated: boolean;
}
export type SubActivity = {
  description: string;
  date: string;
  assignee: string;
  completion: number;
};

export type NextPeriodActivity = {
  id: string;
  project_id: string;
  description: string;
  date: string;
  completion: number;
  assignee: string;
  sub_activities?: SubActivity[];
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
  duration_days?: number;
  created_at?: string;
  updated_at?: string;
};

export interface ProjectWithRelations
  extends Omit<Project, "manual_status_color" | "computed_status_color"> {
  manual_status_color: "red" | "yellow" | "green" | null;
  computed_status_color: "red" | "yellow" | "green" | null;
  projectId: string; // Form field mapping for project_id
  milestones: (Milestone & { tasks?: Task[] })[];
  accomplishments: (Accomplishment | AccomplishmentItem)[];
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
// Note: This function calculates duration data but doesn't consider project status
// The status-aware logic is handled in the helper functions that use this data
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

  // Find earliest start dates and latest end dates
  const startDates = milestones
    .map((m) => new Date(m.date))
    .filter((date) => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  // Use end_date if available, otherwise fall back to date
  const endDates = milestones
    .map((m) => new Date(m.end_date || m.date))
    .filter((date) => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (startDates.length === 0) {
    return {
      startDate: null,
      endDate: null,
      totalDays: null,
      workingDays: null,
      totalDaysRemaining: null,
      workingDaysRemaining: null,
    };
  }

  const startDate = startDates[0];
  const endDate = endDates[endDates.length - 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // Calculate total days (project duration from start to end)
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

  // CRITICAL FIX: Calculate remaining days from end date
  // This is the source of the >100% issue!
  let totalDaysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate working days remaining
  let workingDaysRemaining = 0;
  const calcStartDate = new Date(today);
  const calcEndDate = new Date(endDate);

  if (calcEndDate >= calcStartDate) {
    // Project end is in the future - count working days from today to end
    const tempDate = new Date(calcStartDate);
    while (tempDate <= calcEndDate) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysRemaining++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
  } else {
    // Project is overdue - count working days from end to today (negative)
    const tempDate = new Date(calcEndDate);
    while (tempDate <= calcStartDate) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysRemaining++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
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

// EXPORTED helper function to ensure consistent time remaining percentage calculations
// This should be used everywhere time remaining percentages are displayed
export const calculateTimeRemainingPercentage = (
  project: ProjectWithRelations | Project,
): number | null => {
  const projectWithRelations = project as ProjectWithRelations;

  // If project is completed, return 0% time remaining
  if (projectWithRelations.status === "completed") {
    return 0;
  }

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

  // CRITICAL FIX: Always cap at 100% regardless of project type
  // This is the fundamental issue - we should NEVER show >100% time remaining
  const rawPercentage = Math.round((remainingDays / totalDays) * 100);
  const cappedPercentage = Math.max(0, Math.min(100, rawPercentage));

  // Additional check for future projects - but still cap at 100%
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = projectWithRelations.calculated_start_date
    ? new Date(projectWithRelations.calculated_start_date)
    : null;

  if (startDate && startDate > today) {
    // Even for future projects, never exceed 100%
    return Math.min(100, cappedPercentage);
  }

  return cappedPercentage;
};

// Helper function to get a human-readable time remaining description
export const getTimeRemainingDescription = (
  project: ProjectWithRelations | Project,
): string => {
  const projectWithRelations = project as ProjectWithRelations;

  // If project is completed, return completion message
  if (projectWithRelations.status === "completed") {
    return "Project completed";
  }

  if (
    !projectWithRelations.total_days ||
    projectWithRelations.total_days_remaining === null ||
    projectWithRelations.total_days_remaining === undefined
  ) {
    return "No timeline data";
  }

  const totalDays = projectWithRelations.total_days;
  const remainingDays = projectWithRelations.total_days_remaining;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = projectWithRelations.calculated_start_date
    ? new Date(projectWithRelations.calculated_start_date)
    : null;
  const endDate = projectWithRelations.calculated_end_date
    ? new Date(projectWithRelations.calculated_end_date)
    : null;

  // If project is overdue
  if (remainingDays < 0) {
    const overdueDays = Math.abs(remainingDays);
    return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
  }

  // If project starts in the future
  if (startDate && startDate > today) {
    const daysUntilStart = Math.ceil(
      (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"} (${remainingDays} days total until completion)`;
  }

  // For active projects, show remaining days and percentage of total duration
  // CRITICAL FIX: Use the standardized function to ensure consistency
  const timeRemainingPercentage = calculateTimeRemainingPercentage(project);
  const cappedPercentage =
    timeRemainingPercentage !== null ? timeRemainingPercentage : 0;

  if (cappedPercentage === 100) {
    return `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining (full duration)`;
  } else {
    return `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining (${cappedPercentage}% of duration)`;
  }
};

// Helper function to generate tooltip text for time remaining percentages over 100%
export const getTimeRemainingTooltipText = (
  project: ProjectWithRelations | Project,
  percentage: number,
): string | null => {
  const projectWithRelations = project as ProjectWithRelations;

  // Only show tooltip for percentages over 100%
  if (percentage <= 100) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = projectWithRelations.calculated_start_date
    ? new Date(projectWithRelations.calculated_start_date)
    : null;
  const endDate = projectWithRelations.calculated_end_date
    ? new Date(projectWithRelations.calculated_end_date)
    : null;

  // Check if project starts in the future
  if (startDate && startDate > today) {
    const daysUntilStart = Math.ceil(
      (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalDays = projectWithRelations.total_days || 0;
    const remainingDays = projectWithRelations.total_days_remaining || 0;

    return `This project shows ${percentage}% time remaining because it hasn't started yet. The project starts in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}, so the time from today to completion (${remainingDays} days) is longer than the actual project duration (${totalDays} days).`;
  }

  // Fallback explanation for other cases where percentage exceeds 100%
  return `This percentage exceeds 100% due to how time remaining is calculated. This can happen when the time from today to project completion is longer than the original project duration.`;
};

// Standardized function to calculate project health status color with time awareness
export const calculateProjectHealthStatusColor = (
  project: ProjectWithRelations | Project,
  milestones?: Milestone[],
): "red" | "yellow" | "green" => {
  // For manual calculation, use the manual status color if available
  if (
    project.health_calculation_type === "manual" &&
    project.manual_status_color
  ) {
    return project.manual_status_color;
  }

  // For automatic calculation or when manual color is not set
  // Use status-based colors first
  if (project.status === "completed") {
    return "green";
  } else if (project.status === "cancelled") {
    return "red";
  } else if (project.status === "draft" || project.status === "on_hold") {
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

    // If we don't have time data, fall back to milestone-only calculation
    if (timeRemainingPercentage === null) {
      let color: "red" | "yellow" | "green" = "green";
      if (weightedCompletion >= 70) color = "green";
      else if (weightedCompletion >= 40) color = "yellow";
      else color = "red";

      return color;
    }

    // FIXED: Improved time-aware health calculation
    let color: "red" | "yellow" | "green" = "green";

    // Check if project starts in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = (project as ProjectWithRelations).calculated_start_date
      ? new Date((project as ProjectWithRelations).calculated_start_date!)
      : null;

    const projectStartsInFuture = startDate && startDate > today;

    // FIXED: Special handling for future projects
    if (projectStartsInFuture) {
      // Projects that haven't started yet should generally be green
      // unless there are obvious issues with milestone setup
      if (weightedCompletion > 50) {
        // If milestones are already significantly complete before project starts,
        // this might indicate data issues, but still lean positive
        color = "yellow";
      } else {
        color = "green";
      }
      return color;
    }

    // If project is overdue (0% time remaining), be strict with milestone requirements
    if (timeRemainingPercentage === 0) {
      if (weightedCompletion >= 90)
        color = "yellow"; // Even high completion is concerning if overdue
      else color = "red";
      return color;
    }

    // FIXED: More intuitive thresholds - projects with more time should be healthier
    // If substantial time remaining (>70% of total duration), be very lenient
    if (timeRemainingPercentage > 70) {
      if (weightedCompletion >= 5)
        color = "green"; // Very low threshold for green when substantial time remains
      else if (weightedCompletion >= 0)
        color = "yellow"; // Even 0% completion can be yellow with lots of time
      else color = "red";
      return color;
    }

    // If plenty of time remaining (40-70% of total duration), be more lenient
    if (timeRemainingPercentage > 40) {
      if (weightedCompletion >= 15)
        color = "green"; // Lower threshold for green when plenty of time
      else if (weightedCompletion >= 5) color = "yellow";
      else color = "red";
      return color;
    }

    // If moderate time remaining (20-40% of total duration), use balanced approach
    if (timeRemainingPercentage > 20) {
      if (weightedCompletion >= 30) color = "green";
      else if (weightedCompletion >= 15) color = "yellow";
      else color = "red";
      return color;
    }

    // If little time remaining (1-20% of total duration), be stricter
    if (weightedCompletion >= 70) color = "green";
    else if (weightedCompletion >= 50) color = "yellow";
    else color = "red";

    return color;
  }

  // Default to green for active projects with no milestones
  return "green";
};

// Service function to update computed status color for a project
export const updateProjectComputedStatusColor = async (
  projectId: string,
): Promise<boolean> => {
  try {
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
      // Import and use the proper service
      const { projectDurationService } = await import(
        "./projectDurationService"
      );
      const result =
        await projectDurationService.recalculateAllProjectDurations();
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
      // Fetch all projects first with timeout
      const projectsPromise = supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      // Add a timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );

      const { data: projects, error: projectsError } = await Promise.race([
        projectsPromise,
        timeoutPromise
      ]).catch((err) => {
        return { data: null, error: err };
      });

      if (projectsError) {
        return [];
      }

      if (!projects || projects.length === 0) {
        return [];
      }

      // Get all project IDs
      const projectIds = projects.map((p) => p.id);

      // Improved fetch with retry logic and better error handling
      const fetchWithRetry = async (
        tableName: string,
        projectIds: string[],
        maxRetries = 2,
      ) => {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Add timeout to each fetch
            const fetchPromise = supabase
              .from(tableName)
              .select("*")
              .in("project_id", projectIds);

            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Fetch timeout")), 15000)
            );

            const { data, error } = await Promise.race([
              fetchPromise,
              timeoutPromise
            ]).catch((err) => {
              return { data: null, error: err };
            });

            if (error) {
              lastError = error;
              
              // If it's a network error and we have retries left, wait before retrying
              if (attempt < maxRetries) {
                const waitTime = attempt * 500; // Shorter backoff
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
              
              // Return empty array on final failure
              return [];
            }
            return data || [];
          } catch (err) {
            lastError = err;
            
            // If we have retries left, wait before retrying
            if (attempt < maxRetries) {
              const waitTime = attempt * 500;
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            // Return empty array on final failure
            return [];
          }
        }
        return [];
      };

      // Fetch all related data with retry logic
      const [milestones, tasks, accomplishments, activities, risks, considerations, changes] = 
        await Promise.all([
          fetchWithRetry("milestones", projectIds),
          fetchWithRetry("tasks", projectIds),
          fetchWithRetry("accomplishments", projectIds),
          fetchWithRetry("next_period_activities", projectIds),
          fetchWithRetry("risks", projectIds),
          fetchWithRetry("considerations", projectIds),
          fetchWithRetry("changes", projectIds),
        ]);

      // Map tasks to milestones
      const milestonesWithTasks = (milestones || []).map((milestone) => ({
        ...milestone,
        tasks: (tasks || []).filter(
          (task) => task.milestone_id === milestone.id,
        ),
      }));

      // Build complete projects with relations
      const projectsWithRelations = projects.map((project) => {
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

      return projectsWithRelations;
    } catch (error) {
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Method to create a new project summary and mark previous ones as not current
  async updateProjectAnalysis(
    id: string,
    analysisContent: string,
  ): Promise<boolean> {
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
      }

      // Create timestamp for the new summary
      const timestamp = new Date().toISOString();
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
          return null;
        }
        // Only log non-network errors to reduce noise from transient failures
        if (error.message && !error.message.includes("Failed to fetch")) {
          console.error("[DEBUG] Error fetching project summary:", error);
        }
        return null;
      }

      if (!data) {
        return null;
      }

      // Check if the summary is older than 1 week (stale)
      const summaryDate = new Date(data.created_at);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const isStale = summaryDate < oneWeekAgo;

      // Ensure we're returning a properly formatted timestamp
      const formattedTimestamp = data.created_at
        ? new Date(data.created_at).toISOString()
        : null;
      return {
        content: data.content || "",
        created_at: formattedTimestamp || "",
        is_stale: isStale,
      };
    } catch (error: any) {
      // Only log non-network errors to reduce noise from transient failures
      if (error?.message && !error.message.includes("Failed to fetch")) {
        console.error(
          "[DEBUG] Unexpected error in getLatestProjectSummary:",
          error,
        );
      }
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
      const { data, error } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DEBUG] Error fetching project summary history:", error);
        return [];
      }
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
          duration_days?: number;
        }>;
      }>;
      accomplishments: Array<string | AccomplishmentItem>;
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
              end_date: m.end_date,
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
              date: task.date || null,
              completion: task.completion || 0,
              duration_days: task.duration_days || 1,
            };
            tasksToInsert.push(taskData);
          });
        }
      });

      if (tasksToInsert.length > 0) {
        const { data: insertedTasks, error: tasksInsertError } = await supabase
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
        const accomplishmentRows = data.accomplishments.map((a) => {
          if (typeof a === "string") {
            return {
              project_id: id,
              description: a,
              source_type: "manual",
              source_id: null,
              is_hidden: false,
              is_deleted: false,
              auto_generated: false,
            };
          }
          // AccomplishmentItem object
          return {
            project_id: id,
            description: a.description,
            source_type: a.source_type || "manual",
            source_id: a.source_id || null,
            is_hidden: a.is_hidden || false,
            is_deleted: a.is_deleted || false,
            auto_generated: a.auto_generated || false,
          };
        });

        const { error: accomplishmentsError } = await supabase
          .from("accomplishments")
          .insert(accomplishmentRows);
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
        const activityRows = data.next_period_activities.map((a) => ({
          project_id: id,
          description: a.description,
          date: a.date || new Date().toISOString().split("T")[0],
          completion: a.completion || 0,
          assignee: a.assignee || "",
          sub_activities: a.sub_activities || [],
        }));
        let { error: activitiesError } = await supabase
          .from("next_period_activities")
          .insert(activityRows);
        // Fallback: if sub_activities column doesn't exist yet, retry without it
        if (activitiesError && activitiesError.message?.includes("sub_activities")) {
          const rowsWithoutSubActivities = activityRows.map(({ sub_activities: _omit, ...rest }) => rest);
          const { error: retryError } = await supabase
            .from("next_period_activities")
            .insert(rowsWithoutSubActivities);
          activitiesError = retryError;
        }
        if (activitiesError) {
          console.error("Error inserting activities:", activitiesError);
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
        const success = await updateProjectComputedStatusColor(id);
        if (!success) {
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
        const { projectVersionsService } = await import("./projectVersions");
        const version = await projectVersionsService.createVersion(
          id,
          updatedProject,
        );
        if (!version) {
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

      return updatedProject;
    } catch (error) {
      console.error("[PROJECT_ID] Error in updateProject:", error);
      return null;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      // Validate project ID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        console.error("[DELETE_PROJECT] Invalid project ID format:", id);
        return false;
      }

      // Check if project exists
      const { data: project, error: projectCheckError } = await supabase
        .from("projects")
        .select("id, title")
        .eq("id", id)
        .single();

      if (projectCheckError || !project) {
        console.error(
          "[DELETE_PROJECT] Project not found or error checking:",
          projectCheckError,
        );
        return false;
      }

      // Delete all related records first (in order to avoid foreign key constraint violations)
      const deleteOperations = [
        {
          table: "tasks",
          operation: supabase.from("tasks").delete().eq("project_id", id),
        },
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
        {
          table: "project_summaries",
          operation: supabase
            .from("project_summaries")
            .delete()
            .eq("project_id", id),
        },
      ];

      // Execute all delete operations for related records
      for (const { table, operation } of deleteOperations) {
        const { error } = await operation;
        if (error) {
          console.error(`[DELETE_PROJECT] Error deleting ${table}:`, error);
          // Log the error but continue with other deletions
          // Some tables might not have records, which is fine
        } else {
        }
      }

      // Finally, delete the project itself
      const { error: projectDeleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (projectDeleteError) {
        console.error(
          "[DELETE_PROJECT] Error deleting project:",
          projectDeleteError,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DELETE_PROJECT] Unexpected error during project deletion:",
        error,
      );
      return false;
    }
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
          owner_id: user?.id ?? null,
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
      // Auto-add the designated Project Manager as an editor so they can
      // edit the project even if someone else (e.g. an admin) created it.
      if (data.project_manager && user) {
        const { data: pmProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("full_name", data.project_manager.trim())
          .single();

        if (pmProfile && pmProfile.id !== user.id) {
          await supabase.from("project_editors").insert({
            project_id: project.id,
            user_id: pmProfile.id,
            granted_by: user.id,
          });
        }
      }

      // Insert milestones if any
      if (data.milestones && data.milestones.length > 0) {
        try {
          const { error: milestonesError } = await supabase
            .from("milestones")
            .insert(
              data.milestones.map((m) => ({
                project_id: project.id,
                date: m.date,
                end_date: m.end_date,
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
        try {
          const accomplishmentRows = data.accomplishments.map((a) => {
            if (typeof a === "string") {
              return {
                project_id: project.id,
                description: a,
                source_type: "manual",
                source_id: null,
                is_hidden: false,
                is_deleted: false,
                auto_generated: false,
              };
            }
            return {
              project_id: project.id,
              description: a.description,
              source_type: a.source_type || "manual",
              source_id: a.source_id || null,
              is_hidden: a.is_hidden || false,
              is_deleted: a.is_deleted || false,
              auto_generated: a.auto_generated || false,
            };
          });

          const { error: accomplishmentsError } = await supabase
            .from("accomplishments")
            .insert(accomplishmentRows);
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
        try {
          const activityRows2 = data.next_period_activities.map((a) => ({
            project_id: project.id,
            description: a.description,
            date: a.date || new Date().toISOString().split("T")[0],
            completion: a.completion || 0,
            assignee: a.assignee || "",
            sub_activities: a.sub_activities || [],
          }));
          let { error: activitiesError } = await supabase
            .from("next_period_activities")
            .insert(activityRows2);
          if (activitiesError && activitiesError.message?.includes("sub_activities")) {
            const rowsWithout = activityRows2.map(({ sub_activities: _omit, ...rest }) => rest);
            const { error: retryError } = await supabase
              .from("next_period_activities")
              .insert(rowsWithout);
            activitiesError = retryError;
          }
          if (activitiesError) {
            console.error("Error inserting activities:", activitiesError);
          }
        } catch (error) {
          console.error("Exception inserting activities:", error);
        }
      }

      // Insert risks if any
      if (data.risks && data.risks.length > 0) {
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

      // Update project duration after creating milestones
      try {
        const { projectDurationService } = await import(
          "./projectDurationService"
        );
        const success = await projectDurationService.updateProjectDuration(
          project.id,
        );
        if (!success) {
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
        const success = await updateProjectComputedStatusColor(project.id);
        if (!success) {
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

      // Create initial version after project creation
      if (completeProject) {
        try {
          const { projectVersionsService } = await import("./projectVersions");
          const version = await projectVersionsService.createVersion(
            project.id,
            completeProject,
          );
          if (!version) {
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

        // Track project creation in usage analytics
        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            console.error(
              "[USAGE_TRACKING] User authentication error:",
              userError,
            );
            throw new Error(`User auth failed: ${userError.message}`);
          }

          if (!user) {
            console.error("[USAGE_TRACKING] No authenticated user found");
            throw new Error("No authenticated user");
          }

          // Try the database test function first for immediate feedback
          const { data: dbTestResult, error: dbTestError } = await supabase.rpc(
            "test_project_creation_tracking",
            {
              p_user_id: user.id,
              p_test_project_id: project.id,
            },
          );

          // Import adminService
          const { adminService } = await import("./adminService");
          // Get current page URL safely
          const pageUrl =
            typeof window !== "undefined" && window.location
              ? window.location.href
              : "project-creation";
          // Log project creation activity with the exact activity type expected by the database
          const trackingResult = await adminService.logUserActivity(
            user.id,
            "project-creation-session", // More descriptive session ID
            "project_creation", // This must match the database function expectation
            {
              project_id: project.id,
              project_title: project.title,
              department: department,
              timestamp: new Date().toISOString(),
              created_via: "project_form",
            },
            pageUrl,
          );
          if (!trackingResult) {
            console.error(
              "[USAGE_TRACKING] ❌ Tracking returned false - check adminService.logUserActivity",
            );
          }
        } catch (error) {
          console.error(
            "[USAGE_TRACKING] ❌ CRITICAL ERROR tracking project creation:",
            {
              error: error.message,
              stack: error.stack,
              projectId: project.id,
              timestamp: new Date().toISOString(),
            },
          );
          // Don't fail project creation if tracking fails, but make the error very visible
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
      return null;
    }

    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) {
        return null;
      }

      if (!project) {
        return null;
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", id);

      const { data: allTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id);

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

  async getProjectEditors(projectId: string): Promise<Array<{ user_id: string; full_name: string | null; email: string | null; granted_by: string | null; created_at: string }>> {
    const { data: editors, error } = await supabase
      .from("project_editors")
      .select("user_id, granted_by, created_at")
      .eq("project_id", projectId);

    if (error) {
      console.error("Error fetching project editors:", error);
      return [];
    }
    if (!editors?.length) return [];

    const userIds = editors.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return editors.map((e) => ({
      user_id: e.user_id,
      full_name: profileMap.get(e.user_id)?.full_name ?? null,
      email: profileMap.get(e.user_id)?.email ?? null,
      granted_by: e.granted_by,
      created_at: e.created_at,
    }));
  },

  async addProjectEditor(projectId: string, userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("project_editors")
      .insert({ project_id: projectId, user_id: userId, granted_by: user?.id ?? null });

    if (error) {
      console.error("Error adding project editor:", error);
      return false;
    }
    return true;
  },

  async removeProjectEditor(projectId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("project_editors")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing project editor:", error);
      return false;
    }
    return true;
  },

  async getApprovedUsers(): Promise<Array<{ id: string | null; full_name: string | null; email: string | null; department: string | null; hasAccount: boolean }>> {
    // Search all active AD users, then join to profiles by email for the auth UUID.
    // Users without a profile haven't logged in yet — hasAccount will be false.
    const [{ data: dirUsers }, { data: profiles }] = await Promise.all([
      supabase
        .from("directory_users")
        .select("display_name, email, department")
        .eq("sync_status", "active")
        .order("display_name"),
      supabase
        .from("profiles")
        .select("id, email"),
    ]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.email?.toLowerCase(), p.id])
    );

    return (dirUsers ?? []).map((u) => ({
      id: profileMap.get(u.email?.toLowerCase()) ?? null,
      full_name: u.display_name,
      email: u.email,
      department: u.department,
      hasAccount: profileMap.has(u.email?.toLowerCase()),
    }));
  },
};