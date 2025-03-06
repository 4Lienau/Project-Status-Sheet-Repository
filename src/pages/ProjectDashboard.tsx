import React from "react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import {
  Edit,
  ArrowLeft,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { projectService } from "@/lib/services/project";
import {
  projectVersionsService,
  type ProjectVersion,
} from "@/lib/services/projectVersions";
import StatusSheet from "@/components/StatusSheet";
import ProjectForm from "@/components/ProjectForm";
import type { Project } from "@/lib/services/project";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";

interface ProjectDashboardProps {
  project: Project & {
    milestones?: Array<{
      date: string;
      milestone: string;
      owner: string;
      completion: number;
      status: "green" | "yellow" | "red";
    }>;
    accomplishments?: Array<{ description: string }>;
    next_period_activities?: Array<{ description: string }>;
    risks?: Array<{ description: string }>;
    considerations?: Array<{ description: string }>;
    changes?: Array<{ change: string; impact: string; disposition: string }>;
  };
  onBack: () => void;
}

type ProjectState = ProjectDashboardProps["project"];

const ProjectDashboard = ({
  project: initialProject,
  onBack,
  initialEditMode = false,
}: ProjectDashboardProps & { initialEditMode?: boolean }) => {
  const [currentProject, setCurrentProject] =
    React.useState<ProjectState>(initialProject);
  const [latestProject, setLatestProject] =
    React.useState<ProjectState>(initialProject);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(initialEditMode);
  const [versions, setVersions] = React.useState<ProjectVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = React.useState(-1);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] =
    React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [newProjectTitle, setNewProjectTitle] = React.useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadVersions = async () => {
      const versions = await projectVersionsService.getVersions(
        initialProject.id,
      );
      setVersions(versions);
      setCurrentVersionIndex(-1); // -1 means current version
      setCurrentProject(initialProject);
      setLatestProject(initialProject);
    };
    loadVersions();
  }, [initialProject.id]);

  const formatCurrency = (value: number) => {
    return value
      .toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
      .replace("$", "");
  };

  const formattedData = {
    title: currentProject?.title || "",
    description: currentProject?.description || "",
    valueStatement: currentProject?.value_statement || "",
    status: currentProject?.status || "active",
    health_calculation_type:
      currentProject?.health_calculation_type || "automatic",
    manual_health_percentage: currentProject?.manual_health_percentage || 0,
    budget: {
      total: currentProject?.budget_total
        ? formatCurrency(currentProject.budget_total)
        : "0.00",
      actuals: currentProject?.budget_actuals
        ? formatCurrency(currentProject.budget_actuals)
        : "0.00",
      forecast: currentProject?.budget_forecast
        ? formatCurrency(currentProject.budget_forecast)
        : "0.00",
    },
    charterLink: currentProject?.charter_link || "",
    sponsors: currentProject?.sponsors || "",
    businessLeads: currentProject?.business_leads || "",
    projectManager: currentProject?.project_manager || "",
    milestones: currentProject?.milestones || [],
    accomplishments:
      currentProject?.accomplishments?.map((a) => a.description) || [],
    nextPeriodActivities:
      currentProject?.next_period_activities?.map((a) => ({
        description: a.description || "",
        date: a.date || new Date().toISOString().split("T")[0],
        completion: a.completion || 0,
        assignee: a.assignee || "",
      })) || [],
    risks:
      currentProject?.risks?.map((r) => ({
        description: r.description,
        impact: r.impact,
      })) || [],
    considerations:
      currentProject?.considerations?.map((c) => c.description) || [],
    changes:
      currentProject?.changes?.map((c) => ({
        change: c.change || "",
        impact: c.impact || "",
        disposition: c.disposition || "",
      })) || [],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Button>

        {/* Version controls */}
        {versions.length > 0 && !isEditing && (
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentVersionIndex === versions.length - 1}
              onClick={() => {
                if (currentVersionIndex < versions.length - 1) {
                  const nextIndex = currentVersionIndex + 1;
                  setCurrentVersionIndex(nextIndex);
                  setCurrentProject(versions[nextIndex].data);
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground space-y-1 min-w-[120px] text-center">
              <div>
                {currentVersionIndex === -1
                  ? "Current Version"
                  : `Version ${versions.length - currentVersionIndex}/${versions.length}`}
              </div>
              {currentVersionIndex !== -1 && versions[currentVersionIndex] && (
                <div className="text-xs opacity-70">
                  {new Date(
                    versions[currentVersionIndex].created_at,
                  ).toLocaleDateString()}{" "}
                  {new Date(
                    versions[currentVersionIndex].created_at,
                  ).toLocaleTimeString()}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentVersionIndex === -1}
              onClick={() => {
                if (currentVersionIndex > -1) {
                  const prevIndex = currentVersionIndex - 1;
                  setCurrentVersionIndex(prevIndex);
                  if (prevIndex === -1) {
                    setCurrentProject(latestProject);
                  } else {
                    setCurrentProject(versions[prevIndex].data);
                  }
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
            disabled={currentVersionIndex !== -1}
          >
            <Edit className="h-4 w-4" />
            {isEditing ? "View Status Sheet" : "Edit Project"}
          </Button>

          {isEditing && (
            <>
              <Button
                onClick={() => {
                  setNewProjectTitle(`${currentProject.title} (Copy)`);
                  setIsDuplicateDialogOpen(true);
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" /> Duplicate Project
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete Project
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <ProjectForm
          initialData={formattedData}
          onSubmit={async (data) => {
            try {
              const updatedProject = await projectService.updateProject(
                currentProject.id,
                {
                  title: data.title,
                  description: data.description || null,
                  valueStatement: data.valueStatement || null,
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
                  milestones: data.milestones
                    .filter((m) => m.milestone.trim() !== "")
                    .map((m) => ({
                      date: m.date,
                      milestone: m.milestone,
                      owner: m.owner,
                      completion: m.completion,
                      status: m.status,
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
                  risks: data.risks.filter((r) =>
                    typeof r === "string"
                      ? r.trim() !== ""
                      : r.description.trim() !== "",
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

              if (updatedProject) {
                // Create a new version
                await projectVersionsService.createVersion(
                  currentProject.id,
                  updatedProject,
                );

                setCurrentProject(updatedProject);
                setLatestProject(updatedProject);
                toast({
                  title: "Changes saved",
                  description: "Your changes have been saved successfully",
                  className: "bg-green-50 border-green-200",
                });
                // Stay in edit mode

                // Refresh versions
                const versions = await projectVersionsService.getVersions(
                  currentProject.id,
                );
                setVersions(versions);
                setCurrentVersionIndex(-1);
              }
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to update project",
                variant: "destructive",
              });
            }
          }}
        />
      ) : (
        <StatusSheet data={formattedData} />
      )}

      <Dialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Enter new project title"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newProjectTitle.trim()) {
                  toast({
                    title: "Error",
                    description: "Please enter a project title",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const newProject = await projectService.createProject({
                    title: newProjectTitle,
                    description: currentProject.description,
                    valueStatement: currentProject.value_statement,
                    status: currentProject.status,
                    budget_total: currentProject.budget_total,
                    budget_actuals: currentProject.budget_actuals,
                    budget_forecast: currentProject.budget_forecast,
                    charter_link: currentProject.charter_link,
                    sponsors: currentProject.sponsors,
                    business_leads: currentProject.business_leads,
                    project_manager: currentProject.project_manager,
                    health_calculation_type:
                      currentProject.health_calculation_type,
                    manual_health_percentage:
                      currentProject.manual_health_percentage,
                    milestones:
                      currentProject.milestones?.map((m) => ({
                        date: m.date,
                        milestone: m.milestone,
                        owner: m.owner,
                        completion: m.completion,
                        status: m.status,
                      })) || [],
                    accomplishments:
                      currentProject.accomplishments?.map(
                        (a) => a.description,
                      ) || [],
                    next_period_activities:
                      currentProject.next_period_activities?.map(
                        (a) => a.description,
                      ) || [],
                    risks:
                      currentProject.risks?.map((r) => r.description) || [],
                    considerations:
                      currentProject.considerations?.map(
                        (c) => c.description,
                      ) || [],
                  });

                  if (newProject) {
                    toast({
                      title: "Project duplicated",
                      description:
                        "The project has been successfully duplicated.",
                    });
                    setIsDuplicateDialogOpen(false);
                    navigate(`/status-sheet/${newProject.id}`);
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to duplicate project",
                    variant: "destructive",
                  });
                }
              }}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await projectService.deleteProject(currentProject.id);
                  toast({
                    title: "Project deleted",
                    description: "The project has been successfully deleted.",
                  });
                  onBack();
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to delete project",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  );
};

export default ProjectDashboard;
