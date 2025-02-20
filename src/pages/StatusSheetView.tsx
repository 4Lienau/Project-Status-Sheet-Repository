import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StatusSheet from "@/components/StatusSheet";
import { projectService } from "@/lib/services/project";

const StatusSheetView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = React.useState(null);

  React.useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const projectData = await projectService.getProject(id);
        if (projectData) {
          setProject(projectData);
        }
      }
    };

    loadProject();
  }, [id]);

  if (!project) {
    return <div>Loading...</div>;
  }

  const formattedData = {
    title: project.title,
    description: project.description || "",
    status: project.status || "active",
    budget: {
      total: project.budget_total.toLocaleString(),
      actuals: project.budget_actuals.toLocaleString(),
      forecast: project.budget_forecast.toLocaleString(),
    },
    charterLink: project.charter_link,
    sponsors: project.sponsors,
    businessLeads: project.business_leads,
    projectManager: project.project_manager,
    milestones: project.milestones || [],
    accomplishments: project.accomplishments?.map((a) => a.description) || [],
    nextPeriodActivities:
      project.next_period_activities?.map((a) => a.description) || [],
    risks: project.risks?.map((r) => r.description) || [],
    considerations: project.considerations?.map((c) => c.description) || [],
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <div className="bg-white shadow-none">
          <StatusSheet data={formattedData} />
        </div>
      </div>
    </div>
  );
};

export default StatusSheetView;
