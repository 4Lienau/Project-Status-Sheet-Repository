/**
 * File: ProjectDashboard.tsx
 * Purpose: Page component for viewing and editing project details
 * Description: This component serves as the main project dashboard, allowing users to view and edit
 * project details. It provides two main views: a form view for editing project data and a status sheet
 * view for viewing the formatted project status. The component handles loading project data, saving
 * changes, and navigation between views. It also includes unsaved changes protection and project
 * deletion functionality.
 *
 * Imports from:
 * - React core libraries
 * - React Router for navigation and parameters
 * - Project service for data operations
 * - UI components from shadcn/ui
 * - ProjectForm for editing
 * - StatusSheet for viewing
 *
 * Called by:
 * - src/App.tsx (via routing)
 * - src/components/home.tsx
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { projectService } from "@/lib/services/project";
import { projectVersionsService } from "@/lib/services/projectVersions";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import ProjectForm from "@/components/ProjectForm";
import StatusSheet from "@/components/StatusSheet";
import { useToast } from "@/components/ui/use-toast";

interface ProjectDashboardProps {
  project?: any;
  onBack?: () => void;
  initialEditMode?: boolean;
  id?: string;
}

const ProjectDashboard = ({
  project: initialProject,
  onBack,
  initialEditMode = false,
  id: propId,
}: ProjectDashboardProps) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(initialProject || null);
  const [loading, setLoading] = useState(!initialProject);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [versions, setVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1); // -1 means current
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);

  // Add a ref to track if we're in a drag operation to prevent loading screen
  const isDraggingRef = React.useRef(false);

  // Function to set the dragging state that can be passed down to children
  const setIsDragging = (dragging: boolean) => {
    console.log("Setting isDragging to:", dragging);
    isDraggingRef.current = dragging;
  };

  // Load project versions
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadVersions = async () => {
      if (!id) {
        console.warn("[DEBUG] No project ID available for loading versions");
        return;
      }

      try {
        console.log("[DEBUG] Loading versions for project ID:", id);
        console.log(
          "[DEBUG] Current project data:",
          project ? "exists" : "null",
        );
        console.log("[DEBUG] Retry count:", retryCount);

        const versionsData = await projectVersionsService.getVersions(id);

        if (!mounted) {
          console.log("[DEBUG] Component unmounted, skipping state update");
          return;
        }

        if (!versionsData.length && retryCount < maxRetries) {
          console.log("[DEBUG] No versions found, retrying...");
          retryCount++;
          setTimeout(loadVersions, 1000); // Retry after 1 second
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

        if (mounted) {
          setVersions(versionsData);
          setCurrentVersionIndex(-1);
        }
      } catch (error) {
        console.error("[DEBUG] Error loading project versions:", error);
        if (mounted && (!project || retryCount >= maxRetries)) {
          toast({
            title: "Error",
            description: "Failed to load project versions",
            variant: "destructive",
          });
        } else if (mounted && retryCount < maxRetries) {
          console.log("[DEBUG] Retrying version load after error...");
          retryCount++;
          setTimeout(loadVersions, 1000); // Retry after 1 second
        }
      }
    };

    // Load versions whenever project data changes or component mounts
    if (project && project.id) {
      console.log("[DEBUG] Project data changed, reloading versions");
      retryCount = 0; // Reset retry count
      loadVersions();
    }

    return () => {
      mounted = false;
      console.log("[DEBUG] Version loading effect cleanup");
    };
  }, [id, toast, project?.id]); // Only depend on project.id, not the entire project object

  const loadVersion = async (versionIndex) => {
    console.log("Loading version index:", versionIndex);
    console.log("Available versions:", versions.length);
    console.log("Current versions data:", versions);

    if (versionIndex === -1) {
      // Load current version
      setIsLoadingVersion(true);
      try {
        console.log("Loading current version for project ID:", id);
        const projectData = await projectService.getProject(id);
        if (projectData) {
          console.log("Successfully loaded current version:", projectData);
          setProject(projectData);
          setCurrentVersionIndex(-1);
        } else {
          console.error("Failed to load current project data");
          toast({
            title: "Error",
            description: "Failed to load current project data",
            variant: "destructive",
          });
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
        const version = versions[versionIndex];
        console.log("Loading version:", version.version_number);
        console.log("Version data:", version.data);

        if (!version.data) {
          throw new Error("Version data is missing");
        }

        // Ensure version data has all required fields
        const requiredFields = [
          "title",
          "description",
          "status",
          "milestones",
          "risks",
          "accomplishments",
        ];
        const missingFields = requiredFields.filter(
          (field) => !(field in version.data),
        );
        if (missingFields.length > 0) {
          throw new Error(
            `Version data is missing required fields: ${missingFields.join(", ")}`,
          );
        }

        setProject(version.data);
        setCurrentVersionIndex(versionIndex);
      } catch (error) {
        console.error("Error loading project version:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load project version",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVersion(false);
      }
    } else {
      console.error("Invalid version index:", versionIndex);
      toast({
        title: "Error",
        description: "Invalid version selected",
        variant: "destructive",
      });
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

  useEffect(() => {
    // Always fetch fresh data when mounting component
    const fetchProject = async () => {
      if (!id) {
        setLoading(false);
        setError("No project ID provided");
        return;
      }

      // Check if we're in the middle of adding milestones
      const formElement = document.querySelector("form");
      const isAddingMilestones =
        formElement?.getAttribute("data-adding-milestones") === "true";

      if (isAddingMilestones) {
        console.log("Skipping project data fetch while adding milestones");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching project with ID:", id);
        const [projectData, versionsData] = await Promise.all([
          projectService.getProject(id),
          projectVersionsService.getVersions(id),
        ]);
        console.log("Project data received:", projectData ? "success" : "null");
        console.log("Versions data received:", versionsData.length);

        if (projectData) {
          setProject(projectData);
          setVersions(versionsData);
          setCurrentVersionIndex(-1);
        } else {
          setError("Project not found");
        }
      } catch (err) {
        console.error("Error fetching project:", err);
        setError("Failed to load project: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, initialProject]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading) {
          console.log("Loading timeout reached, forcing state update");
          setLoading(false);
          if (!project && !error) {
            setError("Loading timed out. Please try refreshing the page.");
          }
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [loading, project, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading project data...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (onBack) {
      // Use the callback from props if provided
      onBack();
    } else {
      // Otherwise navigate directly
      navigate("/");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <Link to="/">
          <Button onClick={handleBack}>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    return value
      ? value
          .toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })
          .replace("$", "")
      : "0.00";
  };

  // Format project data for the form
  const getFormattedData = () => {
    if (!project) {
      console.log("No project data available for formatting");
      return {
        title: "",
        description: "",
        valueStatement: "",
        projectAnalysis: "",
        status: "active",
        health_calculation_type: "automatic",
        manual_health_percentage: 0,
        manual_status_color: "green",
        budget: { total: "0.00", actuals: "0.00", forecast: "0.00" },
        charterLink: "",
        sponsors: "",
        businessLeads: "",
        projectManager: "",
        department: "",
        milestones: [],
        accomplishments: [],
        nextPeriodActivities: [],
        risks: [],
        considerations: [],
        changes: [],
      };
    }

    return {
      title: project.title || "",
      description: project.description || "",
      valueStatement: project.value_statement || "",
      projectAnalysis: project.project_analysis || "",
      status: project.status || "active",
      health_calculation_type: project.health_calculation_type || "automatic",
      manual_health_percentage: project.manual_health_percentage || 0,
      manual_status_color: project.manual_status_color || "green",
      budget: {
        total: project.budget_total
          ? formatCurrency(project.budget_total)
          : "0.00",
        actuals: project.budget_actuals
          ? formatCurrency(project.budget_actuals)
          : "0.00",
        forecast: project.budget_forecast
          ? formatCurrency(project.budget_forecast)
          : "0.00",
      },
      charterLink: project.charter_link || "",
      sponsors: project.sponsors || "",
      businessLeads: project.business_leads || "",
      projectManager: project.project_manager || "",
      department: project.department || "",
      milestones: project.milestones || [],
      accomplishments: project.accomplishments?.map((a) => a.description) || [],
      nextPeriodActivities:
        project.next_period_activities?.map((a) => ({
          description: a.description || "",
          date: a.date || new Date().toISOString().split("T")[0],
          completion: a.completion || 0,
          assignee: a.assignee || "",
        })) || [],
      risks:
        project.risks?.map((r) => ({
          description: r.description || "",
          impact: r.impact || "",
        })) || [],
      considerations:
        project.considerations?.map((c) =>
          typeof c === "string" ? c : c.description || "",
        ) || [],
      changes:
        project.changes?.map((c) => ({
          change: c.change || "",
          impact: c.impact || "",
          disposition: c.disposition || "",
        })) || [],
    };
  };

  const formattedData = getFormattedData();

  // Function to check for unsaved changes
  const checkUnsavedChanges = (callback: () => void) => {
    if (isEditing) {
      const formElement = document.querySelector("form");
      const formHasChanges =
        formElement?.getAttribute("data-has-changes") === "true";
      const formHasInteraction =
        formElement?.getAttribute("data-user-interaction") === "true";

      if (formHasChanges && formHasInteraction) {
        const confirmLeave = window.confirm(
          "You have unsaved changes. Are you sure you want to leave without saving?",
        );
        if (confirmLeave) {
          callback();
        }
      } else {
        callback();
      }
    } else {
      callback();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (isEditing) {
                // Check for unsaved changes before navigating back
                checkUnsavedChanges(handleBack);
              } else {
                handleBack();
              }
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>

          {/* Version Navigation - Only show in Status Sheet view */}
          {!isEditing && (
            <div className="flex items-center gap-2">
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
          )}
        </div>

        <Button
          onClick={async () => {
            if (isEditing) {
              // Check for unsaved changes before switching to Status Sheet view
              const formElement = document.querySelector("form");
              const formHasChanges =
                formElement?.getAttribute("data-has-changes") === "true";
              const formHasInteraction =
                formElement?.getAttribute("data-user-interaction") === "true";
              const isAddingMilestones =
                formElement?.getAttribute("data-adding-milestones") === "true";

              if (formHasChanges && formHasInteraction) {
                // Show confirmation dialog
                const confirmLeave = window.confirm(
                  "You have unsaved changes. Are you sure you want to leave without saving?",
                );
                if (confirmLeave) {
                  // Fetch fresh data before switching view
                  setLoading(true);
                  try {
                    const projectId = id || (project && project.id);
                    if (projectId) {
                      const freshData =
                        await projectService.getProject(projectId);
                      if (freshData) {
                        setProject(freshData);
                      }
                    }
                  } catch (error) {
                    console.error("Error fetching fresh project data:", error);
                    toast({
                      title: "Error",
                      description: "Failed to load latest project data",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                  setIsEditing(false);
                }
              } else {
                // Don't fetch fresh data if we're in the middle of adding milestones
                if (isAddingMilestones) {
                  console.log("Skipping data reload while adding milestones");
                  setIsEditing(false);
                  return;
                }

                // Fetch fresh data before switching view
                setLoading(true);
                try {
                  const projectId = id || (project && project.id);
                  if (projectId) {
                    const freshData =
                      await projectService.getProject(projectId);
                    if (freshData) {
                      setProject(freshData);
                    }
                  }
                } catch (error) {
                  console.error("Error fetching fresh project data:", error);
                  toast({
                    title: "Error",
                    description: "Failed to load latest project data",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
                setIsEditing(false);
              }
            } else {
              setIsEditing(true);
            }
          }}
          variant="outline"
        >
          {isEditing ? "View Status Sheet" : "Edit Project"}
        </Button>
      </div>

      {isEditing ? (
        <ProjectForm
          initialData={formattedData}
          projectId={project?.id || id || ""}
          onBack={handleBack}
          setIsDragging={setIsDragging}
          onSubmit={async (data) => {
            try {
              setLoading(true);
              console.log("Submitting project update with data:", data);
              const projectId = id || (project && project.id);
              console.log("Project ID for update:", projectId);

              if (!projectId) {
                console.error("No project ID available for update");
                toast({
                  title: "Error",
                  description: "No project ID available for update",
                  variant: "destructive",
                });
                setLoading(false);
                return false;
              }

              // First update the project
              console.log(
                "ProjectDashboard: Updating project with milestones:",
                JSON.stringify(data.milestones),
              );

              // Ensure milestones are properly formatted and not empty
              const formattedMilestones = data.milestones
                .filter((m) => m.milestone.trim() !== "")
                .map((m) => ({
                  date: m.date,
                  milestone: m.milestone,
                  owner: m.owner,
                  completion: m.completion,
                  status: m.status,
                  weight: m.weight || 3,
                  tasks:
                    m.tasks?.map((t) => ({
                      description: t.description,
                      assignee: t.assignee || m.owner,
                      date: t.date || m.date,
                      completion: t.completion || 0,
                    })) || [],
                }));

              console.log(
                "ProjectDashboard: Formatted milestones for update:",
                JSON.stringify(formattedMilestones),
              );

              const updatedProject = await projectService.updateProject(
                projectId,
                {
                  title: data.title,
                  description: data.description || null,
                  valueStatement: data.valueStatement || null,
                  project_analysis:
                    data.projectAnalysis !== undefined
                      ? data.projectAnalysis
                      : null,
                  status: data.status || "active",
                  health_calculation_type:
                    data.health_calculation_type || "automatic",
                  manual_health_percentage:
                    data.health_calculation_type === "manual"
                      ? data.manual_health_percentage
                      : null,
                  manual_status_color: data.manual_status_color || "green",
                  budget_total: parseFloat(
                    data.budget.total.replace(/[^0-9.-]+/g, ""),
                  ),
                  budget_actuals: parseFloat(
                    data.budget.actuals.replace(/[^0-9.-]+/g, ""),
                  ),
                  budget_forecast: parseFloat(
                    data.budget.forecast.replace(/[^0-9.-]+/g, ""),
                  ),
                  charter_link: data.charterLink,
                  sponsors: data.sponsors,
                  business_leads: data.businessLeads,
                  project_manager: data.projectManager,
                  department: data.department,
                  milestones: formattedMilestones,
                  accomplishments: data.accomplishments || [],
                  next_period_activities:
                    data.nextPeriodActivities?.map((a) => ({
                      description: a.description || "",
                      date: a.date || new Date().toISOString().split("T")[0],
                      completion: a.completion || 0,
                      assignee: a.assignee || "",
                    })) || [],
                  risks:
                    data.risks?.map((r) => ({
                      description: r.description || "",
                      impact: r.impact || "",
                    })) || [],
                  considerations:
                    data.considerations?.map((c) => ({ description: c })) || [],
                  changes:
                    data.changes?.map((c) => ({
                      change: c.change || "",
                      impact: c.impact || "",
                      disposition: c.disposition || "",
                    })) || [],
                },
              );

              if (updatedProject) {
                console.log(
                  "ProjectDashboard: Project updated successfully",
                  updatedProject,
                );
                console.log(
                  "ProjectDashboard: Updated milestones:",
                  JSON.stringify(updatedProject.milestones),
                );

                // Set the project state with the updated data
                setProject(updatedProject);

                toast({
                  title: "Success",
                  description: "Project updated successfully",
                });
                return true;
              } else {
                toast({
                  title: "Error",
                  description: "Failed to update project",
                  variant: "destructive",
                });
                return false;
              }
            } catch (error) {
              console.error("Error updating project:", error);
              toast({
                title: "Error",
                description: "Failed to update project: " + error.message,
                variant: "destructive",
              });
              return false;
            } finally {
              setLoading(false);
            }
          }}
        />
      ) : (
        <StatusSheet
          data={{
            title: project.title || "Untitled Project",
            description: project.description || "",
            status: project.status || "active",
            health_calculation_type:
              project.health_calculation_type || "automatic",
            manual_health_percentage: project.manual_health_percentage || 0,
            manual_status_color: project.manual_status_color || "green",
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
            milestones: Array.isArray(project.milestones)
              ? project.milestones
              : [],
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
          }}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;
