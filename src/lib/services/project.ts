/**
 * File: project.ts
 * Purpose: Service for project data management and operations
 * Description: This comprehensive service handles all project-related operations including creating,
 * updating, deleting, and fetching projects and their related data (milestones, tasks, accomplishments,
 * risks, etc.). It provides strongly typed interfaces for project data structures and includes
 * real-time subscription capabilities. The service interacts with the Supabase database and includes
 * detailed logging for debugging.
 *
 * Imports from:
 * - Supabase client
 * - Database type definitions
 *
 * Used by:
 * - src/components/home.tsx
 * - src/components/ProjectForm.tsx
 * - src/components/projects/ProjectList.tsx
 * - src/components/projects/ProjectsOverview.tsx
 * - src/pages/ProjectDashboard.tsx
 * - src/pages/StatusSheetView.tsx
 * - Other components that need project data
 */

import { supabase } from "../supabase";
import { Database } from "@/types/supabase";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
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

// Daily Notes type removed

export interface ProjectWithRelations extends Project {
  milestones: (Milestone & { tasks?: Task[] })[];
  accomplishments: Accomplishment[];
  next_period_activities: NextPeriodActivity[];
  risks: Risk[];
  considerations: Consideration[];
  changes: Change[];
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

export const projectService = {
  // Special method to update only the project analysis field
  async updateProjectAnalysis(
    id: string,
    analysisContent: string,
  ): Promise<boolean> {
    console.log("[DEBUG] Updating project analysis for project ID:", id);
    console.log(
      "[DEBUG] Analysis content length:",
      analysisContent?.length || 0,
    );

    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          project_analysis: analysisContent,
        })
        .eq("id", id);

      if (error) {
        console.error("[DEBUG] Error updating project analysis:", error);
        return false;
      }

      console.log("[DEBUG] Project analysis updated successfully");
      return true;
    } catch (error) {
      console.error(
        "[DEBUG] Unexpected error in updateProjectAnalysis:",
        error,
      );
      return false;
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
            data.projectAnalysis !== undefined ? data.projectAnalysis : null, // More robust null handling
          status: data.status,
          budget_total: data.budget_total,
          budget_actuals: data.budget_actuals,
          budget_forecast: data.budget_forecast,
          charter_link: data.charter_link,
          sponsors: data.sponsors,
          business_leads: data.business_leads,
          project_manager: data.project_manager,
          health_calculation_type: data.health_calculation_type || "automatic",
          manual_health_percentage: data.manual_health_percentage,
          department: data.department, // Update department if provided
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
            description: c,
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
            data.projectAnalysis !== undefined ? data.projectAnalysis : null, // More robust null handling
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
          department: department, // Add department to project
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
                description: c,
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

    // Validate that id is a valid UUID format to prevent errors
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
          tasks: milestoneTasks || [],
        };
      });

      console.log("[DEBUG] Fetching accomplishments for project ID:", id);
      const { data: accomplishments, error: accomplishmentsError } =
        await supabase.from("accomplishments").select("*").eq("project_id", id);

      if (accomplishmentsError)
        console.warn(
          "[DEBUG] Error fetching accomplishments:",
          accomplishmentsError.message,
        );
      console.log(
        "[DEBUG] Found",
        accomplishments?.length || 0,
        "accomplishments",
      );

      console.log("[DEBUG] Fetching activities for project ID:", id);
      const { data: activities, error: activitiesError } = await supabase
        .from("next_period_activities")
        .select("*")
        .eq("project_id", id);

      if (activitiesError)
        console.warn(
          "[DEBUG] Error fetching activities:",
          activitiesError.message,
        );
      console.log("[DEBUG] Found", activities?.length || 0, "activities");

      console.log("[DEBUG] Fetching risks for project ID:", id);
      const { data: risks, error: risksError } = await supabase
        .from("risks")
        .select("*")
        .eq("project_id", id);

      if (risksError)
        console.warn("[DEBUG] Error fetching risks:", risksError.message);
      console.log("[DEBUG] Found", risks?.length || 0, "risks");

      console.log("[DEBUG] Fetching considerations for project ID:", id);
      const { data: considerations, error: considerationsError } =
        await supabase.from("considerations").select("*").eq("project_id", id);

      if (considerationsError)
        console.warn(
          "[DEBUG] Error fetching considerations:",
          considerationsError.message,
        );
      console.log(
        "[DEBUG] Found",
        considerations?.length || 0,
        "considerations",
      );

      console.log("[DEBUG] Fetching changes for project ID:", id);
      const { data: changes, error: changesError } = await supabase
        .from("changes")
        .select("*")
        .eq("project_id", id);

      if (changesError)
        console.warn("[DEBUG] Error fetching changes:", changesError.message);
      console.log("[DEBUG] Found", changes?.length || 0, "changes");

      const result = {
        ...project,
        milestones: milestonesWithTasks || [],
        accomplishments: accomplishments || [],
        next_period_activities: activities || [],
        risks: risks || [],
        considerations: considerations || [],
        changes: changes || [],
      };

      console.log(
        "[DEBUG] Returning complete project data with",
        Object.keys(result).length,
        "top-level keys",
      );
      return result;
    } catch (error) {
      console.error("[DEBUG] Error fetching project data:", error);
      return null;
    }
  },

  async getAllProjects(): Promise<Project[]> {
    const { data } = await supabase.from("projects").select("*");
    return data || [];
  },

  subscribeToProject(
    id: string,
    callback: (project: ProjectWithRelations) => void,
  ) {
    const channels = [
      supabase
        .channel(`projects:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`milestones:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "milestones",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`tasks:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`accomplishments:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "accomplishments",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`activities:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "next_period_activities",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`risks:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "risks",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`considerations:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "considerations",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
      supabase
        .channel(`changes:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "changes",
            filter: `project_id=eq.${id}`,
          },
          () => this.getProject(id).then((p) => p && callback(p)),
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  },
};
