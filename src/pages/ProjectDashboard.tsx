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
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadVersions = async () => {
      const versions = await projectVersionsService.getVersions(
        initialProject.id,
      );
      setVersions(versions);
      setCurrentVersionIndex(-1); // -1 means current version
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
    status: currentProject?.status || "active",
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
      currentProject?.next_period_activities?.map((a) => a.description) || [],
    risks: currentProject?.risks?.map((r) => r.description) || [],
    considerations:
      currentProject?.considerations?.map((c) => c.description) || [],
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
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              const element = document.getElementById("status-sheet");
              if (!element) return;

              const canvas = await html2canvas(element);

              // Create download link
              const link = document.createElement("a");
              link.download = `${currentProject.title}_${new Date().toISOString().split("T")[0]}.jpg`;
              link.href = canvas.toDataURL("image/jpeg", 0.9);
              link.click();
            }}
            variant="outline"
            className="flex items-center gap-2 text-blue-800 hover:text-blue-900"
          >
            <Download className="h-4 w-4 mr-2" />
            Export as JPG
          </Button>
          <div className="flex items-center gap-2">
            {!isEditing && versions.length > 0 && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentVersionIndex === versions.length - 1}
                  onClick={() => {
                    if (currentVersionIndex < versions.length - 1) {
                      setCurrentVersionIndex(currentVersionIndex + 1);
                      setCurrentProject(versions[currentVersionIndex + 1].data);
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground">
                  {currentVersionIndex === -1
                    ? "Current"
                    : `Version ${versions.length - currentVersionIndex}/${versions.length}`}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentVersionIndex === -1}
                  onClick={() => {
                    if (currentVersionIndex > -1) {
                      setCurrentVersionIndex(currentVersionIndex - 1);
                      if (currentVersionIndex === 0) {
                        setCurrentProject(latestProject);
                      } else {
                        setCurrentProject(
                          versions[currentVersionIndex - 1].data,
                        );
                      }
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                setIsEditing(!isEditing);
                if (isEditing) {
                  setCurrentVersionIndex(-1);
                  setCurrentProject(latestProject);
                }
              }}
              variant="outline"
              className="flex items-center gap-2"
              disabled={currentVersionIndex !== -1}
            >
              <Edit className="h-4 w-4" />
              {isEditing ? "View Status" : "Edit Project"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mb-4">
        {isEditing ? (
          <Button
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
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete Project
          </Button>
        ) : null}
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
                  status: data.status || "active",
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
                  next_period_activities: data.nextPeriodActivities.filter(
                    (a) => a.trim() !== "",
                  ),
                  risks: data.risks.filter((r) => r.trim() !== ""),
                  considerations: data.considerations.filter(
                    (c) => c.trim() !== "",
                  ),
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
      <Toaster />
    </div>
  );
};

export default ProjectDashboard;
