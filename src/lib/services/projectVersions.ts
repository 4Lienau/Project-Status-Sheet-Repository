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

export const projectVersionsService = {
  async createVersion(
    projectId: string,
    data: ProjectWithRelations,
  ): Promise<ProjectVersion | null> {
    // Get the latest version number
    const { data: versions } = await supabase
      .from("project_versions")
      .select("version_number")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersionNumber =
      versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Insert new version
    const { data: newVersion, error } = await supabase
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: nextVersionNumber,
        data: data,
      })
      .select()
      .single();

    if (error) return null;

    // Delete older versions (keep only last 5)
    const { data: oldVersions } = await supabase
      .from("project_versions")
      .select("id")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .range(8, 999999);

    if (oldVersions && oldVersions.length > 0) {
      await supabase
        .from("project_versions")
        .delete()
        .in(
          "id",
          oldVersions.map((v) => v.id),
        );
    }

    return newVersion;
  },

  async getVersions(projectId: string): Promise<ProjectVersion[]> {
    const { data } = await supabase
      .from("project_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(8);

    return data || [];
  },

  async getVersion(versionId: string): Promise<ProjectVersion | null> {
    const { data } = await supabase
      .from("project_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    return data;
  },
};
