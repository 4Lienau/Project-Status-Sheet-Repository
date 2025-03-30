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

    console.log(
      "Creating version",
      nextVersionNumber,
      "for project",
      projectId,
    );

    // Insert new version
    console.log("Inserting new version with data:", {
      project_id: projectId,
      version_number: nextVersionNumber,
      data_sample: { ...data, milestones: data.milestones?.length || 0 },
    });

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
      console.error("Error creating new version:", error);
      return null;
    }

    if (error) return null;

    // Delete older versions (keep only last 20)
    const { data: oldVersions } = await supabase
      .from("project_versions")
      .select("id")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .range(20, 999999);

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
    if (!projectId) {
      console.warn("[DEBUG] No project ID provided to getVersions");
      return [];
    }

    console.log("[DEBUG] Fetching versions for project:", projectId);

    try {
      // First check if project exists
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        console.error("[DEBUG] Project not found or error:", projectError);
        return [];
      }

      // Fetch versions
      const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DEBUG] Error fetching versions:", error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log("[DEBUG] No versions found for project:", projectId);
        return [];
      }

      console.log(
        `[DEBUG] Found ${data.length} versions for project ${projectId}`,
      );
      console.log("[DEBUG] Version data sample:", data[0]);

      // Validate version data
      const validVersions = data.filter((version) => {
        if (!version.data || typeof version.data !== "object") {
          console.warn(
            `[DEBUG] Invalid version data for version ${version.version_number}`,
          );
          return false;
        }

        // Additional validation for required fields
        const requiredFields = ["title", "status", "milestones"];
        const missingFields = requiredFields.filter(
          (field) => !(field in version.data),
        );

        if (missingFields.length > 0) {
          console.warn(
            `[DEBUG] Version ${version.version_number} missing required fields:`,
            missingFields,
          );
          return false;
        }

        return true;
      });

      if (validVersions.length !== data.length) {
        console.warn(
          `[DEBUG] Filtered out ${data.length - validVersions.length} invalid versions`,
        );
      }

      return validVersions;
    } catch (error) {
      console.error("[DEBUG] Unexpected error in getVersions:", error);
      return [];
    }
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
