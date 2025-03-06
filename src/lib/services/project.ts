import { supabase } from "../supabase";
import { Database } from "@/types/supabase";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
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

export interface ProjectWithRelations extends Project {
  milestones: Milestone[];
  accomplishments: Accomplishment[];
  next_period_activities: NextPeriodActivity[];
  risks: Risk[];
  considerations: Consideration[];
  changes: Change[];
}

export const projectService = {
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
    },
  ): Promise<ProjectWithRelations | null> {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .update({
        title: data.title,
        description: data.description,
        value_statement: data.valueStatement,
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
      })
      .eq("id", id)
      .select()
      .single();

    if (projectError || !project) return null;

    // Delete existing related records
    await Promise.all([
      supabase.from("milestones").delete().eq("project_id", id),
      supabase.from("accomplishments").delete().eq("project_id", id),
      supabase.from("next_period_activities").delete().eq("project_id", id),
      supabase.from("risks").delete().eq("project_id", id),
      supabase.from("considerations").delete().eq("project_id", id),
      supabase.from("changes").delete().eq("project_id", id),
    ]);

    // Insert new records
    await Promise.all([
      supabase.from("milestones").insert(
        data.milestones.map((m) => ({
          project_id: id,
          date: m.date,
          milestone: m.milestone,
          owner: m.owner,
          completion: m.completion,
          status: m.status,
        })),
      ),
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
          description: r,
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
    ]);

    return this.getProject(id);
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
    risks: string[];
    considerations: string[];
  }): Promise<ProjectWithRelations | null> {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: data.title,
        description: data.description,
        value_statement: data.valueStatement,
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
      })
      .select()
      .single();

    if (projectError || !project) return null;

    // Insert milestones
    const { error: milestonesError } = await supabase.from("milestones").insert(
      data.milestones.map((m) => ({
        project_id: project.id,
        date: m.date,
        milestone: m.milestone,
        owner: m.owner,
        completion: m.completion,
        status: m.status,
      })),
    );

    // Insert accomplishments
    const { error: accomplishmentsError } = await supabase
      .from("accomplishments")
      .insert(
        data.accomplishments.map((a) => ({
          project_id: project.id,
          description: a,
        })),
      );

    // Insert next period activities
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

    // Insert risks
    const { error: risksError } = await supabase.from("risks").insert(
      data.risks.map((r) => ({
        project_id: project.id,
        description: r,
      })),
    );

    // Insert considerations
    const { error: considerationsError } = await supabase
      .from("considerations")
      .insert(
        data.considerations.map((c) => ({
          project_id: project.id,
          description: c,
        })),
      );

    // Insert changes
    const { error: changesError } = await supabase.from("changes").insert(
      data.changes.map((c) => ({
        project_id: project.id,
        change: c.change,
        impact: c.impact,
        disposition: c.disposition,
      })),
    );

    if (
      milestonesError ||
      accomplishmentsError ||
      activitiesError ||
      risksError ||
      considerationsError ||
      changesError
    ) {
      return null;
    }

    return this.getProject(project.id);
  },

  async getProject(id: string): Promise<ProjectWithRelations | null> {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) return null;

    const { data: milestones } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", id);

    const { data: accomplishments } = await supabase
      .from("accomplishments")
      .select("*")
      .eq("project_id", id);

    const { data: activities } = await supabase
      .from("next_period_activities")
      .select("*")
      .eq("project_id", id);

    const { data: risks } = await supabase
      .from("risks")
      .select("*")
      .eq("project_id", id);

    const { data: considerations } = await supabase
      .from("considerations")
      .select("*")
      .eq("project_id", id);

    const { data: changes } = await supabase
      .from("changes")
      .select("*")
      .eq("project_id", id);

    return {
      ...project,
      milestones: milestones || [],
      accomplishments: accomplishments || [],
      next_period_activities: activities || [],
      risks: risks || [],
      considerations: considerations || [],
      changes: changes || [],
    };
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
