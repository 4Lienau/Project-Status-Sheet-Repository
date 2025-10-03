/**
 * File: StatusSheetView.tsx
 * Purpose: Page component for viewing a project status sheet in full page mode
 * Description: This component renders a standalone view of a project's status sheet. It loads
 * project data based on the URL parameter, formats it for the StatusSheet component, and provides
 * navigation back to the previous page. The component also includes functionality to export the
 * status sheet to JPG format.
 *
 * Imports from:
 * - React core libraries
 * - React Router for navigation and parameters
 * - UI components from shadcn/ui
 * - StatusSheet component
 * - Project service
 * - Lucide icons
 *
 * Called by: src/App.tsx (via routing)
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ChevronLeft, ChevronRight } from "lucide-react";
import StatusSheet from "@/components/StatusSheet";
import { projectService } from "@/lib/services/project";
import { projectVersionsService } from "@/lib/services/projectVersions";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Breadcrumb } from "@/components/ui/breadcrumb";

/**
 * StatusSheetView component
 * Displays a project status sheet with version navigation
 */
const StatusSheetView: React.FC = () => {
  const { toast } = useToast();
  const [versions, setVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1); // -1 means current (non-versioned)
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);

  const handleExportToJpg = async () => {
    const element = document.getElementById("status-sheet");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project?.title || "status-sheet"}_${new Date().toISOString().split("T")[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to JPG:", error);
    }
  };

  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = React.useState(null);

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        console.log("Loading project with ID:", id);
        try {
          const [projectData, versionsData] = await Promise.all([
            projectService.getProject(id),
            projectVersionsService.getVersions(id),
          ]);
          console.log(
            "Project data received:",
            projectData ? "success" : "null",
          );
          console.log("Versions data received:", versionsData.length);

          if (projectData) {
            console.log("Project loaded successfully");
            setProject(projectData);
            setVersions(versionsData);
            setCurrentVersionIndex(-1);
          } else {
            console.error("Failed to load project data");
            toast({
              title: "Error",
              description: "Failed to load project data",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error loading project:", error);
          toast({
            title: "Error",
            description: "An error occurred while loading the project",
            variant: "destructive",
          });
        }
      } else {
        console.warn("No project ID provided");
      }
    };

    loadProject();
  }, [id, toast]);

  // Load project versions
  useEffect(() => {
    let mounted = true;

    const loadVersions = async () => {
      if (!id || !project) {
        console.warn(
          "[DEBUG] No project ID or project data available for loading versions",
        );
        return;
      }

      try {
        console.log("[DEBUG] Loading versions for project ID:", id);

        // DEBUGGING: Let's also run a direct query to see if there's a service layer issue
        const { data: directQueryData, error: directQueryError } =
          await supabase
            .from("project_versions")
            .select("*")
            .eq("project_id", id)
            .order("version_number", { ascending: false });

        console.log(
          `[DEBUG] DIRECT QUERY: Found ${directQueryData?.length || 0} versions`,
        );
        console.log(
          `[DEBUG] DIRECT QUERY DATA:`,
          directQueryData?.map((v) => ({
            id: v.id,
            version_number: v.version_number,
          })),
        );
        if (directQueryError) {
          console.error(`[DEBUG] DIRECT QUERY ERROR:`, directQueryError);
        }

        const versionsData = await projectVersionsService.getVersions(id);

        if (!mounted) {
          console.log("[DEBUG] Component unmounted, skipping state update");
          return;
        }

        console.log(
          `[DEBUG] Successfully loaded ${versionsData.length} versions from database`,
        );

        // Analyze version data for missing versions
        if (versionsData.length > 0) {
          const versionNumbers = versionsData
            .map((v) => v.version_number)
            .sort((a, b) => a - b);
          const minVersion = Math.min(...versionNumbers);
          const maxVersion = Math.max(...versionNumbers);
          const missingFromStart = minVersion - 1;

          console.log(
            `[DEBUG] STATUS SHEET VIEW - Available versions: ${versionNumbers.join(", ")}`,
          );
          console.log(
            `[DEBUG] STATUS SHEET VIEW - Range: ${minVersion} to ${maxVersion}`,
          );

          if (missingFromStart > 0) {
            console.warn(
              `[DEBUG] ⚠️  ${missingFromStart} versions (1-${minVersion - 1}) are missing from database`,
            );
            console.warn(
              `[DEBUG] This may be due to data retention policies or database migration`,
            );
          }
        }

        // CRITICAL: Set ALL versions without any filtering or limiting
        setVersions(versionsData);
        setCurrentVersionIndex(-1);

        console.log(
          `[DEBUG] STATE UPDATE: Set ${versionsData.length} versions in component state`,
        );
        console.log(
          `[DEBUG] UI DISPLAY CHECK: Will show "Version X of ${versionNumbers.length > 0 ? Math.max(...versionNumbers) : 0}" in UI`,
        );
      } catch (error) {
        console.error("[DEBUG] Error loading project versions:", error);
        if (mounted) {
          toast({
            title: "Error",
            description: "Failed to load project versions",
            variant: "destructive",
          });
        }
      }
    };

    loadVersions();

    return () => {
      mounted = false;
    };
  }, [id, project, toast]);

  const loadVersion = async (versionIndex) => {
    console.log("[VERSION_LOAD] Loading version index:", versionIndex);
    console.log("[VERSION_LOAD] Available versions:", versions.length);
    console.log(
      "[VERSION_LOAD] All version numbers:",
      versions.map((v) => v.version_number),
    );

    if (versionIndex === -1) {
      // Load current version
      setIsLoadingVersion(true);
      try {
        console.log(
          "[VERSION_LOAD] Loading current version for project ID:",
          id,
        );
        const projectData = await projectService.getProject(id);
        if (projectData) {
          console.log("[VERSION_LOAD] Successfully loaded current version");
          setProject(projectData);
          setCurrentVersionIndex(-1);
        } else {
          console.error("[VERSION_LOAD] Failed to load current project data");
        }
      } catch (error) {
        console.error(
          "[VERSION_LOAD] Error loading current project version:",
          error,
        );
        toast({
          title: "Error",
          description: "Failed to load current project version",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVersion(false);
      }
    } else if (
      versionIndex >= 0 &&
      versionIndex < versions.length &&
      versions[versionIndex]
    ) {
      // Load specific version - ensure we can access ANY version in the array
      setIsLoadingVersion(true);
      try {
        const targetVersion = versions[versionIndex];
        console.log(
          `[VERSION_LOAD] Loading version ${targetVersion.version_number} at index ${versionIndex}`,
        );
        console.log(
          `[VERSION_LOAD] Version created at:`,
          targetVersion.created_at,
        );
        setProject(targetVersion.data);
        setCurrentVersionIndex(versionIndex);
        console.log(
          `[VERSION_LOAD] Successfully loaded version ${targetVersion.version_number}`,
        );
      } catch (error) {
        console.error("[VERSION_LOAD] Error loading project version:", error);
        toast({
          title: "Error",
          description: "Failed to load project version",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVersion(false);
      }
    } else {
      console.error(
        `[VERSION_LOAD] Invalid version index: ${versionIndex}. Valid range: 0 to ${versions.length - 1}`,
      );
      toast({
        title: "Error",
        description: "Invalid version selected",
        variant: "destructive",
      });
    }
  };

  const handlePreviousVersion = () => {
    console.log("[VERSION_NAV] Handling previous version");
    console.log("[VERSION_NAV] Current version index:", currentVersionIndex);
    console.log("[VERSION_NAV] Total versions available:", versions.length);
    console.log(
      "[VERSION_NAV] Version numbers:",
      versions.map((v) => v.version_number),
    );

    if (currentVersionIndex === -1 && versions.length > 0) {
      // Go from current to most recent version (index 0)
      console.log(
        "[VERSION_NAV] Going from current to most recent version (index 0)",
      );
      loadVersion(0);
    } else if (currentVersionIndex < versions.length - 1) {
      // Go to older version (higher index = older version)
      const nextIndex = currentVersionIndex + 1;
      console.log(`[VERSION_NAV] Going to older version (index ${nextIndex})`);
      loadVersion(nextIndex);
    } else {
      console.log(
        "[VERSION_NAV] Already at oldest version, no older version available",
      );
    }
  };

  const handleNextVersion = () => {
    console.log("[VERSION_NAV] Handling next version");
    console.log("[VERSION_NAV] Current version index:", currentVersionIndex);
    console.log("[VERSION_NAV] Total versions available:", versions.length);

    if (currentVersionIndex > 0) {
      // Go to newer version (lower index = newer version)
      const nextIndex = currentVersionIndex - 1;
      console.log(`[VERSION_NAV] Going to newer version (index ${nextIndex})`);
      loadVersion(nextIndex);
    } else if (currentVersionIndex === 0) {
      // Go from most recent version to current
      console.log("[VERSION_NAV] Going from most recent version to current");
      loadVersion(-1);
    } else {
      console.log("[VERSION_NAV] Already at newest version (current)");
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Format project data for the StatusSheet component
  // Format project data for the StatusSheet component
  const formattedData = {
    title: project.title || "Untitled Project",
    description: project.description || "",
    status: project.status || "active",
    health_calculation_type: project.health_calculation_type || "automatic",
    manual_health_percentage: project.manual_health_percentage || 0,
    computed_status_color: project.computed_status_color,
    manual_status_color: project.manual_status_color,
    budget: {
      total:
        typeof project.budget_total === "number"
          ? project.budget_total.toLocaleString()
          : "0",
      actuals:
        typeof project.budget_actuals === "number"
          ? project.budget_actuals.toLocaleString()
          : "0",
      forecast:
        typeof project.budget_forecast === "number"
          ? project.budget_forecast.toLocaleString()
          : "0",
    },
    charterLink: project.charter_link || "",
    sponsors: project.sponsors || "",
    businessLeads: project.business_leads || "",
    projectManager: project.project_manager || "",
    milestones: Array.isArray(project.milestones) ? project.milestones : [],
    accomplishments: Array.isArray(project.accomplishments)
      ? project.accomplishments.map((a) =>
          typeof a === "string" ? a : a.description,
        )
      : [],
    nextPeriodActivities: Array.isArray(project.next_period_activities)
      ? project.next_period_activities
      : [],
    risks: Array.isArray(project.risks) ? project.risks : [],
    considerations: Array.isArray(project.considerations)
      ? project.considerations.map((c) =>
          typeof c === "string" ? c : c.description,
        )
      : [],
    changes: Array.isArray(project.changes) ? project.changes : [],
  };

  console.log("Formatted data for StatusSheet:", {
    title: formattedData.title,
    status: formattedData.status,
    milestones: formattedData.milestones?.length || 0,
    risks: formattedData.risks?.length || 0,
  });

  return (
    <Layout>
      <div className="container mx-auto p-6 bg-background">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: "Projects", href: "/" },
              { label: project.title || "Status Sheet", current: true },
            ]}
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Projects
              </Button>
              
              <Button
                variant="default"
                onClick={() => navigate(`/project/${id}`)}
                className="flex items-center gap-2"
              >
                Edit Project
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Version Navigation */}
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousVersion}
                  disabled={
                    (currentVersionIndex === -1 && versions.length === 0) ||
                    currentVersionIndex >= versions.length - 1 ||
                    isLoadingVersion
                  }
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Older ({versions.length} saved changes)</span>
                </Button>

                <div className="text-sm px-3 py-2 bg-gray-100 rounded border min-w-[160px] text-center">
                  {(() => {
                    if (isLoadingVersion) {
                      return "Loading...";
                    }

                    if (currentVersionIndex === -1) {
                      return (
                        <div>
                          <div className="font-bold">Current Version</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Latest changes
                          </div>
                          {versions.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              ({versions.length} saved changes available)
                            </div>
                          )}
                        </div>
                      );
                    }

                    const currentVersion = versions[currentVersionIndex];
                    if (!currentVersion) {
                      return "Invalid Version";
                    }

                    const positionInAvailable =
                      versions.length - currentVersionIndex;
                    const totalAvailable = versions.length;
                    const actualVersionNumber = currentVersion.version_number;

                    const highestVersionNumber =
                      versions.length > 0
                        ? Math.max(...versions.map((v) => v.version_number))
                        : actualVersionNumber;

                    return (
                      <div>
                        <div className="font-bold">
                          Change {positionInAvailable} of {totalAvailable}
                        </div>
                        <div className="text-xs text-gray-600">
                          (Save #{actualVersionNumber} of {highestVersionNumber}{" "}
                          total saves)
                        </div>
                        {currentVersion.created_at && (
                          <div className="text-xs text-gray-600 mt-1">
                            Saved:{" "}
                            {new Date(
                              currentVersion.created_at,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextVersion}
                  disabled={currentVersionIndex === -1 || isLoadingVersion}
                  className="flex items-center gap-1"
                >
                  Newer <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleExportToJpg}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" /> Export to JPG
              </Button>
            </div>
          </div>
        </div>
        
        {/* StatusSheet component - forced to light mode */}
        <div className="bg-white shadow-none">
          <StatusSheet data={formattedData} />
        </div>
      </div>
    </Layout>
  );
};

export default StatusSheetView;