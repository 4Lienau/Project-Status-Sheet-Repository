import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { projectService } from "@/lib/services/project";
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
}: ProjectDashboardProps) => {
  const [project, setProject] = React.useState<ProjectState>(initialProject);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return value
      .toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
      .replace("$", "");
  };

  const formattedData = {
    title: project?.title || "",
    description: project?.description || "",
    status: project?.status || "active",
    budget: {
      total: project?.budget_total
        ? formatCurrency(project.budget_total)
        : "0.00",
      actuals: project?.budget_actuals
        ? formatCurrency(project.budget_actuals)
        : "0.00",
      forecast: project?.budget_forecast
        ? formatCurrency(project.budget_forecast)
        : "0.00",
    },
    charterLink: project?.charter_link || "",
    sponsors: project?.sponsors || "",
    businessLeads: project?.business_leads || "",
    projectManager: project?.project_manager || "",
    milestones: project?.milestones || [],
    accomplishments: project?.accomplishments?.map((a) => a.description) || [],
    nextPeriodActivities:
      project?.next_period_activities?.map((a) => a.description) || [],
    risks: project?.risks?.map((r) => r.description) || [],
    considerations: project?.considerations?.map((c) => c.description) || [],
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
            onClick={() => navigate(`/status-sheet/${project.id}`)}
            variant="outline"
            className="flex items-center gap-2 text-blue-800 hover:text-blue-900"
          >
            Create Status Sheet
          </Button>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            {isEditing ? "View Status" : "Edit Project"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mb-4">
        {isEditing ? (
          <Button
            onClick={async () => {
              try {
                await projectService.deleteProject(project.id);
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
                project.id,
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
                setProject(updatedProject);
                toast({
                  title: "Success",
                  description: "Project updated successfully",
                });
                setIsEditing(false);
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
