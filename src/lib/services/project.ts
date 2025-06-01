import { supabase } from "../supabase";
import { Database } from "@/types/supabase";

export type Project = Database["public"]["Tables"]["projects"]["Row"] & {
  manual_status_color?: "red" | "yellow" | "green";
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
  extends Omit<Project, "manual_status_color"> {
  manual_status_color: "red" | "yellow" | "green";
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
        );
        return {
          ...project,
          manual_status_color: project.manual_status_color,
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
    console.log(
      "[DEBUG] updateProject called with manual_status_color:",
      data.manual_status_color,
    );
    console.log(
      "[DEBUG] updateProject called with data:",
      JSON.stringify(
        data.milestones.map((m) => ({
          milestone: m.milestone,
          tasks: m.tasks?.length || 0,
        })),
        null,
        2,
      ),
    );
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .update({
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
        console.error("[DEBUG] Error updating project:", projectError);
        return null;
      }

      // Delete existing related records
      console.log(
        "[DEBUG] Deleting existing related records for project ID:",
        id,
      );

      // First delete tasks since they depend on milestones
      const { error: tasksDeleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", id);

      if (tasksDeleteError) {
        console.error("[DEBUG] Error deleting tasks:", tasksDeleteError);
      } else {
        console.log("[DEBUG] Successfully deleted tasks for project ID:", id);
      }

      // Then delete other related records
      await Promise.all([
        supabase.from("milestones").delete().eq("project_id", id),
        supabase.from("accomplishments").delete().eq("project_id", id),
        supabase.from("next_period_activities").delete().eq("project_id", id),
        supabase.from("risks").delete().eq("project_id", id),
        supabase.from("considerations").delete().eq("project_id", id),
        supabase.from("changes").delete().eq("project_id", id),
      ]);

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
        console.error(
          "[DEBUG] Error inserting milestones:",
          milestonesInsertError,
        );
        throw milestonesInsertError;
      }

      // Insert tasks for each milestone
      const tasksToInsert = [];
      data.milestones.forEach((milestone, index) => {
        console.log(
          `[DEBUG] Processing milestone ${index} (${milestone.milestone}) for tasks:`,
          milestone.tasks ? `${milestone.tasks.length} tasks` : "no tasks",
        );

        if (
          milestone.tasks &&
          milestone.tasks.length > 0 &&
          insertedMilestones &&
          insertedMilestones[index]
        ) {
          const milestoneId = insertedMilestones[index].id;
          console.log(`[DEBUG] Milestone ID for tasks: ${milestoneId}`);

          milestone.tasks.forEach((task, taskIndex) => {
            const taskData = {
              project_id: id,
              milestone_id: milestoneId,
              description: task.description,
              assignee: task.assignee || milestone.owner, // Default to milestone owner if not specified
              date: task.date || milestone.date, // Default to milestone date if not specified
              completion: task.completion || 0,
            };
            console.log(
              `[DEBUG] Adding task ${taskIndex} to insert list:`,
              taskData,
            );
            tasksToInsert.push(taskData);
          });
        }
      });

      console.log(
        "[DEBUG] Tasks to insert:",
        tasksToInsert.length,
        tasksToInsert,
      );

      if (tasksToInsert.length > 0) {
        console.log(
          `[DEBUG] Inserting ${tasksToInsert.length} tasks into database:`,
          JSON.stringify(tasksToInsert, null, 2),
        );

        const { data: insertedTasks, error: tasksInsertError } = await supabase
          .from("tasks")
          .insert(tasksToInsert)
          .select();

        if (tasksInsertError) {
          console.error("[DEBUG] Error inserting tasks:", tasksInsertError);
          throw tasksInsertError;
        } else {
          console.log(
            `[DEBUG] Successfully inserted ${insertedTasks?.length || 0} tasks:`,
            JSON.stringify(insertedTasks, null, 2),
          );
        }
      } else {
        console.log("[DEBUG] No tasks to insert");
      }

      const insertPromises = [
        supabase.from("accomplishments").insert(
          data.accomplishments.map((a) => ({
            project_id: id,
            description: a,
          })),
        ),
        supabase.from("next_period_activities").insert(
          data.next_period_activities.map((a) => ({
            project_id: id,
            description: a.description,
            date: a.date,
            completion: a.completion,
            assignee: a.assignee,
          })),
        ),
        supabase.from("risks").insert(
          data.risks.map((r) => ({
            project_id: id,
            description: typeof r === "string" ? r : r.description,
            impact: typeof r === "string" ? null : r.impact,
          })),
        ),
        supabase.from("considerations").insert(
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
        ),
        supabase.from("changes").insert(
          data.changes.map((c) => ({
            project_id: id,
            change: c.change,
            impact: c.impact,
            disposition: c.disposition,
          })),
        ),
      ];

      // Execute all insert operations
      await Promise.all(insertPromises);

      // Update project duration after saving milestones
      console.log(
        "[PROJECT_SERVICE] Updating project duration after milestone save for project:",
        id,
      );
      try {
        const { projectDurationService } = await import(
          "./projectDurationService"
        );
        const success = await projectDurationService.updateProjectDuration(id);
        if (success) {
          console.log(
            "[PROJECT_SERVICE] Successfully updated project duration after milestone save",
          );
        } else {
          console.error(
            "[PROJECT_SERVICE] Failed to update project duration after milestone save",
          );
        }
      } catch (error) {
        console.error(
          "[PROJECT_SERVICE] Error updating project duration after milestone save:",
          error,
        );
      }

      return this.getProject(id);
    } catch (error) {
      console.error("[DEBUG] Unexpected error in updateProject:", error);
      return null;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    return !error;
  },

  async createProject(data: {
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

      const completeProject = await this.getProject(project.id);
      console.log(
        "Complete project fetched:",
        completeProject ? "success" : "failed",
      );
      return completeProject;
    } catch (error) {
      console.error("Unexpected error in createProject:", error);
      return null;
    }
  },

  async getProject(id: string): Promise<ProjectWithRelations | null> {
    // Skip if id is empty
    if (!id) {
      console.log("[DEBUG] Skipping data fetch for empty project ID");
      return null;
    }

    // Validate that id is a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn("[DEBUG] Invalid project ID format:", id);
      return null;
    }

    try {
      console.log("[DEBUG] Fetching project from Supabase with ID:", id);
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) {
        console.warn(
          "[DEBUG] Supabase error fetching project:",
          projectError.message,
        );
        return null;
      }

      if (!project) {
        console.warn("[DEBUG] No project found with ID:", id);
        return null;
      }

      console.log("[DEBUG] Successfully fetched project with ID:", id);
      console.log("[DEBUG] Project data:", JSON.stringify(project, null, 2));

      // Fetch related data with more detailed logging
      console.log("[DEBUG] Fetching milestones for project ID:", id);
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", id);

      if (milestonesError)
        console.warn(
          "[DEBUG] Error fetching milestones:",
          milestonesError.message,
        );
      console.log("[DEBUG] Found", milestones?.length || 0, "milestones");

      // First, fetch all tasks for this project in a single query
      console.log("[DEBUG] Fetching all tasks for project ID:", id);
      const { data: allTasks, error: allTasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", id);

      if (allTasksError) {
        console.warn(
          "[DEBUG] Error fetching all tasks:",
          allTasksError.message,
        );
      }

      console.log(
        "[DEBUG] Found",
        allTasks?.length || 0,
        "total tasks for project",
      );
      console.log("[DEBUG] All tasks:", JSON.stringify(allTasks, null, 2));

      // Map tasks to their respective milestones
      const milestonesWithTasks = (milestones || []).map((milestone) => {
        const milestoneTasks = (allTasks || []).filter(
          (task) => task.milestone_id === milestone.id,
        );

        console.log(
          "[DEBUG] Milestone",
          milestone.id,
          "has",
          milestoneTasks.length,
          "tasks",
        );

        return {
          ...milestone,
          tasks: milestoneTasks,
        };
      });

      // Fetch remaining related data
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

      // Log any errors
      [
        accomplishmentsError,
        activitiesError,
        risksError,
        considerationsError,
        changesError,
      ].forEach((error) => {
        if (error) {
          console.warn("[DEBUG] Error fetching related data:", error.message);
        }
      });

      // Build and return complete project with relations
      console.log(
        "[DEBUG] Project manual_status_color before returning:",
        project.manual_status_color,
      );
      return {
        ...project,
        manual_status_color: project.manual_status_color,
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
      console.error("[DEBUG] Unexpected error in getProject:", error);
      return null;
    }
  },
};
