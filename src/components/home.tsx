import { useState } from "react";
import Layout from "./layout/Layout";
import { useAuth } from "@/lib/hooks/useAuth";
import LandingPage from "./landing/LandingPage";
import ProjectList from "./projects/ProjectList";
import ProjectForm from "./ProjectForm";
import StatusSheet from "./StatusSheet";
import ProjectDashboard from "@/pages/ProjectDashboard";
import { projectService, type Project } from "@/lib/services/project";

const Home = () => {
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
            <ProjectForm
              onSubmit={async (data) => {
                const projectData = {
                  title: data.title,
                  description: data.description,
                  status: data.status,
                  budget_total: parseFloat(
                    data.budget.total.replace(/,/g, "") || "0",
                  ),
                  budget_actuals: parseFloat(
                    data.budget.actuals.replace(/,/g, "") || "0",
                  ),
                  budget_forecast: parseFloat(
                    data.budget.forecast.replace(/,/g, "") || "0",
                  ),
                  charter_link: data.charterLink,
                  sponsors: data.sponsors,
                  business_leads: data.businessLeads,
                  project_manager: data.projectManager,
                  milestones: data.milestones,
                  accomplishments: data.accomplishments,
                  next_period_activities: data.nextPeriodActivities,
                  risks: data.risks,
                  considerations: data.considerations,
                };

                const project = await projectService.createProject(projectData);
                if (project) {
                  setProjectData(project);
                  setMode("preview");
                }
              }}
            />
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
    </Layout>
  );
};

export default Home;
