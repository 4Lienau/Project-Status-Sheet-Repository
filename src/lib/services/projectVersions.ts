import { supabase } from "../supabase";
import type { Project, ProjectWithRelations } from "./project";

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  data: ProjectWithRelations;
  created_at: string;
  created_by: string;
}

// Service for managing project versions
export const projectVersionsService = {
  async createVersion(
    projectId: string,
    data: ProjectWithRelations,
  ): Promise<ProjectVersion | null> {
    if (!projectId) {
      console.error("No project ID provided to createVersion");
      return null;
    }

    // Get the latest version number
    const { data: versions, error: versionsError } = await supabase
      .from("project_versions")
      .select("version_number")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1);

    if (versionsError) {
      console.error("Error getting latest version number:", versionsError);
      return null;
    }

    const nextVersionNumber =
      versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Insert new version
    const { data: newVersion, error } = await supabase
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: nextVersionNumber,
        data: data,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create project version:", error);
      return null;
    }

    return newVersion;
  },

  async getVersions(projectId: string): Promise<ProjectVersion[]> {
    if (!projectId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (error) {
        console.warn("Error fetching versions (non-critical):", error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn("Failed to fetch versions (non-critical):", error);
      return [];
    }
  },

  async getVersion(versionId: string): Promise<ProjectVersion | null> {
    try {
      const { data } = await supabase
        .from("project_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      return data;
    } catch (error) {
      console.warn("Failed to fetch version:", error);
      return null;
    }
  },
};