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
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import ProjectForm from "@/components/ProjectForm";
import StatusSheet from "@/components/StatusSheet";
import { useToast } from "@/components/ui/use-toast";

interface ProjectDashboardProps {
  project?: any;
  onBack?: () => void;
  initialEditMode?: boolean;
}

const ProjectDashboard = ({
  project: initialProject,
  onBack,
  initialEditMode = false,
}: ProjectDashboardProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(initialProject || null);
  const [loading, setLoading] = useState(!initialProject);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(initialEditMode);

  // Add a ref to track if we're in a drag operation to prevent loading screen
  const isDraggingRef = React.useRef(false);

  // Function to set the dragging state that can be passed down to children
  const setIsDragging = (dragging: boolean) => {
    console.log("Setting isDragging to:", dragging);
    isDraggingRef.current = dragging;
  };

  useEffect(() => {
    // Skip fetching if project was provided as a prop
    if (initialProject) {
      console.log("Using project from props, skipping fetch");
      setProject(initialProject);
      setLoading(false);
      return;
    }

    // Skip fetching if we're in edit mode and already have project data
    // This prevents refetching when milestones are reordered
    if (isEditing && project) {
      console.log("Already in edit mode with project data, skipping fetch");
      return;
    }

    // Skip fetching if we're currently in a drag operation
    if (isDraggingRef.current) {
      console.log("Currently in drag operation, skipping fetch");
      return;
    }

    const fetchProject = async () => {
      if (!id) {
        setLoading(false);
        setError("No project ID provided");
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching project with ID:", id);
        const projectData = await projectService.getProject(id);
        console.log("Project data received:", projectData ? "success" : "null");
        if (projectData) {
          setProject(projectData);
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
  }, [id, initialProject, isEditing]);

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

  const handleBack = () => {
    if (onBack) {
      // Use the callback from props if provided
      onBack();
    } else {
      // Otherwise navigate directly
      navigate("/");
    }
  };

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
      considerations: project.considerations?.map((c) => c.description) || [],
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
        {/* Use navigateSafely from ProjectForm when in edit mode */}
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

              const updatedProject = await projectService.updateProject(
                projectId,
                {
                  title: data.title,
                  description: data.description || null,
                  valueStatement: data.valueStatement || null,
                  project_analysis: data.projectAnalysis || null,
                  status: data.status || "active",
                  health_calculation_type:
                    data.health_calculation_type || "automatic",
                  manual_health_percentage:
                    data.health_calculation_type === "manual"
                      ? data.manual_health_percentage
                      : null,
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
                  milestones: data.milestones
                    .filter((m) => m.milestone.trim() !== "")
                    .map((m) => ({
                      date: m.date,
                      milestone: m.milestone,
                      owner: m.owner,
                      completion: m.completion,
                      status: m.status,
                      weight: m.weight || 3, // Include weight with default of 3
                      tasks: m.tasks,
                    })),
                  accomplishments: data.accomplishments.filter(
                    (a) => a.trim() !== "",
                  ),
                  next_period_activities: data.nextPeriodActivities
                    .filter((a) => a.description.trim() !== "")
                    .map((a) => ({
                      description: a.description,
                      date: a.date,
                      completion: a.completion,
                      assignee: a.assignee,
                    })),
                  risks: data.risks
                    .filter((r) =>
                      typeof r === "string"
                        ? r.trim() !== ""
                        : r.description && r.description.trim() !== "",
                    )
                    .map((r) =>
                      typeof r === "string"
                        ? { description: r, impact: "" }
                        : {
                            description: r.description || "",
                            impact: r.impact || "",
                          },
                    ),
                  considerations: data.considerations.filter(
                    (c) => c.trim() !== "",
                  ),
                  changes: data.changes
                    .filter((c) => c.change.trim() !== "")
                    .map((c) => ({
                      change: c.change,
                      impact: c.impact,
                      disposition: c.disposition,
                    })),
                },
              );

              console.log(
                "Update project response:",
                updatedProject ? "success" : "failed",
              );
              if (updatedProject) {
                setProject(updatedProject);
                toast({
                  title: "Changes saved",
                  description: "Your changes have been saved successfully",
                  className: "bg-green-50 border-green-200",
                });
                // Removed automatic switch to Status Sheet view
                return true;
              }
              toast({
                title: "Error",
                description:
                  "Failed to update project. No response from server.",
                variant: "destructive",
              });
              return false;
            } catch (error) {
              console.error("Error updating project:", error);
              toast({
                title: "Error",
                description: "Failed to update project",
                variant: "destructive",
              });
              return false;
            } finally {
              setLoading(false);
            }
          }}
        />
      ) : (
        <StatusSheet data={formattedData} />
      )}
    </div>
  );
};

export default ProjectDashboard;
