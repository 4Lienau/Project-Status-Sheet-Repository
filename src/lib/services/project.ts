import { supabase } from "../supabase";

export interface Project {
  id: string;
  title: string;
  description?: string;
  value_statement?: string;
  status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
  budget_total: number;
  budget_actuals: number;
  budget_forecast: number;
  charter_link: string;
  sponsors: string;
  business_leads: string;
  project_manager: string;
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  date: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
}

export interface ProjectWithRelations extends Project {
  milestones: Milestone[];
  accomplishments: { description: string }[];
  next_period_activities: { description: string }[];
  risks: { description: string }[];
  considerations: { description: string }[];
}

export const projectService = {
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

    return {
      ...project,
      milestones: milestones || [],
      accomplishments: accomplishments || [],
      next_period_activities: activities || [],
      risks: risks || [],
      considerations: considerations || [],
    };
  },

  async getAllProjects(): Promise<Project[]> {
    const { data } = await supabase.from("projects").select("*");
    return data || [];
  },
};
