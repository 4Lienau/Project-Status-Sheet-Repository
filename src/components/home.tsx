import React, { useState, useEffect } from "react";
import { projectService } from "@/lib/services/project";
import ProjectForm from "./ProjectForm";
import StatusSheet from "./StatusSheet";
import { Button } from "./ui/button";

const Home = () => {
  const [mode, setMode] = useState<"form" | "preview">("form");
  const [projectData, setProjectData] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  useEffect(() => {
    if (currentProjectId) {
      const unsubscribe = projectService.subscribeToProject(
        currentProjectId,
        (project) => {
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
            milestones: project.milestones.map((m) => ({
              date: m.date,
              milestone: m.milestone,
              owner: m.owner,
              completion: m.completion,
            })),
            accomplishments: project.accomplishments.map((a) => a.description),
            nextPeriodActivities: project.next_period_activities.map(
              (a) => a.description,
            ),
            risks: project.risks.map((r) => r.description),
            considerations: project.considerations.map((c) => c.description),
          });
        },
      );

      return () => {
        unsubscribe();
      };
    }
  }, [currentProjectId]);

  const handleFormSubmit = async (data: any) => {
    const project = await projectService.createProject({
      title: data.title,
      budget_actuals: parseFloat(data.budget.actuals),
      budget_forecast: parseFloat(data.budget.forecast),
      charter_link: data.charterLink,
      sponsors: data.sponsors,
      business_leads: data.businessLeads,
      project_manager: data.projectManager,
      milestones: data.milestones,
      accomplishments: data.accomplishments,
      next_period_activities: data.nextPeriodActivities,
      risks: data.risks,
      considerations: data.considerations,
    });

    if (project) {
      setCurrentProjectId(project.id);
      setMode("preview");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {mode === "preview" && (
          <div className="mb-4">
            <Button onClick={() => setMode("form")}>Edit Project</Button>
          </div>
        )}

        {mode === "form" ? (
          <ProjectForm onSubmit={handleFormSubmit} />
        ) : (
          <StatusSheet data={projectData} />
        )}
      </div>
    </div>
  );
};

export default Home;
