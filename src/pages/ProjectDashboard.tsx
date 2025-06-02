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
  const [formattedData, setFormattedData] = useState(null);

  // Add state to track when milestones were recently added
  const [milestonesAddedTimestamp, setMilestonesAddedTimestamp] = useState<
    number | null
  >(null);

  // Add a ref to track if we're in a drag operation to prevent loading screen
  const isDraggingRef = React.useRef(false);

  // Function to set the dragging state that can be passed down to children
  const setIsDragging = (dragging: boolean) => {
    console.log("Setting isDragging to:", dragging);
    isDraggingRef.current = dragging;
  };

  // Check form attributes for milestone additions
  useEffect(() => {
    const checkMilestoneAdditions = () => {
      const formElement = document.querySelector("form");
      const timestampStr = formElement?.getAttribute(
        "data-milestones-added-at",
      );

      if (timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (!isNaN(timestamp)) {
          setMilestonesAddedTimestamp(timestamp);
          console.log(
            "Detected milestones were added at:",
            new Date(timestamp).toISOString(),
          );
        }
      }
    };

    // Check on mount and periodically
    checkMilestoneAdditions();
    const interval = setInterval(checkMilestoneAdditions, 500);

    return () => clearInterval(interval);
  }, []);

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

      // Check if milestones were recently added (within the last 30 seconds)
      if (milestonesAddedTimestamp) {
        const timeSinceAddition = Date.now() - milestonesAddedTimestamp;
        if (timeSinceAddition < 30000) {
          // 30 seconds
          console.log(
            `Skipping project data fetch - milestones were added ${timeSinceAddition}ms ago`,
          );
          setLoading(false);
          return;
        }
      }

      // Also check if we're in the middle of auto-saving
      const isAutoSaving =
        formElement?.getAttribute("data-auto-saving") === "true";
      if (isAutoSaving) {
        console.log("Skipping project data fetch while auto-saving");
        setLoading(false);
        return;
      }

      // Check if there are unsaved changes - don't refresh if there are
      const hasUnsavedChanges =
        formElement?.getAttribute("data-has-changes") === "true" &&
        formElement?.getAttribute("data-user-interaction") === "true" &&
        formElement?.getAttribute("data-just-saved") !== "true";

      if (hasUnsavedChanges && isEditing) {
        console.log("Skipping project data fetch due to unsaved changes");
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
          // Check if project has milestones but no duration data - trigger calculation
          if (
            projectData.milestones &&
            projectData.milestones.length > 0 &&
            (!projectData.total_days || !projectData.working_days)
          ) {
            console.log(
              "[DEBUG] Project has milestones but no duration data, triggering calculation",
            );
            try {
              const { projectDurationService } = await import(
                "@/lib/services/projectDurationService"
              );
              const success =
                await projectDurationService.updateProjectDuration(
                  projectData.id,
                );
              if (success) {
                console.log(
                  "[DEBUG] Successfully calculated duration, refetching project data",
                );
                // Refetch the project data to get the updated duration
                const updatedProjectData = await projectService.getProject(id);
                if (updatedProjectData) {
                  Object.assign(projectData, updatedProjectData);
                }
              }
            } catch (error) {
              console.error(
                "[DEBUG] Error calculating project duration:",
                error,
              );
            }
          }

          // Final checks before updating state
          const finalFormElement = document.querySelector("form");

          // Check if milestones are still being added
          const isStillAddingMilestones =
            finalFormElement?.getAttribute("data-adding-milestones") === "true";

          if (isStillAddingMilestones) {
            console.log(
              "Canceling project data update - milestones are being added",
            );
            setLoading(false);
            return;
          }

          // Check for recent milestone additions
          const timestampStr = finalFormElement?.getAttribute(
            "data-milestones-added-at",
          );
          if (timestampStr) {
            const timestamp = parseInt(timestampStr, 10);
            if (!isNaN(timestamp)) {
              const timeSinceAddition = Date.now() - timestamp;
              if (timeSinceAddition < 30000) {
                // 30 seconds
                console.log(
                  `Canceling project data update - milestones were added ${timeSinceAddition}ms ago`,
                );
                setLoading(false);
                return;
              }
            }
          }

          // Check again for unsaved changes
          const stillHasUnsavedChanges =
            finalFormElement?.getAttribute("data-has-changes") === "true" &&
            finalFormElement?.getAttribute("data-user-interaction") ===
              "true" &&
            finalFormElement?.getAttribute("data-just-saved") !== "true";

          if (stillHasUnsavedChanges && isEditing) {
            console.log("Canceling project data update due to unsaved changes");
            setLoading(false);
            return;
          }

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
  }, [id, initialProject, isEditing, milestonesAddedTimestamp]);

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

  // Format project data for the form
  const getFormattedData = async () => {
    if (!project) {
      console.log("No project data available for formatting");
      return {
        title: "",
        description: "",
        valueStatement: "",
        projectAnalysis: "",
        summaryCreatedAt: null,
        summaryIsStale: false,
        status: "active",
        health_calculation_type: "automatic",
        manual_health_percentage: 0,
        manual_status_color: "green",
        // Initialize duration fields as null when no project data
        total_days: null,
        working_days: null,
        calculated_start_date: null,
        calculated_end_date: null,
        total_days_remaining: null,
        working_days_remaining: null,
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

    // Get the latest summary with metadata if available
    let summaryData = {
      content: project.project_analysis || "",
      created_at: null,
      is_stale: false,
    };

    if (project.id) {
      try {
        const latestSummary = await projectService.getLatestProjectSummary(
          project.id,
        );
        if (latestSummary) {
          console.log(
            "Retrieved latest summary for formatting:",
            latestSummary,
          );
          summaryData = latestSummary;
        }
      } catch (error) {
        console.error("Error fetching latest summary:", error);
        // Continue with the existing project_analysis field
      }
    }

    console.log("Summary data being passed to form:", summaryData);
    console.log("Summary content length:", summaryData.content?.length || 0);
    console.log("Summary timestamp:", summaryData.created_at);

    // Debug duration fields
    console.log("[DEBUG] Project duration fields:", {
      total_days: project.total_days,
      working_days: project.working_days,
      calculated_start_date: project.calculated_start_date,
      calculated_end_date: project.calculated_end_date,
      total_days_remaining: project.total_days_remaining,
      working_days_remaining: project.working_days_remaining,
      milestones_count: project.milestones?.length || 0,
    });

    return {
      title: project.title || "",
      description: project.description || "",
      valueStatement: project.value_statement || "",
      projectAnalysis: summaryData.content || project.project_analysis || "",
      summaryCreatedAt: summaryData.created_at || null,
      summaryIsStale: summaryData.is_stale || false,
      status: project.status || "active",
      health_calculation_type: project.health_calculation_type || "automatic",
      manual_health_percentage: project.manual_health_percentage || 0,
      manual_status_color: project.manual_status_color || "green",
      // Include duration fields from the database
      total_days: project.total_days || null,
      working_days: project.working_days || null,
      calculated_start_date: project.calculated_start_date || null,
      calculated_end_date: project.calculated_end_date || null,
      total_days_remaining: project.total_days_remaining || null,
      working_days_remaining: project.working_days_remaining || null,
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
      isAnalysisExpanded: false, // Always default to collapsed analysis section
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

  // Load formatted data asynchronously
  useEffect(() => {
    const loadFormattedData = async () => {
      const data = await getFormattedData();
      setFormattedData(data);
    };

    loadFormattedData();
  }, [project]);

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

  const handleBack = () => {
    if (onBack) {
      // Use the callback from props if provided
      onBack();
    } else {
      // Otherwise navigate directly
      navigate("/");
    }
  };

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

  if (!formattedData && !loading) {
    // Show loading state while formatted data is being prepared
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Preparing project data...</p>
        </div>
      </div>
    );
  }

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
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/20 font-medium"
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
                  // truncateActivities removed - now using localStorage
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
            projectAnalysis: formattedData?.projectAnalysis || "",
            summaryCreatedAt: formattedData?.summaryCreatedAt,
            summaryIsStale: formattedData?.summaryIsStale,
          }}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;
