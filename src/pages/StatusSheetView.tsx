import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import StatusSheet from "@/components/StatusSheet";
import { projectService } from "@/lib/services/project";

const StatusSheetView = () => {
  const handleExportToJpg = async () => {
    const element = document.getElementById("status-sheet");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project?.title || "status-sheet"}_${new Date().toISOString().split("T")[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to JPG:", error);
    }
  };

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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleExportToJpg}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" /> Export to JPG
            </Button>
          </div>
        </div>
        <div className="bg-white shadow-none">
          <StatusSheet data={formattedData} />
        </div>
      </div>
    </div>
  );
};

export default StatusSheetView;
