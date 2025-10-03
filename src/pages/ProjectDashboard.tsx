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
 * - AlertDialog for warnings
 *
 * Called by:
 * - src/App.tsx (via routing)
 * - src/components/home.tsx
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { projectService } from "@/lib/services/project";
import { projectVersionsService } from "@/lib/services/projectVersions";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProjectForm from "@/components/ProjectForm";
import StatusSheet from "@/components/StatusSheet";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/layout/Layout";
import {
  compareVersions,
  type VersionChanges,
} from "@/lib/utils/versionComparison";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Force re-parse

interface ProjectDashboardProps {
  project?: any;
  onBack?: () => void;
  initialEditMode?: boolean;
  id?: string;
}

const ProjectDashboard: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId;
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Initialize isEditing based on the route path
  // If the path is /project/:id (without /view), it's edit mode
  // If the path is /project/:id/view, it's view mode
  const [isEditing, setIsEditing] = useState(() => {
    return !location.pathname.endsWith('/view');
  });
  
  const [activeTab, setActiveTab] = useState("overview");
  const [versions, setVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1); // -1 means current
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [formattedData, setFormattedData] = useState(null);
  const [versionChanges, setVersionChanges] = useState<VersionChanges>({});
  const [showCompletedWarning, setShowCompletedWarning] = useState(false);

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

  // Update isEditing when the route changes
  useEffect(() => {
    const shouldBeEditing = !location.pathname.endsWith('/view');
    console.log('[DEBUG] Route changed:', location.pathname, 'Should be editing:', shouldBeEditing);
    setIsEditing(shouldBeEditing);
  }, [location.pathname]);

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

        console.log("[DEBUG] Loaded versions:", versionsData.length);

        if (mounted) {
          setVersions(versionsData);
          setCurrentVersionIndex(-1);
        }
      } catch (error) {
        console.warn("[DEBUG] Error loading project versions (non-critical):", error);
        // Don't show error toast for version loading failures - it's not critical
        if (mounted) {
          setVersions([]);
          setCurrentVersionIndex(-1);
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
  }, [id, project?.id]); // Only depend on project.id, not the entire project object

  // Check if project is completed when entering edit mode
  useEffect(() => {
    if (isEditing && project?.status === 'completed' && !showCompletedWarning) {
      setShowCompletedWarning(true);
    }
  }, [isEditing, project?.status]);

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

          // Compare current with most recent version to identify changes
          if (versions.length > 0) {
            const mostRecentVersion = versions[0];
            if (mostRecentVersion && mostRecentVersion.data) {
              const changes = compareVersions(
                projectData,
                mostRecentVersion.data,
              );
              setVersionChanges(changes);
              console.log("Current vs most recent version changes:", changes);
            } else {
              setVersionChanges({});
            }
          } else {
            setVersionChanges({});
          }
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

        // Compare with previous version to identify changes
        const previousVersionIndex = versionIndex + 1;
        if (previousVersionIndex < versions.length) {
          const previousVersion = versions[previousVersionIndex];
          if (previousVersion && previousVersion.data) {
            const changes = compareVersions(version.data, previousVersion.data);
            setVersionChanges(changes);
            console.log("Version changes detected:", changes);
          } else {
            setVersionChanges({});
          }
        } else {
          // This is the oldest version, no previous version to compare
          setVersionChanges({});
        }
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
  }, [id, isEditing, milestonesAddedTimestamp]);

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
        projectId: "", // Add projectId field for empty state
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
        budget: { total: "", actuals: "", forecast: "" },
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

    // Debug Project ID mapping
    console.log("[PROJECT_ID] getFormattedData mapping:", {
      dbProjectId: project.project_id,
      dbType: typeof project.project_id,
      willMapTo: (project.project_id ?? "").toString(),
    });

    return {
      projectId: (project.project_id ?? "").toString(), // Add the missing projectId field
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
        total: project.budget_total ? formatCurrency(project.budget_total) : "",
        actuals: project.budget_actuals
          ? formatCurrency(project.budget_actuals)
          : "",
        forecast: project.budget_forecast
          ? formatCurrency(project.budget_forecast)
          : "",
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
    // Always navigate directly since we don't accept props
    navigate("/");
  };

  // Get breadcrumb items based on current state
  const getBreadcrumbItems = () => {
    const items = [];

    if (project?.title) {
      items.push({
        label:
          project.title.replace(/<[^>]*>/g, "").substring(0, 50) +
          (project.title.length > 50 ? "..." : ""),
        href: `/project/${project.id}`,
        current: !isEditing,
      });

      if (isEditing) {
        items.push({
          label: "Edit",
          current: true,
        });
      }
    }

    return items;
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
    <Layout>
      <div className="container mx-auto p-6 bg-background">
        {/* Completed Project Warning Dialog */}
        <AlertDialog open={showCompletedWarning} onOpenChange={setShowCompletedWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-yellow-600">⚠️ Project Completed</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This project has been marked as <strong>Completed</strong> and should not be modified. 
                Any changes made to a completed project may affect historical records and reporting.
                <br /><br />
                Are you sure you want to proceed with editing?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => navigate(`/project/${id}/view`)}>
                Return to View Mode
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowCompletedWarning(false)}>
                Continue Editing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>

        <div className="flex justify-between items-center mb-6">
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
              className="flex items-center gap-2 text-foreground hover:text-foreground hover:bg-muted font-medium"
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
                  className="flex items-center gap-1 text-foreground hover:text-foreground border-border hover:bg-muted bg-card"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-foreground font-medium">
                    Older ({versions.length} saved changes)
                  </span>
                </Button>

                <div className="text-sm px-3 py-2 text-foreground font-medium bg-card rounded border border-border">
                  {isLoadingVersion ? (
                    <span className="text-foreground">Loading...</span>
                  ) : currentVersionIndex === -1 ? (
                    <div className="text-center">
                      <div className="text-foreground font-bold">
                        Current Version
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Latest changes
                      </div>
                      {versions.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ({versions.length} saved changes available)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-foreground font-bold">
                        Change {versions.length - currentVersionIndex} of{" "}
                        {versions.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (Save #
                        {versions[currentVersionIndex]?.version_number || "N/A"}
                        {versions.length > 0 &&
                          ` of ${Math.max(...versions.map((v) => v.version_number))} total saves`}
                        )
                      </div>
                      {versions[currentVersionIndex]?.created_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Saved:{" "}
                          {new Date(
                            versions[currentVersionIndex].created_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextVersion}
                  disabled={currentVersionIndex === -1 || isLoadingVersion}
                  className="flex items-center gap-1 text-foreground hover:text-foreground border-border hover:bg-muted bg-card"
                >
                  <span className="text-foreground font-medium">Newer</span>
                  <ChevronRight className="h-4 w-4" />
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

                if (formHasChanges && formHasInteraction) {
                  // Show confirmation dialog
                  const confirmLeave = window.confirm(
                    "You have unsaved changes. Are you sure you want to leave without saving?",
                  );
                  if (confirmLeave) {
                    // Navigate to view mode
                    navigate(`/project/${id}/view`);
                  }
                } else {
                  // Navigate to view mode
                  navigate(`/project/${id}/view`);
                }
              } else {
                // Navigate to edit mode
                navigate(`/project/${id}`);
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
                    projectId: data.projectId, // Add the missing projectId field
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
                    budget_total:
                      data.budget.total.trim() === ""
                        ? 0
                        : parseFloat(
                            data.budget.total.replace(/[^0-9.-]+/g, ""),
                          ),
                    budget_actuals:
                      data.budget.actuals.trim() === ""
                        ? 0
                        : parseFloat(
                            data.budget.actuals.replace(/[^0-9.-]+/g, ""),
                          ),
                    budget_forecast:
                      data.budget.forecast.trim() === ""
                        ? 0
                        : parseFloat(
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
                      data.considerations?.map((c) => ({ description: c })) ||
                      [],
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
              computed_status_color: project.computed_status_color,
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
              nextPeriodActivities: Array.isArray(
                project.next_period_activities,
              )
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
            versionChanges={versionChanges}
            showChangeIndicators={
              currentVersionIndex !== -1 &&
              Object.keys(versionChanges).length > 0
            }
          />
        )}
      </div>
    </Layout>
  );
};

export default ProjectDashboard;