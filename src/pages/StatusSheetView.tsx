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

/**
 * StatusSheetView component
 * Displays a project status sheet with version navigation
 */
const StatusSheetView = () => {
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
        const versionsData = await projectVersionsService.getVersions(id);

        if (!mounted) {
          console.log("[DEBUG] Component unmounted, skipping state update");
          return;
        }

        console.log("[DEBUG] Loaded versions:", versionsData.length);
        console.log(
          "[DEBUG] Version data:",
          versionsData.map((v) => ({
            id: v.id,
            number: v.version_number,
            created: v.created_at,
          })),
        );

        setVersions(versionsData);
        setCurrentVersionIndex(-1);
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
    console.log("Loading version index:", versionIndex);
    console.log("Available versions:", versions.length);

    if (versionIndex === -1) {
      // Load current version
      setIsLoadingVersion(true);
      try {
        console.log("Loading current version for project ID:", id);
        const projectData = await projectService.getProject(id);
        if (projectData) {
          console.log("Successfully loaded current version");
          setProject(projectData);
          setCurrentVersionIndex(-1);
        } else {
          console.error("Failed to load current project data");
        }
      } catch (error) {
        console.error("Error loading current project version:", error);
        toast({
          title: "Error",
          description: "Failed to load current project version",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVersion(false);
      }
    } else if (versions[versionIndex]) {
      // Load specific version
      setIsLoadingVersion(true);
      try {
        console.log("Loading version:", versions[versionIndex].version_number);
        setProject(versions[versionIndex].data);
        setCurrentVersionIndex(versionIndex);
      } catch (error) {
        console.error("Error loading project version:", error);
        toast({
          title: "Error",
          description: "Failed to load project version",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVersion(false);
      }
    } else {
      console.error("Invalid version index:", versionIndex);
    }
  };

  const handlePreviousVersion = () => {
    console.log("Handling previous version");
    console.log("Current version index:", currentVersionIndex);
    console.log("Versions length:", versions.length);

    if (currentVersionIndex === -1 && versions.length > 0) {
      // Go from current to most recent version
      console.log("Going from current to most recent version");
      loadVersion(0);
    } else if (currentVersionIndex < versions.length - 1) {
      // Go to older version
      console.log("Going to older version");
      loadVersion(currentVersionIndex + 1);
    } else {
      console.log("No older version available");
    }
  };

  const handleNextVersion = () => {
    console.log("Handling next version");
    console.log("Current version index:", currentVersionIndex);

    if (currentVersionIndex > 0) {
      // Go to newer version
      console.log("Going to newer version");
      loadVersion(currentVersionIndex - 1);
    } else if (currentVersionIndex === 0) {
      // Go from most recent version to current
      console.log("Going from most recent version to current");
      loadVersion(-1);
    } else {
      console.log("Already at newest version");
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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1850px] mx-auto p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-2">
              {/* Version Navigation - Always visible */}
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
                  <ChevronLeft className="h-4 w-4" /> Older ({versions.length}{" "}
                  versions)
                </Button>

                <div className="text-sm px-2">
                  {isLoadingVersion
                    ? "Loading..."
                    : currentVersionIndex === -1
                      ? "Current"
                      : `Version ${versions[currentVersionIndex]?.version_number || ""} of ${versions.length}`}
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
        <div className="bg-white shadow-none">
          <StatusSheet data={formattedData} />
        </div>
      </div>
    </div>
  );
};

export default StatusSheetView;
