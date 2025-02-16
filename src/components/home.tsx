import { useState } from "react";
import Layout from "./layout/Layout";
import { useAuth } from "@/lib/hooks/useAuth";
import LandingPage from "./landing/LandingPage";
import ProjectList from "./projects/ProjectList";
import ProjectForm from "./ProjectForm";
import StatusSheet from "./StatusSheet";
import ProjectDashboard from "@/pages/ProjectDashboard";
import { projectService, type Project } from "@/lib/services/project";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"list" | "form" | "preview">("list");
  const [projectData, setProjectData] = useState(null);

  const handleSelectProject = async (project: Project) => {
    const fullProject = await projectService.getProject(project.id);
    if (fullProject) {
      setProjectData(fullProject);
      setMode("preview");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <Layout>
      <div className="p-6 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {mode === "list" && (
            <ProjectList
              onSelectProject={handleSelectProject}
              onCreateNew={() => setMode("form")}
            />
          )}

          {mode === "form" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Create New Project</h2>
                <Button variant="outline" onClick={() => setMode("list")}>
                  Cancel
                </Button>
              </div>
              <ProjectForm
                onSubmit={async (data) => {
                  if (!data.title.trim()) {
                    toast({
                      title: "Error",
                      description: "Project title is required",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    const projectData = {
                      title: data.title,
                      description: data.description || "",
                      status: data.status || "active",
                      budget_total: parseFloat(
                        data.budget.total.replace(/,/g, "") || "0",
                      ),
                      budget_actuals: parseFloat(
                        data.budget.actuals.replace(/,/g, "") || "0",
                      ),
                      budget_forecast: parseFloat(
                        data.budget.forecast.replace(/,/g, "") || "0",
                      ),
                      charter_link: data.charterLink || "",
                      sponsors: data.sponsors || "",
                      business_leads: data.businessLeads || "",
                      project_manager: data.projectManager || "",
                      milestones: data.milestones.filter(
                        (m) => m.milestone.trim() !== "",
                      ),
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
                    };

                    const project =
                      await projectService.createProject(projectData);
                    if (project) {
                      toast({
                        title: "Success",
                        description: "Project created successfully",
                        className: "bg-green-50 border-green-200",
                      });
                      setProjectData(project);
                      setMode("preview");
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description:
                        "Failed to create project. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          )}

          {mode === "preview" && projectData && (
            <ProjectDashboard
              project={projectData}
              onBack={() => setMode("list")}
              initialEditMode={true}
            />
          )}
        </div>
      </div>
      <Toaster />
    </Layout>
  );
};

export default Home;
