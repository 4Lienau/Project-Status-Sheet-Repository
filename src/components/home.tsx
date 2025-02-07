import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import LandingPage from "./landing/LandingPage";
import ProjectList from "./projects/ProjectList";
import ProjectForm from "./ProjectForm";
import StatusSheet from "./StatusSheet";
import type { Project } from "@/lib/services/project";

const Home = () => {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"list" | "form" | "preview">("list");
  const [projectData, setProjectData] = useState(null);

  const handleSelectProject = (project: Project) => {
    setProjectData({
      title: project.title,
      budget: {
        actuals: project.budget_actuals.toString(),
        forecast: project.budget_forecast.toString(),
      },
      charterLink: project.charter_link,
      sponsors: project.sponsors,
      businessLeads: project.business_leads,
      projectManager: project.project_manager,
    });
    setMode("preview");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {mode === "list" && (
          <ProjectList
            onSelectProject={handleSelectProject}
            onCreateNew={() => setMode("form")}
          />
        )}

        {mode === "form" && (
          <ProjectForm
            onSubmit={(data) => {
              setProjectData(data);
              setMode("preview");
            }}
          />
        )}

        {mode === "preview" && projectData && (
          <StatusSheet data={projectData} />
        )}
      </div>
    </div>
  );
};

export default Home;
