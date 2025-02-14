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
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <Layout>
      <div className="p-6">
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
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;
